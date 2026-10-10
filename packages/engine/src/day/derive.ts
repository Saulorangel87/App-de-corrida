// Grandezas que a decisão do dia usa e que saem do histórico concluído (datas e minutos).
// Funções puras: o serviço da API só lê o banco e chama estas.
import { diaV1 as cfg } from "./config";

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const age = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);
const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);

/** Última corrida que o atleta informou na entrevista: a data de referência menos os dias. */
export const interviewLastRun = (i: { daysSinceLastRun: number; asOf: string }) => addDays(i.asOf, -i.daysSinceLastRun);

/** Dias desde a última corrida concluída (R-PRG-08); sem registros, vale a entrevista. */
export function daysSinceLastRun(completedRunDates: string[], today: string, interviewLast: string): number {
  const last = [interviewLast, ...completedRunDates.filter((d) => d <= today)].sort().at(-1)!;
  return Math.max(0, age(last, today));
}

/**
 * Data da primeira corrida depois de uma pausa de 15 dias ou mais (R-PRG-08): a partir dela
 * não há Z3 por 2 semanas. Considera a última pausa; `null` se não houve.
 */
export function pauseReturnStartedOn(completedRunDates: string[], today: string, interviewLast: string): string | null {
  const dates = [...new Set([interviewLast, ...completedRunDates].filter((d) => d <= today))].sort();
  const minGap = cfg.returnFromPause.freezeMaxDays + 1;
  let start: string | null = null;
  for (let k = 1; k < dates.length; k++) {
    if (age(dates[k - 1]!, dates[k]!) >= minGap) start = dates[k]!;
  }
  return start;
}

export type ClosedWeek = {
  /** Semana de recuperação do plano (R-PRG-07). */
  isRecovery: boolean;
  /** Semana de polimento ou de prova (não é de construção). */
  isTaper: boolean;
  /** Minutos de corrida concluídos na semana. */
  minutes: number;
};

/**
 * Volume da última semana de construção concluída (R-PRG-03): a mais recente que não foi de
 * recuperação nem de polimento e em que houve corrida. `fallback` é a média da entrevista.
 */
export function lastBuildWeekMinutes(closedWeeks: ClosedWeek[], fallback: number): number {
  for (let k = closedWeeks.length - 1; k >= 0; k--) {
    const w = closedWeeks[k]!;
    if (!w.isRecovery && !w.isTaper && w.minutes > 0) return w.minutes;
  }
  return fallback;
}
