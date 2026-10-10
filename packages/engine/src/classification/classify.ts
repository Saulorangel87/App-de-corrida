import { CLS_VERSION, clsV1 as cfg } from "./config";

export type Level = 1 | 2 | 3;
export const LEVEL_NAMES = { 1: "iniciante", 2: "intermediario", 3: "avancado" } as const;
export type LevelName = (typeof LEVEL_NAMES)[Level];

export type Sex = "M" | "F" | "nao_informado";
export type Flag = "inicio_do_zero" | "retorno_de_pausa" | "cautela_lesao";

/** Tempo de prova ou teste, com a data (vale só nos últimos 6 meses). */
export type RaceTime = { seconds: number; date: string };

export type ClassificationInput = {
  ageYears: number;
  sex: Sex;
  /** Meses seguidos correndo pelo menos 1x/semana (R-CLS-02). 0 = não corre. */
  monthsRegular: number;
  /** Média semanal das últimas 4 semanas (ou das 4 antes da pausa, se ≥ 29 dias parado). */
  weeklyVolume: { unit: "km" | "min"; value: number };
  /** Média de sessões de corrida por semana, mesmo período. */
  weeklySessions: number;
  t5k?: RaceTime;
  t10k?: RaceTime;
  /** Dias desde a última corrida regular. */
  daysSinceLastRun: number;
  /** Exercício regular (ACSM: 30 min moderado, 3 dias/sem, 3 meses) nos últimos 3 meses. */
  active3m: boolean;
  /** Lesão por corrida com afastamento nos últimos 12 meses. */
  injury12m: boolean;
  /** Data de referência (AAAA-MM-DD), para validade dos tempos e reavaliação. */
  asOf: string;
};

/** O que segurou o nível, para explicar ao atleta (R-CLS-15). */
export type LimitingCriterion =
  | { kind: "experiencia"; monthsRegular: number; needed: number }
  | { kind: "volume"; weeklyKm: number; needed: number }
  | { kind: "volume_sobreposicao"; weeklyKm: number }
  | { kind: "frequencia"; weeklySessions: number; needed: number }
  | { kind: "desempenho_sem_tempo"; sex: Sex }
  | { kind: "desempenho_tempo_acima"; sex: Sex }
  | { kind: "pausa"; days: number }
  | { kind: "inicio_do_zero" };

export type ClassificationResult =
  | { eligible: false; reason: "menor_de_18"; ruleVersion: typeof CLS_VERSION }
  | {
      eligible: true;
      level: Level;
      levelName: LevelName;
      flags: Flag[];
      limiting: LimitingCriterion[];
      weeklyKm: number;
      ruleVersion: typeof CLS_VERSION;
      nextReevaluation: string;
    };

const DAY_MS = 86_400_000;
const parseDate = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(parseDate(d) + n * DAY_MS).toISOString().slice(0, 10);

/** Tempo válido para classificar: até 6 meses antes da data de referência (R-CLS-06). */
function validTime(t: RaceTime | undefined, asOf: string): number | undefined {
  if (!t) return undefined;
  const age = (parseDate(asOf) - parseDate(t.date)) / DAY_MS;
  return age >= 0 && age <= cfg.performance.validityDays ? t.seconds : undefined;
}

const cutsFor = (sex: Sex) => (sex === "F" ? "F" : "M");

export function toWeeklyKm(volume: ClassificationInput["weeklyVolume"]): number {
  return volume.unit === "km" ? volume.value : volume.value / cfg.load.minutesPerKm;
}

/** Algoritmo CLS-v1 (docs/pesquisa/01-classificacao.md, seção "Algoritmo proposto"). */
export function classify(input: ClassificationInput): ClassificationResult {
  if (input.ageYears < cfg.minAgeYears) {
    return { eligible: false, reason: "menor_de_18", ruleVersion: CLS_VERSION };
  }

  const sexCuts = cutsFor(input.sex);
  const t5k = validTime(input.t5k, input.asOf);
  const t10k = validTime(input.t10k, input.asOf);
  const weeklyKm = toWeeklyKm(input.weeklyVolume);
  const limits: { level: Level; why: LimitingCriterion }[] = [];

  // 1. Experiência (R-CLS-03)
  let expLevel: Level = 3;
  if (input.monthsRegular < cfg.experience.intermediateMonths) {
    expLevel = 1;
    limits.push({ level: 1, why: { kind: "experiencia", monthsRegular: input.monthsRegular, needed: cfg.experience.intermediateMonths } });
  } else if (input.monthsRegular < cfg.experience.advancedMonths) {
    expLevel = 2;
    limits.push({ level: 2, why: { kind: "experiencia", monthsRegular: input.monthsRegular, needed: cfg.experience.advancedMonths } });
  }

  // 2. Carga (R-CLS-04, R-CLS-05)
  let loadLevel: Level;
  if (weeklyKm > cfg.load.advancedAboveKm) {
    if (input.weeklySessions >= cfg.load.advancedMinSessions) {
      loadLevel = 3;
    } else {
      loadLevel = 2;
      limits.push({ level: 2, why: { kind: "frequencia", weeklySessions: input.weeklySessions, needed: cfg.load.advancedMinSessions } });
    }
  } else if (weeklyKm >= cfg.load.intermediateMinKm) {
    loadLevel = 2;
    limits.push({ level: 2, why: { kind: "volume", weeklyKm, needed: cfg.load.advancedAboveKm } });
  } else if (weeklyKm >= cfg.load.overlapMinKm) {
    const nn = cfg.performance.notNovice[sexCuts];
    const notNovice = (t5k !== undefined && t5k <= nn.t5k) || (t10k !== undefined && t10k <= nn.t10k);
    if (input.monthsRegular >= cfg.experience.intermediateMonths && notNovice) {
      loadLevel = 2;
      limits.push({ level: 2, why: { kind: "volume", weeklyKm, needed: cfg.load.advancedAboveKm } });
    } else {
      loadLevel = 1;
      limits.push({ level: 1, why: { kind: "volume_sobreposicao", weeklyKm } });
    }
  } else {
    loadLevel = 1;
    limits.push({ level: 1, why: { kind: "volume", weeklyKm, needed: cfg.load.intermediateMinKm } });
  }

  // 3. Desempenho, só para avançado (R-CLS-06)
  const adv = cfg.performance.advanced[sexCuts];
  let perfLevel: Level;
  if (t5k === undefined && t10k === undefined) {
    perfLevel = 2;
    limits.push({ level: 2, why: { kind: "desempenho_sem_tempo", sex: input.sex } });
  } else if ((t5k !== undefined && t5k <= adv.t5k) || (t10k !== undefined && t10k <= adv.t10k)) {
    perfLevel = 3;
  } else {
    perfLevel = 2;
    limits.push({ level: 2, why: { kind: "desempenho_tempo_acima", sex: input.sex } });
  }

  // 4. Nível base = mínimo dos critérios (R-CLS-01)
  let level = Math.min(expLevel, loadLevel, perfLevel) as Level;
  let limiting = limits.filter((l) => l.level === level).map((l) => l.why);
  const flags: Flag[] = [];

  // 5. Pausa (R-CLS-07)
  const days = input.daysSinceLastRun;
  if (days > cfg.pause.noChangeMaxDays) {
    const before = level;
    level = days > cfg.pause.downgradeOneMaxDays ? 1 : (Math.max(1, level - 1) as Level);
    flags.push("retorno_de_pausa");
    if (level < before) limiting = [{ kind: "pausa", days }];
  }

  // 6. Sedentário (R-CLS-08)
  if (input.monthsRegular === 0 && !input.active3m) {
    level = 1;
    flags.push("inicio_do_zero");
    limiting = [{ kind: "inicio_do_zero" }];
  }

  // 7. Lesão: alerta, não nível (R-CLS-09)
  if (input.injury12m) flags.push("cautela_lesao");

  return {
    eligible: true,
    level,
    levelName: LEVEL_NAMES[level],
    flags,
    limiting,
    weeklyKm: Math.round(weeklyKm * 10) / 10,
    ruleVersion: CLS_VERSION,
    // 8. Reavaliação (R-CLS-11): 12 semanas; o fim do ciclo, se antes, é aplicado com o plano.
    nextReevaluation: addDays(input.asOf, cfg.reevaluationDays),
  };
}
