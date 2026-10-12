import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = iso(new Date());
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

const planInfo = {
  id: "p1", template: "10k-iniciante", calendarWeek: 3, templateWeek: 3, phase: "base",
  isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: today, weekEnd: plusDays(6),
};
const run = {
  id: "s1", date: today, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" },
  kind: "rodagem", minutes: 40, maxZone: "Z2", targetRpe: 4, optional: false, note: null, status: "pending", log: null,
};
const dayBody = {
  date: today, plan: planInfo, sessions: [run], checkin: null, todayName: run.name, questions: [],
  decision: {
    action: "manter", session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
    blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false, needsCheckin: false,
    message: "Mantenha o treino planejado.", reasons: [],
  },
};

/** `createdOn` antigo = conta que existia antes das correções; novo = conta criada depois. */
async function mockApi(page: Page, createdOn: string) {
  const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR", createdOn };
  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") {
      return json(200, {
        profile: { level: "intermediario", plan: { objective: "10k", startDate: plusDays(-14), endDate: plusDays(56), durationWeeks: 10 }, screening: null },
      });
    }
    if (path.startsWith("/plan/review/")) return json(200, { due: false, calendarWeek: 3, felt: null, advanceSuggested: false });
    if (path.startsWith("/day/")) return json(200, dayBody);
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions: [run] });
    if (path.startsWith("/history")) return json(200, { sleep: null, workouts: [], weeks: [] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
}

test("novidades: conta antiga vê o aviso no painel, 'Entendi' some e continua assim ao recarregar", async ({ page }) => {
  await mockApi(page, "2026-10-01");
  await page.goto("/painel");
  const banner = page.getByRole("region", { name: "Novidades do app" });
  await expect(banner).toBeVisible();
  await expect(banner.getByText("Prova perto demais para o plano")).toBeVisible();
  await expect(banner.getByText("Registrar o treino de domingo na segunda-feira")).toBeVisible();
  await expect(banner.getByText("Dor ao caminhar e volta à corrida")).toBeVisible();
  // O tipo aparece em texto, não só em cor.
  await expect(banner.getByText("Correção").first()).toBeVisible();
  await expect(banner.getByText("Limitação do app")).toBeVisible();

  await banner.getByRole("button", { name: "Entendi" }).click();
  await expect(page.getByRole("region", { name: "Novidades do app" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Novidades do app" })).toHaveCount(0);
});

test("novidades: a página guarda o histórico mesmo depois do 'Entendi'", async ({ page }) => {
  await mockApi(page, "2026-10-01");
  await page.goto("/painel");
  await page.getByRole("button", { name: "Entendi" }).click();
  await page.goto("/novidades");
  await expect(page.getByRole("heading", { name: "Novidades" })).toBeVisible();
  await expect(page.getByText("Prova perto demais para o plano")).toBeVisible();
  await expect(page.getByText("Dor ao caminhar e volta à corrida")).toBeVisible();
});

test("novidades: conta criada depois das correções não recebe aviso de erro que já nasceu corrigido", async ({ page }) => {
  await mockApi(page, "2026-10-13");
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Novidades do app" })).toHaveCount(0);
  await page.goto("/novidades");
  await expect(page.getByText("Ainda não há novidades para você.")).toBeVisible();
});
