import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

type Json = Record<string, unknown>;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const today = plusDays(0);
const yesterday = plusDays(-1);

const planInfo = {
  id: "p1", template: "10k-iniciante", calendarWeek: 2, templateWeek: 2, phase: "base",
  isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: yesterday, weekEnd: plusDays(5),
};
const session = (id: string, date: string, over: Json = {}) => ({
  id, date, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" }, kind: "rodagem",
  minutes: 40, maxZone: "Z2", targetRpe: 4, optional: false, note: null, status: "pending", log: null, ...over,
});
// Ontem sem registro, hoje e um treino futuro.
const missed = session("s0", yesterday, { name: { "pt-BR": "Longão de domingo", en: "Sunday long run" }, minutes: 50 });
const run = session("s1", today);
const future = session("s2", plusDays(2), { name: { "pt-BR": "Rodagem de quinta", en: "Thursday run" } });
const decision = (over: Json = {}) => ({
  action: "manter", session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
  blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false, needsCheckin: false,
  message: "Treino mantido.", reasons: [], ...over,
});
const dayBody = (over: Json = {}) => ({
  date: today, plan: planInfo, sessions: [run], checkin: null, decision: decision(), todayName: run.name, questions: [], ...over,
});

async function mockApi(page: Page, sessions: Json[] = [missed, run, future], logPain: Json[] = []) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ method: req.method(), path, body: raw ? JSON.parse(raw) : undefined });
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "10k", startDate: plusDays(-7), endDate: plusDays(50), durationWeeks: 8 }, screening: null } });
    if (path.startsWith("/plan/review/")) return json(200, { due: false, calendarWeek: null, felt: null, advanceSuggested: false });
    if (path.startsWith("/day/")) return json(200, dayBody());
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions });
    const detail = path.match(/^\/workouts\/(\w+)$/);
    if (detail && req.method() === "GET") {
      const s = sessions.find((x) => x.id === detail[1]);
      return s ? json(200, { session: { ...s, ladder: null }, logPain }) : json(404, { error: { code: "NOT_FOUND", message: "x" } });
    }
    if (path.endsWith("/log") && req.method() === "PUT") {
      const nextDay = dayBody({ decision: decision({ message: "Amanhã: rodagem leve." }) });
      return json(200, { session: missed, day: dayBody(), nextDay });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

const putBody = (calls: { method: string; path: string; body: unknown }[]) => calls.find((c) => c.method === "PUT")?.body;

test("registro rápido: o treino de ontem que ficou sem registro é marcado como feito pelo círculo", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByText("1 treino desta semana ficou sem registro. Toque no círculo para dizer se fez ou não.")).toBeVisible();

  await page.getByRole("button", { name: "Registrar: Longão de domingo" }).click();
  const dialog = page.getByRole("dialog", { name: "Longão de domingo" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fiz", exact: true }).click();

  // A duração já vem com o tempo previsto; esforço e a pergunta de dor são obrigatórios.
  await expect(dialog.getByLabel("Duração real (minutos)")).toHaveValue("50");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog.getByText("Responda este campo.")).toHaveCount(2);
  expect(putBody(calls)).toBeUndefined();

  await dialog.getByRole("group", { name: "Como foi o esforço do treino todo?" }).getByText("4", { exact: true }).click();
  await dialog.getByRole("group", { name: "Sentiu dor ou algum mal-estar?" }).getByText("Não", { exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar registro" }).click();

  await expect(dialog.getByText("Registro salvo")).toBeVisible();
  await expect(dialog.getByText("Amanhã: rodagem leve.")).toBeVisible();
  expect(putBody(calls)).toEqual({ completed: true, durationMinutes: 50, srpe: 4, pain: [] });
  await dialog.getByRole("button", { name: "Fechar" }).last().click();
  await expect(dialog).toBeHidden();
});

test("registro rápido: não fiz, sem dor, grava só que não foi feito", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("button", { name: "Registrar: Longão de domingo" }).click();
  const dialog = page.getByRole("dialog", { name: "Longão de domingo" });
  await dialog.getByRole("button", { name: "Não fiz" }).click();
  await expect(dialog.getByLabel("Duração real (minutos)")).toHaveCount(0);
  await dialog.getByRole("group", { name: "Deixou de treinar por dor ou mal-estar?" }).getByText("Não", { exact: true }).click();
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog.getByText("Registro salvo")).toBeVisible();
  expect(putBody(calls)).toEqual({ completed: false, pain: [] });
});

test("registro rápido: com dor ou mal-estar não salva ali e leva ao registro completo", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("button", { name: "Registrar: Longão de domingo" }).click();
  const dialog = page.getByRole("dialog", { name: "Longão de domingo" });
  await dialog.getByRole("button", { name: "Não fiz" }).click();
  await dialog.getByRole("group", { name: "Deixou de treinar por dor ou mal-estar?" }).getByText("Sim", { exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Salvar registro" })).toHaveCount(0);
  await dialog.getByRole("link", { name: "Continuar no registro completo" }).click();
  await expect(page).toHaveURL(/\/registro\/s0$/);
  await expect(page.getByRole("heading", { name: "Longão de domingo" })).toBeVisible();
  expect(putBody(calls)).toBeUndefined();
});

test("registro rápido: treino futuro não abre registro", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await expect(page.getByRole("button", { name: "Registrar: Rodagem de quinta" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar: Rodagem leve" })).toBeVisible(); // hoje pode
});

test("registro já feito: o círculo leva à edição, que reabre a dor informada para não apagá-la", async ({ page }) => {
  const logged = { ...missed, status: "completed", log: { completed: true, durationMinutes: 50, distanceKm: null, srpe: 6, notes: null } };
  const calls = await mockApi(page, [logged, run, future], [
    { region: "canela_e", moment: "treino", intensity: 5, type: "pontada", bonePoint: true, highRiskBoneSite: true },
    { region: "geral", moment: "treino", intensity: 0, cardio: { palpitations: true } },
  ]);
  await page.goto("/painel");
  await expect(page.getByText(/ficou sem registro/)).toHaveCount(0);
  await page.getByRole("button", { name: "Ver o registro: Longão de domingo" }).click();
  const dialog = page.getByRole("dialog", { name: "Longão de domingo" });
  await expect(dialog.getByText("Você marcou este treino como feito.")).toBeVisible();
  await dialog.getByRole("link", { name: "Alterar registro do treino" }).click();
  await expect(page).toHaveURL(/\/registro\/s0$/);

  await expect(page.getByRole("button", { name: "Canela esquerda" })).toHaveAttribute("aria-pressed", "true");
  const canela = page.getByRole("region", { name: "Canela esquerda" });
  await expect(canela.getByRole("radio", { name: "5", exact: true })).toBeChecked();
  await expect(canela.getByLabel("Dói em um ponto do osso (ao tocar ou ao apoiar)")).toBeChecked();
  await expect(page.getByLabel("Palpitações irregulares")).toBeChecked();

  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("heading", { name: "Registro salvo" })).toBeVisible();
  expect(putBody(calls)).toEqual({
    completed: true, durationMinutes: 50, srpe: 6,
    pain: [
      { region: "canela_e", moment: "treino", intensity: 5, type: "pontada", bonePoint: true },
      { region: "geral", moment: "treino", intensity: 0, cardio: { palpitations: true } },
    ],
  });
});

test("plano completo: o círculo também registra", async ({ page }) => {
  await mockApi(page);
  await page.route(`${API}/plan/overview/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: { objective: "10k", level: "iniciante", startDate: plusDays(-8), endDate: plusDays(50) },
        weeks: [{ calendarWeek: 2, startDate: yesterday, endDate: plusDays(5), state: "current", projected: false, phase: "base", isRecovery: false, isTaper: false, isRaceWeek: false, ladderStage: null, sessions: [missed, run, future] }],
      }),
    }),
  );
  await page.goto("/plano");
  await page.getByRole("button", { name: "Registrar: Longão de domingo" }).click();
  await expect(page.getByRole("dialog", { name: "Longão de domingo" }).getByRole("button", { name: "Fiz", exact: true })).toBeVisible();
});
