import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { athleteStrings, TECHNICAL_MARKERS, type AthleteText } from "@passo/db";
import { admin, makeApp, signUpAndLogin, uniqueEmail, type TestApp } from "./helpers";

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

/** Segunda-feira: a janela do plano começa nela e o domingo é o longão (offset 6). */
const MONDAY = "2026-10-05";
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const onDate = (d: string) => t.setNow(new Date(`${d}T12:00:00Z`));

const intermediate = () => ({
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
});

/** Iniciante do zero, 5 km: escada caminhada-corrida de 3 sessões por semana. */
const beginner = () => ({
  ...intermediate(),
  historico: {
    monthsRegular: 0, weeklySessions: 0, weeklyVolume: { unit: "km", value: 0 }, longestRecentKm: 0,
    canRunContinuousMinutes: 0, daysSinceLastRun: 400, halfMarathonLast3m: false, regularExercise3m: false,
  },
  objetivo: { goal: "primeira_prova", raceDistance: "5k" },
  disponibilidade: { daysPerWeek: 3, minutesPerSession: 60, longRunDay: 7 },
});

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- corpo inspecionado livremente

async function onboard(iv: Record<string, unknown>) {
  onDate(MONDAY);
  // "manter conectado": o relógio do teste anda dias e a sessão curta (12 h) expiraria.
  const a = await signUpAndLogin(t, uniqueEmail(), true);
  for (const [step, data] of Object.entries(iv)) {
    const res = await t.request("PUT", `/interview/${step}`, data, a.cookie);
    if (res.status !== 204) throw new Error(`${step}: ${res.status} ${await res.text()}`);
  }
  const res = await t.request("POST", "/interview/submit", {}, a.cookie);
  const body = (await res.json()) as Json;
  if (res.status !== 201) throw new Error(`submit: ${res.status} ${JSON.stringify(body)}`);
  return { ...a, planStart: body.profile.plan.startDate as string };
}

async function get(cookie: string, path: string) {
  const res = await t.request("GET", path, undefined, cookie);
  return { status: res.status, body: (await res.json()) as Json };
}
async function send(method: string, cookie: string, path: string, data: unknown) {
  const res = await t.request(method, path, data, cookie);
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Json };
}

const runs = (sessions: Json[]) => sessions.filter((s) => !s.optional);

/** Registra como concluídas todas as corridas das semanas anteriores e põe o relógio na semana `index`. */
async function advanceToWeek(cookie: string, index: number) {
  for (let w = 0; w < index; w++) {
    const start = addDays(MONDAY, 7 * w);
    onDate(start);
    const week = await get(cookie, `/plan/week/${start}`);
    for (const s of runs(week.body.sessions)) {
      onDate(s.date);
      const res = await send("PUT", cookie, `/workouts/${s.id}/log`, { completed: true, durationMinutes: s.minutes, srpe: 3 });
      if (res.status !== 200) throw new Error(`log: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
  onDate(addDays(MONDAY, 7 * index));
}

describe("agenda do plano", () => {
  it("sem entrevista: 409 INTERVIEW_REQUIRED", async () => {
    onDate(MONDAY);
    const a = await signUpAndLogin(t);
    const res = await get(a.cookie, `/day/${MONDAY}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INTERVIEW_REQUIRED");
  });

  it("cria a semana na primeira consulta e não duplica sessões", async () => {
    const a = await onboard(intermediate());
    expect(a.planStart).toBe(MONDAY);

    const day = await get(a.cookie, `/day/${MONDAY}`);
    expect(day.status).toBe(200);
    expect(day.body.plan).toMatchObject({ template: "10k-intermediario", calendarWeek: 1, templateWeek: 1, weekStart: MONDAY, weekEnd: addDays(MONDAY, 6) });
    expect(day.body.decision.ruleVersion).toBe("DIA-v1");

    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    expect(week.status).toBe(200);
    expect(runs(week.body.sessions).length).toBeGreaterThanOrEqual(3);
    for (const s of week.body.sessions) {
      expect(s.date >= MONDAY && s.date <= addDays(MONDAY, 6)).toBe(true);
      expect(s.minutes).toBeLessThanOrEqual(60); // tempo disponível por sessão
    }

    const again = await get(a.cookie, `/plan/week/${MONDAY}`);
    expect(again.body.sessions.map((s: Json) => s.id)).toEqual(week.body.sessions.map((s: Json) => s.id));
    const [{ n }] = await admin`select count(*)::int as n from scheduled_workouts where user_id = ${a.userId}`;
    expect(n).toBe(week.body.sessions.length);
  });

  it("longão no dia pedido e qualidade nunca em dias seguidos (semana 5, quando entra a qualidade)", async () => {
    const a = await onboard(intermediate());
    await advanceToWeek(a.cookie, 4);
    const start = addDays(MONDAY, 28);
    const week = await get(a.cookie, `/plan/week/${start}`);
    expect(week.body.plan).toMatchObject({ calendarWeek: 5, templateWeek: 5 });
    const main = runs(week.body.sessions);
    expect(main.find((s) => s.kind === "longao")?.date).toBe(addDays(start, 6)); // domingo
    const quality = main.filter((s) => s.kind === "qualidade").map((s) => Date.parse(s.date)).sort();
    expect(quality.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < quality.length; i++) expect(quality[i]! - quality[i - 1]!).toBeGreaterThan(86_400_000);
  });

  it("recusa datas longe de hoje e datas inválidas", async () => {
    const a = await onboard(intermediate());
    expect((await get(a.cookie, `/day/${addDays(MONDAY, 5)}`)).status).toBe(400);
    expect((await get(a.cookie, `/day/ontem`)).status).toBe(400);
    expect((await get(a.cookie, `/history?days=3`)).status).toBe(400);
  });
});

describe("check-in e decisão do dia", () => {
  it("doença aguda vira descanso e a decisão é gravada com a regra aplicada", async () => {
    const a = await onboard(intermediate());
    const res = await send("PUT", a.cookie, `/checkins/${MONDAY}`, { sleepHours: 7.5, sleepQuality: 4, acuteIllness: true });
    expect(res.status).toBe(200);
    expect(res.body.checkin.acuteIllness).toBe(true);
    expect(res.body.decision.action).toBe("descanso_ou_mobilidade");
    expect(res.body.decision.blockRunning).toBe(true);
    expect(res.body.decision.reasons.map((r: Json) => r.rule)).toContain("R-SON-16");

    const rows = await admin`select applied_rule, output_decision, for_date::text as for_date, engine_version, context
      from engine_decisions where user_id = ${a.userId} and for_date = ${MONDAY} order by created_at`;
    const last = rows[rows.length - 1]!;
    expect(last.applied_rule).toMatch(/^DIA-v1:/);
    expect(last.applied_rule).toContain("R-SON-16");
    expect(last.output_decision).toMatch(/^descanso_ou_mobilidade\|/);
    expect(last.context.today).toBe(MONDAY);
  });

  it("um check-in por dia: reenviar substitui, e o que ficou de fora é apagado", async () => {
    const a = await onboard(intermediate());
    await send("PUT", a.cookie, `/checkins/${MONDAY}`, { sleepHours: 5, sleepQuality: 2, energy: 2 });
    const second = await send("PUT", a.cookie, `/checkins/${MONDAY}`, { sleepHours: 8, sleepQuality: 5 });
    expect(second.body.checkin).toMatchObject({ sleepHours: 8, sleepQuality: 5, energy: null });
    const [{ n }] = await admin`select count(*)::int as n from daily_checkins where user_id = ${a.userId}`;
    expect(n).toBe(1);
  });

  it("noites ruins seguidas antes de uma sessão de qualidade reduzem o dia (sono)", async () => {
    const a = await onboard(intermediate());
    await advanceToWeek(a.cookie, 4);
    const week = await get(a.cookie, `/plan/week/${addDays(MONDAY, 28)}`);
    const quality = runs(week.body.sessions).find((s) => s.kind === "qualidade");
    expect(quality).toBeTruthy();
    const date = quality!.date as string;
    for (const back of [2, 1]) {
      await admin`insert into daily_checkins (user_id, date, sleep_hours, sleep_quality, energy, mood, stress, general_muscle_soreness)
        values (${a.userId}, ${addDays(date, -back)}, 4.5, 1, 2, 2, 2, 2)`;
    }
    onDate(date);
    const res = await send("PUT", a.cookie, `/checkins/${date}`, { sleepHours: 4.5, sleepQuality: 1, energy: 2, mood: 2, stress: 2, muscleSoreness: 2 });
    expect(res.status).toBe(200);
    expect(res.body.decision.action).not.toBe("manter");
    expect(res.body.decision.reasons.map((r: Json) => r.rule).some((r: string) => r.startsWith("R-SON"))).toBe(true);
    // texto limpo para o atleta; as fontes vêm numa lista à parte
    expect(res.body.decision.message).not.toMatch(/\[|R-[A-Z]{3}-\d+/);
    expect(res.body.decision.sources.length).toBeGreaterThan(0);
  });

  it("campos desconhecidos e notas fora da escala: 400", async () => {
    const a = await onboard(intermediate());
    expect((await send("PUT", a.cookie, `/checkins/${MONDAY}`, { sleepHours: 7, userId: "x" })).status).toBe(400);
    expect((await send("PUT", a.cookie, `/checkins/${MONDAY}`, { energy: 9 })).status).toBe(400);
  });
});

describe("coerência entre o plano e a decisão do dia", () => {
  async function followPlan(iv: Record<string, unknown>, weeks: number) {
    const a = await onboard(iv);
    const seen: { week: number; date: string; slug: string; planned: number; action: string; minutes: number; changed: boolean; why: string[] }[] = [];
    for (let w = 0; w < weeks; w++) {
      const start = addDays(MONDAY, 7 * w);
      onDate(start);
      const week = await get(a.cookie, `/plan/week/${start}`);
      for (const s of runs(week.body.sessions)) {
        onDate(s.date);
        const ci = await send("PUT", a.cookie, `/checkins/${s.date}`, {
          sleepHours: 8, sleepQuality: 5, energy: 4, mood: 4, stress: 4, muscleSoreness: 4,
        });
        const dec = ci.body.decision;
        seen.push({
          week: w + 1, date: s.date, slug: s.slug, planned: s.minutes, action: dec.action,
          minutes: dec.session.minutes, changed: dec.session.changed, why: dec.reasons.map((r: Json) => `${r.rule}:${r.code}`),
        });
        const done = Math.min(dec.session.minutes, s.minutes);
        await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: true, durationMinutes: done, srpe: s.targetRpe ?? 3 });
      }
    }
    return seen;
  }

  it("quem segue o plano (descansado, sem dor) não recebe ajuste: 10 km intermediário, 8 semanas", async () => {
    const seen = await followPlan(intermediate(), 8);
    expect(seen.length).toBeGreaterThan(20);
    const adjusted = seen.filter((x) => x.action !== "manter" || x.changed || x.minutes !== x.planned);
    expect(adjusted, JSON.stringify(adjusted, null, 1)).toEqual([]);
  });

  it("iniciante do zero na escada: sem ajuste em 6 semanas", async () => {
    const seen = await followPlan(beginner(), 6);
    expect(seen.length).toBeGreaterThanOrEqual(15);
    const adjusted = seen.filter((x) => x.action !== "manter" || x.changed || x.minutes !== x.planned);
    expect(adjusted, JSON.stringify(adjusted, null, 1)).toEqual([]);
  });

  it("iniciante que entra na etapa 10 pelo que declarou: segue as 4 semanas sem ajuste", async () => {
    const seen = await followPlan(runner(20), 4);
    expect(seen.length).toBeGreaterThanOrEqual(10);
    const adjusted = seen.filter((x) => x.action !== "manter" || x.changed || x.minutes !== x.planned);
    expect(adjusted, JSON.stringify(adjusted, null, 1)).toEqual([]);
  });
});

describe("registro pós-treino e dor", () => {
  async function firstRun(a: { cookie: string }, from = MONDAY) {
    const week = await get(a.cookie, `/plan/week/${from}`);
    return runs(week.body.sessions)[0] as Json;
  }

  it("concluir registra o treino, marca a sessão e devolve a decisão do dia seguinte", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    const res = await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: true, durationMinutes: s.minutes, distanceKm: 6.2, srpe: 4, notes: "tranquilo" });
    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({ status: "completed", log: { completed: true, durationMinutes: s.minutes, srpe: 4 } });
    expect(res.body.nextDay.date).toBe(addDays(s.date, 1));
    expect(res.body.nextDay.decision.ruleVersion).toBe("DIA-v1");

    // reenviar substitui, não duplica
    const again = await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: true, durationMinutes: s.minutes - 5, srpe: 5 });
    expect(again.status).toBe(200);
    const [{ n }] = await admin`select count(*)::int as n from workout_logs where user_id = ${a.userId}`;
    expect(n).toBe(1);
  });

  it("concluído exige duração e esforço (CR-10); não concluído não exige", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    expect((await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: true })).status).toBe(400);
    const skipped = await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: false, notes: "viagem" });
    expect(skipped.status).toBe(200);
    expect(skipped.body.session.status).toBe("skipped");
  });

  it("dor 6/10 que altera a passada bloqueia a corrida do dia seguinte e orienta procurar um profissional", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    const res = await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
      completed: true, durationMinutes: 20, srpe: 7,
      pain: [{ region: "joelho", intensity: 6, type: "pontada", changedStride: true, moment: "treino" }],
    });
    expect(res.status).toBe(200);
    const next = res.body.nextDay.decision;
    expect(next.blockRunning).toBe(true);
    expect(next.refer).toBe(true);
    expect(next.reasons.map((r: Json) => r.rule).some((r: string) => r.startsWith("R-DOR"))).toBe(true);
    expect(res.body.nextDay.questions).toContain("daily_pain_walking");

    const [pain] = await admin`select body_part, intensity, altered_stride, reported_on::text as reported_on from pain_reports where user_id = ${a.userId}`;
    expect(pain).toMatchObject({ body_part: "joelho", intensity: 6, altered_stride: true, reported_on: s.date });
  });

  it("ponto doloroso no osso em sítio de alto risco bloqueia a corrida mesmo com dor baixa (o servidor aplica o mapa, não o cliente)", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    const res = await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
      completed: true, durationMinutes: 30, srpe: 4,
      pain: [{ region: "canela_d", intensity: 2, bonePoint: true, moment: "treino" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.nextDay.decision.blockRunning).toBe(true);
    expect(res.body.nextDay.decision.refer).toBe(true);
    const [row] = await admin`select extra_symptoms from pain_reports where user_id = ${a.userId}`;
    expect(row!.extra_symptoms).toMatchObject({ bonePoint: true, highRiskBoneSite: true });
  });

  it("ponto doloroso em região de baixo risco, com dor baixa, não bloqueia por si só", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    const res = await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
      completed: true, durationMinutes: 30, srpe: 4,
      pain: [{ region: "coxa_frente_d", intensity: 2, bonePoint: true, moment: "treino" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.nextDay.decision.blockRunning).toBe(false);
  });

  it("sinal cardiopulmonar é urgente e fica sem corrida mesmo sem dor", async () => {
    const a = await onboard(intermediate());
    onDate(MONDAY);
    const res = await send("POST", a.cookie, `/pain/${MONDAY}`, { intensity: 0, cardio: { chestPain: true } });
    expect(res.status).toBe(201);
    expect(res.body.decision.urgent).toBe(true);
    expect(res.body.decision.blockRunning).toBe(true);
    expect(res.body.decision.action).toBe("interromper_e_encaminhar");
  });

  it("alta sem dor: relato com intensidade 0 e sem sintomas não é gravado", async () => {
    const a = await onboard(intermediate());
    const s = await firstRun(a);
    onDate(s.date);
    await send("PUT", a.cookie, `/workouts/${s.id}/log`, { completed: true, durationMinutes: 30, srpe: 3, pain: [{ region: "joelho", intensity: 0 }] });
    const [{ n }] = await admin`select count(*)::int as n from pain_reports where user_id = ${a.userId}`;
    expect(n).toBe(0);
  });
});

describe("pausa e liberação profissional", () => {
  it("pausa por lesão aguarda liberação; a autodeclaração libera a volta gradual", async () => {
    const a = await onboard(intermediate());
    onDate(MONDAY);
    const paused = await send("PUT", a.cookie, "/profile/pause", { cause: "lesao" });
    expect(paused.status).toBe(200);
    const blocked = await get(a.cookie, `/day/${MONDAY}`);
    expect(blocked.body.decision.reasons.map((r: Json) => r.code)).toContain("pausa_aguardando_liberacao");
    expect(blocked.body.questions).toContain("professional_clearance");
    expect(blocked.body.decision.refer).toBe(true);
    // O perfil informa a pausa para a tela de configurações.
    const profile = await get(a.cookie, "/profile");
    expect(profile.body.profile.pause).toMatchObject({ cause: "lesao", clearedByProfessionalOn: null });

    const cleared = await send("POST", a.cookie, "/profile/professional-clearance", { date: MONDAY });
    expect(cleared.status).toBe(200);
    const after = await get(a.cookie, `/day/${MONDAY}`);
    expect(after.body.decision.reasons.map((r: Json) => r.code)).not.toContain("pausa_aguardando_liberacao");
    expect(after.body.decision.returnBand).toBe("longa"); // volta gradual (R-PRG-09)
    expect((await get(a.cookie, "/profile")).body.profile.pause.clearedByProfessionalOn).toBe(MONDAY);
  });

  it("a pausa usa a data local do atleta, para casar com a liberação no mesmo dia (fuso)", async () => {
    const a = await onboard(intermediate());
    onDate(MONDAY);
    // O cliente está um dia à frente da data UTC do servidor (ex.: noite no fuso -3).
    const nextDay = addDays(MONDAY, 1);
    const paused = await send("PUT", a.cookie, "/profile/pause", { cause: "dor", date: nextDay });
    expect(paused.status).toBe(200);
    expect(paused.body.pauseDeclaredOn).toBe(nextDay);
    const cleared = await send("POST", a.cookie, "/profile/professional-clearance", { date: nextDay });
    expect(cleared.status).toBe(200);
    // longe demais da data do servidor: recusado
    expect((await send("PUT", a.cookie, "/profile/pause", { cause: "dor", date: addDays(MONDAY, 5) })).status).toBe(400);
  });

  it("não aceita liberação com data futura", async () => {
    const a = await onboard(intermediate());
    onDate(MONDAY);
    expect((await send("POST", a.cookie, "/profile/professional-clearance", { date: addDays(MONDAY, 5) })).status).toBe(400);
  });
});

describe("escada caminhada-corrida", () => {
  async function logWeek(cookie: string, weekStart: string, count: number, { pain = 0 } = {}) {
    const week = await get(cookie, `/plan/week/${weekStart}`);
    const ladder = runs(week.body.sessions).filter((s) => s.ladder);
    for (const s of ladder.slice(0, count)) {
      onDate(s.date);
      const res = await send("PUT", cookie, `/workouts/${s.id}/log`, {
        completed: true, durationMinutes: s.minutes, srpe: 3,
        pain: pain > 0 ? [{ region: "canela", intensity: pain, moment: "treino" }] : [],
      });
      expect(res.status).toBe(200);
    }
    return { week, ladder };
  }

  it("3 sessões concluídas sem dor avançam a etapa; 1 de 3 repete a mesma", async () => {
    const a = await onboard(beginner());
    const w1 = await logWeek(a.cookie, MONDAY, 3);
    expect(w1.ladder).toHaveLength(3);
    expect(w1.week.body.plan.ladderStage).toBe("1");

    const w2Start = addDays(MONDAY, 7);
    onDate(w2Start);
    const w2 = await get(a.cookie, `/plan/week/${w2Start}`);
    expect(w2.body.plan).toMatchObject({ calendarWeek: 2, templateWeek: 2 });
    const stage2 = w2.body.plan.ladderStage as string;
    expect(stage2).not.toBe("1");

    // semana 2: só 1 de 3 sessões → repete a etapa na semana 3
    await logWeek(a.cookie, w2Start, 1);
    const w3Start = addDays(MONDAY, 14);
    onDate(w3Start);
    const w3 = await get(a.cookie, `/plan/week/${w3Start}`);
    expect(w3.body.plan).toMatchObject({ calendarWeek: 3, templateWeek: 2, ladderStage: stage2 });
    const [closed] = await admin`select ladder_action from athlete_plan_weeks where user_id = ${a.userId} and calendar_week = 2`;
    expect(closed!.ladder_action).toBe("repetir");
  });

  it("dor 3/10 ou mais na semana repete a etapa mesmo com as 3 sessões feitas", async () => {
    const a = await onboard(beginner());
    await logWeek(a.cookie, MONDAY, 3, { pain: 3 });
    const w2Start = addDays(MONDAY, 7);
    onDate(w2Start);
    const w2 = await get(a.cookie, `/plan/week/${w2Start}`);
    expect(w2.body.plan).toMatchObject({ calendarWeek: 2, templateWeek: 1, ladderStage: "1" });
  });

  it("nenhuma sessão registrada: a semana é fechada como não feita, sem compensar", async () => {
    const a = await onboard(beginner());
    const w1 = await get(a.cookie, `/plan/week/${MONDAY}`);
    const w2Start = addDays(MONDAY, 7);
    onDate(w2Start);
    await get(a.cookie, `/day/${w2Start}`);
    const rows = await admin`select status from scheduled_workouts where user_id = ${a.userId} and athlete_plan_week_id =
      (select id from athlete_plan_weeks where user_id = ${a.userId} and calendar_week = 1)`;
    expect(rows).toHaveLength(w1.body.sessions.length);
    expect(rows.every((r) => r.status === "skipped")).toBe(true);
  });
});

describe("histórico", () => {
  it("sono, dor, carga semanal (sRPE × minutos) e aderência", async () => {
    const a = await onboard(intermediate());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const s = runs(week.body.sessions)[0] as Json;
    onDate(s.date);
    await send("PUT", a.cookie, `/checkins/${s.date}`, { sleepHours: 7, sleepQuality: 4 });
    await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
      completed: true, durationMinutes: 40, srpe: 5, pain: [{ region: "gluteo", intensity: 2 }],
    });
    onDate(addDays(MONDAY, 6));
    const h = await get(a.cookie, "/history?days=28");
    expect(h.status).toBe(200);
    expect(h.body.sleep).toEqual([{ date: s.date, hours: 7, quality: 4 }]);
    expect(h.body.pain).toEqual([{ date: s.date, region: "gluteo", intensity: 2, moment: "treino" }]);
    expect(h.body.weekly).toHaveLength(1);
    expect(h.body.weekly[0]).toMatchObject({ weekStart: MONDAY, completedSessions: 1, minutes: 40, srpeLoad: 200 });
    expect(h.body.weekly[0].adherencePct).toBeGreaterThan(0);
    expect(h.body.weekly[0].adherencePct).toBeLessThan(100);
  });
});

describe("detalhe do treino", () => {
  it("traz a sessão, o recorte do catálogo para o nível do atleta e as referências", async () => {
    const a = await onboard(intermediate());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const session = runs(week.body.sessions)[0] as Json;
    const res = await get(a.cookie, `/workouts/${session.id}`);
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(session.id);
    expect(res.body.session.slug).toBe(session.slug);
    expect(res.body.detail.summary).toEqual(expect.any(String));
    expect(res.body.detail.limits.length).toBeGreaterThan(0);
    expect(res.body.references.length).toBeGreaterThan(0);
    expect(res.body.references[0].citation).toEqual(expect.any(String));
    // texto do atleta: sem código de regra, [P], crase (nome técnico de treino), sigla ou "Autor 2007"
    expect(JSON.stringify(res.body.detail)).not.toMatch(TECHNICAL_MARKERS);
    // sem campos internos do banco
    expect(JSON.stringify(res.body)).not.toMatch(/user_?id|athlete_?plan/i);
  });

  it("a escada do iniciante vem pela sessão; a tabela inteira das 13 etapas não vai", async () => {
    const a = await onboard(beginner());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const session = runs(week.body.sessions)[0] as Json;
    expect(session.slug).toBe("caminhada-corrida");
    const res = await get(a.cookie, `/workouts/${session.id}`);
    expect(res.status).toBe(200);
    expect(res.body.session.ladder).toMatchObject({ etapa: "1", corridaMin: 1, caminhadaMin: 1, repeticoes: 10 });
    // a tabela das 13 etapas e as notas de auditoria da fonte não vão para o atleta
    const labels = res.body.detail.how.main.facts.map((f: Json) => f.label);
    // o "Como fazer" mostra só a sessão e o ritmo; a explicação das etapas fica em "Por que" e nos limites
    expect(labels).toEqual(["Onde você está", "Ritmo"]);
    expect(JSON.stringify(res.body)).not.toMatch(/ajusteP|etapas"|DEC-12/);
  });

  it("os 11 treinos do catálogo têm texto do atleta sem nenhum marcador técnico", async () => {
    const rows = await admin`select slug, structure->'atleta' as atleta from workouts where status = 'published'`;
    expect(rows.length).toBe(11);
    for (const r of rows) {
      const a = r.atleta as AthleteText | null;
      expect(a, r.slug).toBeTruthy();
      for (const text of athleteStrings(a!)) {
        expect(text, `${r.slug}: "${text}"`).not.toMatch(TECHNICAL_MARKERS);
        // zona só aparece com o nome do esforço: "esforço leve (Z1)"
        expect(text.replace(/(leve|moderado|forte) \(Z[123]\)/g, ""), `${r.slug}: "${text}"`).not.toMatch(/\bZ[123]\b/);
      }
    }
  });

  it("os 11 treinos têm o texto em inglês: mesma estrutura, sem marcador técnico nem português", async () => {
    const rows = await admin`select slug, structure->'atleta' as pt, structure->'atletaEn' as en from workouts where status = 'published'`;
    expect(rows.length).toBe(11);
    const LEFTOVER_PT = /\b(você|para|com|sem|treino|semana|esforço|corrida|caminhada|repetições|duração|minutos)\b/i;
    for (const r of rows) {
      const pt = athleteStrings(r.pt as AthleteText);
      const en = athleteStrings(r.en as AthleteText);
      expect(en.length, r.slug).toBe(pt.length);
      en.forEach((text, i) => {
        expect(text, `${r.slug}: "${text}"`).not.toMatch(TECHNICAL_MARKERS);
        expect(text, `${r.slug}: "${text}"`).not.toMatch(LEFTOVER_PT);
        // zona só aparece com o nome do esforço: "easy effort (Z1)"
        expect(text.replace(/(easy|moderate|hard) effort \(Z[123]\)/gi, ""), `${r.slug}: "${text}"`).not.toMatch(/\bZ[123]\b/);
        // igual ao português só quando não há o que traduzir (número, letra, nome do treino)
        if (text === pt[i]) expect(text, `${r.slug}: sem tradução: "${text}"`).toMatch(/^([\d\sA-Za-z.,%x-]{1,12})$/);
      });
    }
  });

  it("o idioma do app (Accept-Language) escolhe o texto do treino e a mensagem do dia", async () => {
    const a = await onboard(intermediate());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const session = runs(week.body.sessions)[0] as Json;
    const call = async (path: string, lang?: string) => {
      const res = await t.request("GET", path, undefined, a.cookie, lang ? { "accept-language": lang } : {});
      return (await res.json()) as Json;
    };

    const pt = await call(`/workouts/${session.id}`, "pt-BR");
    const en = await call(`/workouts/${session.id}`, "en");
    expect(pt.detail.summary).toMatch(/[ãçõ]|você|ritmo|corrida/i);
    expect(en.detail.summary).not.toEqual(pt.detail.summary);
    expect(en.detail.summary).not.toMatch(/[ãçõ]/);
    expect(Object.keys(en.detail)).toEqual(Object.keys(pt.detail));

    // sem o cabeçalho, vale o idioma da conta (pt-BR)
    const none = await call(`/workouts/${session.id}`);
    expect(none.detail.summary).toEqual(pt.detail.summary);

    // mensagem do dia: só uma, no idioma pedido, sem o campo auxiliar
    onDate(session.date);
    const dayPt = await call(`/day/${session.date}`, "pt-BR");
    const dayEn = await call(`/day/${session.date}`, "en-US,en;q=0.9");
    expect(dayPt.decision.messageEn).toBeUndefined();
    expect(dayEn.decision.messageEn).toBeUndefined();
    expect(dayPt.decision.message).toMatch(/treino|planejado|check-in/i);
    expect(dayEn.decision.message).toMatch(/workout|planned|check-in/i);
    expect(dayEn.decision.message).not.toMatch(/[ãçõ]|treino/);
    expect(dayEn.decision.action).toBe(dayPt.decision.action);
  });

  it("id inexistente ou que não é UUID: 404", async () => {
    const a = await onboard(intermediate());
    expect((await get(a.cookie, `/workouts/${crypto.randomUUID()}`)).status).toBe(404);
    expect((await get(a.cookie, "/workouts/nao-e-uuid")).status).toBe(404);
  });
});

describe("plano completo", () => {
  it("sem entrevista: 409; data inválida ou longe de hoje: 400", async () => {
    onDate(MONDAY);
    const novice = await signUpAndLogin(t);
    expect((await get(novice.cookie, `/plan/overview/${MONDAY}`)).status).toBe(409);
    const a = await onboard(intermediate());
    expect((await get(a.cookie, `/plan/overview/ontem`)).status).toBe(400);
    expect((await get(a.cookie, `/plan/overview/${addDays(MONDAY, 5)}`)).status).toBe(400);
  });

  it("semana atual com sessões; as seguintes só com o contorno do modelo, sem sessão inventada", async () => {
    const a = await onboard(intermediate());
    const ov = await get(a.cookie, `/plan/overview/${MONDAY}`);
    expect(ov.status).toBe(200);
    expect(ov.body.plan).toMatchObject({ template: "10k-intermediario", objective: "10k", level: "intermediario", startDate: MONDAY });
    expect(ov.body.currentWeek).toBe(1);
    const weeks = ov.body.weeks as Json[];
    expect(weeks).toHaveLength(ov.body.plan.durationWeeks);

    expect(weeks[0]).toMatchObject({ calendarWeek: 1, templateWeek: 1, state: "current", projected: false, startDate: MONDAY, endDate: addDays(MONDAY, 6) });
    expect(runs(weeks[0]!.sessions).length).toBeGreaterThanOrEqual(3);
    weeks.slice(1).forEach((w, i) => {
      expect(w, `semana ${i + 2}`).toMatchObject({
        calendarWeek: i + 2, templateWeek: i + 2, state: "upcoming", projected: true, startDate: addDays(MONDAY, 7 * (i + 1)), sessions: [],
      });
    });
    // o contorno vem do modelo: a última semana é a da prova e há semana de recuperação no meio
    expect(weeks.at(-1)!.isRaceWeek || weeks.at(-1)!.isTaper).toBe(true);
    expect(weeks.some((w) => w.isRecovery)).toBe(true);

    // consultar de novo não cria sessões nem semanas
    const [{ before }] = await admin`select count(*)::int as before from scheduled_workouts where user_id = ${a.userId}`;
    await get(a.cookie, `/plan/overview/${MONDAY}`);
    const [{ after }] = await admin`select count(*)::int as after from scheduled_workouts where user_id = ${a.userId}`;
    expect(after).toBe(before);
    const [{ nWeeks }] = await admin`select count(*)::int as "nWeeks" from athlete_plan_weeks where user_id = ${a.userId}`;
    expect(nWeeks).toBe(1);
  });

  it("semanas passadas trazem o que foi feito; a atual vira a semana corrente", async () => {
    const a = await onboard(intermediate());
    await advanceToWeek(a.cookie, 2);
    const ov = await get(a.cookie, `/plan/overview/${addDays(MONDAY, 14)}`);
    const weeks = ov.body.weeks as Json[];
    expect(ov.body.currentWeek).toBe(3);
    expect(weeks.slice(0, 2).map((w) => w.state)).toEqual(["past", "past"]);
    expect(weeks[2]).toMatchObject({ state: "current", projected: false });
    expect(weeks[3]).toMatchObject({ state: "upcoming", projected: true });
    for (const w of weeks.slice(0, 2)) {
      const main = runs(w.sessions);
      expect(main.length).toBeGreaterThan(0);
      expect(main.every((s) => s.status === "completed" && s.log?.completed === true)).toBe(true);
    }
  });

  it("escada: etapa repetida empurra a previsão em uma semana", async () => {
    const a = await onboard(beginner());
    const w1 = await get(a.cookie, `/plan/week/${MONDAY}`);
    for (const s of runs(w1.body.sessions).filter((x) => x.ladder)) {
      onDate(s.date);
      await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
        completed: true, durationMinutes: s.minutes, srpe: 3, pain: [{ region: "canela", intensity: 3, moment: "treino" }],
      });
    }
    const w2Start = addDays(MONDAY, 7);
    onDate(w2Start);
    const ov = await get(a.cookie, `/plan/overview/${w2Start}`);
    const weeks = ov.body.weeks as Json[];
    // semana 2 repete a etapa da 1; a previsão continua do modelo a partir daí
    expect(weeks[1]).toMatchObject({ calendarWeek: 2, templateWeek: 1, ladderStage: "1", state: "current", projected: false });
    expect(weeks[2]).toMatchObject({ calendarWeek: 3, templateWeek: 2, projected: true });
    expect(weeks).toHaveLength(ov.body.plan.durationWeeks + 1);
  });
});

describe("isolamento entre atletas (A tenta acessar B)", () => {
  it("B não vê, não registra e não consulta nada de A", async () => {
    const a = await onboard(intermediate());
    const b = await onboard(intermediate());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const aSession = runs(week.body.sessions)[0] as Json;
    onDate(aSession.date);
    await send("PUT", a.cookie, `/checkins/${aSession.date}`, { sleepHours: 3, sleepQuality: 1 });

    // B tenta registrar o treino de A: 404, e nada muda em A
    const log = await send("PUT", b.cookie, `/workouts/${aSession.id}/log`, { completed: true, durationMinutes: 30, srpe: 5 });
    expect(log.status).toBe(404);
    const [stillPending] = await admin`select status from scheduled_workouts where id = ${aSession.id}`;
    expect(stillPending!.status).toBe("pending");
    expect((await send("PUT", b.cookie, `/workouts/${crypto.randomUUID()}/log`, { completed: false })).status).toBe(404);
    // B tenta abrir o detalhe do treino de A: 404 (igual a um id que não existe)
    expect((await get(b.cookie, `/workouts/${aSession.id}`)).status).toBe(404);

    // O plano completo de B só tem sessões de B
    const overview = await get(b.cookie, `/plan/overview/${aSession.date}`);
    const ids = (overview.body.weeks as Json[]).flatMap((w) => (w.sessions as Json[]).map((s) => s.id));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain(aSession.id);

    // O dia e o histórico de B não contêm o check-in de A
    const day = await get(b.cookie, `/day/${aSession.date}`);
    expect(day.body.checkin).toBeNull();
    const hist = await get(b.cookie, "/history?days=14");
    expect(hist.body.sleep).toEqual([]);
    expect(hist.body.weekly.every((w: Json) => w.completedSessions === 0)).toBe(true);
  });

  it("sem sessão, tudo é 401", async () => {
    for (const [m, p] of [["GET", `/day/${MONDAY}`], ["GET", `/plan/week/${MONDAY}`], ["GET", `/plan/overview/${MONDAY}`], ["PUT", `/checkins/${MONDAY}`], ["POST", `/pain/${MONDAY}`], ["PUT", `/workouts/${crypto.randomUUID()}/log`], ["GET", `/workouts/${crypto.randomUUID()}`], ["PUT", "/profile/pause"], ["POST", "/profile/professional-clearance"], ["GET", "/history"]] as const) {
      const res = await t.request(m, p, m === "GET" ? undefined : {});
      expect(res.status, `${m} ${p}`).toBe(401);
    }
  });
});

describe("LGPD com dados de treino", () => {
  it("exporta tudo do atleta e a exclusão da conta apaga todas as tabelas de acompanhamento", async () => {
    const a = await onboard(intermediate());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const s = runs(week.body.sessions)[0] as Json;
    onDate(s.date);
    await send("PUT", a.cookie, `/checkins/${s.date}`, { sleepHours: 7, sleepQuality: 4 });
    await send("PUT", a.cookie, `/workouts/${s.id}/log`, {
      completed: true, durationMinutes: 30, srpe: 4, pain: [{ region: "joelho", intensity: 3 }],
    });

    const exp = await get(a.cookie, "/account/export");
    expect(exp.status).toBe(200);
    expect(exp.body.planWeeks.length).toBeGreaterThanOrEqual(1);
    expect(exp.body.scheduledWorkouts.length).toBe(week.body.sessions.length);
    expect(exp.body.workoutLogs).toHaveLength(1);
    expect(exp.body.dailyCheckins).toHaveLength(1);
    expect(exp.body.painReports).toHaveLength(1);
    expect(exp.body.engineDecisions.length).toBeGreaterThan(3);

    const del = await t.request("DELETE", "/auth/account", { password: "Corrida-longa-2026!" }, a.cookie);
    expect(del.status).toBe(204);
    const [left] = await admin`select
      (select count(*)::int from athlete_plans where user_id = ${a.userId}) as plans,
      (select count(*)::int from athlete_plan_weeks where user_id = ${a.userId}) as weeks,
      (select count(*)::int from scheduled_workouts where user_id = ${a.userId}) as scheduled,
      (select count(*)::int from workout_logs where user_id = ${a.userId}) as logs,
      (select count(*)::int from daily_checkins where user_id = ${a.userId}) as checkins,
      (select count(*)::int from pain_reports where user_id = ${a.userId}) as pain,
      (select count(*)::int from engine_decisions where user_id = ${a.userId}) as decisions,
      (select count(*)::int from health_screenings where user_id = ${a.userId}) as screenings`;
    expect(left).toEqual({ plans: 0, weeks: 0, scheduled: 0, logs: 0, checkins: 0, pain: 0, decisions: 0, screenings: 0 });
  });
});

/** Iniciante (menos de 12 meses) que já corre: quanto consegue correr sem parar muda a etapa de entrada. */
const runner = (canRunContinuousMinutes: number, over: Record<string, unknown> = {}) => ({
  ...intermediate(),
  historico: {
    monthsRegular: 3, weeklySessions: 3, weeklyVolume: { unit: "km", value: 25 }, longestRecentKm: 5,
    canRunContinuousMinutes, daysSinceLastRun: 2, halfMarathonLast3m: false, regularExercise3m: true,
  },
  objetivo: { goal: "primeira_prova", raceDistance: "5k" },
  disponibilidade: { daysPerWeek: 3, minutesPerSession: 60, longRunDay: 7 },
  ...over,
});

describe("posicionamento na escada (R-PLN-21)", () => {
  it("quem corre 20 min sem parar entra na etapa 10, com 4 semanas pela frente", async () => {
    const a = await onboard(runner(20));
    const profile = await get(a.cookie, "/profile");
    expect(profile.body.profile.plan).toMatchObject({ template: "5k-iniciante", durationWeeks: 4, startTemplateWeek: 10 });
    expect(profile.body.profile.plan.selection.placement).toMatchObject({ etapa: "10", reason: "declarado" });

    const day = await get(a.cookie, `/day/${MONDAY}`);
    expect(day.body.plan).toMatchObject({ calendarWeek: 1, templateWeek: 10 });
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const ladder = week.body.sessions.filter((s: Json) => s.ladder);
    expect(ladder).toHaveLength(3);
    expect(new Set(ladder.map((s: Json) => s.ladder.etapa))).toEqual(new Set(["10"]));

    const ov = await get(a.cookie, `/plan/overview/${MONDAY}`);
    const weeks = ov.body.weeks as Json[];
    expect(ov.body.plan.durationWeeks).toBe(4);
    expect(weeks.map((w) => [w.calendarWeek, w.templateWeek, w.ladderStage])).toEqual([
      [1, 10, "10"],
      [2, 11, "10b"],
      [3, 12, "11"],
      [4, 13, "12"],
    ]);
    expect(new Date(`${ov.body.plan.endDate}T00:00:00Z`).getTime() - new Date(`${MONDAY}T00:00:00Z`).getTime()).toBe(4 * 7 * 86_400_000);
  });

  it("quem corre 40 min ou mais entra na etapa 11 e o plano termina na etapa 12", async () => {
    const a = await onboard(runner(45));
    const ov = await get(a.cookie, `/plan/overview/${MONDAY}`);
    expect((ov.body.weeks as Json[]).map((w) => w.ladderStage)).toEqual(["11", "12"]);
    // as 2 semanas concluídas fecham o plano
    await advanceToWeek(a.cookie, 2);
    const profile = await get(a.cookie, "/profile");
    const [row] = await admin`select status from athlete_plans where user_id = ${a.userId} and status = 'completed'`;
    expect(profile.status).toBe(200);
    expect(row?.status).toBe("completed");
  });

  it("o volume semanal que o atleta faz limita a entrada: poucos km por semana não vão direto à etapa 10", async () => {
    const low = runner(20, {
      historico: {
        monthsRegular: 3, weeklySessions: 2, weeklyVolume: { unit: "km", value: 8 }, longestRecentKm: 5,
        canRunContinuousMinutes: 20, daysSinceLastRun: 2, halfMarathonLast3m: false, regularExercise3m: true,
      },
    });
    const a = await onboard(low);
    const plan = (await get(a.cookie, "/profile")).body.profile.plan;
    expect(plan.selection.placement.reason).toBe("teto_de_volume");
    expect(plan.startTemplateWeek).toBeLessThan(10);
    // e o dia a dia concorda com o plano: seguir à risca não gera ajuste
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    for (const s of runs(week.body.sessions)) {
      onDate(s.date);
      const ci = await send("PUT", a.cookie, `/checkins/${s.date}`, { sleepHours: 8, sleepQuality: 5, energy: 4, mood: 4, stress: 4, muscleSoreness: 4 });
      expect(ci.body.decision.session, s.date).toMatchObject({ minutes: s.minutes, changed: false });
    }
  });

  it("menos de 10 min, IMC 30 ou mais e cautela de lesão ficam na etapa 1", async () => {
    const few = await onboard(runner(5));
    expect((await get(few.cookie, "/profile")).body.profile.plan).toMatchObject({ durationWeeks: 13, startTemplateWeek: 1 });

    const heavy = await onboard(runner(30, { basicos: { birthMonth: 1, birthYear, sex: "F", heightCm: 165, weightKg: 100 } }));
    const heavyPlan = (await get(heavy.cookie, "/profile")).body.profile.plan;
    expect(heavyPlan).toMatchObject({ durationWeeks: 13, startTemplateWeek: 1 });
    expect(heavyPlan.selection.placement).toMatchObject({ etapa: "1", reason: "imc" });

    const injured = await onboard(
      runner(30, { lesoes: { injury12m: true, runningInjuryLast3m: true, injuryOrPersistentPainLast6w: false, currentPain: { intensity: 0 } } }),
    );
    const injuredPlan = (await get(injured.cookie, "/profile")).body.profile.plan;
    expect(injuredPlan).toMatchObject({ startTemplateWeek: 1 });
    expect(injuredPlan.selection.placement).toMatchObject({ etapa: "1", reason: "cautela_lesao" });
  });

  it("o atleta B não vê o plano posicionado do atleta A", async () => {
    const a = await onboard(runner(30));
    const b = await onboard(runner(5));
    const planA = (await get(a.cookie, "/profile")).body.profile.plan;
    const planB = (await get(b.cookie, "/profile")).body.profile.plan;
    expect(planA.id).not.toBe(planB.id);
    expect(planA.startTemplateWeek).toBe(11);
    expect(planB.startTemplateWeek).toBe(1);
  });
});

describe("detalhe da sessão da escada: Como fazer com os números da sessão", () => {
  it("do zero, etapa 1: frases simples em português e em inglês (Accept-Language)", async () => {
    const a = await onboard(beginner());
    const week = await get(a.cookie, `/plan/week/${MONDAY}`);
    const first = runs(week.body.sessions).find((s) => s.ladder) as Json;
    const pt = await get(a.cookie, `/workouts/${first.id}`);
    expect(pt.status).toBe(200);
    expect(pt.body.detail.how.warmup.text).toBe("Caminhe 5 minutos em passo rápido, para o corpo esquentar.");
    expect(pt.body.detail.how.main.text).toBe("Corra 1 minuto e depois caminhe 1 minuto. Faça isso 10 vezes ao todo.");
    expect(pt.body.detail.how.main.facts[0]).toEqual({ label: "Onde você está", value: "Sessão 1 de 3 da etapa 1." });
    expect(JSON.stringify(pt.body.detail.how)).not.toMatch(/N x|Buist|10b/);

    const res = await t.request("GET", `/workouts/${first.id}`, undefined, a.cookie, { "accept-language": "en" });
    const en = (await res.json()) as Json;
    expect(en.detail.how.main.text).toBe("Run for 1 minute and then walk for 1 minute. Do this 10 times in total.");
  });
});
