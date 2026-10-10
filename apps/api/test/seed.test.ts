import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "@passo/db";
import { runSeed } from "@passo/db/seed";
import { admin } from "./helpers";

// O seed roda como dono do schema (como a migração), nunca como passo_api.
const { db, close } = createDb(process.env.TEST_DATABASE_URL!, { max: 1 });
afterAll(async () => {
  await close();
});

describe("seed do catálogo", () => {
  it("é idempotente e todo treino publicado tem ao menos uma referência", async () => {
    await runSeed(db);
    await runSeed(db);
    const [counts] = await admin`select
      (select count(*)::int from workouts) as workouts,
      (select count(*)::int from workouts where status <> 'published') as unpublished,
      (select count(*)::int from "references") as refs,
      (select count(*)::int from workouts w where not exists
         (select 1 from workout_references wr where wr.workout_id = w.id)) as without_ref`;
    expect(counts).toMatchObject({ workouts: 11, unpublished: 0, refs: 34, without_ref: 0 });
  });

  it("os 13 modelos têm todas as semanas, e toda sessão aponta para um treino publicado do catálogo", async () => {
    await runSeed(db);
    const templates = await admin`select t.slug, t.duration_weeks as expected,
        (select count(*)::int from plan_template_weeks w where w.plan_template_id = t.id) as weeks
      from plan_templates t order by t.slug`;
    expect(templates).toHaveLength(13);
    for (const t of templates) expect(t.weeks).toBe(t.expected);

    const [bad] = await admin`select count(*)::int as n from plan_template_sessions s
      join workouts w on w.id = s.workout_id where w.status <> 'published'`;
    expect(bad!.n).toBe(0);

    // idempotente: rodar de novo não duplica semanas nem sessões
    const [before] = await admin`select (select count(*)::int from plan_template_weeks) as weeks, (select count(*)::int from plan_template_sessions) as sessions`;
    await runSeed(db);
    const [after] = await admin`select (select count(*)::int from plan_template_weeks) as weeks, (select count(*)::int from plan_template_sessions) as sessions`;
    expect(after).toEqual(before);
  });
});
