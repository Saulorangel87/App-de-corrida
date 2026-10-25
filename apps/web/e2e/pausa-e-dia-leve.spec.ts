import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

type Json = Record<string, unknown>;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const today = plusDays(0);

const planInfo = {
  id: "p1", template: "10k-iniciante", calendarWeek: 2, templateWeek: 2, phase: "base",
  isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: plusDays(-1), weekEnd: plusDays(5),
};
const session = (id: string, date: string, over: Json = {}) => ({
  id, date, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" }, kind: "rodagem",
  minutes: 40, maxZone: "Z2", targetRpe: 4, optional: false, note: null, status: "pending", log: null, paused: false, ...over,
});
const run = session("s1", today);
const decision = (over: Json = {}) => ({
  action: "manter", session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
  blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false, needsCheckin: false,
  message: "Siga o treino de hoje como planejado.", reasons: [], ...over,
});
const dayBody = (over: Json = {}) => ({
  date: today, plan: planInfo, sessions: [run], checkin: null, decision: decision(), todayName: run.name, questions: [],
  lighterRequested: false, plannedPause: null, ...over,
});
const lighterDay = dayBody({
  lighterRequested: true,
  decision: decision({
    action: "reduzir", session: { slug: "rodagem-leve", minutes: 32, maxZone: "Z1", changed: true },
    message: "Você pediu um dia mais leve: o treino de hoje ficou 20% mais curto e sem trechos fortes.",
  }),
});

async function mockPanel(page: Page, opts: { day?: Json; sessions?: Json[] } = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  let day = opts.day ?? dayBody();
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ method: req.method(), path, body: raw ? JSON.parse(raw) : undefined });
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "10k", startDate: plusDays(-7), endDate: plusDays(50), durationWeeks: 8 }, screening: null } });
    if (path.startsWith("/plan/review/")) return json(200, { due: false, calendarWeek: null, felt: null, advanceSuggested: false });
    if (path.endsWith("/lighter") && req.method() === "PUT") {
      day = (JSON.parse(raw ?? "{}") as { on: boolean }).on ? lighterDay : dayBody();
      return json(200, day);
    }
    if (path.startsWith("/day/")) return json(200, day);
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions: opts.sessions ?? [run] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

test("não estou 100%: pede um dia mais leve, o treino de hoje muda e dá para desfazer", async ({ page }) => {
  const calls = await mockPanel(page);
  await page.goto("/painel");
  await page.getByRole("button", { name: "Não estou 100% hoje" }).click();
  await expect(page.getByText("Você pediu um dia mais leve: o treino de hoje ficou 20% mais curto e sem trechos fortes.").first()).toBeVisible();
  await expect(page.getByText("32 min").first()).toBeVisible();
  expect(calls.find((c) => c.method === "PUT")).toMatchObject({ path: `/day/${today}/lighter`, body: { on: true } });

  await page.getByRole("button", { name: "Desfazer e voltar ao treino do plano" }).click();
  await expect(page.getByRole("button", { name: "Não estou 100% hoje" })).toBeVisible();
  expect(calls.filter((c) => c.method === "PUT").pop()).toMatchObject({ body: { on: false } });
});

test("não estou 100%: não aparece quando o dia já foi reduzido por outro motivo ou o treino foi registrado", async ({ page }) => {
  await mockPanel(page, { day: dayBody({ decision: decision({ action: "regenerativo" }) }) });
  await page.goto("/painel");
  await expect(page.getByText("Siga o treino de hoje como planejado.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Não estou 100% hoje" })).toHaveCount(0);

  const logged = { ...run, log: { completed: true, durationMinutes: 40, distanceKm: 6, srpe: 4, notes: null } };
  await mockPanel(page, { day: dayBody({ sessions: [logged] }), sessions: [logged] });
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Plano da semana" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Não estou 100% hoje" })).toHaveCount(0);
});

test("pausa planejada: o painel avisa e os treinos da pausa aparecem como pausa, sem contar como perdidos", async ({ page }) => {
  const paused = session("s0", plusDays(-1), { paused: true, name: { "pt-BR": "Longão de domingo", en: "Sunday long run" } });
  await mockPanel(page, {
    day: dayBody({ plannedPause: { startDate: plusDays(-1), endDate: plusDays(3) }, sessions: [] }),
    sessions: [paused, session("s1", today, { paused: true })],
  });
  await page.goto("/painel");
  await expect(page.getByText(/Você está em pausa planejada até/)).toBeVisible();
  await expect(page.getByText("Pausa planejada", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/ficou sem registro/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar: Longão de domingo" })).toHaveCount(0);
});

const overview = {
  plan: { objective: "10k", level: "iniciante", startDate: plusDays(-7), endDate: plusDays(50), durationWeeks: 8 },
  weeks: [{
    calendarWeek: 2, templateWeek: 2, startDate: plusDays(-1), endDate: plusDays(5), phase: "base", isRecovery: false,
    isTaper: false, isRaceWeek: false, ladderStage: null, state: "current", projected: false, sessions: [run],
  }],
};

async function mockPlan(page: Page, initial: Json) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  let state = initial;
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ method: req.method(), path, body: raw ? JSON.parse(raw) : undefined });
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { planNotice: null } });
    if (path.startsWith("/plan/overview/")) return json(200, overview);
    if (path === "/plan/pause" && req.method() === "GET") return json(200, state);
    if (path === "/plan/pause" && req.method() === "PUT") {
      const body = JSON.parse(raw ?? "{}") as { startDate: string; endDate: string };
      if (body.endDate > plusDays(50)) return json(400, { error: { code: "VALIDATION_ERROR", message: "x", details: [{ path: "endDate", code: "after_plan_end" }] } });
      state = { pause: { startDate: body.startDate, endDate: body.endDate, started: false }, returnBand: "congela" };
      return json(200, state);
    }
    if (path === "/plan/pause" && req.method() === "DELETE") {
      state = { pause: null, returnBand: null };
      return json(200, state);
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

test("pausa planejada: marca as datas, mostra como fica a volta e cancela", async ({ page }) => {
  const calls = await mockPlan(page, { pause: null, returnBand: null });
  await page.goto("/plano");
  const card = page.locator("#pausa");
  await expect(card.getByRole("heading", { name: "Pausa planejada" })).toBeVisible();
  await card.getByLabel("Primeiro dia sem treino").fill(plusDays(2));
  await card.getByLabel("Último dia sem treino").fill(plusDays(10));
  await card.getByRole("button", { name: "Marcar pausa" }).click();
  await expect(card.getByText("Pausa salva.")).toBeVisible();
  await expect(card.getByText("O plano repete o volume da última semana antes de voltar a subir.")).toBeVisible();
  expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ startDate: plusDays(2), endDate: plusDays(10), today });

  await card.getByRole("button", { name: "Cancelar a pausa" }).click();
  await expect(card.getByRole("button", { name: "Marcar pausa" })).toBeVisible();
  expect(calls.find((c) => c.method === "DELETE")?.body).toEqual({ today });
});

test("pausa planejada: volta antes do início e fim depois do plano explicam o problema", async ({ page }) => {
  await mockPlan(page, { pause: null, returnBand: null });
  await page.goto("/plano");
  const card = page.locator("#pausa");
  await card.getByLabel("Primeiro dia sem treino").fill(plusDays(5));
  await card.getByLabel("Último dia sem treino").fill(plusDays(3));
  await expect(card.getByText("O último dia vem depois do primeiro.")).toBeVisible();
  await card.getByLabel("Último dia sem treino").fill(plusDays(80));
  await card.getByRole("button", { name: "Marcar pausa" }).click();
  await expect(card.getByText("A pausa não pode passar do fim do seu plano.")).toBeVisible();
});
