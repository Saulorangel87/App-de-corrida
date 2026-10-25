import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, makeApp, signUpAndLogin, uniqueEmail, type TestApp } from "./helpers";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- corpo inspecionado livremente

let t: TestApp;
beforeAll(() => {
  t = makeApp();
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
const json = async (res: Response) => (await res.json()) as Json;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

async function onboard() {
  t.setNow(new Date(`${MONDAY}T12:00:00Z`));
  const a = await signUpAndLogin(t, uniqueEmail(), true);
  for (const [step, data] of Object.entries(interview)) await t.request("PUT", `/interview/${step}`, data, a.cookie);
  await t.request("POST", "/interview/submit", {}, a.cookie);
  const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie));
  const runDay = (week.sessions as Json[]).find((s) => !s.optional)!.date as string;
  return { ...a, runDay };
}

describe("não estou 100% (R-PRG-13)", () => {
  it("liga e desfaz o pedido; o treino do dia reduz e volta", async () => {
    const a = await onboard();
    t.setNow(new Date(`${a.runDay}T12:00:00Z`));
    const before = await json(await t.request("GET", `/day/${a.runDay}`, undefined, a.cookie));
    expect(before.lighterRequested).toBe(false);

    const on = await json(await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true }, a.cookie));
    expect(on.lighterRequested).toBe(true);
    expect(on.decision.action).toBe("reduzir");
    expect(on.decision.reasons.map((r: Json) => r.rule)).toContain("R-PRG-13");
    expect(on.decision.session.minutes).toBeLessThan(before.decision.session.minutes);
    // pedir de novo não duplica
    expect((await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true }, a.cookie)).status).toBe(200);

    const off = await json(await t.request("PUT", `/day/${a.runDay}/lighter`, { on: false }, a.cookie));
    expect(off.lighterRequested).toBe(false);
    expect(off.decision.session.minutes).toBe(before.decision.session.minutes);
  });

  it("só para hoje ou um dia de diferença; campos a mais recusados; o pedido de A não toca B; sem sessão 401", async () => {
    const a = await onboard();
    const b = await onboard();
    t.setNow(new Date(`${a.runDay}T12:00:00Z`));
    expect((await t.request("PUT", `/day/${addDays(a.runDay, 5)}/lighter`, { on: true }, a.cookie)).status).toBe(400);
    expect((await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true, userId: b.userId }, a.cookie)).status).toBe(400);
    await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true }, a.cookie);
    expect((await json(await t.request("GET", `/day/${a.runDay}`, undefined, b.cookie))).lighterRequested).toBe(false);
    expect((await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true })).status).toBe(401);
  });
});

describe("pausa planejada (R-PRG-14)", () => {
  it("marca, mostra a volta prevista, deixa os dias sem treino e sem contar como não feitos", async () => {
    const a = await onboard();
    t.setNow(new Date(`${MONDAY}T12:00:00Z`));
    const start = addDays(MONDAY, 1);
    const end = addDays(MONDAY, 10);
    const saved = await json(await t.request("PUT", "/plan/pause", { startDate: start, endDate: end, today: MONDAY }, a.cookie));
    expect(saved).toEqual({ pause: { startDate: start, endDate: end, started: false }, returnBand: "congela" });
    expect(await json(await t.request("GET", `/plan/pause?today=${MONDAY}`, undefined, a.cookie))).toEqual(saved);

    const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie));
    for (const s of week.sessions as Json[]) expect(s.paused).toBe(s.date >= start && s.date <= end);

    t.setNow(new Date(`${addDays(MONDAY, 3)}T12:00:00Z`));
    const day = await json(await t.request("GET", `/day/${addDays(MONDAY, 3)}`, undefined, a.cookie));
    expect(day.decision.session).toMatchObject({ slug: null, minutes: 0 });
    expect(day.decision.reasons.map((r: Json) => r.rule)).toContain("R-PRG-14");
    expect(day.plannedPause).toEqual({ startDate: start, endDate: end });

    // na volta, os treinos da pausa não aparecem como perdidos nem pedem o motivo da parada
    const back = addDays(end, 1);
    t.setNow(new Date(`${back}T12:00:00Z`));
    const after = await json(await t.request("GET", `/day/${back}`, undefined, a.cookie));
    expect(after.decision.freezeReasons ?? []).not.toContain("sessoes_nao_concluidas");
    expect(after.questions).not.toContain("pause_cause");
  });

  it("pausa longa mostra a volta com metade do volume; volta antes do início e fora do plano são recusadas", async () => {
    const a = await onboard();
    t.setNow(new Date(`${MONDAY}T12:00:00Z`));
    const long = await json(await t.request("PUT", "/plan/pause", { startDate: MONDAY, endDate: addDays(MONDAY, 30), today: MONDAY }, a.cookie));
    expect(long.returnBand).toBe("longa");
    for (const body of [
      { startDate: addDays(MONDAY, -2), endDate: addDays(MONDAY, 3), today: MONDAY },
      { startDate: addDays(MONDAY, 3), endDate: addDays(MONDAY, 2), today: MONDAY },
      { startDate: addDays(MONDAY, 3), endDate: "2030-01-01", today: MONDAY },
      { startDate: addDays(MONDAY, 3), endDate: addDays(MONDAY, 5), today: MONDAY, motivo: "viagem" },
    ]) {
      expect((await t.request("PUT", "/plan/pause", body, a.cookie)).status).toBe(400);
    }
  });

  it("em curso só muda a volta; cancelar antes apaga e durante encerra ontem", async () => {
    const a = await onboard();
    t.setNow(new Date(`${MONDAY}T12:00:00Z`));
    await t.request("PUT", "/plan/pause", { startDate: addDays(MONDAY, 2), endDate: addDays(MONDAY, 4), today: MONDAY }, a.cookie);
    expect(await json(await t.request("DELETE", "/plan/pause", { today: MONDAY }, a.cookie))).toEqual({ pause: null, returnBand: null });

    await t.request("PUT", "/plan/pause", { startDate: MONDAY, endDate: addDays(MONDAY, 6), today: MONDAY }, a.cookie);
    const mid = addDays(MONDAY, 3);
    t.setNow(new Date(`${mid}T12:00:00Z`));
    expect((await t.request("PUT", "/plan/pause", { startDate: mid, endDate: addDays(MONDAY, 8), today: mid }, a.cookie)).status).toBe(400);
    const longer = await json(await t.request("PUT", "/plan/pause", { startDate: MONDAY, endDate: addDays(MONDAY, 8), today: mid }, a.cookie));
    expect(longer.pause).toEqual({ startDate: MONDAY, endDate: addDays(MONDAY, 8), started: true });
    expect(await json(await t.request("DELETE", "/plan/pause", { today: mid }, a.cookie))).toEqual({ pause: null, returnBand: null });
    const [row] = await admin`select start_date::text as s, end_date::text as e from planned_pauses where user_id = ${a.userId}`;
    expect(row).toEqual({ s: MONDAY, e: addDays(mid, -1) });
  });

  it("A não vê nem cancela a pausa de B (404); sem sessão 401", async () => {
    const a = await onboard();
    const b = await onboard();
    t.setNow(new Date(`${MONDAY}T12:00:00Z`));
    await t.request("PUT", "/plan/pause", { startDate: addDays(MONDAY, 2), endDate: addDays(MONDAY, 4), today: MONDAY }, b.cookie);
    expect((await json(await t.request("GET", `/plan/pause?today=${MONDAY}`, undefined, a.cookie))).pause).toBeNull();
    expect((await t.request("DELETE", "/plan/pause", { today: MONDAY }, a.cookie)).status).toBe(404);
    expect((await json(await t.request("GET", `/plan/pause?today=${MONDAY}`, undefined, b.cookie))).pause).not.toBeNull();
    expect((await t.request("GET", `/plan/pause?today=${MONDAY}`)).status).toBe(401);
    expect((await t.request("PUT", "/plan/pause", { startDate: MONDAY, endDate: MONDAY, today: MONDAY })).status).toBe(401);
  });

  it("pausa e pedido entram na exportação e somem com a exclusão da conta", async () => {
    const a = await onboard();
    t.setNow(new Date(`${a.runDay}T12:00:00Z`));
    await t.request("PUT", `/day/${a.runDay}/lighter`, { on: true }, a.cookie);
    await t.request("PUT", "/plan/pause", { startDate: addDays(a.runDay, 1), endDate: addDays(a.runDay, 3), today: a.runDay }, a.cookie);
    const exp = await json(await t.request("GET", "/account/export", undefined, a.cookie));
    expect(exp.plannedPauses).toHaveLength(1);
    expect(exp.lighterDayRequests).toHaveLength(1);
    await admin`delete from users where id = ${a.userId}`;
    const [{ n }] = await admin`select (select count(*) from planned_pauses where user_id = ${a.userId}) + (select count(*) from lighter_day_requests where user_id = ${a.userId}) as n`;
    expect(Number(n)).toBe(0);
  });
});
