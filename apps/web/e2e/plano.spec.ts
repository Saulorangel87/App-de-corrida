import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

type Json = Record<string, unknown>;

const session = (id: string, date: string, over: Json = {}) => ({
  id,
  date,
  slug: "caminhada-corrida",
  name: { "pt-BR": "Caminhada e corrida", en: "Walk-run" },
  kind: "caminhada_corrida",
  minutes: 40,
  maxZone: "Z1",
  targetRpe: 3,
  optional: false,
  ladder: null,
  note: null,
  status: "pending",
  log: null,
  ...over,
});

const week = (n: number, start: string, over: Json = {}) => ({
  calendarWeek: n,
  templateWeek: n,
  startDate: start,
  endDate: plusDaysFrom(start, 6),
  phase: "base",
  isRecovery: false,
  isTaper: false,
  isRaceWeek: false,
  ladderStage: null,
  state: "upcoming",
  projected: true,
  sessions: [],
  ...over,
});

function plusDaysFrom(startIso: string, n: number) {
  const d = new Date(`${startIso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}

const w1Start = plusDays(-7);
const w2Start = plusDays(0);

const overview = {
  plan: { template: "5k-iniciante", objective: "5k", level: "iniciante", durationWeeks: 4, startDate: w1Start, endDate: plusDays(20) },
  currentWeek: 2,
  weeks: [
    week(1, w1Start, {
      state: "past",
      projected: false,
      ladderStage: "1",
      sessions: [
        session("p1", w1Start, { status: "completed", log: { completed: true, durationMinutes: 38, distanceKm: null, srpe: 3, notes: null } }),
        session("p2", plusDaysFrom(w1Start, 2), { status: "skipped" }),
      ],
    }),
    week(2, w2Start, {
      state: "current",
      projected: false,
      ladderStage: "2",
      sessions: [session("c1", w2Start), session("c2", plusDaysFrom(w2Start, 2), { optional: true, name: { "pt-BR": "Mobilidade", en: "Mobility" } })],
    }),
    week(3, plusDaysFrom(w2Start, 7), { ladderStage: "3", isRecovery: true }),
    week(4, plusDaysFrom(w2Start, 14), { phase: "prova", isRaceWeek: true }),
  ],
};

async function mockApi(page: Page, opts: { overview?: Json; status?: number } = {}) {
  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "5k", endDate: plusDays(20) } } });
    if (path.startsWith("/plan/overview/")) {
      if (opts.status && opts.status !== 200) return json(opts.status, { error: { code: "X", message: "x" } });
      return json(200, opts.overview ?? overview);
    }
    if (path.startsWith("/day/")) {
      return json(200, {
        date: plusDays(0), plan: null, sessions: [], checkin: null,
        decision: {
          action: "manter", session: { slug: null, minutes: 0, maxZone: null, changed: false },
          blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false,
          needsCheckin: false, message: "Sem treino.", reasons: [], sources: [],
        },
        todayName: null, questions: [],
      });
    }
    if (path.startsWith("/plan/week/")) return json(200, { plan: null, sessions: [] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
}

test("plano completo: resumo, semana atual aberta, passadas recolhidas e futuras só com o contorno", async ({ page }) => {
  await mockApi(page);
  await page.goto("/plano");
  await expect(page.getByRole("heading", { name: "Plano completo", level: 1 })).toBeVisible();
  await expect(page.getByText("Prova de 5 km · Iniciante")).toBeVisible();

  // resumo (só conta o que a API devolveu: 1 feito de 3 treinos principais; complementar fica de fora)
  await expect(page.getByText("2 de 4", { exact: true })).toBeVisible();
  await expect(page.getByText("1 de 3", { exact: true })).toBeVisible();
  await expect(page.getByText("As semanas à frente mostram só o contorno do plano.")).toBeVisible();
  await expect(page.getByText("empurra as semanas seguintes")).toBeVisible();

  // semana atual aberta, com link para o treino
  const current = page.locator("details", { has: page.getByText("Semana atual") });
  await expect(current).toHaveJSProperty("open", true);
  await expect(current.getByRole("link", { name: "Caminhada e corrida" })).toHaveAttribute("href", "/treino/c1");
  await expect(current.getByText("(opcional)")).toBeVisible();

  // semana passada recolhida; abre ao clicar e mostra o que foi feito
  const past = page.locator("details").filter({ hasText: "Semana 1" });
  await expect(past).toHaveJSProperty("open", false);
  await expect(past.getByText("1 de 2 treinos feitos")).toBeVisible();
  await past.getByText("Semana 1").click();
  await expect(past.getByRole("link", { name: "Caminhada e corrida" }).first()).toHaveAttribute("href", "/treino/p1");
  await expect(past.getByText("Feito", { exact: true })).toBeVisible();

  // futuras: previsão, sem treinos inventados e sem área para abrir
  const future = page.getByRole("listitem").filter({ hasText: "Semana 3" });
  await expect(future.getByText("Previsão")).toBeVisible();
  await expect(future.getByText("Semana de recuperação")).toBeVisible();
  await expect(future.getByText("Etapa 3 da escada")).toBeVisible();
  await expect(future.locator("details")).toHaveCount(0);
  await expect(future.getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Semana 4" }).getByText("Semana da prova")).toBeVisible();

  // nenhum código de regra na tela
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/R-[A-Z]{3}-\d+|\[P\]|`/);
});

test("painel leva ao plano completo", async ({ page }) => {
  await mockApi(page, { overview: { ...overview } });
  await page.route(`${API}/day/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        date: plusDays(0),
        plan: { id: "p", template: "5k-iniciante", calendarWeek: 2, templateWeek: 2, phase: "base", isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: w2Start, weekEnd: plusDaysFrom(w2Start, 6) },
        sessions: [],
        checkin: null,
        decision: {
          action: "manter", session: { slug: null, minutes: 0, maxZone: null, changed: false },
          blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false,
          needsCheckin: false, message: "Sem treino hoje.", reasons: [], sources: [],
        },
        todayName: null,
        questions: [],
      }),
    });
  });
  await page.goto("/painel");
  await page.getByRole("link", { name: "Plano completo" }).click();
  await expect(page).toHaveURL(/\/plano$/);
  await expect(page.getByRole("heading", { name: "Plano completo", level: 1 })).toBeVisible();
});

test("sem plano ativo: explica e leva ao perfil", async ({ page }) => {
  await mockApi(page, { overview: { plan: null, currentWeek: null, weeks: [] } });
  await page.goto("/plano");
  await expect(page.getByText("Ainda não há plano ativo")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver meu perfil e plano" })).toHaveAttribute("href", "/resultado");
});

test("sem entrevista concluída segue para a entrevista", async ({ page }) => {
  await mockApi(page, { status: 409 });
  await page.goto("/plano");
  await expect(page).toHaveURL(/\/entrevista$/);
});

test("erro ao carregar mostra aviso", async ({ page }) => {
  await mockApi(page, { status: 500 });
  await page.goto("/plano");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("celular: o plano não rola para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page);
  await page.goto("/plano");
  await expect(page.getByRole("heading", { name: "Plano completo", level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});
