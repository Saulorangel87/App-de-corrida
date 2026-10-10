import { db } from "./index"; // Assuming index exports db instance, wait, we need an actual db instance
import { workouts, planTemplates, references, workoutReferences } from "./schema";

// This is a placeholder for the actual seed script.
// It will insert the data validated in Phase 0 into the DB.
// You would run this via `pnpm run db:seed`.

async function seed() {
  console.log("Seeding database...");
  
  // 1. Insert References
  const insertedRefs = await db.insert(references).values([
    {
      doi: "10.1186/1471-2474-8-24",
      citation: "Buist I, et al. The GRONORUN study... BMC Musculoskelet Disord 2007;8:24.",
      studyType: "Protocolo de ECR"
    },
    {
      doi: "10.1177/0363546507307505",
      citation: "Buist I, et al. No effect of a graded training program... Am J Sports Med 2008.",
      studyType: "ECR"
    },
    {
      doi: "10.1249/mss.0b013e31806010e0",
      citation: "Bosquet L, et al. Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 2007.",
      studyType: "Meta-análise"
    }
  ]).returning();

  // 2. Insert Workouts (Catálogo)
  const insertedWorkouts = await db.insert(workouts).values([
    {
      slug: "caminhada-corrida",
      namePt: "Caminhada e Corrida",
      nameEn: "Walk and Run",
      type: "caminhada-corrida",
      objective: "iniciacao",
      allowedLevels: ["iniciante"],
      structure: {
        warmup: "5 min caminhada rápida",
        cooldown: "5 min caminhada rápida",
        description: "Repetições de caminhada e corrida baseadas na etapa atual (1 a 12 + 10b). Ritmo Z1 (frases completas)."
      },
      targetRpe: 3, // CR-10 1-3
      targetHrZone: "Z1",
      status: "published",
      version: "1.0.0"
    },
    {
      slug: "rodagem-leve",
      namePt: "Rodagem Leve",
      nameEn: "Easy Run",
      type: "rodagem",
      allowedLevels: ["iniciante", "intermediario", "avancado"],
      structure: {
        warmup: "5 min trote leve",
        cooldown: "5 min trote leve",
        description: "Corrida contínua em Z1. Duração varia por nível."
      },
      targetRpe: 3,
      targetHrZone: "Z1",
      status: "published",
      version: "1.0.0"
    },
    {
      slug: "longao",
      namePt: "Longão",
      nameEn: "Long Run",
      type: "longao",
      allowedLevels: ["iniciante", "intermediario", "avancado"],
      structure: {
        description: "Corrida contínua em Z1, maior sessão da semana."
      },
      targetRpe: 3,
      targetHrZone: "Z1",
      status: "published",
      version: "1.0.0"
    }
  ]).returning();

  // 3. Insert Workout References
  await db.insert(workoutReferences).values([
    {
      workoutId: insertedWorkouts.find(w => w.slug === "caminhada-corrida")!.id,
      referenceId: insertedRefs[0].id // Buist 2007
    },
    {
      workoutId: insertedWorkouts.find(w => w.slug === "caminhada-corrida")!.id,
      referenceId: insertedRefs[1].id // Buist 2008
    }
  ]);

  // 4. Insert Plan Templates
  await db.insert(planTemplates).values([
    {
      objective: "5k",
      level: "iniciante",
      description: "Plano de 13 semanas começando do zero, baseado no método de caminhada-corrida."
    },
    {
      objective: "10k",
      level: "intermediario",
      description: "Plano de 10 semanas com foco em aumentar volume progressivamente com qualidade."
    }
  ]);

  console.log("Seeding complete.");
}
