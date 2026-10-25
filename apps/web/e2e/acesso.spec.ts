import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

type Mock = { status: number; body: unknown };

/** Simula a API: sem sessão por padrão; `login` e `register` definem as respostas. */
async function mockApi(page: Page, opts: { login?: Mock; register?: Mock } = {}) {
  let signedIn = false;
  const calls: { path: string; body: unknown }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const raw = req.postData();
    calls.push({ path, body: raw ? JSON.parse(raw) : undefined });
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") {
      return signedIn ? json(200, { user }) : json(401, { error: { code: "UNAUTHORIZED", message: "x" } });
    }
    if (path === "/auth/login") {
      const res = opts.login ?? { status: 200, body: { user } };
      if (res.status === 200) signedIn = true;
      return json(res.status, res.body);
    }
    if (path === "/auth/register") {
      const res = opts.register ?? { status: 202, body: { message: "Enviamos um e-mail para confirmar o cadastro." } };
      return json(res.status, res.body);
    }
    if (path === "/auth/resend-verification") return json(202, { message: "ok" });
    if (path === "/profile") return json(200, { profile: { plan: null } }); // quem já fez a entrevista vê o painel
    if (path.startsWith("/day/")) return json(200, { plan: null, sessions: [], checkin: null, decision: {}, questions: [] });
    if (path.startsWith("/plan/week/")) return json(200, { plan: null, sessions: [] });
    if (path === "/auth/logout") {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
  return calls;
}

test("login em português, com rótulos ligados aos campos e sem erro no console", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await mockApi(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: /Bom te ver de novo/ })).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Entrar" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  // A raiz pergunta ao servidor quem está logado; o 401 de quem não entrou é esperado.
  expect(errors.filter((e) => !/status of 401/.test(e))).toEqual([]);
});

test("troca para inglês e lembra a escolha", async ({ page }) => {
  await mockApi(page);
  await page.goto("/entrar");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Good to see you again/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good to see you again/ })).toBeVisible();
});

test("campos vazios mostram erro e não chamam a API", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Informe a senha.")).toBeVisible();
  expect(calls.filter((c) => c.path === "/auth/login")).toHaveLength(0);
});

test("entra e chega ao painel; sair volta ao login", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ANA@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByLabel("Manter conectado neste dispositivo").check();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible();
  expect(calls.find((c) => c.path === "/auth/login")?.body).toMatchObject({ email: "ana@exemplo.com", rememberMe: true });

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test("credenciais erradas: mensagem traduzida pelo código", async ({ page }) => {
  await mockApi(page, {
    login: { status: 401, body: { error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." } } },
  });
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("errada-errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);
  // Senha errada não é "e-mail não confirmado": não oferece reenviar a confirmação.
  await expect(page.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toHaveCount(0);
});

test("servidor fora do ar com internet: não culpa a conexão da pessoa", async ({ page }) => {
  await mockApi(page);
  await page.route(`${API}/auth/login`, (route) => route.abort("connectionrefused"));
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("errada-errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "O servidor não respondeu. Tente de novo em instantes." })).toBeVisible();
  await expect(page.getByText("Verifique sua internet")).toHaveCount(0);
});

test("login recusado por e-mail não confirmado oferece reenviar a confirmação, sem sair da tela", async ({ page }) => {
  const calls = await mockApi(page, {
    login: { status: 403, body: { error: { code: "EMAIL_NOT_VERIFIED", message: "x" } } },
  });
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Confirme seu e-mail antes de entrar." })).toBeVisible();

  await page.getByRole("button", { name: "Reenviar e-mail de confirmação" }).click();
  const done = page.getByTestId("resend-done");
  await expect(done).toContainText("enviamos outro link");
  await expect(done).toContainText("caixa de spam");
  // O endereço vai no corpo da requisição, nunca na URL.
  expect(calls.find((c) => c.path === "/auth/resend-verification")?.body).toEqual({ email: "ana@exemplo.com" });
  await expect(page).toHaveURL(/\/entrar$/);
});

test("depois do cadastro avisa do spam e permite reenviar a confirmação", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrar");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Ana Corredora");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByLabel("Declaro que tenho 18 anos ou mais.").check();
  await page.getByLabel(/Li e aceito os Termos de Uso e a Política de Privacidade/).check();
  await page.getByLabel(/Autorizo o tratamento dos meus dados de saúde/).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Enviamos um e-mail");
  await expect(status).toContainText("caixa de spam ou lixo eletrônico");

  await page.getByRole("button", { name: "Reenviar e-mail de confirmação" }).click();
  await expect(page.getByTestId("resend-done")).toBeVisible();
  expect(calls.find((c) => c.path === "/auth/resend-verification")?.body).toEqual({ email: "ana@exemplo.com" });
});

test("verificar e-mail sem link: pedir outro mostra o aviso do spam", async ({ page }) => {
  await mockApi(page);
  await page.goto("/verificar-email");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByRole("button", { name: "Reenviar e-mail de confirmação" }).click();
  await expect(page.getByText("enviamos outro link")).toBeVisible();
  await expect(page.getByText("caixa de spam ou lixo eletrônico")).toBeVisible();
});

test("cadastro exige os três aceites e envia idioma e declaração de 18 anos", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/entrar");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Ana Corredora");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("Corrida-longa-2026!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText("Necessário para criar a conta.")).toHaveCount(3);
  expect(calls.filter((c) => c.path === "/auth/register")).toHaveLength(0);

  await page.getByLabel("Declaro que tenho 18 anos ou mais.").check();
  await page.getByLabel(/Li e aceito os Termos de Uso e a Política de Privacidade/).check();
  await page.getByLabel(/Autorizo o tratamento dos meus dados de saúde/).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("status")).toContainText("Enviamos um e-mail");
  expect(calls.find((c) => c.path === "/auth/register")?.body).toMatchObject({
    name: "Ana Corredora",
    email: "ana@exemplo.com",
    language: "pt-BR",
    confirmAdult: true,
    acceptTerms: true,
    acceptHealthData: true,
  });
});

test("cadastro: senha recusada pelo servidor mostra o motivo no campo da senha", async ({ page }) => {
  await mockApi(page, {
    register: {
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", message: "x", details: [{ path: "password", code: "CONTAINS_EMAIL" }] } },
    },
  });
  await page.goto("/entrar");
  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Nome completo").fill("Conta teste");
  await page.getByLabel("E-mail", { exact: true }).fill("contateste@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("contateste123");
  await page.getByLabel("Declaro que tenho 18 anos ou mais.").check();
  await page.getByLabel(/Li e aceito os Termos de Uso e a Política de Privacidade/).check();
  await page.getByLabel(/Autorizo o tratamento dos meus dados de saúde/).check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText("A senha não pode conter partes do seu e-mail.")).toBeVisible();
  await expect(page.getByText("Confira os dados informados.")).toHaveCount(0);
});

test("celular: a foto do desktop não é baixada e não há rolagem horizontal", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  const images: string[] = [];
  page.on("request", (r) => /login-\d+.*\.(avif|webp|jpg)/.test(r.url()) && images.push(r.url()));
  await mockApi(page);
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: /Bom te ver de novo/ })).toBeVisible();
  expect(images).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});

test("desktop: a foto otimizada (AVIF) é a que carrega", async ({ page }) => {
  const images: string[] = [];
  page.on("request", (r) => /login-\d+.*\.(avif|webp|jpg)/.test(r.url()) && images.push(r.url()));
  await mockApi(page);
  await page.goto("/entrar");
  await expect.poll(() => images.length).toBeGreaterThan(0);
  expect(images.every((u) => u.includes(".avif"))).toBe(true);
});

test("a página sai com CSP restritiva e cabeçalhos de segurança", async ({ page }) => {
  await mockApi(page);
  const res = await page.goto("/entrar");
  const h = res!.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).not.toContain("unsafe-inline");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
