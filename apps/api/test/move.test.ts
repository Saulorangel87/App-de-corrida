import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeApp, signUpAndLogin, uniqueEmail, type TestApp } from "./helpers";

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
  disponibilidade: { daysPerWeek: 3, minutesPerSession: 60, longRunDay: 7 },
  recuperacao: { sleepHours: 7.5, stress: 2, workType: "sedentario", otherSportsMinutesPerWeek: 0, strengthTraining: true },
  recursos: { hrDevice: "relogio", track: false, treadmill: true, terrain: ["plano"] },
};
const json = async (res: Response) => (await res.json()) as Json;
const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${MONDAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

async function onboard() {
  t.setNow(new Date(`${MONDAY}T12:00:00Z`));
  const a = await signUpAndLogin(t, uniqueEmail(), true);
  for (const [step, data] of Object.entries(interview)) await t.request("PUT", `/interview/${step}`, data, a.cookie);
  await t.request("POST", "/interview/submit", {}, a.cookie);
  const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie));
  return { ...a, sessions: week.sessions as Json[] };
}

describe("trocar o dia do treino", () => {
  it("o detalhe lista os dias possíveis e a troca muda a data na semana", async () => {
    const a = await onboard();
    const s = a.sessions.find((x) => !x.optional && x.kind !== "qualidade")!;
    const detail = await json(await t.request("GET", `/workouts/${s.id}?today=${MONDAY}`, undefined, a.cookie));
    expect(detail.moveTo.length).toBeGreaterThan(0);
    expect(detail.moveTo).not.toContain(s.date);
    const to = detail.moveTo[0] as string;

    const res = await t.request("PUT", `/workouts/${s.id}/date`, { date: to, today: MONDAY }, a.cookie);
    expect(res.status).toBe(200);
    expect((await json(res)).session.date).toBe(to);
    const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie));
    expect((week.sessions as Json[]).find((x) => x.id === s.id)!.date).toBe(to);
  });

  it("dia fora das regras devolve 409 com o motivo e não muda nada", async () => {
    const a = await onboard();
    const runs = a.sessions.filter((x) => !x.optional);
    const [s, other] = [runs[0]!, runs[1]!];
    const res = await t.request("PUT", `/workouts/${s.id}/date`, { date: other.date, today: MONDAY }, a.cookie);
    expect(res.status).toBe(409);
    expect((await json(res)).error.details).toEqual({ reason: "dia_ocupado" });

    const outside = await t.request("PUT", `/workouts/${s.id}/date`, { date: "2026-10-20", today: MONDAY }, a.cookie);
    expect(outside.status).toBe(409);
    const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, a.cookie));
    expect((week.sessions as Json[]).find((x) => x.id === s.id)!.date).toBe(s.date);
  });

  it("treino já registrado não muda de dia", async () => {
    const a = await onboard();
    const s = a.sessions.find((x) => !x.optional && x.date === MONDAY) ?? a.sessions.find((x) => !x.optional)!;
    t.setNow(new Date(`${s.date}T12:00:00Z`));
    await t.request("PUT", `/workouts/${s.id}/log`, { completed: false }, a.cookie);
    const free = days.find((d) => d > s.date && !a.sessions.some((x) => x.date === d))!;
    const res = await t.request("PUT", `/workouts/${s.id}/date`, { date: free, today: s.date }, a.cookie);
    expect(res.status).toBe(409);
    expect((await json(res)).error.details).toEqual({ reason: "ja_registrado" });
  });

  it("recusa campos a mais e data local longe do relógio do servidor", async () => {
    const a = await onboard();
    const s = a.sessions[0]!;
    expect((await t.request("PUT", `/workouts/${s.id}/date`, { date: days[3], today: MONDAY, userId: "x" }, a.cookie)).status).toBe(400);
    expect((await t.request("PUT", `/workouts/${s.id}/date`, { date: days[3], today: "2026-09-01" }, a.cookie)).status).toBe(400);
  });

  it("A não troca o dia do treino de B (404); sem sessão é 401", async () => {
    const a = await onboard();
    const b = await onboard();
    const s = b.sessions[0]!;
    expect((await t.request("PUT", `/workouts/${s.id}/date`, { date: days[3], today: MONDAY }, a.cookie)).status).toBe(404);
    expect((await t.request("GET", `/workouts/${s.id}?today=${MONDAY}`, undefined, a.cookie)).status).toBe(404);
    expect((await t.request("PUT", `/workouts/${s.id}/date`, { date: days[3], today: MONDAY })).status).toBe(401);
    const week = await json(await t.request("GET", `/plan/week/${MONDAY}`, undefined, b.cookie));
    expect((week.sessions as Json[]).find((x) => x.id === s.id)!.date).toBe(s.date);
  });
});
