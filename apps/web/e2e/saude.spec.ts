import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
const today = new Date().toLocaleDateString("sv-SE");

type Call = { method: string; path: string; body: unknown };

/** Perfil com a triagem liberada; `due` é o aviso do servidor de que a pergunta semanal deve aparecer. */
async function mockApi(page: Page, opts: { due?: boolean; allowsTraining?: boolean; failHealth?: boolean } = {}) {
  const calls: Call[] = [];
  let state: "LIBERADO" | "EXPIRADO" = "LIBERADO";
  let due = opts.due ?? false;
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ method: req.method(), path, body });
    const json = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data ?? {}) });

    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") {
      const expired = state === "EXPIRADO";
      return json(200, {
        profile: {
          level: "intermediario",
          explanation: { text: "Você é **intermediário**." },
          nextEvaluationDate: "2027-01-10",
          pause: { cause: null, declaredOn: null, clearedByProfessionalOn: null },
          plan: { objective: "10k", level: "intermediario", durationWeeks: 10, baseWeeks: 0, startDate: today, endDate: today },
          screening: {
            state,
            validUntil: expired ? null : "2027-10-10",
            reasons: expired ? ["saude_mudou"] : [],
            allowsTraining: !expired && (opts.allowsTraining ?? true),
            healthCheckDue: due && !expired,
          },
        },
      });
    }
    if (path === "/profile/screening/health-change") {
      if (opts.failHealth) return json(500, { error: { code: "INTERNAL", message: "x" } });
      const changed = (body as { changed: boolean }).changed;
      if (changed) state = "EXPIRADO";
      else due = false;
      return json(200, { screening: { state } });
    }
    if (path.startsWith("/day/")) {
      return json(200, {
        date: today,
        plan: { id: "p", template: "10k-intermediario", calendarWeek: 1, templateWeek: 1, phase: "base", isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: today, weekEnd: today },
        sessions: [],
        checkin: null,
        decision: {
          action: "manter", session: { slug: null, minutes: 0, maxZone: null, changed: false },
          blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false,
          needsCheckin: false, message: "Sem treino hoje.", reasons: [], sources: [],
        },
        todayName: null,
        questions: [],
      });
    }
    if (path.startsWith("/plan/week/")) return json(200, { plan: null, sessions: [] });
    if (path === "/auth/sessions") return json(200, { sessions: [] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

const healthCalls = (calls: Call[]) => calls.filter((c) => c.path === "/profile/screening/health-change");

test("painel: a pergunta semanal aparece só quando o servidor manda, e \"não\" grava a data local", async ({ page }) => {
  const calls = await mockApi(page, { due: true });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Mudou algo na sua saúde?" })).toBeVisible();
  await expect(page.getByText("um novo diagnóstico, um remédio novo, uma lesão, uma gravidez ou uma internação")).toBeVisible();
  await expect(page.getByText("Isto não é diagnóstico nem substitui avaliação profissional.")).toBeVisible();

  await page.getByRole("button", { name: "Não mudou nada" }).click();
  await expect(page.getByText("Obrigado pela resposta.")).toBeVisible();
  await expect(page.getByText("Perguntamos de novo em uma semana.")).toBeVisible();
  expect(healthCalls(calls).map((c) => c.body)).toEqual([{ changed: false, date: today }]);
  // o painel continua normal
  await expect(page.getByRole("heading", { name: "Olá, Ana Corredora" })).toBeVisible();
});

test("painel sem aviso do servidor não mostra a pergunta", async ({ page }) => {
  await mockApi(page, { due: false });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Olá, Ana Corredora" })).toBeVisible();
  await expect(page.getByText("Mudou algo na sua saúde?")).toHaveCount(0);
});

test("\"sim\" pede confirmação, só então grava, e leva ao resultado com a triagem vencida", async ({ page }) => {
  const calls = await mockApi(page, { due: true });
  await page.goto("/painel");
  await page.getByRole("button", { name: "Sim, algo mudou" }).click();

  // nada foi gravado ainda: primeiro o aviso do que acontece
  await expect(page.getByRole("heading", { name: "Vamos refazer a triagem de saúde" })).toBeVisible();
  await expect(page.getByText("Seus treinos ficam em espera até você refazer o questionário de saúde")).toBeVisible();
  expect(healthCalls(calls)).toHaveLength(0);

  // voltar desfaz
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Mudou algo na sua saúde?" })).toBeVisible();

  await page.getByRole("button", { name: "Sim, algo mudou" }).click();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page).toHaveURL(/\/resultado$/);
  expect(healthCalls(calls).map((c) => c.body)).toEqual([{ changed: true, date: today }]);
  await expect(page.getByText("Triagem vencida")).toBeVisible();
  await expect(page.getByText("Você informou uma mudança na sua saúde.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Refazer a entrevista" })).toBeVisible();
});

test("configurações: a pergunta fica disponível com a triagem liberada", async ({ page }) => {
  await mockApi(page, { due: false });
  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { name: "Mudou algo na sua saúde?" })).toBeVisible();
});

test("configurações: sem liberação não há o que invalidar, então não pergunta", async ({ page }) => {
  await mockApi(page, { allowsTraining: false });
  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { name: "Perfil e configurações" })).toBeVisible();
  await expect(page.getByText("Mudou algo na sua saúde?")).toHaveCount(0);
});

test("erro ao gravar mostra o aviso e não segue para o resultado", async ({ page }) => {
  await mockApi(page, { due: true, failHealth: true });
  await page.goto("/painel");
  await page.getByRole("button", { name: "Não mudou nada" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/painel$/);
});

test("celular: a pergunta cabe na tela e os botões não rolam para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page, { due: true });
  await page.goto("/painel");
  await expect(page.getByRole("button", { name: "Sim, algo mudou" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});
