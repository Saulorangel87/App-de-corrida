import { defineConfig } from "drizzle-kit";

// Gera SQL a partir do schema. Aplicar migrações: `pnpm --filter @passo/db db:migrate`
// (usa MIGRATION_DATABASE_URL, o usuário dono do schema; nunca o usuário da API).
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL ?? "",
  },
});
