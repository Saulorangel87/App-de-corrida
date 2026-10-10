// Semana do atleta: materializa o modelo, aplica o tempo disponível por sessão e distribui nos dias
// da janela de 7 dias (seção 6 da especificação, etapa 6 da entrevista). Função pura.
import { recoveryWeekMinutes, weeklyCaps } from "../day/progression";
import { materializeWeek, type MaterializeInput, type MaterializedSession, type MaterializedWeek } from "./materialize";
import { scheduleWeek } from "./schedule";

export type AthleteWeekInput = MaterializeInput & {
  /** Dias por semana que o atleta informou. Limita as corridas; o motor nunca "compensa". */
  daysPerWeek: number;
  /** Minutos disponíveis por sessão: teto de duração de cada sessão do plano (só reduz). */
  minutesPerSession: number;
  /** Dia preferido para o longão: 1 = segunda … 7 = domingo. */
  longRunDay: number;
  /** Dia da semana em que a janela de 7 dias começa: 1 = segunda … 7 = domingo. */
  startWeekday: number;
  /**
   * Volume concluído na última semana de construção (R-PRG-05: a base é o que foi feito).
   * Com ele a semana nasce dentro dos tetos que a decisão do dia aplica depois (R-PRG-03, R-PRG-07).
   */
  lastBuildWeekMinutes?: number;
};

export type AthletePlacement = {
  /** Dias depois do início da janela (0 a 6). */
  dayOffset: number;
  session: MaterializedSession;
};

export type AthleteWeek = {
  week: MaterializedWeek;
  placed: AthletePlacement[];
  /** Não coube nos dias do atleta (sem compensação em outro dia). */
  unplaced: MaterializedSession[];
  /** Dias da semana (1–7) escolhidos para treinar. */
  weekdays: number[];
};

/**
 * Escolhe os dias da semana de treino: o dia do longão mais os outros mais espaçados.
 * Maximiza o menor intervalo (contando a virada da semana) e, no empate, o equilíbrio.
 */
export function availableWeekdays(daysPerWeek: number, longRunDay: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  const long = Math.min(7, Math.max(1, Math.round(longRunDay)));
  if (n >= 7) return [1, 2, 3, 4, 5, 6, 7];
  const others = [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== long);

  const subsets = (k: number, from: number): number[][] => {
    if (k === 0) return [[]];
    const out: number[][] = [];
    for (let i = from; i <= others.length - k; i++) {
      for (const rest of subsets(k - 1, i + 1)) out.push([others[i]!, ...rest]);
    }
    return out;
  };

  let best: number[] = [long];
  let bestKey: [number, number] = [-1, -Infinity];
  for (const combo of subsets(n - 1, 0)) {
    const days = [long, ...combo].sort((a, b) => a - b);
    const gaps = days.map((d, i) => (i + 1 < days.length ? days[i + 1]! - d : days[0]! + 7 - d));
    const key: [number, number] = [Math.min(...gaps), -gaps.reduce((s, g) => s + g * g, 0)];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      best = days;
      bestKey = key;
    }
  }
  return best;
}

/** Semana concreta do atleta: minutos por sessão (com o limite de tempo) e dias de cada uma. */
export function buildAthleteWeek(input: AthleteWeekInput): AthleteWeek {
  const weekdays = availableWeekdays(input.daysPerWeek, input.longRunDay);
  const week = materializeWeek({ ...input, maxRuns: weekdays.length });
  const cap = Math.max(10, Math.floor(input.minutesPerSession));

  // A escada tem estrutura fixa (repetições): não é encurtada; as demais só reduzem.
  const sessions: MaterializedSession[] = week.sessions.map((s) => {
    if (s.optional || s.ladder || s.minutes <= cap) return s;
    return {
      ...s,
      minutes: cap,
      ...(s.workMinutes !== undefined ? { workMinutes: Math.max(Math.min(s.workMinutes, cap - 20), 8) } : {}),
      note: s.note ? `${s.note}; limitada ao tempo disponível por sessão` : "limitada ao tempo disponível por sessão",
    };
  });

  // O agendador trabalha com posições 1–7 da janela; assim "dias seguidos" são datas seguidas.
  const toPos = (weekday: number) => ((weekday - input.startWeekday + 7) % 7) + 1;
  const level = input.template.level;
  const noConsecutiveRuns = !!week.ladderStage || (level === "iniciante" && input.weekNumber <= 8);
  const result = scheduleWeek({
    sessions,
    availableDays: weekdays.map(toPos),
    longRunDay: toPos(input.longRunDay),
    noConsecutiveRuns,
  });

  // Teto semanal sobre o que foi concluído (R-PRG-03, R-PRG-07): vale para o que de fato foi
  // agendado. A semana já nasce dentro dele; o motor diário só reduz o que sobrar.
  const notes = [...week.notes];
  const lastBuild = input.lastBuildWeekMinutes ?? 0;
  let placed = result.placed;
  if (lastBuild > 0 && !week.ladderStage && !week.isTaper && !week.isRaceWeek) {
    const weeklyCap = week.isRecovery ? recoveryWeekMinutes(lastBuild) : weeklyCaps(lastBuild, !!input.cautelaLesao).target;
    const sum = placed.filter((p) => !p.session.optional).reduce((a, p) => a + p.session.minutes, 0);
    if (weeklyCap !== null && sum > weeklyCap) {
      const factor = weeklyCap / sum;
      placed = placed.map((p) => {
        const s = p.session;
        if (s.optional || s.ladder) return p;
        const minutes = Math.max(10, Math.floor(s.minutes * factor));
        return {
          ...p,
          session: {
            ...s,
            minutes,
            ...(s.workMinutes !== undefined ? { workMinutes: Math.max(Math.min(s.workMinutes, minutes - 20), 8) } : {}),
            note: s.note ? `${s.note}; ajustada ao teto semanal` : "ajustada ao teto semanal sobre o que você concluiu",
          },
        };
      });
      notes.push(
        week.isRecovery
          ? `Semana de recuperação: ${weeklyCap} min, 75% da última semana de construção (R-PRG-07).`
          : `Volume limitado a ${weeklyCap} min, sobre o que você concluiu na última semana de construção (R-PRG-03).`,
      );
    }
  }

  const scheduled = placed.map((p) => ({ dayOffset: p.day - 1, session: p.session }));
  const finalSessions = [...scheduled.map((p) => p.session), ...result.unplaced].sort((a, b) => a.slot - b.slot);
  return {
    week: {
      ...week,
      sessions: finalSessions,
      notes,
      weeklyRunMinutes: scheduled.filter((p) => !p.session.optional).reduce((a, p) => a + p.session.minutes, 0),
    },
    placed: scheduled,
    unplaced: result.unplaced,
    weekdays,
  };
}
