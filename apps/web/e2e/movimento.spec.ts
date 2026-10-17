import { expect, test, type Page } from "@playwright/test";

// Movimento da interface (esqueletos, entrada dos cartões, gráfico). A configuração global roda os
// testes com `reducedMotion: "reduce"`; aqui o movimento é ligado de propósito, e cada caso volta a
// desligar quando quer conferir o comportamento de quem pede menos animação.

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
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

const session = (id: string, date: string, minutes: number, over: Record<string, unknown> = {}) => ({
  id,
  date,
  slug: "rodagem-leve",
  name: { "pt-BR": "Rodagem leve", en: "Easy run" },
  kind: "rodagem",
  minutes,
  maxZone: "Z2",
  targetRpe: 4,
  optional: false,
  note: null,
  status: "pending",
  log: null,
  ...over,
});

const dayBody = {
  date: today,
  plan: planInfo,
  sessions: [session("s1", today, 40)],
  checkin: null,
  decision: {
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
  },
  todayName: { "pt-BR": "Rodagem leve", en: "Easy run" },
  questions: ["checkin"],
};

const weekBody = { plan: planInfo, sessions: [session("s1", today, 40), session("s2", plusDays(2), 60)] };

/** API simulada do painel. `delayMs` atrasa o treino do dia para dar tempo de ver o esqueleto. */
async function mockPanel(page: Page, delayMs = 0) {
  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") {
      return json(200, {
        profile: {
          level: "intermediario",
          plan: { objective: "10k", startDate: plusDays(-14), endDate: plusDays(56), durationWeeks: 10 },
          screening: null,
        },
      });
    }
    if (path.startsWith("/plan/review/")) return json(200, { due: false, calendarWeek: null, felt: null, advanceSuggested: false });
    if (path.startsWith("/day/")) {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return json(200, dayBody);
    }
    if (path.startsWith("/plan/week/")) return json(200, weekBody);
    if (path.startsWith("/history")) return json(200, { from: plusDays(-6), to: today, weekly: [], sleep: [], pain: [] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
}

const animationName = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).animationName);

test.describe("com movimento", () => {
  test.use({ reducedMotion: "no-preference" });

  test("painel: esqueleto com brilho enquanto carrega e some quando os dados chegam", async ({ page }) => {
    await mockPanel(page, 1_500);
    await page.goto("/painel");

    // Um único aviso para leitor de tela; os blocos cinza ficam ocultos.
    const loading = page.getByRole("status");
    await expect(loading).toContainText("Carregando...");
    await expect(page.locator(".skeleton").first()).toBeVisible();
    await expect.poll(() => animationName(page, ".skeleton")).toBe("shimmer");
    await expect(page.locator('.skeleton[aria-hidden="true"]')).not.toHaveCount(0);

    await expect(page.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
  });
});

test.describe("pedindo menos movimento", () => {
  test.use({ reducedMotion: "reduce" });

  test("painel: o esqueleto fica parado, sem brilho", async ({ page }) => {
    await mockPanel(page, 1_500);
    await page.goto("/painel");

    await expect(page.getByRole("status")).toContainText("Carregando...");
    await expect(page.locator(".skeleton").first()).toBeVisible();
    await expect.poll(() => animationName(page, ".skeleton")).toBe("none");
  });
});
