import { defineConfig, devices } from "@playwright/test";

// Fumaça de interface: sobe o build com `vite preview` e simula a API (sem banco).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  // Sem animação por padrão: os testes não esperam transição. `movimento.spec.ts` liga o movimento.
  use: { baseURL: "http://localhost:4173", locale: "pt-BR", trace: "retain-on-failure", reducedMotion: "reduce" },
  webServer: {
    command: "pnpm build && pnpm exec vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
