import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, makeApp, signUpAndLogin, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

const year = new Date().getUTCFullYear();
const allNo = { "1": false, "2": false, "3": false, "4": false, "5": false, "6": false, "7": false };
const followUpAllNo = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { has: false, answers: {} }]));

/** Entrevista de um intermediário que quer correr 10 km (caso 4 de 01-classificacao.md). */
const interview = () => ({
  basicos: { birthMonth: 1, birthYear: year - 30, sex: "F", heightCm: 165, weightKg: 60 },
  triagem: { general: allNo, pregnant: false },
  historico: {
    monthsRegular: 24,
    weeklySessions: 3,
    weeklyVolume: { unit: "km", value: 25 },
    longestRecentKm: 12,
    canRunContinuousMinutes: 60,
    daysSinceLastRun: 2,
    halfMarathonLast3m: false,
    regularExercise3m: true,
  },
  lesoes: { injury12m: false, runningInjuryLast3m: false, injuryOrPersistentPainLast6w: false, currentPain: { intensity: 0 } },
  objetivo: { goal: "primeira_prova", raceDistance: "10k" },
  disponibilidade: { daysPerWeek: 4, minutesPerSession: 60, longRunDay: 7 },
  recuperacao: { sleepHours: 7.5, stress: 2, workType: "sedentario", otherSportsMinutesPerWeek: 0, strengthTraining: true },
  recursos: { hrDevice: "relogio", track: false, treadmill: true, terrain: ["plano"] },
});

type Iv = ReturnType<typeof interview>;

async function fill(cookie: string, iv: Record<string, unknown>) {
  for (const [step, data] of Object.entries(iv)) {
    const res = await t.request("PUT", `/interview/${step}`, data, cookie);
    if (res.status !== 204) throw new Error(`${step}: ${res.status} ${await res.text()}`);
  }
}

async function submit(cookie: string) {
  const res = await t.request("POST", "/interview/submit", {}, cookie);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- corpo de resposta inspecionado livremente no teste
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

describe("entrevista", () => {
  it("fluxo completo: triagem liberada, intermediário, plano de 10 km de 10 semanas", async () => {
    const a = await signUpAndLogin(t);
    await fill(a.cookie, interview());
    const { status, body } = await submit(a.cookie);
    expect(status).toBe(201);
    expect(body.profile).toMatchObject({
      level: "intermediario",
      ruleVersion: "CLS-v1",
      screening: { state: "LIBERADO", maxIntensity: "livre", allowsTraining: true },
      plan: { template: "10k-intermediario", durationWeeks: 10, baseWeeks: 0 },
    });
    expect(body.profile.explanation.text).toContain("**intermediário**");
    expect(body.profile.explanation.sources).toEqual(["Honert 2020"]);

    // Auditoria: triagem, classificação e plano (R-CLS-14).
    const rules = await admin`select applied_rule from engine_decisions where user_id = ${a.userId} order by created_at`;
    expect(rules.map((r) => r.applied_rule).sort()).toEqual(["CLS-v1", "PLN-v1", "TRI-v1"]);

    // R-TRI-15: respostas do PAR-Q+ só em health_screenings, não no histórico da entrevista.
    const [ir] = await admin`select responses, status from interview_responses where user_id = ${a.userId}`;
    expect(ir!.status).toBe("submitted");
    expect(ir!.responses.triagem).toEqual({ screeningId: expect.any(String) });
  });

  it("salvar e continuar depois; envio incompleto lista o que falta", async () => {
    const a = await signUpAndLogin(t);
    const iv = interview();
    await fill(a.cookie, { basicos: iv.basicos, historico: iv.historico });
    const draft = await (await t.request("GET", "/interview", undefined, a.cookie)).json();
    expect(draft.completed).toEqual(["basicos", "historico"]);
    expect(draft.responses.basicos.heightCm).toBe(165);
    expect(draft.parq).toMatchObject({ name: "PAR-Q+", textAvailable: false });

    // Reenviar uma etapa substitui só ela.
    await fill(a.cookie, { basicos: { ...iv.basicos, heightCm: 170 } });
    const again = await (await t.request("GET", "/interview", undefined, a.cookie)).json();
    expect(again.responses.basicos.heightCm).toBe(170);
    expect(again.responses.historico.weeklySessions).toBe(3);

    const { status, body } = await submit(a.cookie);
    expect(status).toBe(400);
    expect(body.error.code).toBe("INTERVIEW_INCOMPLETE");
    expect(body.error.details.map((d: { path: string }) => d.path)).toEqual(["triagem", "lesoes", "objetivo", "disponibilidade", "recuperacao", "recursos"]);
  });

  it("etapa inexistente: 404; dados inválidos: 400", async () => {
    const a = await signUpAndLogin(t);
    expect((await t.request("PUT", "/interview/nao-existe", {}, a.cookie)).status).toBe(404);
    expect((await t.request("PUT", "/interview/basicos", { birthMonth: 13 }, a.cookie)).status).toBe(400);
  });

  it("menor de 18 anos é recusado (mês e ano, conservador)", async () => {
    const a = await signUpAndLogin(t);
    const now = new Date();
    const res = await t.request("PUT", "/interview/basicos", { ...interview().basicos, birthYear: now.getUTCFullYear() - 18, birthMonth: now.getUTCMonth() + 1 }, a.cookie);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("UNDERAGE");
  });

  it("SIM nas perguntas gerais exige o seguimento das 10 seções", async () => {
    const a = await signUpAndLogin(t);
    const res = await t.request("PUT", "/interview/triagem", { general: { ...allNo, "1": true }, pregnant: false }, a.cookie);
    expect(res.status).toBe(400);
    const partial = await t.request("PUT", "/interview/triagem", { general: { ...allNo, "1": true }, followUp: { "4": { has: true, answers: { "4a": false } } }, pregnant: false }, a.cookie);
    expect(partial.status).toBe(400);
  });
});

describe("triagem com risco (R-TRI-04, R-TRI-05, R-TRI-06)", () => {
  it("bloqueia o plano até a autodeclaração; depois libera só Z1", async () => {
    const a = await signUpAndLogin(t);
    const iv: Iv = interview();
    await fill(a.cookie, { ...iv, triagem: { general: { ...allNo, "2": true }, followUp: followUpAllNo, pregnant: false } });
    const { body } = await submit(a.cookie);
    expect(body.profile.screening).toMatchObject({ state: "AVALIACAO_NECESSARIA", allowsTraining: false, reasons: ["sintoma_geral"] });
    expect(body.profile.plan).toBeNull();
    expect(body.planSelection).toMatchObject({ status: "bloqueado", reason: "triagem" });

    const today = new Date().toISOString().slice(0, 10);
    const restricted = await t.request("POST", "/profile/screening/evaluation", { result: "com_restricoes", date: today, source: "medico" }, a.cookie);
    expect((await restricted.json()).screening.state).toBe("AVALIACAO_NECESSARIA");

    const cleared = await t.request("POST", "/profile/screening/evaluation", { result: "sem_restricoes", date: today, source: "medico" }, a.cookie);
    expect(cleared.status).toBe(200);
    const profile = (await (await t.request("GET", "/profile", undefined, a.cookie)).json()).profile;
    expect(profile.screening).toMatchObject({ state: "LIBERADO_APOS_AVALIACAO", maxIntensity: "leve_moderada", allowsTraining: true });
    expect(profile.plan).toMatchObject({ template: "10k-intermediario" });

    // Já liberado: nova declaração não se aplica.
    expect((await t.request("POST", "/profile/screening/evaluation", { result: "sem_restricoes", date: today, source: "medico" }, a.cookie)).status).toBe(409);
  });

  it("data de avaliação no futuro é recusada", async () => {
    const a = await signUpAndLogin(t);
    const res = await t.request("POST", "/profile/screening/evaluation", { result: "sem_restricoes", date: "2999-01-01", source: "medico" }, a.cookie);
    expect(res.status).toBe(400);
  });

  it("R-TRI-07: 45+ sem exercício regular fica em Z1 até registrar consulta", async () => {
    const a = await signUpAndLogin(t);
    const iv: Iv = interview();
    await fill(a.cookie, {
      ...iv,
      basicos: { ...iv.basicos, birthYear: year - 50 },
      historico: { ...iv.historico, regularExercise3m: false },
    });
    const { body } = await submit(a.cookie);
    expect(body.profile.screening).toMatchObject({ state: "LIBERADO", maxIntensity: "leve_moderada" });
    const today = new Date().toISOString().slice(0, 10);
    const res = await t.request("POST", "/profile/screening/professional-consulted", { date: today }, a.cookie);
    expect((await res.json()).screening.maxIntensity).toBe("livre");
  });

  it("R-PLN-02: dor atual ≥ 3/10 não recebe plano", async () => {
    const a = await signUpAndLogin(t);
    const iv: Iv = interview();
    await fill(a.cookie, { ...iv, lesoes: { ...iv.lesoes, currentPain: { intensity: 4, bodyPart: "joelho" } } });
    const { body } = await submit(a.cookie);
    expect(body.planSelection).toMatchObject({ status: "bloqueado", reason: "dor_atual" });
    expect(body.profile.plan).toBeNull();
  });
});

describe("A tenta acessar os dados de B", () => {
  it("perfil, rascunho e triagem de B ficam invisíveis para A", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    await fill(b.cookie, { ...interview(), triagem: { general: { ...allNo, "3": true }, followUp: followUpAllNo, pregnant: false } });
    await submit(b.cookie);

    expect((await t.request("GET", "/profile", undefined, a.cookie)).status).toBe(404);
    const draftA = await (await t.request("GET", "/interview", undefined, a.cookie)).json();
    expect(draftA.completed).toEqual([]);

    // A não declara avaliação na triagem de B: 404 (A não tem triagem).
    const today = new Date().toISOString().slice(0, 10);
    expect((await t.request("POST", "/profile/screening/evaluation", { result: "sem_restricoes", date: today, source: "medico" }, a.cookie)).status).toBe(404);
    const [bRow] = await admin`select state from health_screenings where user_id = ${b.userId}`;
    expect(bRow!.state).toBe("AVALIACAO_NECESSARIA");

    // Sem sessão: 401 em todas.
    for (const [m, p] of [["GET", "/profile"], ["GET", "/interview"], ["POST", "/interview/submit"]] as const) {
      expect((await t.request(m, p, m === "POST" ? {} : undefined)).status).toBe(401);
    }
  });
});
