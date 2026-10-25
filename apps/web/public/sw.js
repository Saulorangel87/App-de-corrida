// Service worker do Let's Go Run: deixa o app abrir sem internet e instalável no celular.
// Guarda só os arquivos do próprio app (página, scripts, estilos, ícones). Respostas da API
// (dados de saúde) nunca entram no cache: a API é outra origem e este código só trata a mesma.
// Mudou a lógica? Suba a versão: o cache antigo é apagado na ativação.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const MAX_ASSETS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Mantém o cache de arquivos com no máximo MAX_ASSETS itens (os mais antigos saem primeiro). */
async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/.well-known/")) return;

  // Páginas: sempre da rede (versão nova do app); sem internet, a página guardada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(SHELL).then((cache) => cache.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/", { cacheName: SHELL }).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // Scripts e estilos do build têm o conteúdo no nome: o que está guardado nunca muda.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          void trim(cache);
        }
        return res;
      }),
    );
    return;
  }

  // Ícones e manifesto: o guardado na hora, atualizado por trás.
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) void cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? fresh;
    }),
  );
});
