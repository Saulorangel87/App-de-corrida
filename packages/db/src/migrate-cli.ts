import { runMigrations } from "./migrate";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error("MIGRATION_DATABASE_URL não definida");
  process.exit(1);
}

runMigrations(url)
  .then(() => console.log("Migrações aplicadas."))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
