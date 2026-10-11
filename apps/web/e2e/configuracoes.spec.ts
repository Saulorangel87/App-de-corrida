import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
const today = new Date().toLocaleDateString("sv-SE");

type Call = { method: string; path: string; body: unknown; contentType?: string; firstBytes?: number[] };

async function mockApi(page: Page, opts: { emailChangeStatus?: number } = {}) {
  const calls: Call[] = [];
  const me: { id: string; name: string; email: string; language: string; photoVersion: number | null } = { ...user, photoVersion: null };
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
    const isPhoto = path === "/profile/photo" && req.method() === "PUT";
    const raw = isPhoto ? null : req.postData();
    const body = raw ? JSON.parse(raw) : undefined;
    const bytes = isPhoto ? req.postDataBuffer() : null;
    calls.push({
      method: req.method(),
      path,
      body,
      contentType: req.headers()["content-type"],
      firstBytes: bytes ? [...bytes.subarray(0, 3)] : undefined,
    });
    const json = (status: number, data?: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data ?? {}) });

    if (path === "/auth/me") return json(200, { user: me });
    if (path === "/auth/profile" && req.method() === "PATCH") {
      me.name = (body as { name: string }).name.trim();
      return json(200, { user: me });
    }
    if (path === "/profile/photo") {
      if (req.method() === "PUT") {
        me.photoVersion = 1760000000000;
        return json(200, { photoVersion: me.photoVersion });
      }
      if (req.method() === "DELETE") {
        me.photoVersion = null;
        return route.fulfill({ status: 204 });
      }
      return json(404, { error: { code: "NOT_FOUND", message: "x" } });
    }
    if (path === "/auth/email-change") {
      const status = opts.emailChangeStatus ?? 202;
      return status === 202
        ? json(202, { message: "ok" })
        : json(status, { error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." } });
    }
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
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Ana Corredora");
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
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("perfil: edita o nome e a barra lateral acompanha", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  const save = page.getByRole("button", { name: "Salvar nome" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Nome", { exact: true }).fill("  Ana Maria Corredora ");
  await save.click();
  expect(calls.find((c) => c.method === "PATCH" && c.path === "/auth/profile")?.body).toEqual({ name: "Ana Maria Corredora" });
  await expect(page.getByText("Nome salvo.")).toBeVisible();
  await expect(page.getByRole("complementary").getByText("Ana Maria Corredora")).toBeVisible();
});

test("perfil: a foto é reduzida no aparelho (JPEG), enviada, trocada e removida", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await expect(page.getByRole("button", { name: "Remover foto" })).toHaveCount(0);
  await page.getByLabel("Escolher uma foto de perfil").setInputFiles({ name: "eu.png", mimeType: "image/png", buffer: PNG_1X1 });

  await expect(page.getByRole("button", { name: "Remover foto" })).toBeVisible();
  const put = calls.find((c) => c.method === "PUT" && c.path === "/profile/photo");
  expect(put?.contentType).toBe("image/jpeg");
  expect(put?.firstBytes).toEqual([0xff, 0xd8, 0xff]); // saiu JPEG, não o PNG original
  await expect(page.getByText("Trocar foto")).toBeVisible();

  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByRole("button", { name: "Remover foto" })).toHaveCount(0);
  expect(calls.some((c) => c.method === "DELETE" && c.path === "/profile/photo")).toBe(true);
});

test("perfil: arquivo que não é imagem aceita (SVG) é recusado antes de sair do aparelho", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await page.getByLabel("Escolher uma foto de perfil").setInputFiles({
    name: "x.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Use uma imagem JPEG, PNG ou WebP." })).toBeVisible();
  expect(calls.some((c) => c.path === "/profile/photo" && c.method === "PUT")).toBe(false);
});

test("perfil: troca de e-mail pede a senha e avisa que só muda quando o link for aberto", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(page.getByRole("button", { name: "Enviar link de confirmação" })).toBeDisabled();
  await page.getByLabel("Novo e-mail").fill("Ana.Nova@Exemplo.com");
  await page.getByLabel("Sua senha atual").fill("minha-senha-longa");
  await page.getByRole("button", { name: "Enviar link de confirmação" }).click();

  expect(calls.find((c) => c.path === "/auth/email-change")?.body).toEqual({ newEmail: "Ana.Nova@Exemplo.com", password: "minha-senha-longa" });
  await expect(page.getByText(/enviamos o link de confirmação\. O e-mail só muda depois que você abri-lo/)).toBeVisible();
  // o e-mail da conta continua o antigo até a confirmação
  await expect(page.getByRole("main").getByText("ana@exemplo.com")).toBeVisible();
});

test("perfil: senha errada na troca de e-mail mostra o erro e mantém o formulário", async ({ page }) => {
  await mockApi(page, { emailChangeStatus: 401 });
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Trocar e-mail" }).click();
  await page.getByLabel("Novo e-mail").fill("ana.nova@exemplo.com");
  await page.getByLabel("Sua senha atual").fill("errada-errada-1");
  await page.getByRole("button", { name: "Enviar link de confirmação" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /senha/i })).toBeVisible();
  await expect(page.getByLabel("Sua senha atual")).toBeVisible();
});

test("link do e-mail novo: confirma uma vez e leva ao login; link inválido mostra o aviso", async ({ page }) => {
  const calls: string[] = [];
  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    calls.push(path);
    if (path === "/auth/me") return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "x" } }) });
    if (path === "/auth/email-change/confirm") {
      const token = (JSON.parse(route.request().postData() ?? "{}") as { token?: string }).token ?? "";
      return token.startsWith("valido")
        ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "ok" }) })
        : route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: { code: "INVALID_TOKEN", message: "x" } }) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  await page.goto("/confirmar-novo-email#token=" + "valido-de-teste-".repeat(3));
  await expect(page.getByRole("heading", { name: "E-mail alterado" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  expect(calls.filter((p) => p === "/auth/email-change/confirm")).toHaveLength(1);

  await page.goto("/confirmar-novo-email#token=" + "invalido-teste-".repeat(3));
  await expect(page.getByRole("heading", { name: "Link inválido ou expirado" })).toBeVisible();
});
