import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    include: ["test/**/*.test.ts"],
    // Argon2 deixa cada login com ~50–100 ms; os testes de integração precisam de folga.
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
