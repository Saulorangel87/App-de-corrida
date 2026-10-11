// Lê os textos oficiais do PAR-Q+ em docs/parq/ (português do Brasil, colado pelo dono; inglês, o
// original da PAR-Q+ Collaboration), confere que todos os blocos estão preenchidos e gera
// src/parq/text.pt-BR.ts e src/parq/text.en.ts.
// Uso: pnpm --filter @passo/shared parq:build
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PARQ_TEXT_KEYS } from "../src/parq/structure";

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));

const LANGUAGES = [
  {
    label: "português do Brasil",
    source: "docs/parq/parq-plus-pt-br.txt",
    target: "packages/shared/src/parq/text.pt-BR.ts",
    completeName: "PARQ_TEXT_COMPLETE",
    textName: "PARQ_TEXT_PT_BR",
    note: "Texto oficial do PAR-Q+ em português, sem alteração (R-TRI-02).",
  },
  {
    label: "inglês (original)",
    source: "docs/parq/parq-plus-en.txt",
    target: "packages/shared/src/parq/text.en.ts",
    completeName: "PARQ_TEXT_EN_COMPLETE",
    textName: "PARQ_TEXT_EN",
    note: "Texto original do PAR-Q+ em inglês, sem alteração (R-TRI-02).",
  },
] as const;

let failed = false;

for (const lang of LANGUAGES) {
  const source = root(lang.source);
  const target = root(lang.target);

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

  if (unknown.length) console.error(`[${lang.label}] Blocos desconhecidos (nome alterado?): ${unknown.join(", ")}`);
  if (missing.length) {
    console.error(`[${lang.label}] Faltam ${missing.length} de ${PARQ_TEXT_KEYS.length} blocos:\n  ${missing.join("\n  ")}`);
  }

  const complete = missing.length === 0 && unknown.length === 0;
  writeFileSync(
    target,
    [
      `// GERADO por scripts/parq-build.ts a partir de ${lang.source}. Não editar à mão.`,
      `// ${lang.note}`,
      `export const ${lang.completeName} = ${complete};`,
      `export const ${lang.textName}: Record<string, string> = ${JSON.stringify(complete ? text : {}, null, 2)};`,
      "",
    ].join("\n"),
  );

  if (complete) console.log(`PAR-Q+ (${lang.label}): ${PARQ_TEXT_KEYS.length} blocos conferidos; ${target} gerado.`);
  else failed = true;
}

if (failed) process.exit(1);
