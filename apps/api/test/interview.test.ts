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

  it("registra a versão do PAR-Q+ conforme o texto que a pessoa leu (brasileiro ou original em inglês)", async () => {
    const pt = await signUpAndLogin(t);
    await fill(pt.cookie, interview());
    expect((await submit(pt.cookie)).status).toBe(201);

    const en = await signUpAndLogin(t);
    const iv = interview();
    await fill(en.cookie, { ...iv, triagem: { ...iv.triagem, textLang: "en" } });
    expect((await submit(en.cookie)).status).toBe(201);

    const [a] = await admin`select instrument_version from health_screenings where user_id = ${pt.userId}`;
    const [b] = await admin`select instrument_version from health_screenings where user_id = ${en.userId}`;
    expect(a!.instrument_version).toBe("pt-BR 2023");
    expect(b!.instrument_version).toBe("en 2025");
  });

  it("idioma do texto do PAR-Q+ fora da lista é recusado", async () => {
    const a = await signUpAndLogin(t);
    const res = await t.request("PUT", "/interview/triagem", { general: allNo, pregnant: false, textLang: "fr" }, a.cookie);
    expect(res.status).toBe(400);
  });

  it("salvar e continuar depois; envio incompleto lista o que falta", async () => {
    const a = await signUpAndLogin(t);
    const iv = interview();
    await fill(a.cookie, { basicos: iv.basicos, historico: iv.historico });
    const draft = await (await t.request("GET", "/interview", undefined, a.cookie)).json();
    expect(draft.completed).toEqual(["basicos", "historico"]);
    expect(draft.responses.basicos.heightCm).toBe(165);
    expect(draft.parq).toMatchObject({ name: "PAR-Q+", textAvailable: true });

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
    const err = (await res.json()).error;
    expect(err.code).toBe("UNDERAGE");
    expect(err.details).toEqual({ canDeleteAccount: true });
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

describe("prova perto demais (R-PLN-05)", () => {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  it("sem plano por falta de prazo: o perfil explica quantas semanas faltam e que data ou distância cabem", async () => {
    const a = await signUpAndLogin(t);
    const iv: Iv = interview();
    await fill(a.cookie, { ...iv, objetivo: { goal: "primeira_prova", raceDistance: "21k", raceDate: inDays(14) } });
    const { status, body } = await submit(a.cookie);
    expect(status).toBe(201);
    expect(body.planSelection).toMatchObject({ status: "prazo_insuficiente", objective: "21k" });
    expect(body.profile.plan).toBeNull();

    // A mesma explicação volta em GET /profile (é o que o painel e o resultado leem).
    const res = await t.request("GET", "/profile", undefined, a.cookie);
    const { profile } = (await res.json()) as { profile: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(profile.plan).toBeNull();
    expect(profile.screening).toMatchObject({ state: "LIBERADO", allowsTraining: true });
    expect(profile.planNotice).toMatchObject({ reason: "prazo_insuficiente", objective: "21k" });
    expect(profile.planNotice.weeksNeeded).toBeGreaterThan(profile.planNotice.weeksAvailable);
    expect(profile.planNotice.weeksAvailable).toBe(2);
    expect(profile.planNotice.earliestRaceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(profile.planNotice.smallerThatFit)).toBe(true);
  });

  it("com plano atribuído não há aviso", async () => {
    const a = await signUpAndLogin(t);
    await fill(a.cookie, interview());
    await submit(a.cookie);
    const res = await t.request("GET", "/profile", undefined, a.cookie);
    const { profile } = (await res.json()) as { profile: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(profile.plan).not.toBeNull();
    expect(profile.planNotice).toBeNull();
  });

  it("sem plano por outro motivo (dor atual) não mostra o aviso de prazo", async () => {
    const a = await signUpAndLogin(t);
    const iv: Iv = interview();
    await fill(a.cookie, { ...iv, lesoes: { ...iv.lesoes, currentPain: { intensity: 4, bodyPart: "joelho" } } });
    await submit(a.cookie);
    const res = await t.request("GET", "/profile", undefined, a.cookie);
    const { profile } = (await res.json()) as { profile: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(profile.plan).toBeNull();
    expect(profile.planNotice).toBeNull();
  });
});

describe("mudança de saúde (R-TRI-11)", () => {
  const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const post = async (cookie: string, body: unknown) => {
    const res = await t.request("POST", "/profile/screening/health-change", body, cookie);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- corpo de resposta inspecionado livremente no teste
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
  const profileOf = async (cookie: string) => (await (await t.request("GET", "/profile", undefined, cookie)).json()).profile;
  const TODAY = "2026-10-05";
  afterAll(() => t.setNow(null));

  async function onboard() {
    t.setNow(new Date(`${TODAY}T12:00:00Z`));
    const a = await signUpAndLogin(t, undefined, true);
    await fill(a.cookie, interview());
    expect((await submit(a.cookie)).status).toBe(201);
    return a;
  }

  it("a pergunta volta a cada 7 dias; responder \"não\" a adia por mais 7", async () => {
    const a = await onboard();
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(false);

    t.setNow(new Date(`${addDays(TODAY, 6)}T12:00:00Z`));
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(false);
    t.setNow(new Date(`${addDays(TODAY, 7)}T12:00:00Z`));
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(true);

    const no = await post(a.cookie, { changed: false, date: addDays(TODAY, 7) });
    expect(no.status).toBe(200);
    expect(no.body.screening).toMatchObject({ state: "LIBERADO", reasons: [] });
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(false);
    t.setNow(new Date(`${addDays(TODAY, 13)}T12:00:00Z`));
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(false);
    t.setNow(new Date(`${addDays(TODAY, 14)}T12:00:00Z`));
    expect((await profileOf(a.cookie)).screening.healthCheckDue).toBe(true);
  });

  it("\"sim\" expira a triagem, trava o dia e a pergunta deixa de aparecer; refazer a entrevista libera", async () => {
    const a = await onboard();
    const day = addDays(TODAY, 3);
    t.setNow(new Date(`${day}T12:00:00Z`));
    const yes = await post(a.cookie, { changed: true, date: day });
    expect(yes.status).toBe(200);
    expect(yes.body.screening).toMatchObject({ state: "EXPIRADO", maxIntensity: "nenhuma", reasons: ["saude_mudou"] });

    const profile = await profileOf(a.cookie);
    expect(profile.screening).toMatchObject({ state: "EXPIRADO", allowsTraining: false, healthCheckDue: false });
    // o motor trava o dia por causa da triagem vencida
    const today = await (await t.request("GET", `/day/${day}`, undefined, a.cookie)).json();
    expect(today.decision.reasons.map((r: { code: string }) => r.code)).toContain("triagem_expirada");

    const [row] = await admin`select health_changed_on::text as changed, health_confirmed_on::text as confirmed, state from health_screenings where user_id = ${a.userId}`;
    expect(row).toMatchObject({ changed: day, confirmed: day, state: "EXPIRADO" });
    const rules = await admin`select applied_rule from engine_decisions where user_id = ${a.userId} and applied_rule = 'TRI-v1'`;
    expect(rules.length).toBeGreaterThanOrEqual(2); // entrevista + mudança de saúde

    // um "não" depois não desfaz o "sim"
    expect((await post(a.cookie, { changed: false, date: day })).body.screening.state).toBe("EXPIRADO");

    // refazer a entrevista é o caminho para voltar
    await fill(a.cookie, interview());
    expect((await submit(a.cookie)).status).toBe(201);
    expect((await profileOf(a.cookie)).screening).toMatchObject({ state: "LIBERADO", allowsTraining: true });
  });

  it("data no futuro e corpo fora do formato: 400; sem entrevista: 404; sem sessão: 401", async () => {
    const a = await onboard();
    expect((await post(a.cookie, { changed: true, date: "2999-01-01" })).status).toBe(400);
    expect((await post(a.cookie, { changed: "sim", date: TODAY })).status).toBe(400);
    expect((await post(a.cookie, { changed: true, date: TODAY, userId: "x" })).status).toBe(400);
    const stranger = await signUpAndLogin(t);
    expect((await post(stranger.cookie, { changed: true, date: TODAY })).status).toBe(404);
    expect((await t.request("POST", "/profile/screening/health-change", { changed: true, date: TODAY })).status).toBe(401);
  });

  it("B não altera a triagem de A", async () => {
    const a = await onboard();
    const b = await onboard();
    expect((await post(b.cookie, { changed: true, date: TODAY })).body.screening.state).toBe("EXPIRADO");
    const [rowA] = await admin`select health_changed_on, state from health_screenings where user_id = ${a.userId}`;
    expect(rowA).toMatchObject({ health_changed_on: null, state: "LIBERADO" });
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
