// Modelos de plano (semanas e sessões): docs/pesquisa/10-planos-objetivo.md (R-PLN-06 a R-PLN-14).
// Os índices de volume (pico = 100) das 5 curvas publicadas na pesquisa entram como estão;
// as demais seguem o mesmo gerador (×1,05–1,10 por semana de carga, ×0,75 na recuperação,
// polimento de R-PLN-10). Tudo [P], salvo o que a pesquisa cita com fonte.
import type { LevelName } from "../classification/classify";
import type { SessionKind, Zone } from "../day/types";
import { plnV1, type Objective } from "./config";
import { ESCADA_CAMINHADA_CORRIDA } from "./ladder";

export type Phase = "base" | "construcao" | "especifica" | "polimento" | "prova";

export type TemplateSession = {
  /** Ordem dentro da semana (os dias do calendário saem da disponibilidade do atleta). */
  slot: number;
  slug: string;
  kind: SessionKind;
  maxZone: Zone;
  /** Parte do volume semanal de corrida (0 nas sessões de duração fixa). */
  sharePct: number;
  fixedMinutes?: number;
  /** Força e mobilidade: complementares, sem entrar no volume de corrida. */
  optional?: boolean;
  /** Sessão 1–3 da etapa da escada (iniciante do zero). */
  ladderSession?: 1 | 2 | 3;
};

export type TemplateWeek = {
  weekNumber: number;
  phase: Phase;
  /** Índice de volume, pico = 100 (R-PLN-10, curvas). */
  volumeIndex: number;
  isRecovery: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  /** Etapa da escada (5 km iniciante do zero e saúde iniciante). */
  ladderStage?: string;
  /** Semana de recuperação na escada: repete a etapa anterior com este % das repetições (R-PLN-08). */
  ladderRecoveryPct?: number;
  sessions: TemplateSession[];
};

export type PlanTemplate = {
  slug: string;
  objective: Objective;
  level: LevelName;
  durationWeeks: number;
  weeks: TemplateWeek[];
  /** Teto de volume semanal de pico, em minutos (R-PLN-11). */
  peakWeeklyCapMinutes: number;
  /** Teto do longão, em minutos (R-PLN-11 e R-SES-30). */
  longRunCapMinutes: number;
};

// ---- Curvas publicadas (índices, pico = 100) ----
const PUBLISHED: Record<string, number[]> = {
  "5k-iniciante": [33, 38, 40, 44, 49, 53, 60, 62, 71, 80, 80, 89, 100],
  "5k-intermediario": [70, 75, 81, 60, 87, 94, 100, 60],
  "10k-intermediario": [68, 73, 79, 59, 86, 93, 100, 75, 75, 55],
  "21k-intermediario": [58, 63, 68, 51, 74, 80, 86, 64, 93, 100, 75, 55],
  "42k-intermediario": [55, 59, 63, 47, 67, 72, 77, 57, 82, 88, 94, 70, 100, 80, 62, 40],
};

/** Semanas de recuperação e de polimento (R-PLN-13), com a queda de cada semana de polimento (R-PLN-10). */
const SHAPE: Record<Objective, { recovery: number[]; taper: number[] }> = {
  "5k": { recovery: [4, 8], taper: [40] },
  "10k": { recovery: [4, 8], taper: [25, 45] },
  "21k": { recovery: [4, 8], taper: [25, 45] },
  "42k": { recovery: [4, 8, 12], taper: [20, 38, 60] },
  saude: { recovery: [4, 8, 12], taper: [] },
};

/** Teto de pico (min/semana) e do longão (min), por objetivo e nível (R-PLN-11; longão também R-SES-30). */
const CAPS: Record<Objective, Record<LevelName, { peak: number; longRun: number } | null>> = {
  "5k": { iniciante: { peak: 90, longRun: 40 }, intermediario: { peak: 150, longRun: 60 }, avancado: { peak: 240, longRun: 84 } },
  "10k": { iniciante: { peak: 132, longRun: 60 }, intermediario: { peak: 210, longRun: 84 }, avancado: { peak: 330, longRun: 108 } },
  "21k": { iniciante: null, intermediario: { peak: 270, longRun: 114 }, avancado: { peak: 390, longRun: 126 } },
  "42k": { iniciante: null, intermediario: { peak: 330, longRun: 120 }, avancado: { peak: 480, longRun: 150 } },
  // Saúde: alvo de 150 min/semana (R-PLN-14); o teto de 300 só vale depois de 12 semanas (R-PLN-16).
  saude: { iniciante: { peak: 150, longRun: 45 }, intermediario: { peak: 150, longRun: 60 }, avancado: { peak: 150, longRun: 75 } },
};

const RUNS_PER_WEEK: Record<Objective, Record<LevelName, number>> = {
  "5k": { iniciante: 3, intermediario: 3, avancado: 5 },
  "10k": { iniciante: 3, intermediario: 3, avancado: 5 },
  "21k": { iniciante: 3, intermediario: 4, avancado: 5 },
  "42k": { iniciante: 3, intermediario: 4, avancado: 6 },
  saude: { iniciante: 3, intermediario: 3, avancado: 3 },
};

// ---- Rotação das sessões de qualidade (R-SES-40 a R-SES-66, R-PLN-09) ----
const QUALITY_A: Record<Objective, Record<"intermediario" | "avancado", string[]>> = {
  "5k": {
    intermediario: ["fartlek", "subidas", "intervalado-curto", "intervalado-longo", "fartlek", "intervalado-curto"],
    avancado: ["intervalado-longo", "intervalado-curto", "intervalado-longo", "subidas"],
  },
  "10k": {
    intermediario: ["fartlek", "limiar-continuo", "intervalado-longo", "limiar-continuo", "intervalado-longo"],
    avancado: ["intervalado-longo", "limiar-continuo", "intervalado-longo", "limiar-continuo"],
  },
  "21k": { intermediario: ["fartlek", "limiar-continuo"], avancado: ["limiar-continuo", "intervalado-longo"] },
  "42k": { intermediario: ["fartlek", "limiar-continuo"], avancado: ["limiar-continuo", "fartlek"] },
  saude: { intermediario: [], avancado: [] },
};
const QUALITY_B: Record<Objective, string[]> = {
  "5k": ["limiar-continuo", "intervalado-curto"],
  "10k": ["fartlek", "intervalado-curto"],
  "21k": ["fartlek", "limiar-continuo"],
  "42k": ["fartlek", "limiar-continuo"],
  saude: [],
};

export const SLUG_ZONE: Record<string, Zone> = {
  "caminhada-corrida": "Z1",
  "rodagem-leve": "Z1",
  regenerativo: "Z1",
  longao: "Z1",
  "forca-corredor": "Z1",
  mobilidade: "Z1",
  "limiar-continuo": "Z2",
  fartlek: "Z2",
  "intervalado-curto": "Z3",
  "intervalado-longo": "Z3",
  subidas: "Z3",
};

const run = (slot: number, slug: string, sharePct: number): TemplateSession => ({
  slot, slug, kind: slug === "longao" ? "longao" : SLUG_ZONE[slug] === "Z1" ? "rodagem" : "qualidade", maxZone: SLUG_ZONE[slug] ?? "Z1", sharePct,
});

/** Distribui o volume entre as corridas da semana (soma 100; longão ≤ ~40%, R-SES-31). */
function shares(runs: number, withLong: boolean, qualities: number, reducedLong: boolean): number[] {
  const longShare = reducedLong ? 30 : { 3: 40, 4: 36, 5: 28, 6: 26 }[runs] ?? 30;
  const qShare = qualities === 0 ? 0 : { 3: 25, 4: 20, 5: qualities === 2 ? 16 : 20, 6: qualities === 2 ? 13 : 15 }[runs] ?? 20;
  const q = qShare * qualities;
  const easyCount = runs - qualities - (withLong ? 1 : 0);
  const easyTotal = 100 - q - (withLong ? longShare : 0);
  const base = Math.floor(easyTotal / easyCount);
  const out: number[] = [];
  for (let i = 0; i < qualities; i++) out.push(qShare);
  for (let i = 0; i < easyCount; i++) out.push(base);
  if (withLong) out.push(longShare);
  // ajusta o resto na última sessão, para somar exatamente 100
  out[out.length - 1]! += 100 - out.reduce((a, b) => a + b, 0);
  return out;
}

function runningSessions(i: {
  objective: Objective;
  level: LevelName;
  phase: Phase;
  isRecovery: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  buildOrdinal: number; // 0, 1, 2… entre as semanas de carga
  weekNumber: number;
}): TemplateSession[] {
  const { objective, level } = i;
  const runs = RUNS_PER_WEEK[objective][level];

  if (i.isRaceWeek) {
    return [run(1, "rodagem-leve", 50), run(2, "rodagem-leve", 50)];
  }

  const advancedPhase = i.phase === "construcao" || i.phase === "especifica" || i.phase === "polimento";
  const noQuality = level === "iniciante" || objective === "saude" || i.isRecovery || !advancedPhase;
  const qualities = noQuality ? 0 : level === "avancado" ? 2 : 1;
  // longão "a partir da fase de construção" (R-PLN-06); iniciante só depois da etapa 12 / 40 min (R-SES-30)
  const longAllowed = objective !== "saude" ? i.phase !== "base" || i.weekNumber >= 5 : i.weekNumber >= 5;
  const withLong = longAllowed && (level !== "iniciante" || i.weekNumber >= 5);
  const reducedLong = i.isRecovery || i.isTaper;
  const parts = shares(runs, withLong, qualities, reducedLong);

  const out: TemplateSession[] = [];
  let slot = 1;
  let idx = 0;
  const qa = level === "iniciante" ? [] : QUALITY_A[objective][level === "avancado" ? "avancado" : "intermediario"];
  for (let q = 0; q < qualities; q++) {
    const seq = q === 0 ? qa : QUALITY_B[objective];
    const slug = seq[i.buildOrdinal % seq.length]!;
    out.push(run(slot++, slug, parts[idx++]!));
  }
  const easyCount = runs - qualities - (withLong ? 1 : 0);
  for (let e = 0; e < easyCount; e++) out.push(run(slot++, "rodagem-leve", parts[idx++]!));
  if (withLong) out.push(run(slot, "longao", parts[idx]!));
  return out;
}

/** Força (2/semana, 1 na prova) e mobilidade (≥ 2 dias): complementares (R-SES-70, R-SES-80). */
function complementary(startSlot: number, raceOrTaper: boolean): TemplateSession[] {
  const strength: TemplateSession = {
    slot: startSlot, slug: "forca-corredor", kind: "forca", maxZone: "Z1", sharePct: 0, fixedMinutes: 30, optional: true,
  };
  const strength2: TemplateSession = { ...strength, slot: startSlot + 1 };
  const mob = (slot: number): TemplateSession => ({
    slot, slug: "mobilidade", kind: "mobilidade", maxZone: "Z1", sharePct: 0, fixedMinutes: 15, optional: true,
  });
  return raceOrTaper
    ? [strength, mob(startSlot + 1), mob(startSlot + 2)]
    : [strength, strength2, mob(startSlot + 2), mob(startSlot + 3)];
}

function buildCurve(objective: Objective, level: LevelName, weeks: number): number[] {
  const key = `${objective}-${level}`;
  const published = PUBLISHED[key];
  if (published) return [...published];

  const { recovery, taper } = SHAPE[objective];
  const taperStart = weeks - taper.length + 1;
  const isRecovery = (w: number) => recovery.includes(w) && w < taperStart;
  const isTaper = (w: number) => taper.length > 0 && w >= taperStart;
  const buildWeeks: number[] = [];
  for (let w = 1; w <= weeks; w++) if (!isRecovery(w) && !isTaper(w)) buildWeeks.push(w);
  const n = buildWeeks.length;
  const start = 100 / 1.075 ** (n - 1);
  const ratio = (100 / start) ** (1 / (n - 1));
  const curve: number[] = new Array(weeks).fill(0);
  buildWeeks.forEach((w, k) => {
    curve[w - 1] = k === n - 1 ? 100 : Math.round(start * ratio ** k);
  });
  for (let w = 1; w <= weeks; w++) {
    if (isRecovery(w)) {
      const prev = curve[w - 2] ?? 0;
      curve[w - 1] = Math.floor(prev * 0.75); // R-PRG-07
    } else if (isTaper(w)) {
      curve[w - 1] = 100 - taper[w - taperStart]!;
    }
  }
  return curve;
}

/** Monta o modelo de um objetivo e nível (ou null se não é oferecido, R-PLN-04). */
export function buildPlanTemplate(objective: Objective, level: LevelName): PlanTemplate | null {
  const weeks = plnV1.weeks[objective][level];
  const caps = CAPS[objective][level];
  if (weeks === null || !caps) return null;

  const { recovery, taper } = SHAPE[objective];
  const healthLadder = objective === "saude" && level === "iniciante";
  const ladderPlan = (objective === "5k" && level === "iniciante") || healthLadder;
  // Saúde iniciante: etapa 1, 2, 3, recuperação (repete 3 a 75%), 4, 5, 6, recuperação… (R-PLN-08, R-PLN-14).
  const healthStage: number[] = [];
  if (healthLadder) {
    let stage = 0;
    for (let w = 1; w <= weeks; w++) {
      if (recovery.includes(w)) healthStage.push(stage);
      else healthStage.push(++stage);
    }
  }
  const stageTotal = (ordem: number) => {
    const e = ESCADA_CAMINHADA_CORRIDA[ordem - 1]!;
    return e.totalCorridaMin + e.totalCaminhadaMin;
  };
  const curve = healthLadder
    ? (() => {
        const peak = stageTotal(Math.max(...healthStage));
        return healthStage.map((st, i) => {
          const pct = recovery.includes(i + 1) ? 0.75 : 1;
          return Math.round((100 * stageTotal(st) * pct) / peak);
        });
      })()
    : buildCurve(objective, level, weeks);
  const taperStart = weeks - taper.length + 1;
  const racePlan = objective !== "saude";
  const nonTaper = weeks - taper.length;

  let buildOrdinal = 0;
  const out: TemplateWeek[] = [];
  for (let w = 1; w <= weeks; w++) {
    const isTaper = !ladderPlan && taper.length > 0 && w >= taperStart;
    const isRecovery = (!ladderPlan || healthLadder) && recovery.includes(w) && !isTaper;
    const isRaceWeek = racePlan && w === weeks;
    let phase: Phase;
    if (isRaceWeek) phase = "prova";
    else if (isTaper) phase = "polimento";
    else {
      const pos = w / Math.max(1, nonTaper);
      phase = pos <= 0.4 ? "base" : pos <= 0.75 ? "construcao" : "especifica";
    }

    let sessions: TemplateSession[];
    let ladderStage: string | undefined;
    if (ladderPlan) {
      const stage = ESCADA_CAMINHADA_CORRIDA[(healthLadder ? healthStage[w - 1]! : w) - 1]!;
      ladderStage = stage.etapa;
      sessions = ([1, 2, 3] as const).map((n) => ({
        slot: n, slug: "caminhada-corrida", kind: "caminhada-corrida" as const, maxZone: "Z1" as const, sharePct: 0, ladderSession: n,
      }));
      sessions.push(...complementary(4, isRaceWeek));
      if (phase !== "prova") phase = "base";
    } else {
      sessions = runningSessions({
        objective, level, phase, isRecovery, isTaper, isRaceWeek, buildOrdinal, weekNumber: w,
      });
      sessions.push(...complementary(sessions.length + 1, isTaper || isRaceWeek));
      if (!isRecovery && !isTaper && !isRaceWeek) buildOrdinal += 1;
    }

    out.push({
      weekNumber: w, phase, volumeIndex: curve[w - 1]!, isRecovery, isTaper, isRaceWeek, ladderStage,
      ...(healthLadder && isRecovery ? { ladderRecoveryPct: 75 } : {}), sessions,
    });
  }

  return {
    slug: `${objective}-${level}`,
    objective,
    level,
    durationWeeks: weeks,
    weeks: out,
    peakWeeklyCapMinutes: caps.peak,
    longRunCapMinutes: caps.longRun,
  };
}

export const OBJECTIVES: Objective[] = ["5k", "10k", "21k", "42k", "saude"];
export const LEVELS: LevelName[] = ["iniciante", "intermediario", "avancado"];

/** Os 13 modelos oferecidos (R-PLN-13). */
export function allPlanTemplates(): PlanTemplate[] {
  return OBJECTIVES.flatMap((o) => LEVELS.map((l) => buildPlanTemplate(o, l))).filter((t): t is PlanTemplate => t !== null);
}
