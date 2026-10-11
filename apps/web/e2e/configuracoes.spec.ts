import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
const today = new Date().toLocaleDateString("sv-SE");

type Call = { method: string; path: string; body: unknown };

async function mockApi(page: Page) {
  const calls: Call[] = [];
  let pause: { cause: string | null; declaredOn: string | null; clearedByProfessionalOn: string | null } = {
    cause: null,
    declaredOn: null,
    clearedByProfessionalOn: null,
  };
  let sessions = [
    { id: "s-atual", createdAt: `${today}T10:00:00Z`, lastSeenAt: `${today}T10:00:00Z`, userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537", current: true },
    { id: "s-outra", createdAt: `${today}T08:00:00Z`, lastSeenAt: `${today}T08:00:00Z`, userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537", current: false },
  ];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ method: req.method(), path, body });
    const json = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data ?? {}) });

    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { nextEvaluationDate: "2027-01-10", pause, plan: null } });
    if (path === "/auth/sessions" && req.method() === "GET") return json(200, { sessions });
    if (path.startsWith("/auth/sessions/") && req.method() === "DELETE") {
      sessions = sessions.filter((s) => s.id !== path.split("/")[3]);
      return route.fulfill({ status: 204 });
    }
    if (path === "/profile/pause" && req.method() === "PUT") {
      pause = { cause: (body as { cause: string }).cause, declaredOn: today, clearedByProfessionalOn: null };
      return json(200, pause);
    }
    if (path === "/profile/professional-clearance") {
      pause = { ...pause, clearedByProfessionalOn: (body as { date: string }).date };
      return json(200, pause);
    }
    if (path === "/account/export") return json(200, { exportedAt: today, account: { email: user.email }, dailyCheckins: [] });
    if (path === "/auth/account" && req.method() === "DELETE") return route.fulfill({ status: 204 });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

test("configurações: conta, aparelhos e encerrar outra sessão", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { name: "Perfil e configurações" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Ana Corredora")).toBeVisible();
  await expect(page.getByRole("main").getByText("ana@exemplo.com")).toBeVisible();
  await expect(page.getByText("Chrome · Windows")).toBeVisible();
  await expect(page.getByText("Este aparelho")).toBeVisible();
  await expect(page.getByText("Chrome · Android")).toBeVisible();

  await page.getByRole("button", { name: "Encerrar" }).click();
  await expect(page.getByText("Chrome · Android")).toHaveCount(0);
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/auth/sessions/s-outra")).toBe(true);
  // a sessão atual não tem botão de encerrar aqui (para sair, use "Sair")
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("pausa por dor pede a liberação profissional e a registra", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await expect(page.getByRole("button", { name: "Pausar os treinos" })).toBeDisabled();
  await page.getByRole("group", { name: "O que aconteceu?" }).getByText("Dor", { exact: true }).click();
  await page.getByRole("button", { name: "Pausar os treinos" }).click();

  await expect(page.getByText(/Treinos pausados por dor desde/)).toBeVisible();
  expect(calls.find((c) => c.path === "/profile/pause")?.body).toEqual({ cause: "dor", date: today });

  await expect(page.getByRole("button", { name: "Registrar liberação" })).toBeDisabled();
  await page.getByLabel("Data da avaliação").fill(today);
  await page.getByRole("button", { name: "Registrar liberação" }).click();
  await expect(page.getByText(/Liberação registrada em/)).toBeVisible();
  expect(calls.find((c) => c.path === "/profile/professional-clearance")?.body).toEqual({ date: today });
});

test("baixar meus dados gera o arquivo JSON no aparelho", async ({ page }) => {
  await mockApi(page);
  await page.goto("/configuracoes");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar meus dados" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("meus-dados-lets-go-run.json");
});

test("excluir a conta exige senha e confirmação e leva ao login", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  const del = page.getByRole("button", { name: "Excluir tudo agora" });
  await expect(del).toBeDisabled();
  await page.getByLabel("Sua senha, para confirmar").fill("minha-senha-longa");
  await expect(del).toBeDisabled();
  await page.getByLabel("Entendo que isso não pode ser desfeito.").check();
  await expect(del).toBeEnabled();
  await del.click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(calls.find((c) => c.method === "DELETE" && c.path === "/auth/account")?.body).toEqual({ password: "minha-senha-longa" });
});

test("celular: o cabeçalho cabe e a tela não rola para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page);
  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { name: "Perfil e configurações" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Configurações" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});
