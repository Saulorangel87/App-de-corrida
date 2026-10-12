import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
const STEPS = ["basicos", "triagem", "historico", "lesoes", "objetivo", "disponibilidade", "recuperacao", "recursos"];

type Call = { method: string; path: string; body: unknown };
type Opts = {
  responses?: Record<string, unknown>;
  completed?: string[];
  putStatus?: Record<string, { status: number; body: unknown }>;
  profile?: { status: number; body: unknown };
  signedIn?: boolean;
};

const profileOk = {
  profile: {
    level: "iniciante",
    flags: [],
    ruleVersion: "CLS-v1",
    explanation: { text: "Seu nível foi calculado como **Iniciante** porque você corre há poucos meses. Esta classificação é uma estimativa conservadora.", sources: [] },
    nextEvaluationDate: "2027-01-10",
    screening: { state: "LIBERADO", maxIntensity: "livre", validUntil: "2027-10-10", expiresSoon: false, reasons: [], allowsTraining: true },
    plan: {
      id: "p1",
      template: "5k-iniciante",
      objective: "5k",
      level: "iniciante",
      durationWeeks: 8,
      baseWeeks: 2,
      startDate: "2026-10-12",
      endDate: "2026-12-20",
      selection: { placement: { etapa: "10", reason: "declarado" } },
    },
  },
};

/** Simula a API do atleta logado; devolve a lista de chamadas para conferir o que foi enviado. */
async function mockApi(page: Page, opts: Opts = {}) {
  const calls: Call[] = [];
  const responses = { ...(opts.responses ?? {}) };
  const completed = [...(opts.completed ?? [])];
  let submitted = false;
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ method: req.method(), path, body });
    const json = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data ?? {}) });

    if (path === "/auth/me") {
      return opts.signedIn === false
        ? json(401, { error: { code: "UNAUTHORIZED", message: "x" } })
        : json(200, { user });
    }
    if (path === "/interview" && req.method() === "GET") {
      return json(200, { version: "ENT-v1", steps: STEPS, completed, responses, updatedAt: null, parq: { name: "PAR-Q+" } });
    }
    if (path.startsWith("/interview/") && req.method() === "PUT") {
      const step = path.split("/")[2]!;
      const forced = opts.putStatus?.[step];
      if (forced) return json(forced.status, forced.body);
      responses[step] = body;
      if (!completed.includes(step)) completed.push(step);
      return route.fulfill({ status: 204 });
    }
    if (path === "/interview/submit") {
      submitted = true;
      return json(201, { profile: profileOk.profile, planSelection: { status: "atribuido" } });
    }
    if (path === "/profile") {
      if (opts.profile) return json(opts.profile.status, opts.profile.body);
      return submitted ? json(200, profileOk) : json(404, { error: { code: "NOT_FOUND", message: "x" } });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

const putBody = (calls: Call[], step: string) => calls.find((c) => c.method === "PUT" && c.path === `/interview/${step}`)?.body;
const puts = (calls: Call[]) => calls.filter((c) => c.method === "PUT").map((c) => c.path.split("/")[2]);

async function answer(page: Page, group: RegExp | string, option: string, which: "first" | "last" = "first") {
  const groups = page.getByRole("group", { name: group });
  await (which === "first" ? groups.first() : groups.last()).getByText(option, { exact: true }).click();
}
const next = (page: Page) => page.getByRole("button", { name: "Continuar" }).click();

async function fillBasics(page: Page, sex: "Feminino" | "Masculino" = "Feminino") {
  await page.getByLabel("Mês de nascimento").selectOption("5");
  await page.getByLabel("Ano de nascimento").fill("1990");
  await answer(page, "Sexo", sex);
  await page.getByLabel("Altura (cm)").fill("170");
  await page.getByLabel("Peso (kg) — opcional").fill("68,5");
  await next(page);
}

async function allNoScreening(page: Page, withPregnancy = true) {
  for (let q = 1; q <= 7; q++) await answer(page, new RegExp(`^${q}\\. `), "Não");
  if (withPregnancy) await answer(page, "Você está grávida neste momento?", "Não");
  await next(page);
}

test("entrevista completa: 8 etapas, cada uma salva, e o envio leva ao resultado", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrevista");

  await expect(page.getByRole("heading", { name: "Vamos começar por você" })).toBeVisible();
  await expect(page.getByText("Etapa 1 de 8")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Progresso da entrevista" })).toHaveAttribute("aria-valuenow", "1");
  await fillBasics(page);
  expect(putBody(calls, "basicos")).toEqual({ birthMonth: 5, birthYear: 1990, sex: "F", heightCm: 170, weightKg: 68.5 });

  await expect(page.getByRole("heading", { name: "Triagem de saúde" })).toBeVisible();
  await expect(page.getByText("Etapa 2 de 8")).toBeVisible();
  await allNoScreening(page);
  expect(putBody(calls, "triagem")).toEqual({
    general: { "1": false, "2": false, "3": false, "4": false, "5": false, "6": false, "7": false },
    pregnant: false,
    textLang: "pt-BR",
  });

  await expect(page.getByRole("heading", { name: "Sua corrida até agora" })).toBeVisible();
  await page.getByLabel(/Há quantos meses você corre/).fill("6");
  await page.getByLabel(/Quantas vezes por semana você correu/).fill("2,5");
  await page.getByLabel(/Volume semanal médio \(km\)/).fill("12");
  await page.getByLabel(/Maior distância que você correu/).fill("5");
  await page.getByLabel(/Por quantos minutos você consegue correr/).fill("20");
  await page.getByLabel(/Há quantos dias foi a sua última corrida/).fill("2");
  await answer(page, /meia maratona/, "Não");
  await answer(page, /exercício planejado/, "Sim");
  await page.getByLabel("Minutos", { exact: true }).first().fill("28");
  await page.getByLabel("Segundos", { exact: true }).first().fill("30");
  await page.getByLabel("Data", { exact: true }).first().fill("2026-09-20");
  await next(page);
  expect(putBody(calls, "historico")).toEqual({
    monthsRegular: 6,
    weeklySessions: 2.5,
    weeklyVolume: { unit: "km", value: 12 },
    longestRecentKm: 5,
    canRunContinuousMinutes: 20,
    t5k: { seconds: 28 * 60 + 30, date: "2026-09-20" },
    daysSinceLastRun: 2,
    halfMarathonLast3m: false,
    regularExercise3m: true,
  });

  await expect(page.getByRole("heading", { name: "Lesões e dores" })).toBeVisible();
  await answer(page, /alguma lesão nos últimos 12 meses/, "Não");
  await answer(page, /causada pela corrida/, "Não");
  await answer(page, /persistente nas últimas 6 semanas/, "Não");
  await answer(page, /intensidade da dor/, "0");
  await expect(page.getByLabel("Onde dói? (opcional)")).toHaveCount(0);
  await next(page);
  expect(putBody(calls, "lesoes")).toEqual({
    injury12m: false,
    runningInjuryLast3m: false,
    injuryOrPersistentPainLast6w: false,
    currentPain: { intensity: 0 },
  });

  await expect(page.getByRole("heading", { name: "Seu objetivo" })).toBeVisible();
  // "Melhorar meu tempo" pede a distância, mas não fala em prova marcada: a data é só opcional.
  await answer(page, "Qual é o seu objetivo?", "Melhorar meu tempo");
  await expect(page.getByText("Em qual distância você quer melhorar seu tempo?")).toBeVisible();
  await expect(page.getByLabel("Tem uma prova marcada? Informe a data (opcional)")).toBeVisible();
  await expect(page.getByText("Se não tiver, deixe em branco.")).toBeVisible();
  await expect(page.getByText("Qual a distância da prova?")).toHaveCount(0);
  await answer(page, "Qual é o seu objetivo?", "Minha primeira prova");
  await expect(page.getByText("Em qual distância você quer melhorar seu tempo?")).toHaveCount(0);
  await answer(page, "Qual a distância da prova?", "5 km");
  await page.getByLabel("Data da prova (opcional)").fill("2027-02-14");
  await next(page);
  expect(putBody(calls, "objetivo")).toEqual({ goal: "primeira_prova", raceDistance: "5k", raceDate: "2027-02-14" });

  await expect(page.getByRole("heading", { name: "Sua disponibilidade" })).toBeVisible();
  await answer(page, /Em quantos dias por semana/, "3");
  await page.getByLabel(/Quanto tempo você tem por treino/).fill("45");
  await page.getByLabel(/Qual dia é melhor/).selectOption("7");
  await next(page);
  expect(putBody(calls, "disponibilidade")).toEqual({ daysPerWeek: 3, minutesPerSession: 45, longRunDay: 7 });

  await expect(page.getByRole("heading", { name: "Recuperação e rotina" })).toBeVisible();
  await page.getByLabel(/Quantas horas você dorme/).fill("7,5");
  await answer(page, /nível de estresse/, "Médio");
  await answer(page, "Como é o seu trabalho?", "Misto (em pé e sentado)");
  await page.getByLabel(/Quantos minutos por semana você faz outros esportes/).fill("0");
  await answer(page, /treino de força/, "Não");
  await next(page);
  expect(putBody(calls, "recuperacao")).toEqual({
    sleepHours: 7.5,
    stress: 3,
    workType: "misto",
    otherSportsMinutesPerWeek: 0,
    strengthTraining: false,
  });

  await expect(page.getByRole("heading", { name: "O que você tem à mão" })).toBeVisible();
  await expect(page.getByText("Etapa 8 de 8")).toBeVisible();
  await answer(page, /aparelho para medir a frequência/, "Relógio");
  await answer(page, /pista de corrida/, "Não");
  await answer(page, /esteira/, "Sim");
  await page.getByRole("main").getByText("Plano", { exact: true }).click();
  await page.getByRole("button", { name: "Concluir entrevista" }).click();
  expect(putBody(calls, "recursos")).toEqual({ hrDevice: "relogio", track: false, treadmill: true, terrain: ["plano"] });

  await expect(page).toHaveURL(/\/resultado$/);
  await expect(page.getByRole("heading", { name: "Seu perfil de corredor" })).toBeVisible();
  await expect(page.getByText("Iniciante", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Triagem concluída")).toBeVisible();
  await expect(page.getByText("Prova de 5 km")).toBeVisible();
  await expect(page.getByText("Etapa 10 da corrida e caminhada, pelo que você disse que já consegue correr sem parar.")).toBeVisible();
  expect(calls.some((c) => c.path === "/interview/submit" && c.method === "POST")).toBe(true);
  expect(puts(calls)).toEqual(STEPS);
});

test("etapa vazia mostra o que falta e não chama a API", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrevista");
  await next(page);
  await expect(page.getByText("Responda este campo.").first()).toBeVisible();
  expect(puts(calls)).toHaveLength(0);

  await page.getByLabel("Ano de nascimento").fill("1890");
  await page.getByLabel("Altura (cm)").fill("300");
  await next(page);
  await expect(page.getByText("Confira este valor.").first()).toBeVisible();
  expect(puts(calls)).toHaveLength(0);
});

test("triagem: um Sim abre as perguntas adicionais e o envio leva a estrutura do PAR-Q+", async ({ page }) => {
  const calls = await mockApi(page, { completed: ["basicos"], responses: { basicos: { birthMonth: 5, birthYear: 1990, sex: "M", heightCm: 170 } } });
  await page.goto("/entrevista");
  await expect(page.getByRole("heading", { name: "Triagem de saúde" })).toBeVisible();
  // Homem: a pergunta de gravidez do app não aparece.
  await expect(page.getByText("Você está grávida neste momento?")).toHaveCount(0);
  await expect(page.getByText(/Fonte: PAR-Q\+ ©/)).toBeVisible();
  await expect(page.getByText("PERGUNTAS ADICIONAIS SOBRE PROBLEMA(S) DE SAÚDE")).toHaveCount(0);

  for (let q = 1; q <= 7; q++) await answer(page, new RegExp(`^${q}\\. `), q === 6 ? "Sim" : "Não");
  await expect(page.getByText("PERGUNTAS ADICIONAIS SOBRE PROBLEMA(S) DE SAÚDE")).toBeVisible();

  // Sem responder as adicionais, não envia.
  await next(page);
  await expect(page.getByText("Responda este campo.").first()).toBeVisible();
  expect(puts(calls)).toHaveLength(0);

  // 1 = SIM abre 1a-1c; as demais seções = NÃO.
  await answer(page, /^1\. Você tem artrite/, "Sim");
  await answer(page, /^1a\. /, "Sim");
  await answer(page, /^1b\. /, "Não");
  await answer(page, /^1c\. /, "Não");
  for (let s = 2; s <= 10; s++) await answer(page, new RegExp(`^${s}\\. `), "Não", "last");
  await next(page);

  await expect(page.getByRole("heading", { name: "Sua corrida até agora" })).toBeVisible();
  const body = putBody(calls, "triagem") as { general: Record<string, boolean>; followUp: Record<string, { has: boolean; answers: Record<string, boolean> }>; pregnant: boolean };
  expect((body as { textLang?: string }).textLang).toBe("pt-BR");
  expect(body.general["6"]).toBe(true);
  expect(body.general["1"]).toBe(false);
  expect(body.pregnant).toBe(false);
  expect(body.followUp["1"]).toEqual({ has: true, answers: { "1a": true, "1b": false, "1c": false } });
  expect(body.followUp["2"]).toEqual({ has: false, answers: {} });
  expect(Object.keys(body.followUp)).toHaveLength(10);
});

test("triagem em inglês mostra o PAR-Q+ original (sem tradução nossa) e envia o idioma lido", async ({ page }) => {
  const calls = await mockApi(page, { completed: ["basicos"], responses: { basicos: { birthMonth: 5, birthYear: 1990, sex: "M", heightCm: 170 } } });
  await page.goto("/entrevista");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByText("GENERAL HEALTH QUESTIONS")).toBeVisible();
  await expect(page.getByText("Has your doctor ever said that you have a heart condition OR high blood pressure?")).toBeVisible();
  await expect(page.getByText(/Source: PAR-Q\+ © 2025 PAR-Q\+ Collaboration/)).toBeVisible();
  await expect(page.getByText(/original English version/)).toBeVisible();
  // Nada do questionário em português nesta tela.
  await expect(page.getByText("O médico alguma vez disse")).toHaveCount(0);
  await expect(page.locator('[lang="en"]').getByText("PAR-Q+")).not.toHaveCount(0);

  for (let q = 1; q <= 7; q++) await answer(page, new RegExp(`^${q}[.] `), "No");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect.poll(() => putBody(calls, "triagem")).toMatchObject({ pregnant: false, textLang: "en" });
});

test("resultado em inglês mostra as recomendações do PAR-Q+ no original e avisa", async ({ page }) => {
  await mockApi(page, { profile: { status: 200, body: profileOk } });
  await page.goto("/resultado");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  const box = page.locator('[lang="en"]').filter({ hasText: "PAR-Q+ recommendations" });
  await expect(box.getByText("It is advised that you consult a qualified exercise professional")).toBeVisible();
  await expect(page.getByText(/original English version of the PAR-Q\+/)).toBeVisible();
  await expect(page.getByText("É aconselhável que você consulte")).toHaveCount(0);
});

test("volta de onde parou: abre na primeira etapa que falta, com as respostas salvas", async ({ page }) => {
  const calls = await mockApi(page, {
    completed: ["basicos", "triagem", "historico"],
    responses: {
      basicos: { birthMonth: 5, birthYear: 1990, sex: "F", heightCm: 170 },
      triagem: { general: { "1": false, "2": false, "3": false, "4": false, "5": false, "6": false, "7": false }, pregnant: false },
      historico: {},
    },
  });
  await page.goto("/entrevista");
  await expect(page.getByRole("heading", { name: "Lesões e dores" })).toBeVisible();
  await expect(page.getByText("Etapa 4 de 8")).toBeVisible();

  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Sua corrida até agora" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByLabel("Ano de nascimento")).toHaveValue("1990");
  await expect(page.getByLabel("Altura (cm)")).toHaveValue("170");
  expect(puts(calls)).toHaveLength(0);
});

test("menor de 18 anos: mostra o aviso e oferece excluir a conta com a senha", async ({ page }) => {
  const calls = await mockApi(page, {
    putStatus: { basicos: { status: 400, body: { error: { code: "UNDERAGE", message: "x", details: { canDeleteAccount: true } } } } },
  });
  await page.route(`${API}/auth/account`, (route) => {
    calls.push({ method: "DELETE", path: "/auth/account", body: JSON.parse(route.request().postData() ?? "{}") });
    return route.fulfill({ status: 204 });
  });
  await page.goto("/entrevista");
  await page.getByLabel("Mês de nascimento").selectOption("1");
  await page.getByLabel("Ano de nascimento").fill("2015");
  await answer(page, "Sexo", "Masculino");
  await page.getByLabel("Altura (cm)").fill("150");
  await next(page);

  await expect(page.getByRole("heading", { name: "O Let's Go Run é só para maiores de 18 anos" })).toBeVisible();
  const del = page.getByRole("button", { name: "Excluir minha conta" });
  await expect(del).toBeDisabled();
  await page.getByLabel("Sua senha, para confirmar a exclusão").fill("minha-senha-longa");
  await del.click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(calls.find((c) => c.method === "DELETE")?.body).toEqual({ password: "minha-senha-longa" });
});

test("sem sessão, a entrevista leva ao login", async ({ page }) => {
  await mockApi(page, { signedIn: false });
  await page.goto("/entrevista");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("painel: quem ainda não tem perfil vai para a entrevista", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrevista$/);
});

test("resultado: avaliação necessária bloqueia, mostra o texto oficial e registra a autodeclaração", async ({ page }) => {
  const blocked = {
    profile: {
      ...profileOk.profile,
      screening: { state: "AVALIACAO_NECESSARIA", maxIntensity: "nenhuma", validUntil: null, expiresSoon: false, reasons: ["seguimento_sim"], allowsTraining: false },
      plan: null,
    },
  };
  const calls = await mockApi(page, { profile: { status: 200, body: blocked } });
  await page.route(`${API}/profile/screening/evaluation`, (route) => {
    calls.push({ method: "POST", path: "/profile/screening/evaluation", body: JSON.parse(route.request().postData() ?? "{}") });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ screening: {}, selection: null }) });
  });
  await page.goto("/resultado");
  await expect(page.getByText("Antes de começar, procure mais orientação")).toBeVisible();
  await expect(page.getByText("Isto não é diagnóstico nem substitui avaliação profissional.")).toBeVisible();
  await expect(page.getByText(/ePARmed-X\+ \(www\.eparmedx\.com\) e\/ou consulte/)).toBeVisible();
  await expect(page.getByText(/Ainda não há plano/)).toBeVisible();

  await page.getByRole("button", { name: "Registrar avaliação" }).click();
  await expect(page.getByText("Responda este campo.").first()).toBeVisible();

  await page.getByLabel("Resultado da avaliação").selectOption("sem_restricoes");
  await page.getByLabel("Data da avaliação").fill("2026-10-09");
  await page.getByLabel("Quem avaliou").selectOption("medico");
  await page.getByRole("button", { name: "Registrar avaliação" }).click();
  await expect(page.getByText(/Registramos a avaliação/)).toBeVisible();
  expect(calls.find((c) => c.path === "/profile/screening/evaluation")?.body).toEqual({
    result: "sem_restricoes",
    date: "2026-10-09",
    source: "medico",
    vigorousAllowed: false,
  });
});

test("?etapa=objetivo abre direto na etapa do objetivo, mesmo com a entrevista já concluída", async ({ page }) => {
  await mockApi(page, { completed: STEPS });
  await page.goto("/entrevista?etapa=objetivo");
  await expect(page.getByText("Etapa 5 de 8")).toBeVisible();
  // Valor desconhecido na URL é ignorado: abre onde a entrevista normalmente abriria (a última etapa).
  await page.goto("/entrevista?etapa=qualquer-coisa");
  await expect(page.getByText("Etapa 8 de 8")).toBeVisible();
});
