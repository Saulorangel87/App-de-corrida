// Progressão de carga: docs/pesquisa/05-progressao-carga.md (R-PRG-02 a R-PRG-09) e R-CRG-07.
// Sem ACWR (R-PRG-01): nada aqui usa razão aguda:crônica.
import type { LevelName } from "../classification/classify";
import { diaV1 as cfg } from "./config";
import type { DayInput, WorkoutLog } from "./types";

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const age = (d: string, today: string) => Math.round((parse(today) - parse(d)) / DAY_MS);
const pct = (n: number, p: number) => Math.floor((n * p) / 100);

/** R-PRG-05: a base é o que foi concluído, nunca o planejado. */
export function longestSessionLast30(logs: WorkoutLog[], today: string): number {
  return logs
    .filter((l) => l.completed && age(l.date, today) >= 0 && age(l.date, today) < cfg.progression.sessionCapWindowDays)
    .reduce((m, l) => Math.max(m, l.minutes), 0);
}

/** R-PRG-02: teto de 110% da maior sessão concluída em 30 dias, arredondado para baixo. */
export function sessionCapMinutes(longest30: number): number | null {
  return longest30 > 0 ? pct(longest30, cfg.progression.sessionCapPct) : null;
}

/** R-PRG-03 e R-PRG-04: teto semanal (alvo) e absoluto, sobre a última semana de construção. */
export function weeklyCaps(lastBuildWeek: number, cautelaLesao: boolean) {
  if (lastBuildWeek <= 0) return { target: null, absolute: null };
  const targetPct = cautelaLesao ? cfg.progression.weeklyCapInjuryPct : cfg.progression.weeklyCapPct;
  const absolute = pct(lastBuildWeek, cautelaLesao ? cfg.progression.absoluteCapInjuryPct : cfg.progression.absoluteCapPct);
  const base = (lastBuildWeek * targetPct) / 100;
  // R-PRG-03: em volumes pequenos, vale o múltiplo de 5 min mais próximo, sem passar do teto absoluto.
  const target = Math.max(Math.floor(base), Math.min(Math.round(base / 5) * 5, absolute));
  return { target, absolute };
}

/** R-PRG-07: semana de recuperação = 75% da última semana de construção. */
export const recoveryWeekMinutes = (lastBuildWeek: number) => pct(lastBuildWeek, cfg.progression.recoveryWeekPct);

/** R-CRG-07: RPE relatado ≥ 2 pontos acima do alvo (alvo ≤ 4) em 2 das últimas 3 sessões. */
export function rpeOverTarget(logs: WorkoutLog[]): boolean {
  const last = logs
    .filter((l) => l.completed && l.reportedRpe !== undefined && l.targetRpe !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-cfg.progression.rpeOverSessions.of);
  const over = last.filter(
    (l) => l.targetRpe! <= cfg.progression.rpeOverTargetMaxTarget && l.reportedRpe! - l.targetRpe! >= cfg.progression.rpeOverTarget,
  );
  return last.length === cfg.progression.rpeOverSessions.of && over.length >= cfg.progression.rpeOverSessions.atLeast;
}

/** R-PRG-02: houve corrida acima do teto na última semana (gatilho d de R-PRG-06)? */
export function ranOverCap(logs: WorkoutLog[], today: string): boolean {
  return logs
    .filter((l) => l.completed && !l.exempt && age(l.date, today) >= 0 && age(l.date, today) <= 6)
    .some((l) => {
      const before = logs
        .filter((p) => p !== l && p.completed && age(p.date, l.date) > 0 && age(p.date, l.date) <= cfg.progression.sessionCapWindowDays)
        .reduce((m, p) => Math.max(m, p.minutes), 0);
      return before > 0 && l.minutes > pct(before, cfg.progression.sessionCapPct);
    });
}

export type FreezeReason = "dor_limite" | "sono_s1_na_semana" | "sessoes_nao_concluidas" | "corrida_acima_do_teto" | "rpe_acima_do_alvo";

/** R-PRG-06: congelar a progressão da semana seguinte (repete a semana concluída, nunca "compensa"). */
export function freezeReasons(i: {
  painLimit: boolean;
  sleepS1OrWorseThisWeek: boolean;
  logs: WorkoutLog[];
  today: string;
}): FreezeReason[] {
  const out: FreezeReason[] = [];
  if (i.painLimit) out.push("dor_limite");
  if (i.sleepS1OrWorseThisWeek) out.push("sono_s1_na_semana");
  const missed = i.logs.filter((l) => !l.completed && age(l.date, i.today) >= 0 && age(l.date, i.today) <= 6).length;
  if (missed > cfg.progression.freezeSessionsMissed) out.push("sessoes_nao_concluidas");
  if (ranOverCap(i.logs, i.today)) out.push("corrida_acima_do_teto");
  if (rpeOverTarget(i.logs)) out.push("rpe_acima_do_alvo");
  return out;
}

const LEVELS: LevelName[] = ["iniciante", "intermediario", "avancado"];

/** R-CLS-07: nível efetivo para o retorno (29–84 dias rebaixa 1; mais de 84 volta a iniciante). */
export function levelAfterPause(level: LevelName, days: number): LevelName {
  if (days > 84) return "iniciante";
  if (days >= 29) return LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)]!;
  return level;
}

export type ReturnBand = "segue" | "congela" | "reduzido" | "longa";

export type ReturnPlan = {
  band: ReturnBand;
  weeklyMinutesCap: number | null;
  sessionMinutesCap: number | null;
  noZ3: boolean;
  effectiveLevel: LevelName;
  reapplyScreening: boolean;
  restartWith: "caminhada-corrida" | "rodagem-leve" | null;
  /** R-PRG-09: pausa por dor, lesão ou doença sem autodeclaração de liberação. */
  waitingProfessional: boolean;
};

/** R-PRG-08 (tabela única) e R-PRG-09 (pausa por dor, lesão ou doença). */
export function returnFromPause(i: {
  level: LevelName;
  daysSinceLastRun: number;
  lastBuildWeekMinutes: number;
  longest30: number;
  pauseCause?: DayInput["pauseCause"];
  clearedByProfessionalAt?: string | null;
  pauseReturnStartedOn?: string | null;
  today: string;
}): ReturnPlan {
  const D = i.daysSinceLastRun;
  const r = cfg.returnFromPause;
  const effectiveLevel = levelAfterPause(i.level, D);
  const hasCause = !!i.pauseCause;
  const waitingProfessional = hasCause && !i.clearedByProfessionalAt;
  const stillInNoZ3Window =
    !!i.pauseReturnStartedOn && age(i.pauseReturnStartedOn, i.today) >= 0 && age(i.pauseReturnStartedOn, i.today) < r.noZ3Weeks * 7;

  if (hasCause || D >= 29) {
    const initialWeekly = r.initialPhaseWeeklyMinutes[effectiveLevel];
    const half = i.lastBuildWeekMinutes > 0 ? pct(i.lastBuildWeekMinutes, r.longPauseVolumePct) : initialWeekly;
    return {
      band: "longa",
      weeklyMinutesCap: Math.min(half, initialWeekly),
      sessionMinutesCap: r.initialPhaseSessionMinutes[effectiveLevel],
      noZ3: true,
      effectiveLevel,
      reapplyScreening: D >= 29,
      restartWith: effectiveLevel === "iniciante" ? "caminhada-corrida" : "rodagem-leve",
      waitingProfessional,
    };
  }
  if (D >= 15) {
    return {
      band: "reduzido",
      weeklyMinutesCap: i.lastBuildWeekMinutes > 0 ? pct(i.lastBuildWeekMinutes, r.reducedPct) : null,
      sessionMinutesCap: i.longest30 > 0 ? pct(i.longest30, r.reducedPct) : null,
      noZ3: true,
      effectiveLevel,
      reapplyScreening: false,
      restartWith: null,
      waitingProfessional: false,
    };
  }
  if (D >= 8) {
    return {
      band: "congela",
      weeklyMinutesCap: i.lastBuildWeekMinutes > 0 ? i.lastBuildWeekMinutes : null,
      sessionMinutesCap: null,
      noZ3: stillInNoZ3Window,
      effectiveLevel,
      reapplyScreening: false,
      restartWith: null,
      waitingProfessional: false,
    };
  }
  return {
    band: "segue",
    weeklyMinutesCap: null,
    sessionMinutesCap: null,
    noZ3: stillInNoZ3Window,
    effectiveLevel,
    reapplyScreening: false,
    restartWith: null,
    waitingProfessional: false,
  };
}
