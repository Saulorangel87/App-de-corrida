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
  return out;
}

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version: string };

export default defineConfig({
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), react()],
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
