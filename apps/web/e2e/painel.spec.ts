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

type Opts = { day?: Json; week?: Json; hasProfile?: boolean; review?: Json; profile?: Json };

async function mockApi(page: Page, opts: Opts = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  let day = opts.day ?? dayBody();
  let review: Json = opts.review ?? { due: false, calendarWeek: null, felt: null, advanceSuggested: false };
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
        : json(200, {
            profile: {
              level: "intermediario",
              plan: { objective: "10k", startDate: plusDays(-14), endDate: plusDays(56), durationWeeks: 10 },
              screening: null,
              ...(opts.profile ?? {}),
            },
          });
    }
    if (path.startsWith("/plan/review/")) {
      if (req.method() === "PUT") {
        review = { due: false, calendarWeek: 2, felt: (body as { felt: string }).felt, advanceSuggested: (body as { felt: string }).felt === "facil" };
        return json(200, review);
      }
      return json(200, review);
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

test("painel: treino de hoje, motivo do motor, resumo da semana e convite ao check-in", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible();
  await expect(page.getByText("Semana 3 de 10 · Prova de 10 km")).toBeVisible();

  // menu lateral só com telas que existem
  const menu = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(menu.getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page");
  for (const [label, href] of [["Plano de treino", "/plano"], ["Histórico", "/historico"], ["Perfil e plano", "/resultado"]]) {
    await expect(menu.getByRole("link", { name: label })).toHaveAttribute("href", href);
  }
  await expect(page.getByRole("navigation", { name: "Conta" }).getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/configuracoes");
  await expect(menu.locator("xpath=ancestor::aside").getByText("Nível intermediário")).toBeVisible();

  // treino de hoje (cartão escuro)
  const hoje = page.locator("section", { has: page.getByRole("heading", { name: "Treino de hoje" }) });
  await expect(hoje.getByText("Rodagem leve")).toBeVisible();
  await expect(hoje.getByText("Treino mantido", { exact: true })).toBeVisible();
  await expect(hoje.getByText("40 min")).toBeVisible();
  await expect(hoje.getByText("Até esforço moderado (Z2)")).toBeVisible();
  await expect(hoje.getByText("Moderado (Z2)", { exact: true })).toBeVisible();
  await expect(hoje.getByText("4 de 10")).toBeVisible();
  await expect(hoje.getByText("Mantenha o treino planejado.")).toBeVisible();
  await expect(hoje.getByRole("link", { name: "Ver o treino completo" })).toHaveAttribute("href", "/treino/s1");

  await expect(page.getByText("Faça o check-in de hoje")).toBeVisible();
  await expect(page.getByRole("link", { name: "Fazer check-in" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Complementares de hoje" })).toBeVisible();
  await expect(page.getByText("Mobilidade básica")).toBeVisible();

  // resumo da semana: só o que a API devolveu (nada feito ainda)
  await expect(page.getByText("0 de 2 treinos feitos")).toBeVisible();
  await expect(page.getByText("Informe a distância ao registrar um treino")).toBeVisible();
  await expect(page.getByText("Aparece quando você informa distância e duração")).toBeVisible();

  // volume semanal e plano da semana
  const volume = page.locator("section", { has: page.getByRole("heading", { name: "Volume semanal" }) });
  await expect(volume.getByText("Concluído", { exact: true })).toBeVisible();
  await expect(volume.getByRole("img", { name: /min planejados/ }).first()).toBeVisible();
  const semana = page.locator("section", { has: page.getByRole("heading", { name: "Plano da semana" }) });
  await expect(semana.getByText("Semana 3 · Base")).toBeVisible();
  await expect(semana.getByText("Longão leve")).toBeVisible();
  await expect(semana.getByText("Descanso").first()).toBeVisible();

  // objetivo e treinos recentes
  await expect(page.getByRole("heading", { name: "Seu objetivo" })).toBeVisible();
  await expect(page.getByText("Prova de 10 km", { exact: true })).toBeVisible();
  await expect(page.getByText("O plano termina em")).toBeVisible();
  await expect(page.getByText("Progresso do plano")).toBeVisible();
  await expect(page.getByText("Os treinos que você registrar esta semana aparecem aqui.")).toBeVisible();
});

test("painel: treino feito entra no resumo, no volume e nos treinos recentes", async ({ page }) => {
  const doneSession = session("s0", today, {
    status: "completed",
    log: { completed: true, durationMinutes: 42, distanceKm: 7, srpe: 4, notes: null },
  });
  await mockApi(page, {
    week: {
      plan: planInfo,
      sessions: [doneSession, session("s2", plusDays(2), { name: { "pt-BR": "Longão leve", en: "Easy long run" }, kind: "longao", minutes: 60 })],
    },
    day: dayBody({ sessions: [doneSession], checkin: { sleepHours: 7, sleepQuality: 4, energy: 4, mood: 4, stress: 2, muscleSoreness: 2, restingHr: null, acuteIllness: false, dailyPainWalking: null }, questions: [] }),
  });
  await page.goto("/painel");
  await expect(page.getByText("1 de 2 treinos feitos")).toBeVisible();
  await expect(page.getByText("42 min").first()).toBeVisible();
  await expect(page.getByText("6:00", { exact: true })).toBeVisible(); // 42 min / 7 km
  await expect(page.getByText("Dos treinos com distância e duração")).toBeVisible();
  const recentes = page.locator("section", { has: page.getByRole("heading", { name: "Treinos recentes" }) });
  await expect(recentes.getByText("7 km")).toBeVisible();
  await expect(recentes.getByText("42 min · 6:00 /km")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver o registro: Rodagem leve" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Planejado", exact: true })).toBeVisible(); // longão daqui a 2 dias: sem botão

  // check-in já feito: aviso e um único botão para alterar (sem repetir no topo da tela)
  await expect(page.getByText("Check-in de hoje feito.")).toBeVisible();
  await expect(page.getByText("Suas respostas de hoje já estão salvas.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Alterar check-in" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Fazer check-in" })).toHaveCount(0);
});

test("painel: com o app em inglês, o menu e o resumo mudam de idioma", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("complementary").getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: /^(Good morning|Good afternoon|Good evening), Ana$/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Training plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly volume" })).toBeVisible();
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

test("painel: prova perto demais explica o porquê, o que fazer e leva direto à etapa do objetivo", async ({ page }) => {
  const earliest = plusDays(63);
  await mockApi(page, {
    day: dayBody({ plan: null, sessions: [] }),
    week: { plan: null, sessions: [] },
    profile: {
      plan: null,
      screening: { healthCheckDue: false },
      planNotice: {
        reason: "prazo_insuficiente", objective: "21k", weeksNeeded: 9, weeksAvailable: 2,
        earliestRaceDate: earliest, smallerThatFit: ["5k", "10k"],
      },
    },
  });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Sua prova está perto demais para este plano" })).toBeVisible();
  await expect(page.getByText("Esta distância pede cerca de 9 semanas de preparo.")).toBeVisible();
  await expect(page.getByText("Faltam 2 semanas até a prova.")).toBeVisible();
  await expect(page.getByText("o app não encurta o plano")).toBeVisible();
  await expect(page.getByText("ou uma distância menor: 5 km ou 10 km.")).toBeVisible();
  // O texto genérico "o plano será montado automaticamente" não aparece mais para este caso.
  await expect(page.getByText("Ainda não há plano ativo")).toHaveCount(0);
  await page.getByRole("link", { name: "Refazer a entrevista com outra data" }).click();
  await expect(page).toHaveURL(/\/entrevista\?etapa=objetivo$/);
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
  await expect(page.getByRole("link", { name: "Alterar check-in" })).toHaveCount(1);
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

test("celular: o menu abre com as áreas do app, navega e fecha", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByRole("complementary")).toBeHidden(); // menu lateral só no desktop

  const toggle = page.getByRole("button", { name: "Abrir menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const menu = page.getByRole("navigation", { name: "Navegação principal" });
  for (const name of ["Painel", "Plano de treino", "Histórico", "Perfil e plano", "Configurações"]) {
    await expect(menu.getByRole("link", { name })).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "EN" })).toBeVisible();

  // Esc fecha
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toHaveCount(0);

  // escolher uma área navega e fecha o menu
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/configuracoes$/);
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});

test("raiz do app: quem já entrou vai para o painel", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/painel$/);
});

test("avaliação do bloco: pergunta nos últimos dias, grava a resposta e só sugere reavaliar quando foi fácil", async ({ page }) => {
  const calls = await mockApi(page, { review: { due: true, calendarWeek: 2, felt: null, advanceSuggested: false } });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Como foi este bloco de 2 semanas?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Puxado, cansei mais do que esperava" })).toBeVisible();
  await page.getByRole("button", { name: "Fácil, sobrou energia" }).click();

  const put = calls.find((c) => c.method === "PUT" && c.path.startsWith("/plan/review/"));
  expect(put?.body).toEqual({ felt: "facil" });
  await expect(page.getByText("Resposta registrada.")).toBeVisible();
  await expect(page.getByText("O plano continua do mesmo jeito, sem pular etapas", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quer um plano um pouco mais avançado?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Refazer a avaliação" })).toHaveAttribute("href", "/entrevista");
  await expect(page.getByRole("heading", { name: "Como foi este bloco de 2 semanas?" })).toHaveCount(0);
});

test("avaliação do bloco: sem janela aberta não aparece nada", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: /Boa|Bom/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como foi este bloco de 2 semanas?" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Quer um plano um pouco mais avançado?" })).toHaveCount(0);
});

test("plano concluído: o painel leva ao próximo objetivo", async ({ page }) => {
  await mockApi(page, {
    day: { ...dayBody(), plan: null, sessions: [] },
    profile: { plan: null, completedPlan: { objective: "5k" } },
  });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Você concluiu o plano de Prova de 5 km" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Escolher o próximo objetivo" })).toHaveAttribute("href", "/entrevista");
});
