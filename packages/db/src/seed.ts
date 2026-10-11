// Seed do catálogo de treinos (docs/pesquisa/07-tipos-sessao.md).
// Idempotente: treinos por `workouts.slug`; referências por DOI ou URL. Tudo em uma única transação.
// Modelos de plano: só objetivo, nível e duração (as semanas vêm na Fase 4).
import { eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  planTemplateSessions, planTemplateWeeks, planTemplates, references, workoutProgressions, workoutReferences, workouts,
} from "./schema";
import { planTemplateSeeds, planTemplateStructures } from "./seed-data/plan-templates";
import { referenceSeeds } from "./seed-data/references";
import { buildAthleteText } from "./seed-data/athlete-text";
import { translateAthleteText } from "./seed-data/athlete-text.en";
import { workoutSeeds } from "./seed-data/workouts";

export type SeedCounts = {
  references: { inserted: number; updated: number };
  workouts: number;
  workoutReferences: number;
  workoutProgressions: number;
  planTemplates: number;
  planWeeks: number;
  planSessions: number;
};

export async function runSeed(db: Database): Promise<SeedCounts> {
  return db.transaction(async (tx) => {
    const counts: SeedCounts = {
      references: { inserted: 0, updated: 0 },
      workouts: 0,
      workoutReferences: 0,
      workoutProgressions: 0,
      planTemplates: 0,
      planWeeks: 0,
      planSessions: 0,
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
    const workoutNames = new Map(workoutSeeds.map((w) => [w.slug, w.namePt]));
    for (const w of workoutSeeds) {
      const atleta = buildAthleteText(w.structure as Record<string, unknown>, workoutNames);
      const values = {
        slug: w.slug,
        namePt: w.namePt,
        nameEn: w.nameEn,
        type: w.type,
        objective: w.objective ?? null,
        allowedLevels: w.allowedLevels,
        // O atleta lê só `atleta` (texto sem código de regra); o resto é técnico, para o motor e a auditoria.
        structure: {
          ...(w.structure as Record<string, unknown>),
          atleta,
          atletaEn: translateAthleteText(atleta),
        },
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

    // Modelos de plano (upsert por slug).
    for (const p of planTemplateSeeds) {
      const { slug: _slug, ...rest } = p;
      await tx
        .insert(planTemplates)
        .values(p)
        .onConflictDoUpdate({ target: planTemplates.slug, set: { ...rest, updatedAt: new Date() } });
      counts.planTemplates += 1;
    }

    // Semanas e sessões dos modelos: apaga e recria (cascade), numa só transação.
    const templateRows = await tx.select({ id: planTemplates.id, slug: planTemplates.slug }).from(planTemplates);
    const templateIdBySlug = new Map(templateRows.map((t) => [t.slug, t.id]));
    for (const t of planTemplateStructures) {
      const planId = templateIdBySlug.get(t.slug);
      if (!planId) throw new Error(`modelo ausente: ${t.slug}`);
      await tx.delete(planTemplateWeeks).where(eq(planTemplateWeeks.planTemplateId, planId));
      for (const w of t.weeks) {
        const [week] = await tx
          .insert(planTemplateWeeks)
          .values({
            planTemplateId: planId,
            weekNumber: w.weekNumber,
            phase: w.phase,
            volumeIndex: w.volumeIndex,
            isRecovery: w.isRecovery,
            isTaper: w.isTaper,
            isRaceWeek: w.isRaceWeek,
            ladderStage: w.ladderStage ?? null,
            ladderRecoveryPct: w.ladderRecoveryPct ?? null,
          })
          .returning({ id: planTemplateWeeks.id });
        counts.planWeeks += 1;
        const rows = w.sessions.map((s) => {
          const workoutId = workoutIdBySlug.get(s.slug);
          if (!workoutId) throw new Error(`treino do catálogo ausente: ${s.slug}`);
          return {
            weekId: week!.id,
            slot: s.slot,
            workoutId,
            sharePct: s.sharePct,
            fixedMinutes: s.fixedMinutes ?? null,
            optional: !!s.optional,
            ladderSession: s.ladderSession ?? null,
          };
        });
        await tx.insert(planTemplateSessions).values(rows);
        counts.planSessions += rows.length;
      }
    }

    return counts;
  });
}
