import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

type Json = Record<string, unknown>;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = iso(new Date());
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

const planInfo = {
  id: "p1",
  template: "10k-iniciante",
  calendarWeek: 3,
  templateWeek: 3,
  phase: "base",
  isRecovery: false,
  isTaper: false,
  isRaceWeek: false,
  weekStart: today,
  weekEnd: plusDays(6),
};

const session = (id: string, date: string, over: Json = {}) => ({
  id,
  date,
  slug: "rodagem-leve",
  name: { "pt-BR": "Rodagem leve", en: "Easy run" },
  kind: "rodagem",
  minutes: 40,
  maxZone: "Z2",
  targetRpe: 4,
  optional: false,
  note: null,
  status: "pending",
  log: null,
  ...over,
});

const decision = (over: Json = {}) => ({
  action: "manter",
  session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
  blockRunning: false,
  refer: false,
  urgent: false,
  sameDayMedical: false,
  needsEvaluation: false,
  needsCheckin: true,
  message: "Mantenha o treino planejado.",
  reasons: [],
  ...over,
});

function dayBody(over: Json = {}) {
  return {
    date: today,
    plan: planInfo,
    sessions: [
      session("s1", today),
      session("c1", today, { slug: "mobilidade-basica", name: { "pt-BR": "Mobilidade básica", en: "Basic mobility" }, kind: "mobilidade", minutes: 10, optional: true, allowed: true }),
    ],
    checkin: null,
    decision: decision(),
    todayName: { "pt-BR": "Rodagem leve", en: "Easy run" },
    questions: ["checkin"],
    ...over,
  };
}

const weekBody = {
  plan: planInfo,
  sessions: [
    session("s1", today),
    session("s2", plusDays(2), { slug: "longao-leve", name: { "pt-BR": "Longão leve", en: "Easy long run" }, minutes: 60 }),
    session("s0", plusDays(-0), { id: "s0", optional: true, kind: "forca", name: { "pt-BR": "Força do corredor", en: "Runner strength" }, minutes: 15 }),
  ],
};

type Opts = { day?: Json; week?: Json; hasProfile?: boolean };

async function mockApi(page: Page, opts: Opts = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  let day = opts.day ?? dayBody();
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ method: req.method(), path, body });
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") {
      return opts.hasProfile === false
        ? json(404, { error: { code: "NOT_FOUND", message: "x" } })
        : json(200, { profile: { plan: { objective: "10k", endDate: plusDays(60) } } });
    }
    if (path.startsWith("/day/")) return json(200, day);
    if (path.startsWith("/plan/week/")) return json(200, opts.week ?? weekBody);
    if (path.startsWith("/checkins/") && req.method() === "PUT") {
      day = dayBody({
        checkin: { sleepHours: 7.5, sleepQuality: 4, energy: 4, mood: 5, stress: 3, muscleSoreness: 4, restingHr: null, acuteIllness: false, dailyPainWalking: null },
        decision: decision({ needsCheckin: false, message: "Treino mantido depois do check-in." }),
        questions: [],
      });
      return json(200, day);
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

test("painel: treino de hoje, motivo do motor, semana e convite ao check-in", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Olá, Ana Corredora" })).toBeVisible();

  const hoje = page.getByRole("region", { name: "Treino de hoje" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Treino de hoje" }) }));
  await expect(hoje.getByText("Rodagem leve")).toBeVisible();
  await expect(hoje.getByText("Treino mantido", { exact: true })).toBeVisible();
  await expect(hoje.getByText("40 min")).toBeVisible();
  await expect(hoje.getByText("Até esforço moderado (Z2)")).toBeVisible();
  await expect(hoje.getByText("Esforço alvo: 4 de 10")).toBeVisible();
  await expect(hoje.getByText("Mantenha o treino planejado.")).toBeVisible();

  await expect(page.getByText("Faça o check-in de hoje")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Complementares de hoje" })).toBeVisible();
  await expect(page.getByText("Mobilidade básica")).toBeVisible();

  const semana = page.locator("section", { has: page.getByRole("heading", { name: "Sua semana" }) });
  await expect(semana.getByText("Semana 3")).toBeVisible();
  await expect(semana.getByText("0 de 2 treinos feitos")).toBeVisible();
  await expect(semana.getByText("Longão leve")).toBeVisible();

  await expect(page.getByText("O plano termina em")).toBeVisible();
});

test("painel: descanso e alerta de emergência quando o motor manda parar", async ({ page }) => {
  await mockApi(page, {
    day: dayBody({
      sessions: [],
      todayName: null,
      decision: decision({
        action: "interromper_e_encaminhar",
        session: { slug: null, minutes: 0, maxZone: null, changed: true },
        urgent: true,
        refer: true,
        blockRunning: true,
        message: "Pare e procure atendimento. [R-TRI-12]",
      }),
    }),
  });
  await page.goto("/painel");
  await expect(page.getByText("Pare e procure um profissional")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("192 (SAMU)");
  await expect(page.getByText("Descanso hoje", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pare e procure atendimento. [R-TRI-12]")).toBeVisible();
});

test("painel: dia de descanso planejado não aparece como treino mantido", async ({ page }) => {
  await mockApi(page, {
    day: dayBody({
      sessions: [],
      todayName: null,
      decision: decision({ session: { slug: null, minutes: 0, maxZone: null, changed: false }, message: "Hoje é dia de descanso no seu plano." }),
    }),
  });
  await page.goto("/painel");
  await expect(page.getByText("Descanso planejado")).toBeVisible();
  await expect(page.getByText("Treino mantido", { exact: true })).toHaveCount(0);
});

test("painel: sem plano ativo aponta para o resultado da triagem", async ({ page }) => {
  await mockApi(page, { day: dayBody({ plan: null, sessions: [] }), week: { plan: null, sessions: [] } });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Ainda não há plano ativo" })).toBeVisible();
  await page.getByRole("link", { name: "Ver meu perfil e plano" }).click();
  await expect(page).toHaveURL(/\/resultado$/);
});

test("painel: sem perfil leva à entrevista", async ({ page }) => {
  await mockApi(page, { hasProfile: false });
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrevista$/);
});

test("check-in: salva só o que foi respondido e volta ao painel já marcado como feito", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("link", { name: "Fazer check-in" }).click();
  await expect(page.getByRole("heading", { name: "Check-in de hoje" })).toBeVisible();
  // a pergunta de dor ao caminhar só aparece quando o motor pede
  await expect(page.getByText("dor ao caminhar")).toHaveCount(0);

  await page.getByLabel("Quantas horas você dormiu esta noite?").fill("7,5");
  await page.getByRole("group", { name: "Como foi a qualidade do sono?" }).getByText("4", { exact: true }).click();
  await page.getByRole("group", { name: "Como está o seu humor?" }).getByText("5", { exact: true }).click();
  await page.getByRole("group", { name: /febre ou resfriado/ }).getByText("Não", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar check-in" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByText("Check-in de hoje feito.")).toBeVisible();
  await expect(page.getByText("Treino mantido depois do check-in.")).toBeVisible();
  const put = calls.find((c) => c.method === "PUT" && c.path === `/checkins/${today}`);
  expect(put?.body).toEqual({ sleepHours: 7.5, sleepQuality: 4, mood: 5, acuteIllness: false });
});

test("check-in: com bloqueio por dor o app pergunta a dor ao caminhar", async ({ page }) => {
  const calls = await mockApi(page, { day: dayBody({ questions: ["checkin", "daily_pain_walking"] }) });
  await page.goto("/checkin");
  const group = page.getByRole("group", { name: "Qual a intensidade da dor ao caminhar no dia a dia?" });
  await expect(group).toBeVisible();
  await group.getByText("3", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar check-in" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  const put = calls.find((c) => c.method === "PUT");
  expect(put?.body).toMatchObject({ dailyPainWalking: 3 });
});
