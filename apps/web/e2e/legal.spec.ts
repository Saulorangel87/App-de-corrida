import { expect, test } from "@playwright/test";

// Páginas públicas: abrem sem login e sem chamar a API.

test("Política de Privacidade abre sem login, com data, versão, índice e link para os Termos", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1")) apiCalls.push(r.url());
  });
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade", level: 1 })).toBeVisible();
  await expect(page.getByText("Última atualização: 11 de outubro de 2026")).toBeVisible();
  await expect(page.getByText("versão 2026-10-11")).toBeVisible();

  // pontos que o texto precisa afirmar (conferidos no código; docs/textos-legais.md)
  await expect(page.getByText("Nenhuma inteligência artificial gera ou altera seus treinos.")).toBeVisible();
  await expect(page.getByText("mês e ano de nascimento (não guardamos o dia)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Por quanto tempo guardamos" })).toBeVisible();

  // o índice leva à seção
  await page.getByRole("navigation", { name: "Nesta página" }).getByRole("link", { name: "Seus direitos" }).click();
  await expect(page).toHaveURL(/#direitos$/);
  await expect(page.locator("#direitos")).toBeInViewport();

  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/R-[A-Z]{3}-\d+|\[P\]|`|Cadência/);
  expect(apiCalls).toHaveLength(0);

  await page.getByRole("link", { name: "Termos de Uso", exact: true }).first().click();
  await expect(page).toHaveURL(/\/termos$/);
  await expect(page.getByRole("heading", { name: "Termos de Uso", level: 1 })).toBeVisible();
});

test("Termos de Uso: o que o app é e não é, triagem, PAR-Q+, gratuidade e emergência", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de Uso", level: 1 })).toBeVisible();
  await expect(page.getByText("não faz diagnóstico e não substitui a orientação de profissionais de saúde")).toBeVisible();
  await expect(page.getByText("ligue 192 (SAMU)")).toBeVisible();
  await expect(page.getByText("© PAR-Q+ Collaboration")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gratuidade" })).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/R-[A-Z]{3}-\d+|\[P\]|`|Cadência|ciclismo/);
  await page.getByRole("link", { name: "Política de Privacidade", exact: true }).first().click();
  await expect(page).toHaveURL(/\/privacidade$/);
});

test("com o app em inglês, o documento aparece traduzido, com o aviso de que vale o português", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.getByRole("note")).toHaveCount(0);
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "Terms of Use", level: 1 })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("the Portuguese version prevails");
  await expect(page.locator("article")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Last updated: October 11, 2026")).toBeVisible();
  await expect(page.getByText("No artificial intelligence generates or changes the workouts.")).toBeVisible();
  await expect(page.getByText("call 192 (SAMU)")).toBeVisible();

  // a mesma versão, as mesmas seções; o outro documento também em inglês
  await expect(page.getByText("version 2026-10-11")).toBeVisible();
  await page.getByRole("link", { name: "Privacy Policy", exact: true }).first().click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading", { name: "Privacy Policy", level: 1 })).toBeVisible();
  await expect(page.getByText("month and year of birth (we do not keep the day)")).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/R-[A-Z]{3}-\d+|\[P\]|`/);

  // volta para o português
  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.getByRole("heading", { name: "Política de Privacidade", level: 1 })).toBeVisible();
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("rodapé leva às duas páginas", async ({ page }) => {
  await page.goto("/privacidade");
  const footer = page.getByRole("navigation", { name: "Documentos legais" });
  await expect(footer.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade");
  await expect(footer.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
});

test("cadastro: o aceite liga aos dois documentos em outra aba, sem perder o formulário", async ({ page }) => {
  await page.goto("/entrar");
  // a nota de privacidade da tela de entrada só promete o que foi conferido
  await expect(page.getByText("trafegam criptografados, ficam em cópias de segurança criptografadas e nunca são vendidos")).toBeVisible();
  await page.getByRole("tab", { name: "Criar conta" }).click();
  const label = page.getByLabel(/Li e aceito os Termos de Uso e a Política de Privacidade/);
  await expect(label).toBeVisible();
  const terms = page.getByRole("link", { name: "Termos de Uso", exact: true }).first();
  const privacy = page.getByRole("link", { name: "Política de Privacidade", exact: true }).first();
  await expect(terms).toHaveAttribute("href", "/termos");
  await expect(terms).toHaveAttribute("target", "_blank");
  await expect(terms).toHaveAttribute("rel", /noreferrer/);
  await expect(privacy).toHaveAttribute("href", "/privacidade");
  await expect(privacy).toHaveAttribute("target", "_blank");
  // clicar no link não marca a caixa
  await expect(label).not.toBeChecked();
});

test("celular: as páginas legais não rolam para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  for (const path of ["/privacidade", "/termos"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
  }
  await ctx.close();
});
