import { expect, test } from "@playwright/test";

// Os outros testes bloqueiam o service worker (ele poderia servir uma página guardada); aqui ele fica ligado.
test.use({ serviceWorkers: "allow" });

test("app instalável: o service worker guarda só o app, que abre sem internet com o aviso", async ({ page, context }) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade", level: 1 })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload(); // agora a página é controlada pelo service worker
  await expect(page.getByRole("heading", { name: "Política de Privacidade", level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // O cache só tem arquivos do próprio app (nada da API).
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.every((u) => u.startsWith("http://localhost:4173/"))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Política de Privacidade", level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Sem internet. Nada é salvo até a conexão voltar." })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("Sem internet. Nada é salvo até a conexão voltar.")).toHaveCount(0);
});

test("manifesto: nome, ícones e abertura em tela cheia", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ short_name: "Let's Go Run", display: "standalone", start_url: "/" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
});
