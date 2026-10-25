import { defineConfig, devices } from "@playwright/test";

// Fumaça de interface: sobe o build com `vite preview` e simula a API (sem banco).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  // Service worker bloqueado: ele poderia servir uma página guardada entre um teste e outro (`pwa.spec.ts` liga).
  // Sem animação por padrão: os testes não esperam transição. `movimento.spec.ts` liga o movimento.
  use: { baseURL: "http://localhost:4173", locale: "pt-BR", trace: "retain-on-failure", reducedMotion: "reduce", serviceWorkers: "block" },
  webServer: {
    command: "pnpm build && pnpm exec vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
