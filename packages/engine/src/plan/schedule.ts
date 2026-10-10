// Distribui as sessões da semana nos dias que o atleta tem (seção 6, etapa 6 da entrevista).
// Regras: sessões de qualidade nunca em dias seguidos (R-DIS-04), longão no dia escolhido,
// escada e iniciante nas primeiras semanas com dia de descanso entre as corridas (R-SES-10, R-PLN-09),
// força em dia sem sessão dura e com 48 h entre elas (R-SES-70).
import type { MaterializedSession } from "./materialize";

export type ScheduleInput = {
  sessions: MaterializedSession[];
  /** 1 = segunda … 7 = domingo. */
  availableDays: number[];
  longRunDay?: number;
  /** Sem corridas em dias seguidos (escada; iniciante nas 8 primeiras semanas). */
  noConsecutiveRuns?: boolean;
};

export type Scheduled = { day: number; session: MaterializedSession };
export type ScheduleResult = {
  placed: Scheduled[];
  /** Não coube nos dias disponíveis; o motor diário nunca "compensa" em outro dia. */
  unplaced: MaterializedSession[];
};

const isHard = (s: MaterializedSession) => s.kind === "qualidade" || s.kind === "longao";
const adjacent = (a: number, b: number) => Math.abs(a - b) === 1;

function priority(s: MaterializedSession): number {
  if (s.kind === "longao") return 0;
  if (s.kind === "qualidade") return 1;
  return 2;
}

/** Procura a atribuição de dias com menor penalidade que respeite as regras duras. */
function bestAssignment(runs: MaterializedSession[], days: number[], i: ScheduleInput): number[] | null {
  let best: number[] | null = null;
  let bestScore = Infinity;
  const used: number[] = [];

  const feasible = (idx: number, day: number) => {
    const s = runs[idx]!;
    for (let k = 0; k < used.length; k++) {
      const other = runs[k]!;
      const adj = adjacent(used[k]!, day);
      if (!adj) continue;
      if (i.noConsecutiveRuns || s.ladder || other.ladder) return false;
      if (s.kind === "qualidade" && other.kind === "qualidade") return false; // R-DIS-04
    }
    return true;
  };

  const score = (assign: number[]) => {
    let p = 0;
    for (let a = 0; a < assign.length; a++) {
      const s = runs[a]!;
      if (s.kind === "longao" && i.longRunDay !== undefined && assign[a] !== i.longRunDay) p += 5;
      for (let b = a + 1; b < assign.length; b++) {
        if (adjacent(assign[a]!, assign[b]!)) p += isHard(s) && isHard(runs[b]!) ? 3 : 1;
      }
    }
    return p;
  };

  const rec = (idx: number) => {
    if (idx === runs.length) {
      const sc = score(used);
      if (sc < bestScore) {
        bestScore = sc;
        best = [...used];
      }
      return;
    }
    for (const d of days) {
      if (used.includes(d) || !feasible(idx, d)) continue;
      used.push(d);
      rec(idx + 1);
      used.pop();
    }
  };
  rec(0);
  return best;
}

export function scheduleWeek(input: ScheduleInput): ScheduleResult {
  const days = [...new Set(input.availableDays)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  const all = [...input.sessions].sort((a, b) => a.slot - b.slot);
  let runs = all.filter((s) => !s.optional).sort((a, b) => priority(a) - priority(b) || a.slot - b.slot);
  const complementary = all.filter((s) => s.optional);
  const unplaced: MaterializedSession[] = [];

  let assign = bestAssignment(runs, days, input);
  // não coube: abre mão primeiro das corridas leves (de trás para frente)
  while (!assign && runs.length > 0) {
    const dropIdx = [...runs].reverse().findIndex((s) => priority(s) === 2);
    const idx = dropIdx === -1 ? runs.length - 1 : runs.length - 1 - dropIdx;
    unplaced.push(runs[idx]!);
    runs = runs.filter((_, k) => k !== idx);
    assign = bestAssignment(runs, days, input);
  }

  const placed: Scheduled[] = runs.map((s, k) => ({ day: assign![k]!, session: s }));
  const hardDays = new Set(placed.filter((p) => isHard(p.session)).map((p) => p.day));

  // força: dia sem sessão dura, com ≥ 2 dias entre uma e outra (48 h)
  const strengthDays: number[] = [];
  for (const s of complementary.filter((x) => x.kind === "forca")) {
    const day = days.find((d) => !hardDays.has(d) && strengthDays.every((o) => Math.abs(o - d) >= 2));
    if (day === undefined) unplaced.push(s);
    else {
      strengthDays.push(day);
      placed.push({ day, session: s });
    }
  }
  // mobilidade: em dias diferentes, preferindo o dia seguinte a uma sessão dura
  const mobDays: number[] = [];
  const preferred = [...days].sort(
    (a, b) => Number(hardDays.has(b - 1)) - Number(hardDays.has(a - 1)) || a - b,
  );
  for (const s of complementary.filter((x) => x.kind === "mobilidade")) {
    const day = preferred.find((d) => !mobDays.includes(d));
    if (day === undefined) unplaced.push(s);
    else {
      mobDays.push(day);
      placed.push({ day, session: s });
    }
  }
  return { placed: placed.sort((a, b) => a.day - b.day || a.session.slot - b.session.slot), unplaced };
}
