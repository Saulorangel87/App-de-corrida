import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const today = plusDays(0);

const run = {
  id: "s1", date: today, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" }, kind: "rodagem",
  minutes: 40, maxZone: "Z2", targetRpe: 4, optional: false, note: null, status: "pending", log: null,
};
const decision = {
  action: "manter", session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
  blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false, needsCheckin: false,
  message: "Treino mantido.", reasons: [],
};

/** Semana atual começando `daysIn` dias atrás; a anterior começa 7 dias antes dela. */
async function mockApi(page: Page, daysIn: number) {
  const weekStart = plusDays(-daysIn);
  const prevStart = plusDays(-daysIn - 7);
  const planInfo = {
    id: "p1", template: "10k-iniciante", calendarWeek: 3, templateWeek: 3, phase: "base",
    isRecovery: false, isTaper: false, isRaceWeek: false, weekStart, weekEnd: plusDays(6 - daysIn),
  };
  const history = {
    from: plusDays(-13), to: today,
    sleep: [
      { date: plusDays(-daysIn - 6), hours: 7, quality: 4 },
      { date: plusDays(-daysIn - 5), hours: 8, quality: 4 },
      { date: plusDays(-daysIn), hours: 4, quality: 2 }, // semana atual: fica fora
    ],
    pain: [
      { date: plusDays(-daysIn - 4), region: "joelho", intensity: 3, moment: "treino" },
      { date: plusDays(-daysIn - 4), region: "canela_e", intensity: 2, moment: "treino" },
      { date: plusDays(-daysIn - 2), region: "geral", intensity: 0, moment: "treino" }, // só sintoma, sem dor
    ],
    weekly: [
      { weekStart: prevStart, plannedSessions: 4, completedSessions: 3, adherencePct: 75, minutes: 135, srpeLoad: 540, paceKm: 15, paceMinutes: 90 },
      { weekStart, plannedSessions: 1, completedSessions: 0, adherencePct: 0, minutes: 0, srpeLoad: 0, paceKm: 0, paceMinutes: 0 },
    ],
  };
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "10k", startDate: plusDays(-20), endDate: plusDays(50), durationWeeks: 10 }, screening: null } });
    if (path.startsWith("/plan/review/")) return json(200, { due: false, calendarWeek: null, felt: null, advanceSuggested: false });
    if (path.startsWith("/day/")) return json(200, { date: today, plan: planInfo, sessions: [run], checkin: null, decision, todayName: run.name, questions: [] });
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions: [run] });
    if (path === "/history") return json(200, history);
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
}

test("resumo da semana: no começo da semana nova mostra só o que foi registrado e some com Entendi", async ({ page }) => {
  await mockApi(page, 1);
  await page.goto("/painel");
  const card = page.getByRole("region", { name: "Como foi a semana 2" });
  await expect(card).toBeVisible();
  const value = (label: string) => card.getByRole("term").filter({ hasText: label }).locator("xpath=following-sibling::dd[1]");
  await expect(value("Treinos feitos")).toHaveText("3 de 4");
  await expect(value("Tempo em treino")).toHaveText("135 min");
  await expect(value("Distância")).toHaveText("15 km");
  await expect(value("Ritmo médio")).toHaveText("6:00 /km");
  await expect(value("Sono médio")).toHaveText("7,5 h");
  await expect(value("Dor")).toHaveText("1 dia");

  await card.getByRole("button", { name: "Entendi" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rodagem leve" }).or(page.getByText("Treino de hoje")).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Como foi a semana 2" })).toHaveCount(0);
});

test("resumo da semana: passados os primeiros dias da semana, não aparece", async ({ page }) => {
  await mockApi(page, 3);
  await page.goto("/painel");
  await expect(page.getByText("Treino de hoje")).toBeVisible();
  await expect(page.getByRole("region", { name: "Como foi a semana 2" })).toHaveCount(0);
});
