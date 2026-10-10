import postgres from "postgres";
import { createDb } from "@passo/db";
import { runMigrations } from "@passo/db/migrate";
import { runSeed } from "@passo/db/seed";

// Banco de teste do zero a cada execução: apaga o schema, cria o papel
// restrito passo_api e aplica todas as migrações (testa a migração do zero).
// TEST_DATABASE_URL precisa ser um superusuário de um Postgres SÓ de teste.
export const API_ROLE_PASSWORD = "passo_api_test_password";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL não definida (ex.: postgres://postgres:postgres@127.0.0.1:54329/passo_test)");
  if (!/test/i.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL precisa apontar para um banco com 'test' no nome");

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`drop schema if exists drizzle cascade`;
    await sql`drop schema if exists public cascade`;
    await sql`create schema public`;
    await sql.unsafe(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'passo_api') then
          create role passo_api login password '${API_ROLE_PASSWORD}';
        end if;
      end $$;
      alter role passo_api with password '${API_ROLE_PASSWORD}' nosuperuser nobypassrls;
      revoke all on schema public from public;
    `);
  } finally {
    await sql.end();
  }
  await runMigrations(url);
  // Catálogo e modelos de plano, como em produção (seed roda como dono do schema).
  const { db, close } = createDb(url, { max: 1 });
  try {
    await runSeed(db);
  } finally {
    await close();
  }
}
