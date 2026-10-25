import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, makeApp, signUpAndLogin, uniqueEmail, type TestApp } from "./helpers";
import { localNow } from "../src/services/push-service";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- corpo inspecionado livremente

const sent: { endpoint: string; payload: Json }[] = [];
const gone = new Set<string>();
let t: TestApp;
beforeAll(() => {
  t = makeApp({
    vapid: { publicKey: "chave-publica-de-teste", privateKey: "x", subject: "mailto:teste@exemplo.com" },
    pushSender: async (sub, payload) => {
      if (gone.has(sub.endpoint)) return 410;
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
      return 201;
    },
  });
});
afterAll(async () => {
  t.setNow(null);
  await t.close();
});

const allNo = { "1": false, "2": false, "3": false, "4": false, "5": false, "6": false, "7": false };
const birthYear = new Date().getUTCFullYear() - 30;
const MONDAY = "2026-10-05";
const interview = {
  basicos: { birthMonth: 1, birthYear, sex: "F", heightCm: 165, weightKg: 60 },
  triagem: { general: allNo, pregnant: false },
  historico: {
    monthsRegular: 24, weeklySessions: 3, weeklyVolume: { unit: "km", value: 25 }, longestRecentKm: 12,
    canRunContinuousMinutes: 60, daysSinceLastRun: 2, halfMarathonLast3m: false, regularExercise3m: true,
  },
  lesoes: { injury12m: false, runningInjuryLast3m: false, injuryOrPersistentPainLast6w: false, currentPain: { intensity: 0 } },
  objetivo: { goal: "primeira_prova", raceDistance: "10k" },
  disponibilidade: { daysPerWeek: 4, minutesPerSession: 60, longRunDay: 7 },
  recuperacao: { sleepHours: 7.5, stress: 2, workType: "sedentario", otherSportsMinutesPerWeek: 0, strengthTraining: true },
  recursos: { hrDevice: "relogio", track: false, treadmill: true, terrain: ["plano"] },
};

/** Atleta com plano a partir de MONDAY; devolve um dia com corrida e um dia sem treino principal. */
async function onboard() {
  t.setNow(new Date(`${MONDAY}T12:00:00Z`));
  const a = await signUpAndLogin(t, uniqueEmail(), true);
  for (const [step, data] of Object.entries(interview)) await t.request("PUT", `/interview/${step}`, data, a.cookie);
  await t.request("POST", "/interview/submit", {}, a.cookie);
  const week = (await (await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie)).json()) as Json;
  const runDays = new Set((week.sessions as Json[]).filter((s) => !s.optional).map((s) => s.date as string));
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${MONDAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));
  return { ...a, runDay: days.find((d) => runDays.has(d))!, restDay: days.find((d) => !runDays.has(d))! };
}

const device = (n: string, time = "07:00") => ({
  endpoint: `https://push.exemplo.com/${n}-${Math.random()}`,
  keys: { p256dh: "BHx-chave-publica", auth: "segredo" },
  time,
  timeZone: "America/Sao_Paulo",
});
/** Horário de Brasília (UTC−3) num dia. */
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00-03:00`);
const json = async (res: Response) => (await res.json()) as Json;

describe("lembrete do treino (Web Push)", () => {
  it("hora local pelo fuso do aparelho", () => {
    expect(localNow(new Date("2026-10-06T02:30:00Z"), "America/Sao_Paulo")).toEqual({ date: "2026-10-05", time: "23:30" });
  });

  it("liga, lista e desliga o lembrete deste aparelho; o mesmo aparelho atualiza o horário", async () => {
    const a = await onboard();
    expect(await json(await t.request("GET", "/push/config", undefined, a.cookie))).toEqual({ enabled: true, publicKey: "chave-publica-de-teste" });
    const d = device("liga");
    expect((await t.request("PUT", "/push/subscription", d, a.cookie)).status).toBe(200);
    expect((await t.request("PUT", "/push/subscription", { ...d, time: "18:30" }, a.cookie)).status).toBe(200);
    expect((await json(await t.request("GET", "/push/subscriptions", undefined, a.cookie))).subscriptions).toEqual([
      { endpoint: d.endpoint, time: "18:30", timeZone: "America/Sao_Paulo" },
    ]);
    expect((await t.request("DELETE", "/push/subscription", { endpoint: d.endpoint }, a.cookie)).status).toBe(204);
    expect((await json(await t.request("GET", "/push/subscriptions", undefined, a.cookie))).subscriptions).toEqual([]);
  });

  it("recusa endereço que não é https, horário inválido, fuso inexistente e campos a mais", async () => {
    const a = await onboard();
    for (const body of [
      { ...device("x"), endpoint: "http://push.exemplo.com/x" },
      { ...device("x"), time: "25:00" },
      { ...device("x"), timeZone: "Marte/Olimpo" },
      { ...device("x"), userId: "outro" },
    ]) {
      expect((await t.request("PUT", "/push/subscription", body, a.cookie)).status).toBe(400);
    }
  });

  it("envia uma vez por dia, só depois do horário e só em dia com treino; texto sem dado de saúde", async () => {
    const a = await onboard();
    const d = device("envia", "07:00");
    await t.request("PUT", "/push/subscription", d, a.cookie);
    const mine = () => sent.filter((s) => s.endpoint === d.endpoint);

    await t.app.push.sendDue(at(a.runDay, "06:55"));
    expect(mine()).toHaveLength(0);
    await t.app.push.sendDue(at(a.runDay, "07:02"));
    await t.app.push.sendDue(at(a.runDay, "07:07"));
    expect(mine()).toHaveLength(1);
    expect(mine()[0]!.payload).toEqual({ title: "Let's Go Run", body: "Veja o que o app preparou para o seu treino de hoje.", url: "/painel" });

    await t.app.push.sendDue(at(a.restDay, "08:00"));
    expect(mine()).toHaveLength(1);
  });

  it("muito atrasado (API fora do ar no horário) não envia; pausa por lesão também não", async () => {
    const a = await onboard();
    const d = device("atraso", "07:00");
    await t.request("PUT", "/push/subscription", d, a.cookie);
    await t.app.push.sendDue(at(a.runDay, "11:00"));
    expect(sent.filter((s) => s.endpoint === d.endpoint)).toHaveLength(0);

    const b = await onboard();
    const e = device("pausa", "07:00");
    await t.request("PUT", "/push/subscription", e, b.cookie);
    expect((await t.request("PUT", "/profile/pause", { cause: "lesao", date: MONDAY }, b.cookie)).status).toBe(200);
    await t.app.push.sendDue(at(b.runDay, "07:01"));
    expect(sent.filter((s) => s.endpoint === e.endpoint)).toHaveLength(0);
  });

  it("pausa planejada (R-PRG-14): sem lembrete nos dias da pausa", async () => {
    const a = await onboard();
    const d = device("viagem", "07:00");
    await t.request("PUT", "/push/subscription", d, a.cookie);
    expect((await t.request("PUT", "/plan/pause", { startDate: a.runDay, endDate: a.runDay, today: MONDAY }, a.cookie)).status).toBe(200);
    await t.app.push.sendDue(at(a.runDay, "07:01"));
    expect(sent.filter((s) => s.endpoint === d.endpoint)).toHaveLength(0);
  });

  it("aparelho que cancelou a inscrição (410) é apagado", async () => {
    const a = await onboard();
    const d = device("sumiu", "07:00");
    await t.request("PUT", "/push/subscription", d, a.cookie);
    gone.add(d.endpoint);
    await t.app.push.sendDue(at(a.runDay, "07:01"));
    const [{ n }] = await admin`select count(*)::int as n from push_subscriptions where endpoint = ${d.endpoint}`;
    expect(n).toBe(0);
  });

  it("A não vê nem apaga o aparelho de B; sem sessão é 401", async () => {
    const a = await onboard();
    const b = await onboard();
    const d = device("isolado");
    await t.request("PUT", "/push/subscription", d, b.cookie);
    expect((await json(await t.request("GET", "/push/subscriptions", undefined, a.cookie))).subscriptions).toEqual([]);
    await t.request("DELETE", "/push/subscription", { endpoint: d.endpoint }, a.cookie);
    const [{ n }] = await admin`select count(*)::int as n from push_subscriptions where endpoint = ${d.endpoint}`;
    expect(n).toBe(1);
    for (const [m, p] of [["GET", "/push/config"], ["GET", "/push/subscriptions"], ["PUT", "/push/subscription"], ["DELETE", "/push/subscription"]] as const) {
      expect((await t.request(m, p, m === "GET" ? undefined : d)).status).toBe(401);
    }
  });

  it("entra na exportação (sem as chaves de cifra) e some com a exclusão da conta", async () => {
    const a = await onboard();
    const d = device("lgpd");
    await t.request("PUT", "/push/subscription", d, a.cookie);
    const exp = await json(await t.request("GET", "/account/export", undefined, a.cookie));
    expect(exp.reminderDevices).toHaveLength(1);
    expect(exp.reminderDevices[0]).toMatchObject({ endpoint: d.endpoint, reminderTime: "07:00", timeZone: "America/Sao_Paulo" });
    expect(JSON.stringify(exp)).not.toContain("segredo");
    await admin`delete from users where id = ${a.userId}`;
    const [{ n }] = await admin`select count(*)::int as n from push_subscriptions where endpoint = ${d.endpoint}`;
    expect(n).toBe(0);
  });
});

describe("lembrete desligado (sem chaves)", () => {
  it("config diz que não há lembrete e as rotas de aparelho respondem 404", async () => {
    const off = makeApp();
    try {
      const a = await signUpAndLogin(off, uniqueEmail(), true);
      expect(await json(await off.request("GET", "/push/config", undefined, a.cookie))).toEqual({ enabled: false, publicKey: null });
      expect((await off.request("PUT", "/push/subscription", device("off"), a.cookie)).status).toBe(404);
    } finally {
      await off.close();
    }
  });
});
