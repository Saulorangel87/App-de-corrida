// Seed do catálogo de treinos (docs/pesquisa/07-tipos-sessao.md).
// Idempotente: treinos por `workouts.slug`; referências por DOI ou URL. Tudo em uma única transação.
// Não cria planos (plan_templates): os planos vêm depois, do motor de regras.
import { eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "./index";
import { references, workoutProgressions, workoutReferences, workouts } from "./schema";
import { referenceSeeds } from "./seed-data/references";
import { workoutSeeds } from "./seed-data/workouts";

export type SeedCounts = {
  references: { inserted: number; updated: number };
  workouts: number;
  workoutReferences: number;
  workoutProgressions: number;
};

export async function runSeed(db: Database): Promise<SeedCounts> {
  return db.transaction(async (tx) => {
    const counts: SeedCounts = {
      references: { inserted: 0, updated: 0 },
      workouts: 0,
      workoutReferences: 0,
      workoutProgressions: 0,
    };

    // 1. Referências: procura por DOI (sem diferenciar maiúsculas) ou URL; atualiza ou insere.
    const referenceIdByKey = new Map<string, string>();
    for (const ref of referenceSeeds) {
      const conditions = [];
      if (ref.doi) conditions.push(sql`lower(${references.doi}) = ${ref.doi.toLowerCase()}`);
      if (ref.url) conditions.push(eq(references.url, ref.url));
      const [found] = await tx
        .select({ id: references.id })
        .from(references)
        .where(or(...conditions))
        .limit(1);

      const values = {
        doi: ref.doi ?? null,
        url: ref.url ?? null,
        citation: ref.citation,
        studyType: ref.studyType ?? null,
      };
      if (found) {
        await tx.update(references).set(values).where(eq(references.id, found.id));
        referenceIdByKey.set(ref.key, found.id);
        counts.references.updated += 1;
      } else {
        const [created] = await tx.insert(references).values(values).returning({ id: references.id });
        referenceIdByKey.set(ref.key, created!.id);
        counts.references.inserted += 1;
      }
    }

    // 2. Treinos: upsert por slug.
    const workoutIdBySlug = new Map<string, string>();
    for (const w of workoutSeeds) {
      const values = {
        slug: w.slug,
        namePt: w.namePt,
        nameEn: w.nameEn,
        type: w.type,
        objective: w.objective ?? null,
        allowedLevels: w.allowedLevels,
        structure: w.structure,
        targetRpe: w.targetRpe ?? null,
        targetHrZone: w.targetHrZone ?? null,
        targetPaceRelative: w.targetPaceRelative ?? null,
        durationMinutes: w.durationMinutes ?? null,
        distanceKm: w.distanceKm ?? null,
        estimatedLoad: w.estimatedLoad ?? null,
        contraindications: w.contraindications ?? null,
        status: w.status ?? "published",
        version: w.version,
      };
      const { slug: _slug, ...updatable } = values;
      const [row] = await tx
        .insert(workouts)
        .values(values)
        .onConflictDoUpdate({ target: workouts.slug, set: { ...updatable, updatedAt: new Date() } })
        .returning({ id: workouts.id });
      workoutIdBySlug.set(w.slug, row!.id);
      counts.workouts += 1;
    }

    const seededWorkoutIds = [...workoutIdBySlug.values()];

    // 3. Ligações treino-referência: recria as dos treinos do catálogo (reflete remoções).
    await tx.delete(workoutReferences).where(inArray(workoutReferences.workoutId, seededWorkoutIds));
    const referenceRows: { workoutId: string; referenceId: string }[] = [];
    for (const w of workoutSeeds) {
      const workoutId = workoutIdBySlug.get(w.slug)!;
      for (const key of new Set(w.referenceKeys)) {
        const referenceId = referenceIdByKey.get(key);
        if (!referenceId) throw new Error(`Treino ${w.slug}: referência ${key} não encontrada.`);
        referenceRows.push({ workoutId, referenceId });
      }
    }
    if (referenceRows.length > 0) await tx.insert(workoutReferences).values(referenceRows);
    counts.workoutReferences = referenceRows.length;

    // 4. Progressões e regressões: recria as dos treinos do catálogo.
    await tx.delete(workoutProgressions).where(inArray(workoutProgressions.fromWorkoutId, seededWorkoutIds));
    const progressionRows: { fromWorkoutId: string; toWorkoutId: string; type: string }[] = [];
    for (const w of workoutSeeds) {
      for (const link of w.links) {
        const to = workoutIdBySlug.get(link.toSlug);
        if (!to) throw new Error(`Treino ${w.slug}: slug ${link.toSlug} não encontrado.`);
        progressionRows.push({ fromWorkoutId: workoutIdBySlug.get(w.slug)!, toWorkoutId: to, type: link.type });
      }
    }
    if (progressionRows.length > 0) await tx.insert(workoutProgressions).values(progressionRows);
    counts.workoutProgressions = progressionRows.length;

    return counts;
  });
}
