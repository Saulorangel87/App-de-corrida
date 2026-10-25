#!/usr/bin/env node
// Confere o projeto inteiro com um comando só e conta, por funcionalidade, o que passou e o que falhou.
//
//   pnpm check             tudo: qualidade, motor, API, telas e build
//   pnpm check --rapido    sem as telas (Playwright) e sem o build
//   pnpm check --so=api    só uma parte: qualidade, motor, api, telas, build (separadas por vírgula)
//
// Saída: resumo no terminal e relatório em reports/relatorio-testes.md (fora do Git).
// Funcionalidade nova: o arquivo de teste dela aparece no relatório mesmo sem rótulo (como "sem rótulo");
// para dar nome em português, acrescente uma linha em FEATURES abaixo.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "..", "..");
const reports = join(root, "reports");
mkdirSync(reports, { recursive: true });

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/passo_test";
const DB_CONTAINER = "passo-test-db";

// ---------------------------------------------------------------- rótulos por arquivo de teste
/** Arquivo de teste (sem extensão) → nome da funcionalidade, em português. */
const FEATURES = {
  engine: {
    "athlete-week": "Semana do atleta: tetos de carga",
    classify: "Classificação do atleta (nível)",
    decide: "Decisão do dia: manter, reduzir ou bloquear",
    materialize: "Montagem das sessões do plano",
    pain: "Dor reduz ou bloqueia a carga",
    placement: "Onde o iniciante entra na escada (posicionamento)",
    "plan-follow": "Seguir o plano à risca (13 modelos)",
    progression: "Progressão e escada de caminhada e corrida",
    screen: "Triagem de saúde (PAR-Q+)",
    select: "Escolha do modelo de plano",
    sleep: "Sono reduz ou bloqueia a carga",
    templates: "Modelos de plano (catálogo)",
  },
  api: {
    account: "Conta: exportar e excluir dados (LGPD)",
    "athlete-text": "Como fazer em linguagem simples (textos do treino)",
    auth: "Cadastro, login, senha e bloqueio",
    "email-templates": "E-mails: visual da marca e HTML seguro",
    hardening: "Endurecimento: logs sem dados pessoais e limite de e-mails",
    interview: "Entrevista, perfil e triagem",
    "parq-text": "Texto oficial do PAR-Q+ (português e inglês original)",
    profile: "Perfil: nome, troca de e-mail e foto",
    "legal-version": "Versão dos termos legais",
    rls: "Isolamento de dados por atleta no banco",
    security: "Cabeçalhos de segurança e limites",
    seed: "Catálogo de treinos (seed)",
    sessions: "Sessões e dispositivos",
    training: "Treino do dia, plano, check-in, dor e registro",
  },
  telas: {
    acesso: "Tela: login e cadastro",
    configuracoes: "Tela: perfil e configurações",
    entrevista: "Tela: entrevista",
    historico: "Tela: histórico",
    idioma: "Idioma português e inglês",
    legal: "Páginas: privacidade e termos",
    painel: "Tela: painel, check-in e menu",
    plano: "Tela: plano completo",
    "recuperar-conta": "Tela: recuperar senha e e-mail",
    registro: "Tela: registro do treino",
    "registro-rapido": "Tela: registro rápido pelo círculo da semana",
    "resumo-semana": "Tela: resumo da semana passada no painel",
    pwa: "App instalável e uso sem internet",
    novidades: "Tela: novidades do app",
    saude: "Pergunta semanal de saúde",
    treino: "Tela: detalhe do treino",
  },
};

const AREA_TITLE = {
  engine: "Motor de treino (regras)",
  api: "API (servidor e banco)",
  telas: "Telas (navegador)",
};

// ---------------------------------------------------------------- execução
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--so="))?.slice(5).split(",");
const quick = args.includes("--rapido");
const wants = (step) => (only ? only.includes(step) : quick ? !["telas", "build"].includes(step) : true);

function run(label, cmd, cmdArgs, env = {}) {
  const started = Date.now();
  process.stdout.write(`• ${label} ... `);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const ok = r.status === 0;
  console.log(`${ok ? "ok" : "FALHOU"} (${seconds} s)`);
  return { ok, out: `${r.stdout ?? ""}${r.stderr ?? ""}`, seconds };
}

function ensureTestDb() {
  const state = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", DB_CONTAINER], { encoding: "utf8", shell: true });
  const exists = state.status === 0;
  if (exists && state.stdout.trim() === "true") return true;
  process.stdout.write("• banco de teste ... ");
  const started = exists
    ? spawnSync("docker", ["start", DB_CONTAINER], { encoding: "utf8", shell: true })
    : spawnSync(
        "docker",
        ["run", "-d", "--name", DB_CONTAINER, "-p", "127.0.0.1:54329:5432", "-e", "POSTGRES_PASSWORD=postgres", "-e", "POSTGRES_DB=passo_test", "postgres:17-alpine"],
        { encoding: "utf8", shell: true },
      );
  if (started.status !== 0) {
    console.log("FALHOU (o Docker Desktop está ligado?)");
    return false;
  }
  for (let i = 0; i < 30; i++) {
    const ready = spawnSync("docker", ["exec", DB_CONTAINER, "pg_isready", "-U", "postgres"], { encoding: "utf8", shell: true });
    if (ready.status === 0) {
      console.log("ok");
      return true;
    }
    spawnSync(process.platform === "win32" ? "timeout" : "sleep", process.platform === "win32" ? ["/t", "2", "/nobreak"] : ["2"], { shell: true });
  }
  console.log("FALHOU (o banco não ficou pronto)");
  return false;
}

// ---------------------------------------------------------------- leitura dos resultados
// Tira as cores do terminal (ESC [ ... m) sem caractere de controle escrito na expressão.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const clean = (s) => String(s ?? "").replace(ANSI, "").trim();

function readVitest(file, area) {
  if (!existsSync(file)) return null;
  const json = JSON.parse(readFileSync(file, "utf8"));
  return json.testResults.map((suite) => ({
    area,
    key: basename(suite.name).replace(/\.test\.ts$/, ""),
    tests: suite.assertionResults.map((t) => ({
      title: t.fullName ?? t.title,
      status: t.status === "passed" ? "passed" : t.status === "failed" ? "failed" : "skipped",
      error: clean((t.failureMessages ?? []).join("\n")).split("\n").slice(0, 6).join("\n"),
    })),
    suiteError: suite.status === "failed" && suite.assertionResults.length === 0 ? clean(suite.message).slice(0, 600) : "",
  }));
}

function readPlaywright(file) {
  if (!existsSync(file)) return null;
  const json = JSON.parse(readFileSync(file, "utf8"));
  const byFile = new Map();
  const walk = (suite, parents) => {
    const here = suite.title && suite.title !== suite.file ? [...parents, suite.title] : parents;
    for (const spec of suite.specs ?? []) {
      const key = basename(spec.file ?? suite.file ?? "?").replace(/\.spec\.ts$/, "");
      const results = spec.tests.flatMap((t) => t.results);
      const last = results.at(-1);
      const status = spec.tests.every((t) => t.status === "skipped")
        ? "skipped"
        : spec.ok
          ? "passed"
          : "failed";
      const entry = byFile.get(key) ?? { area: "telas", key, tests: [], suiteError: "" };
      entry.tests.push({
        title: [...here, spec.title].join(" › "),
        status,
        error: status === "failed" ? clean(last?.error?.message ?? "").split("\n").slice(0, 6).join("\n") : "",
      });
      byFile.set(key, entry);
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const s of json.suites ?? []) walk(s, []);
  return [...byFile.values()];
}

// ---------------------------------------------------------------- passos
const steps = []; // { name, ok, detail }
const suites = []; // por arquivo de teste

console.log("Let's Go Run: conferência do projeto\n");

if (wants("qualidade")) {
  const lint = run("qualidade: lint", "pnpm", ["lint"]);
  steps.push({ name: "Lint (estilo e erros de código)", ok: lint.ok, detail: lint.ok ? "" : clean(lint.out).slice(-1500) });
  const types = run("qualidade: tipos", "pnpm", ["typecheck"]);
  steps.push({ name: "Tipos (TypeScript)", ok: types.ok, detail: types.ok ? "" : clean(types.out).slice(-1500) });
}

if (wants("motor")) {
  const out = join(reports, "vitest-engine.json");
  const r = run("motor: regras de treino", "pnpm", ["--filter", "@passo/engine", "exec", "vitest", "run", "--reporter=json", `--outputFile="${out}"`]);
  const read = readVitest(out, "engine");
  if (read) suites.push(...read);
  else steps.push({ name: "Motor de treino", ok: false, detail: clean(r.out).slice(-1500) });
}

if (wants("api")) {
  if (ensureTestDb()) {
    const out = join(reports, "vitest-api.json");
    const r = run("api: servidor e banco", "pnpm", ["--filter", "@passo/api", "exec", "vitest", "run", "--reporter=json", `--outputFile="${out}"`], {
      TEST_DATABASE_URL: TEST_DB_URL,
    });
    const read = readVitest(out, "api");
    if (read) suites.push(...read);
    else steps.push({ name: "API", ok: false, detail: clean(r.out).slice(-1500) });
  } else {
    steps.push({ name: "API (precisa do banco de teste)", ok: false, detail: "Ligue o Docker Desktop e rode de novo." });
  }
}

if (wants("telas")) {
  const out = join(reports, "playwright.json");
  const r = run("telas: navegador (Playwright)", "pnpm", ["--filter", "@passo/web", "exec", "playwright", "test", "--reporter=json"], {
    PLAYWRIGHT_JSON_OUTPUT_NAME: out,
  });
  const read = readPlaywright(out);
  if (read) suites.push(...read);
  else steps.push({ name: "Telas", ok: false, detail: clean(r.out).slice(-1500) });
}

if (wants("build")) {
  const r = run("build: gerar o app", "pnpm", ["build"]);
  steps.push({ name: "Build (gerar o app para publicar)", ok: r.ok, detail: r.ok ? "" : clean(r.out).slice(-1500) });
}

// ---------------------------------------------------------------- relatório
const count = (tests, status) => tests.filter((t) => t.status === status).length;
const rows = suites
  .map((s) => {
    const label = FEATURES[s.area]?.[s.key];
    return {
      area: s.area,
      name: label ?? `${s.key} (sem rótulo: acrescente em scripts/check.mjs)`,
      total: s.tests.length,
      passed: count(s.tests, "passed"),
      failed: count(s.tests, "failed") + (s.suiteError ? 1 : 0),
      skipped: count(s.tests, "skipped"),
      tests: s.tests,
      suiteError: s.suiteError,
    };
  })
  .sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name, "pt-BR"));

const totals = rows.reduce(
  (acc, r) => ({ total: acc.total + r.total, passed: acc.passed + r.passed, failed: acc.failed + r.failed, skipped: acc.skipped + r.skipped }),
  { total: 0, passed: 0, failed: 0, skipped: 0 },
);
const failedSteps = steps.filter((s) => !s.ok);
const allOk = totals.failed === 0 && failedSteps.length === 0 && suites.length + steps.length > 0;

const mark = (r) => (r.failed > 0 ? "FALHOU" : r.skipped === r.total ? "pulado" : "ok");

console.log("\nFuncionalidades");
for (const area of ["engine", "api", "telas"]) {
  const group = rows.filter((r) => r.area === area);
  if (!group.length) continue;
  console.log(`\n  ${AREA_TITLE[area]}`);
  for (const r of group) {
    console.log(`    [${mark(r).padEnd(6)}] ${r.name}: ${r.passed}/${r.total}${r.failed ? `, ${r.failed} com falha` : ""}`);
  }
}
if (steps.length) {
  console.log("\n  Qualidade e build");
  for (const s of steps) console.log(`    [${(s.ok ? "ok" : "FALHOU").padEnd(6)}] ${s.name}`);
}

const failures = rows.flatMap((r) => [
  ...r.tests.filter((t) => t.status === "failed").map((t) => ({ where: r.name, title: t.title, error: t.error })),
  ...(r.suiteError ? [{ where: r.name, title: "(o arquivo de teste não carregou)", error: r.suiteError }] : []),
]);

if (failures.length || failedSteps.length) {
  console.log("\nO que falhou");
  for (const f of failures) console.log(`  - ${f.where}: ${f.title}\n      ${f.error.split("\n")[0] ?? ""}`);
  for (const s of failedSteps) console.log(`  - ${s.name}\n      ${s.detail.split("\n").slice(-3).join("\n      ")}`);
}

console.log(
  `\n${allOk ? "TUDO CERTO" : "HÁ PROBLEMAS"}: ${totals.passed} de ${totals.total} verificações passaram` +
    `${totals.failed ? `, ${totals.failed} falharam` : ""}${totals.skipped ? `, ${totals.skipped} puladas` : ""}.`,
);

const md = [];
md.push("# Relatório de testes — Let's Go Run", "");
md.push(`Gerado em ${new Date().toLocaleString("pt-BR")}. Resultado: **${allOk ? "tudo certo" : "há problemas"}** (${totals.passed} de ${totals.total} verificações).`, "");
for (const area of ["engine", "api", "telas"]) {
  const group = rows.filter((r) => r.area === area);
  if (!group.length) continue;
  md.push(`## ${AREA_TITLE[area]}`, "", "| Funcionalidade | Resultado | Passaram | Falharam |", "|---|---|---|---|");
  for (const r of group) md.push(`| ${r.name} | ${mark(r)} | ${r.passed}/${r.total} | ${r.failed} |`);
  md.push("");
}
if (steps.length) {
  md.push("## Qualidade e build", "", "| Item | Resultado |", "|---|---|");
  for (const s of steps) md.push(`| ${s.name} | ${s.ok ? "ok" : "FALHOU"} |`);
  md.push("");
}
if (failures.length || failedSteps.length) {
  md.push("## O que falhou", "");
  for (const f of failures) md.push(`- **${f.where}**: ${f.title}`, "", "  ```", ...f.error.split("\n").map((l) => `  ${l}`), "  ```", "");
  for (const s of failedSteps) md.push(`- **${s.name}**`, "", "  ```", ...s.detail.split("\n").map((l) => `  ${l}`), "  ```", "");
}
writeFileSync(join(reports, "relatorio-testes.md"), md.join("\n"));
console.log("Relatório completo: reports/relatorio-testes.md");

process.exit(allOk ? 0 : 1);
