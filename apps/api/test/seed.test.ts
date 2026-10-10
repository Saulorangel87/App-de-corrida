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
});
