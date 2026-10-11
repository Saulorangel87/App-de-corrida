import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Cria a conexão. Sem valor padrão: quem chama passa a URL validada. */
export function createDb(url: string, options: { max?: number } = {}) {
  const client = postgres(url, { max: options.max ?? 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

/**
 * Única porta de acesso às tabelas do atleta. Abre uma transação e define
 * `app.user_id` (SET LOCAL), que as políticas de RLS usam para filtrar.
 * O userId vem sempre da sessão no servidor, nunca do cliente.
 */
export async function withAthlete<T>(
  db: Database,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

export * from "./schema";
export { athleteStrings, buildAthleteText, TECHNICAL_MARKERS } from "./seed-data/athlete-text";
export type { AthleteText } from "./seed-data/athlete-text";
export { translateAthleteText } from "./seed-data/athlete-text.en";
