import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

/** Cabeçalhos do bloco "/*" de public/_headers (Cloudflare Pages), para testar a CSP também no preview. */
function securityHeaders(): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = readFileSync(path.resolve(__dirname, "public/_headers"), "utf8").split(/\r?\n/);
  let inAll = false;
  for (const line of lines) {
    if (!line.startsWith(" ") && line.trim()) inAll = line.trim() === "/*";
    else if (inAll && line.includes(":")) {
      const i = line.indexOf(":");
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  // Só no preview local (testes de interface, com a API simulada em localhost:3000): o arquivo de
  // produção não leva a origem de desenvolvimento.
  const csp = out["Content-Security-Policy"];
  if (csp) {
    out["Content-Security-Policy"] = csp
      .replace("img-src 'self' data:", "img-src 'self' data: http://localhost:3000")
      .replace("connect-src 'self'", "connect-src 'self' http://localhost:3000");
  }
  return out;
}

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version: string };

export default defineConfig({
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react()],
  // es2022: navegadores de 2022 em diante (Chrome 94, Safari 15.4, Firefox 93). O esbuild corrigido
  // (override do package.json, por causa do aviso de segurança) não rebaixa mais a sintaxe de ES2020.
  // sourcemap: o código do front já é público no navegador (e não tem segredo: gitleaks no CI); o
  // mapa só facilita depurar erros em produção e é exigido pela auditoria de boas práticas do Lighthouse.
  build: { target: "es2022", sourcemap: true },
  preview: { headers: securityHeaders() },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
