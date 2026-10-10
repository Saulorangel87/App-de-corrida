// Lê docs/parq/parq-plus-pt-br.txt (texto oficial colado pelo dono), confere que
// todos os blocos estão preenchidos e gera src/parq/text.pt-BR.ts.
// Uso: pnpm --filter @passo/shared parq:build
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PARQ_TEXT_KEYS } from "../src/parq/structure";

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const source = root("docs/parq/parq-plus-pt-br.txt");
const target = root("packages/shared/src/parq/text.pt-BR.ts");

const blocks = new Map<string, string[]>();
let current: string | null = null;
const unknown: string[] = [];
for (const raw of readFileSync(source, "utf8").replace(/\r\n/g, "\n").split("\n")) {
  if (raw.startsWith("#")) continue;
  const header = raw.match(/^\[([^\]]+)\]\s*$/);
  if (header) {
    current = header[1]!;
    if (!(PARQ_TEXT_KEYS as readonly string[]).includes(current)) unknown.push(current);
    blocks.set(current, []);
    continue;
  }
  if (current) blocks.get(current)!.push(raw);
}

const text: Record<string, string> = {};
const missing: string[] = [];
for (const key of PARQ_TEXT_KEYS) {
  const value = (blocks.get(key) ?? []).join("\n").trim();
  if (!value || value.includes("COLE AQUI")) missing.push(key);
  else text[key] = value;
}

if (unknown.length) console.error(`Blocos desconhecidos (nome alterado?): ${unknown.join(", ")}`);
if (missing.length) {
  console.error(`Faltam ${missing.length} de ${PARQ_TEXT_KEYS.length} blocos:\n  ${missing.join("\n  ")}`);
}

const complete = missing.length === 0 && unknown.length === 0;
writeFileSync(
  target,
  [
    "// GERADO por scripts/parq-build.ts a partir de docs/parq/parq-plus-pt-br.txt. Não editar à mão.",
    "// Texto oficial do PAR-Q+ em português, sem alteração (R-TRI-02).",
    `export const PARQ_TEXT_COMPLETE = ${complete};`,
    `export const PARQ_TEXT_PT_BR: Record<string, string> = ${JSON.stringify(complete ? text : {}, null, 2)};`,
    "",
  ].join("\n"),
);

if (!complete) process.exit(1);
console.log(`PAR-Q+: ${PARQ_TEXT_KEYS.length} blocos conferidos; ${target} gerado.`);
