import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

type Hist = {
  from: string;
  to: string;
  sleep: { date: string; hours: number | null; quality: number | null }[];
  pain: { date: string; region: string; intensity: number | null; moment: string | null }[];
  weekly: { weekStart: string; plannedSessions: number; completedSessions: number; adherencePct: number | null; minutes: number; srpeLoad: number }[];
};

async function mockApi(page: Page, build: (days: number) => Hist) {
  const requested: string[] = [];
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    const json = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data ?? {}) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/history") {
      requested.push(url.searchParams.get("days") ?? "");
      return json(200, build(Number(url.searchParams.get("days"))));
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return requested;
}

const full = (days: number): Hist => ({
  from: day(-(days - 1)),
  to: day(0),
  sleep: [
    { date: day(-2), hours: 6.5, quality: 3 },
    { date: day(-1), hours: 7.5, quality: null },
  ],
  pain: [
    { date: day(-3), region: "joelho_d", intensity: 4, moment: "treino" },
    { date: day(-1), region: "geral", intensity: 0, moment: "treino" },
  ],
  weekly: [
    { weekStart: day(-14), plannedSessions: 4, completedSessions: 3, adherencePct: 75, minutes: 120, srpeLoad: 800 },
    { weekStart: day(-7), plannedSessions: 4, completedSessions: 4, adherencePct: 100, minutes: 150, srpeLoad: 1000 },
  ],
});

test("histórico: resumo, gráficos, leitura por coluna, tabela e dor", async ({ page }) => {
  const requested = await mockApi(page, full);
  await page.goto("/historico");
  await expect(page.getByRole("heading", { name: "Histórico", level: 1 })).toBeVisible();

  await expect(page.getByText("7 de 8")).toBeVisible();
  await expect(page.getByText("270 min")).toBeVisible();
  await expect(page.getByText("7 h")).toBeVisible();

  // por padrão a leitura mostra a última semana com dado
  await expect(page.getByText(/: 4 de 4 treinos \(100%\)\./)).toBeVisible();
  await page.getByRole("button", { name: /: 3 de 4 treinos \(75%\)\./ }).hover();
  await expect(page.locator("p[aria-live=polite]").first()).toHaveText(/3 de 4 treinos \(75%\)/);

  await page.getByText("Ver como tabela").first().click();
  await expect(page.getByRole("columnheader", { name: "Aderência" })).toBeVisible();

  // dor: só regiões com local; o registro "geral" não vira linha
  await expect(page.getByText(/Joelho direito/)).toBeVisible();
  await expect(page.getByText(/intensidade 4 de 10 · no treino/)).toBeVisible();
  await expect(page.getByText(/Geral|geral/)).toHaveCount(0);

  // trocar o período pede 12 semanas (84 dias)
  await page.getByRole("button", { name: "12 semanas" }).click();
  await expect.poll(() => requested.includes("84")).toBe(true);
  expect(requested[0]).toBe("56");
});

test("histórico vazio mostra a orientação para começar", async ({ page }) => {
  await mockApi(page, (days) => ({ from: day(-(days - 1)), to: day(0), sleep: [], pain: [], weekly: [] }));
  await page.goto("/historico");
  await expect(page.getByText("Ainda não há histórico")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para o painel" })).toBeVisible();
});

test("celular: o histórico não rola para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page, full);
  await page.goto("/historico");
  await expect(page.getByRole("heading", { name: "Sono" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});

test("gráficos lado a lado ficam com a linha de base alinhada, mesmo com uma semana só", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await mockApi(page, (days) => ({
    from: day(-(days - 1)),
    to: day(0),
    sleep: [{ date: day(0), hours: 7, quality: 4 }],
    pain: [],
    weekly: [{ weekStart: day(-1), plannedSessions: 1, completedSessions: 1, adherencePct: 100, minutes: 30, srpeLoad: 90 }],
  }));
  await page.goto("/historico");
  const groups = page.getByRole("group").filter({ has: page.locator("button[aria-label]") });
  await expect(groups).toHaveCount(3);
  const boxes = await Promise.all([0, 1].map((i) => groups.nth(i).boundingBox()));
  expect(Math.abs((boxes[0]!.y + boxes[0]!.height) - (boxes[1]!.y + boxes[1]!.height))).toBeLessThan(1);
  // uma coluna não vira uma faixa que ocupa o gráfico todo
  const column = page.getByRole("button", { name: /1 de 1 treinos/ });
  expect((await column.boundingBox())!.width).toBeLessThanOrEqual(73);
});
