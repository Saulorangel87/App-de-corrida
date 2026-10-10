import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
// Valor fictício, montado em execução (sem literal que pareça segredo para o gitleaks).
const LINK_CODE = "codigo-de-teste-".repeat(3);

type Reply = { status: number; body?: unknown };
type Calls = { path: string; body: unknown; url: string }[];

/** Simula a API: `replies` define a resposta de cada rota; o resto é 404. */
async function mockApi(page: Page, replies: Record<string, Reply>) {
  const calls: Calls = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ path, body: raw ? JSON.parse(raw) : undefined, url: req.url() });
    if (path === "/auth/me") {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "x" } }) });
    }
    const r = replies[path] ?? { status: 404, body: { error: { code: "NOT_FOUND", message: "x" } } };
    return route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body ?? {}) });
  });
  return calls;
}

const sent: Reply = { status: 202, body: { message: "Enviamos um e-mail." } };
const invalidToken: Reply = { status: 400, body: { error: { code: "INVALID_TOKEN", message: "Link inválido ou expirado." } } };

test("o login leva a 'Esqueci minha senha'", async ({ page }) => {
  await mockApi(page, {});
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/\/esqueci-a-senha$/);
  await expect(page.getByRole("heading", { name: "Esqueceu a senha?" })).toBeVisible();
});

test("esqueci a senha: valida o e-mail, envia e mostra a mensagem neutra", async ({ page }) => {
  const calls = await mockApi(page, { "/auth/forgot-password": sent });
  await page.goto("/esqueci-a-senha");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/forgot-password")).toHaveLength(0);

  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByRole("heading", { name: "Confira seu e-mail" })).toBeVisible();
  await expect(page.getByText("Se existir uma conta com esse e-mail")).toBeVisible();
  expect(calls.find((c) => c.path === "/auth/forgot-password")?.body).toEqual({ email: "ana@exemplo.com" });

  await page.getByRole("button", { name: "Enviar para outro e-mail" }).click();
  await expect(page.getByRole("heading", { name: "Esqueceu a senha?" })).toBeVisible();
});

test("redefinir senha: apaga o token da barra de endereço, confere a confirmação e salva", async ({ page }) => {
  const calls = await mockApi(page, { "/auth/reset-password": { status: 200, body: { message: "ok" } } });
  await page.goto(`/redefinir-senha#token=${LINK_CODE}`);
  await expect(page.getByRole("heading", { name: "Crie uma nova senha" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");

  await page.getByLabel("Nova senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByLabel("Confirmar nova senha").fill("outra-coisa-aqui");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("As senhas não conferem.")).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/reset-password")).toHaveLength(0);

  await page.getByLabel("Confirmar nova senha").fill("Corrida-longa-2026!");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByRole("heading", { name: "Senha alterada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  const call = calls.find((c) => c.path === "/auth/reset-password");
  expect(call?.body).toEqual({ token: LINK_CODE, password: "Corrida-longa-2026!" });
  // o token só viaja no corpo, nunca na URL
  expect(calls.every((c) => !c.url.includes(LINK_CODE))).toBe(true);
});

test("redefinir senha: senha fraca recusada pela API aparece no campo, em português", async ({ page }) => {
  await mockApi(page, {
    "/auth/reset-password": {
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: [{ path: "password", code: "COMMON" }] } },
    },
  });
  await page.goto(`/redefinir-senha#token=${LINK_CODE}`);
  await page.getByLabel("Nova senha", { exact: true }).fill("senha123456");
  await page.getByLabel("Confirmar nova senha").fill("senha123456");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("Essa senha é muito comum. Escolha outra.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crie uma nova senha" })).toBeVisible();
});

test("redefinir senha: sem token ou com link vencido mostra 'link inválido' e leva a pedir outro", async ({ page }) => {
  await mockApi(page, { "/auth/reset-password": invalidToken, "/auth/forgot-password": sent });
  await page.goto("/redefinir-senha");
  await expect(page.getByRole("heading", { name: "Link inválido ou expirado" })).toBeVisible();

  await page.goto(`/redefinir-senha#token=${LINK_CODE}`);
  await page.getByLabel("Nova senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByLabel("Confirmar nova senha").fill("Corrida-longa-2026!");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByRole("heading", { name: "Link inválido ou expirado" })).toBeVisible();
  await page.getByRole("link", { name: "Pedir novo link" }).click();
  await expect(page).toHaveURL(/\/esqueci-a-senha$/);
});

test("confirmar e-mail: confirma uma única vez e oferece entrar", async ({ page }) => {
  const calls = await mockApi(page, { "/auth/verify-email": { status: 200, body: { message: "E-mail confirmado." } } });
  await page.goto(`/verificar-email#token=${LINK_CODE}`);
  await expect(page.getByRole("heading", { name: "E-mail confirmado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/verify-email")).toHaveLength(1);
  expect(calls.find((c) => c.path === "/auth/verify-email")?.body).toEqual({ token: LINK_CODE });
  expect(new URL(page.url()).hash).toBe("");
});

test("confirmar e-mail: link inválido permite reenviar sem revelar se a conta existe", async ({ page }) => {
  const calls = await mockApi(page, { "/auth/verify-email": invalidToken, "/auth/resend-verification": sent });
  await page.goto(`/verificar-email#token=${LINK_CODE}`);
  await expect(page.getByRole("heading", { name: "Não foi possível confirmar" })).toBeVisible();

  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByRole("button", { name: "Reenviar e-mail de confirmação" }).click();
  await expect(page.getByText("Se houver uma conta aguardando confirmação com esse e-mail")).toBeVisible();
  expect(calls.find((c) => c.path === "/auth/resend-verification")?.body).toEqual({ email: "ana@exemplo.com" });
});

test("confirmar e-mail: sem token mostra a falha direto, sem chamar a API", async ({ page }) => {
  const calls = await mockApi(page, {});
  await page.goto("/verificar-email");
  await expect(page.getByRole("heading", { name: "Não foi possível confirmar" })).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/verify-email")).toHaveLength(0);
});
