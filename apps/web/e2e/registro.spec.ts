import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = iso(new Date());

const planInfo = {
  id: "p1", template: "10k-iniciante", calendarWeek: 2, templateWeek: 2, phase: "base",
  isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: today, weekEnd: iso(new Date(Date.now() + 6 * 86_400_000)),
};
const run = {
  id: "s1", date: today, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" },
  kind: "rodagem", minutes: 40, maxZone: "Z2", targetRpe: 4, optional: false, note: null, status: "pending", log: null,
};
const yesterday = iso(new Date(Date.now() - 86_400_000));
const lastWeekRun = { ...run, id: "s0", date: yesterday, slug: "longao", name: { "pt-BR": "Longão de domingo", en: "Sunday long run" } };
const decision = (over: Record<string, unknown> = {}) => ({
  action: "manter", session: { slug: "rodagem-leve", minutes: 40, maxZone: "Z2", changed: false },
  blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false, needsCheckin: false,
  message: "Treino mantido.", reasons: [], ...over,
});
const dayBody = (over: Record<string, unknown> = {}) => ({
  date: today, plan: planInfo, sessions: [run], checkin: null, decision: decision(), todayName: run.name, questions: [], ...over,
});

async function mockApi(page: Page, opts: { logReply?: Record<string, unknown> } = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ method: req.method(), path, body: raw ? JSON.parse(raw) : undefined });
    const json = (status: number, data: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "10k", endDate: today } } });
    if (path.startsWith("/day/")) return json(200, dayBody());
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions: [run] });
    if (path === "/workouts/s1" && req.method() === "GET") return json(200, { session: { ...run, ladder: null } });
    // Treino de ontem, que já pertence à semana anterior do plano (não aparece em /plan/week).
    if (path === "/workouts/s0" && req.method() === "GET") return json(200, { session: { ...lastWeekRun, ladder: null } });
    if (path === "/workouts/s1/log" && req.method() === "PUT") {
      const nextDay = dayBody({ decision: decision({ message: "Amanhã: rodagem leve." }) });
      return json(200, opts.logReply ?? { session: run, day: dayBody(), nextDay });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

const putBody = (calls: { method: string; path: string; body: unknown }[]) =>
  calls.find((c) => c.method === "PUT" && c.path === "/workouts/s1/log")?.body;

test("pós-treino sem dor: registra duração e esforço e mostra o que muda amanhã", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("link", { name: "Registrar treino" }).first().click();
  await expect(page).toHaveURL(/\/registro\/s1$/);
  await expect(page.getByRole("heading", { name: "Rodagem leve" })).toBeVisible();

  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Sim", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Responda este campo.")).toHaveCount(2); // duração e esforço
  expect(putBody(calls)).toBeUndefined();

  await page.getByLabel("Duração real (minutos)").fill("42");
  await expect(page.getByText("Responda este campo.")).toHaveCount(1);
  const top = async (label: string) => (await page.getByLabel(label).boundingBox())!.y;
  expect(await top("Duração real (minutos)")).toBe(await top("Distância (km) — opcional"));
  await page.getByLabel("Distância (km) — opcional").fill("6,5");
  await page.getByRole("group", { name: "Como foi o esforço do treino todo?" }).getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar registro" }).click();

  await expect(page.getByRole("heading", { name: "Registro salvo" })).toBeVisible();
  await expect(page.getByText("Amanhã: rodagem leve.")).toBeVisible();
  expect(putBody(calls)).toEqual({ completed: true, durationMinutes: 42, distanceKm: 6.5, srpe: 4, pain: [] });
});

test("erro some quando a pessoa responde, e duração e distância ficam alinhadas", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/registro/s1");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Responda este campo.")).toHaveCount(1);

  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Sim", { exact: true }).click();
  await expect(page.getByText("Responda este campo.")).toHaveCount(0);

  const top = async (label: string) => (await page.getByLabel(label).boundingBox())!.y;
  expect(await top("Duração real (minutos)")).toBe(await top("Distância (km) — opcional"));

  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Responda este campo.")).toHaveCount(2);
  await page.getByLabel("Duração real (minutos)").fill("30");
  await expect(page.getByText("Responda este campo.")).toHaveCount(1);
  await page.getByRole("group", { name: "Como foi o esforço do treino todo?" }).getByText("3", { exact: true }).click();
  await expect(page.getByText("Responda este campo.")).toHaveCount(0);
  expect(putBody(calls)).toBeUndefined();
});

test("pós-treino não feito: não pede duração nem esforço", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/registro/s1");
  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Não", { exact: true }).click();
  await expect(page.getByLabel("Duração real (minutos)")).toHaveCount(0);
  await page.getByLabel("Comentário (opcional)").fill("viagem");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("heading", { name: "Registro salvo" })).toBeVisible();
  expect(putBody(calls)).toEqual({ completed: false, notes: "viagem", pain: [] });
});

test("pós-treino com dor: mapa do corpo, perguntas do local e sintoma de peito", async ({ page }) => {
  const calls = await mockApi(page, {
    logReply: {
      session: run,
      day: dayBody({ decision: decision({ urgent: true, refer: true, blockRunning: true, action: "interromper_e_encaminhar" }) }),
      nextDay: dayBody({ decision: decision({ blockRunning: true, refer: true, urgent: true, message: "Pare e procure atendimento. [R-TRI-12]" }) }),
    },
  });
  await page.goto("/registro/s1");
  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Sim", { exact: true }).click();
  await page.getByLabel("Duração real (minutos)").fill("30");
  await page.getByRole("group", { name: "Como foi o esforço do treino todo?" }).getByText("6", { exact: true }).click();

  // O mapa: botões por região e lado; o lado direito do atleta é o "d".
  await page.getByRole("button", { name: "Joelho direito" }).first().click();
  const card = page.getByRole("region", { name: "Joelho direito" });
  await expect(card).toBeVisible();

  // sem intensidade, não envia
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Informe a intensidade da dor de cada local marcado.")).toBeVisible();
  expect(putBody(calls)).toBeUndefined();

  await card.getByRole("group", { name: "Qual a intensidade da dor?" }).getByText("6", { exact: true }).click();
  await card.getByRole("group", { name: "Como é a dor?" }).getByText("Pontada / aguda", { exact: true }).click();
  await card.getByLabel(/mudou a minha passada/).check();
  await card.getByLabel(/ponto do osso/).check();
  await page.getByLabel("Dor ou aperto no peito").check();
  await page.getByRole("button", { name: "Salvar registro" }).click();

  await expect(page.getByRole("heading", { name: "Registro salvo" })).toBeVisible();
  await expect(page.getByRole("alert").first()).toContainText("192 (SAMU)");
  expect(putBody(calls)).toEqual({
    completed: true,
    durationMinutes: 30,
    srpe: 6,
    pain: [
      { region: "joelho_d", moment: "treino", intensity: 6, type: "pontada", changedStride: true, bonePoint: true },
      { region: "geral", moment: "treino", intensity: 0, cardio: { chestPain: true } },
    ],
  });
});

test("mapa do corpo: tocar de novo desmarca e o teclado funciona", async ({ page }) => {
  await mockApi(page);
  await page.goto("/registro/s1");
  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Não", { exact: true }).click();
  const canela = page.getByRole("button", { name: "Canela esquerda" });
  await canela.focus();
  await page.keyboard.press("Enter");
  await expect(canela).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Canela esquerda" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(canela).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("region", { name: "Canela esquerda" })).toHaveCount(0);
});

test("mapa do corpo: vista de costas tem as regiões de trás", async ({ page }) => {
  await mockApi(page);
  await page.goto("/registro/s1");
  await page.getByRole("group", { name: "Você fez este treino?" }).getByText("Não", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Panturrilha direita" })).toHaveCount(0);
  await page.getByRole("group", { name: "Vista do corpo" }).getByRole("button", { name: "Costas" }).click();
  await page.getByRole("button", { name: "Panturrilha direita" }).click();
  await page.getByRole("button", { name: "Lombar / sacro" }).click();
  await expect(page.getByRole("region", { name: "Panturrilha direita" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lombar / sacro" })).toBeVisible();
});

test("treino que não existe mostra aviso e volta ao painel", async ({ page }) => {
  await mockApi(page);
  await page.goto("/registro/outro-id");
  await expect(page.getByText("Não encontramos este treino.")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("treino da semana anterior do plano continua registrável (virada de semana)", async ({ page }) => {
  await mockApi(page);
  await page.goto("/registro/s0");
  await expect(page.getByRole("heading", { name: "Longão de domingo" })).toBeVisible();
  await expect(page.getByText("Não encontramos este treino.")).toHaveCount(0);
});
