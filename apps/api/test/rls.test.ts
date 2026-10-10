import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { consents, painReports, withAthlete } from "@passo/db";
import { admin, makeApp, signUpAndLogin, type TestApp } from "./helpers";

/** Mensagem do erro do Postgres (o Drizzle embrulha o original em `cause`). */
async function pgError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const cause = (e as { cause?: { message?: string } }).cause;
    return cause?.message ?? (e as Error).message;
  }
  return "não falhou";
}

// Testa o RLS com o papel restrito da API (passo_api), como em produção.
let t: TestApp;
let a: { userId: string };
let b: { userId: string };

beforeAll(async () => {
  t = makeApp();
  a = await signUpAndLogin(t);
  b = await signUpAndLogin(t);
  await admin`insert into pain_reports (user_id, body_part, intensity) values
    (${a.userId}, 'joelho', 2), (${b.userId}, 'tornozelo', 4)`;
});
afterAll(async () => {
  await t.close();
});

describe("Row-Level Security nas tabelas do atleta", () => {
  it("sem withAthlete a API não vê nenhuma linha", async () => {
    const rows = await t.db.select().from(painReports);
    expect(rows).toHaveLength(0);
    expect(await t.db.select().from(consents)).toHaveLength(0);
  });

  it("com withAthlete(A) vê só as linhas de A", async () => {
    const rows = await withAthlete(t.db, a.userId, (tx) => tx.select().from(painReports));
    expect(rows.map((r) => r.userId)).toEqual([a.userId]);
  });

  it("A não grava linha em nome de B", async () => {
    const message = await pgError(
      withAthlete(t.db, a.userId, (tx) =>
        tx.insert(painReports).values({ userId: b.userId, bodyPart: "quadril", intensity: 1 }),
      ),
    );
    expect(message).toMatch(/row-level security/);
  });

  it("A não altera nem apaga linhas de B", async () => {
    const updated = await withAthlete(t.db, a.userId, (tx) =>
      tx.update(painReports).set({ intensity: 0 }).where(sql`user_id = ${b.userId}`).returning(),
    );
    const deleted = await withAthlete(t.db, a.userId, (tx) =>
      tx.delete(painReports).where(sql`user_id = ${b.userId}`).returning(),
    );
    expect(updated).toHaveLength(0);
    expect(deleted).toHaveLength(0);
    const [row] = await admin`select intensity from pain_reports where user_id = ${b.userId}`;
    expect(row!.intensity).toBe(4);
  });

  it("o contexto não vaza para a próxima consulta na mesma conexão", async () => {
    await withAthlete(t.db, a.userId, (tx) => tx.select().from(painReports));
    expect(await t.db.select().from(painReports)).toHaveLength(0);
  });

  it("a API não altera o catálogo nem a auditoria do motor", async () => {
    expect(await pgError(t.db.execute(sql`delete from workouts`))).toMatch(/permission denied/);
    expect(
      await pgError(withAthlete(t.db, a.userId, (tx) => tx.execute(sql`delete from engine_decisions`))),
    ).toMatch(/permission denied/);
  });

  it("a API não é superusuário nem ignora RLS", async () => {
    const [role] = await admin`select rolsuper, rolbypassrls from pg_roles where rolname = 'passo_api'`;
    expect(role).toMatchObject({ rolsuper: false, rolbypassrls: false });
  });
});
