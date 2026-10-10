import { createDb } from "./index";
import { runSeed } from "./seed";

async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    throw new Error("MIGRATION_DATABASE_URL não definida");
  }
  const { db, close } = createDb(url, { max: 1 });
  try {
    console.log("Aplicando seed do catálogo...");
    const counts = await runSeed(db);
    console.log(
      `Referências: ${counts.references.inserted} inseridas, ${counts.references.updated} atualizadas.`,
    );
    console.log(`Treinos (upsert por slug): ${counts.workouts}.`);
    console.log(`Ligações treino-referência: ${counts.workoutReferences}.`);
    console.log(`Progressões/regressões: ${counts.workoutProgressions}.`);
    console.log(`Modelos de plano: ${counts.planTemplates}.`);
    console.log("Seed concluído.");
  } finally {
    await close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
