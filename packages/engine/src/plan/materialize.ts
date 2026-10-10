// Do modelo à semana concreta: converte os índices de volume e as partes de cada sessão em
// minutos para um atleta, respeitando os tetos (R-PLN-07, R-PLN-11, R-PRG-02 a R-PRG-04, R-SES-*).
// Função pura: o motor diário (decideDay) ainda pode reduzir, mas nunca aumentar.
import type { LevelName } from "../classification/classify";
import { diaV1 } from "../day/config";
import type { PlannedSession, SessionKind, Zone } from "../day/types";
import { ESCADA_CAMINHADA_CORRIDA } from "./ladder";
import type { PlanTemplate, TemplateSession, TemplateWeek } from "./templates";

const WARMUP_COOLDOWN_MIN = 10; // R-SES-10: 5 min + 5 min de caminhada rápida

export type MaterializedSession = PlannedSession & {
  slot: number;
  optional: boolean;
  /** Estrutura da escada (corrida, caminhada e repetições) nas sessões da escada. */
  ladder?: { etapa: string; corridaMin: number; caminhadaMin: number; repeticoes: number; continua: boolean };
  /** Tempo de trabalho sugerido dentro da sessão de qualidade (sem aquecimento e desaquecimento). */
  workMinutes?: number;
  /** Houve troca ou redução para respeitar um teto. */
  note?: string;
};

export type MaterializedWeek = {
  weekNumber: number;
  phase: TemplateWeek["phase"];
  isRecovery: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  ladderStage?: string;
  weeklyRunMinutes: number;
  sessions: MaterializedSession[];
  notes: string[];
};

export type MaterializeInput = {
  template: PlanTemplate;
  weekNumber: number;
  /** Média semanal de minutos de corrida nas últimas 4 semanas (0 se não se sabe). */
  baseWeeklyMinutes: number;
  /** Maior sessão concluída nos últimos 30 dias, em minutos (R-PRG-02, R-SES-31). */
  longest30?: number;
  cautelaLesao?: boolean;
  /**
   * Máximo de corridas na semana (dias disponíveis do atleta). Excedente sai primeiro entre as leves
   * e o volume dele é repartido entre as que ficam, para o atleta não perder carga em silêncio.
   */
  maxRuns?: number;
};

const RPE: Record<string, number | undefined> = {
  "caminhada-corrida": 3, "rodagem-leve": 3, longao: 3, regenerativo: 2,
  "limiar-continuo": 5, fartlek: 5, "intervalado-curto": 8, "intervalado-longo": 8, subidas: 8,
};

/** Rodagem leve por nível (R-SES-20): faixa de duração. */
const EASY_MAX: Record<LevelName, number> = { iniciante: 40, intermediario: 60, avancado: 75 };
const MIN_SESSION = 15;

/** Minutos em Z2 e Z3 de cada sessão de qualidade (R-SES-41, R-SES-50/55/60/65), por nível. */
const Z_MINUTES: Record<string, { z2: [number, number]; z3: [number, number] }> = {
  "limiar-continuo": { z2: [15, 20], z3: [0, 0] },
  fartlek: { z2: [12, 12], z3: [0, 0] },
  "intervalado-curto": { z2: [0, 0], z3: [5, 8] },
  "intervalado-longo": { z2: [0, 0], z3: [9, 16] },
  subidas: { z2: [0, 0], z3: [4, 6] },
};
/** Regressão quando o orçamento de intensidade estoura (R-SES-42/51/56/61/66). */
const REGRESS: Record<string, string> = {
  "intervalado-longo": "intervalado-curto",
  "intervalado-curto": "fartlek",
  subidas: "fartlek",
  "limiar-continuo": "fartlek",
  fartlek: "rodagem-leve",
};
const Z3_BUDGET: Record<LevelName, number> = { iniciante: 0, intermediario: 0.12, avancado: 0.15 }; // R-DIS-02
const Z2_BUDGET = 0.15; // R-DIS-03

const zoneOf = (slug: string): Zone => (Z_MINUTES[slug]?.z3[0] ? "Z3" : Z_MINUTES[slug] ? "Z2" : "Z1");
const kindOf = (slug: string): SessionKind =>
  slug === "longao" ? "longao" : slug === "rodagem-leve" ? "rodagem" : slug === "regenerativo" ? "regenerativo"
    : slug === "caminhada-corrida" ? "caminhada-corrida" : slug === "forca-corredor" ? "forca" : slug === "mobilidade" ? "mobilidade"
    : "qualidade";

/** Volume de cada semana do modelo para este atleta, com o teto de crescimento (R-PRG-03/04). */
export function weeklyMinutesFor(input: Omit<MaterializeInput, "weekNumber">): number[] {
  const { template, baseWeeklyMinutes, cautelaLesao } = input;
  const weeks = template.weeks;
  const cap = template.peakWeeklyCapMinutes;
  const i1 = weeks[0]!.volumeIndex;

  // Normalização: semana 1 ≈ média atual; pico = min(teto, base ÷ índice); piso de 90% da base.
  let scale: number;
  if (baseWeeklyMinutes > 0) {
    let w1 = baseWeeklyMinutes;
    if (w1 / (i1 / 100) > cap) w1 = Math.min(cap, Math.max((i1 / 100) * cap, 0.9 * baseWeeklyMinutes));
    scale = w1 / i1;
  } else {
    scale = cap / 100;
  }

  const growth = cautelaLesao ? diaV1.progression.weeklyCapInjuryPct : diaV1.progression.weeklyCapPct;
  const out: number[] = [];
  let lastBuild = 0;
  let peakBuild = 0;
  for (const w of weeks) {
    let m: number;
    if (w.isRecovery) {
      m = Math.floor((lastBuild * diaV1.progression.recoveryWeekPct) / 100);
    } else if (w.isTaper || w.isRaceWeek) {
      m = Math.round(((peakBuild || w.volumeIndex * scale) * w.volumeIndex) / 100);
    } else {
      m = Math.round(w.volumeIndex * scale);
      if (lastBuild > 0 && !w.ladderStage) m = Math.min(m, Math.floor((lastBuild * growth) / 100));
      m = Math.min(m, cap);
      lastBuild = m;
      peakBuild = Math.max(peakBuild, m);
    }
    out.push(m);
  }
  return out;
}

function ladderSessions(week: TemplateWeek): MaterializedSession[] {
  const stage = ESCADA_CAMINHADA_CORRIDA.find((e) => e.etapa === week.ladderStage)!;
  const pct = week.ladderRecoveryPct ?? 100;
  return week.sessions
    .filter((s) => s.ladderSession)
    .map((s) => {
      const base = stage.sessoes[s.ladderSession! - 1]!;
      const reps = pct === 100 ? base.repeticoes : Math.max(1, Math.floor((base.repeticoes * pct) / 100));
      const minutes = Math.round((base.corridaMin + base.caminhadaMin) * reps) + WARMUP_COOLDOWN_MIN;
      return {
        slot: s.slot, optional: false, slug: s.slug, kind: "caminhada-corrida" as const, minutes, maxZone: "Z1" as const,
        targetRpe: RPE["caminhada-corrida"],
        ladder: { etapa: stage.etapa, corridaMin: base.corridaMin, caminhadaMin: base.caminhadaMin, repeticoes: reps, continua: !!base.continua },
        ...(pct === 100 ? {} : { note: `semana de recuperação: ${pct}% das repetições` }),
      };
    });
}

function complementary(week: TemplateWeek): MaterializedSession[] {
  return week.sessions
    .filter((s) => s.optional)
    .map((s) => ({
      slot: s.slot, optional: true, slug: s.slug, kind: kindOf(s.slug), minutes: s.fixedMinutes ?? 15, maxZone: "Z1" as Zone,
    }));
}

/** Semana concreta de um modelo para um atleta (minutos por sessão, com os tetos aplicados). */
export function materializeWeek(input: MaterializeInput): MaterializedWeek {
  const { template, weekNumber } = input;
  const week = template.weeks[weekNumber - 1];
  if (!week) throw new Error(`semana ${weekNumber} inexistente em ${template.slug}`);
  const level = template.level;
  const notes: string[] = [];
  const header = {
    weekNumber, phase: week.phase, isRecovery: week.isRecovery, isTaper: week.isTaper, isRaceWeek: week.isRaceWeek,
    ladderStage: week.ladderStage,
  };

  if (week.ladderStage) {
    const sessions = [...ladderSessions(week), ...complementary(week)];
    const runMinutes = sessions.filter((s) => !s.optional).reduce((a, s) => a + s.minutes, 0);
    return { ...header, weeklyRunMinutes: runMinutes, sessions, notes };
  }

  const weekly = weeklyMinutesFor(input)[weekNumber - 1]!;
  // R-PLN-10: o −X% do polimento é de treino; a prova em si é extra e não é sessão do catálogo.
  if (week.isRaceWeek) notes.push("O volume da semana de prova é só de treino; o dia da prova é extra e não entra nessa conta.");
  let runs: TemplateSession[] = week.sessions.filter((s) => s.sharePct > 0);
  if (input.maxRuns !== undefined && runs.length > input.maxRuns) {
    const rank = (s: TemplateSession) => (s.kind === "longao" ? 0 : s.kind === "qualidade" ? 1 : 2);
    const total = runs.reduce((a, s) => a + s.sharePct, 0);
    const kept = [...runs].sort((a, b) => rank(a) - rank(b) || a.slot - b.slot).slice(0, Math.max(1, input.maxRuns));
    const keptTotal = kept.reduce((a, s) => a + s.sharePct, 0);
    runs = kept.map((s) => ({ ...s, sharePct: (s.sharePct * total) / keptTotal })).sort((a, b) => a.slot - b.slot);
    notes.push(`${week.sessions.filter((s) => s.sharePct > 0).length - runs.length} corrida(s) leve(s) a menos: seus dias disponíveis; o volume foi repartido entre as demais.`);
  }
  const items = runs.map((s) => ({
    t: s, slug: s.slug, minutes: Math.round((weekly * s.sharePct) / 100), note: undefined as string | undefined,
  }));

  // ---- Orçamento de intensidade da semana (R-DIS-02/03): regride a sessão se estourar ----
  const levelIdx = level === "avancado" ? 1 : 0;
  const budgetOk = () => {
    let z2 = 0;
    let z3 = 0;
    for (const it of items) {
      const z = Z_MINUTES[it.slug];
      if (!z) continue;
      z2 += z.z2[levelIdx]!;
      z3 += z.z3[levelIdx]!;
    }
    return z3 <= Z3_BUDGET[level] * weekly + 1e-9 && z2 <= Z2_BUDGET * weekly + 1e-9;
  };
  let guard = 0;
  while (!budgetOk() && guard++ < 12) {
    const heavy = items
      .filter((it) => REGRESS[it.slug])
      .sort((a, b) => (Z_MINUTES[b.slug]!.z3[levelIdx]! - Z_MINUTES[a.slug]!.z3[levelIdx]!) || (Z_MINUTES[b.slug]!.z2[levelIdx]! - Z_MINUTES[a.slug]!.z2[levelIdx]!))[0];
    if (!heavy) break;
    const from = heavy.slug;
    heavy.slug = REGRESS[from]!;
    heavy.note = `trocada de ${from}: orçamento de intensidade da semana (R-DIS-02/03)`;
    notes.push(`${from} → ${heavy.slug}`);
  }

  // ---- Limites por sessão ----
  const longest = input.longest30 ?? 0;
  const sessionCap = longest > 0 ? Math.floor((longest * diaV1.progression.sessionCapPct) / 100) : Infinity;
  let spill = 0;
  for (const it of items) {
    if (it.slug === "longao") {
      const cap = Math.min(template.longRunCapMinutes, Math.floor(weekly * 0.4), sessionCap);
      if (it.minutes > cap) {
        it.minutes = cap;
        it.note = "longão limitado pelo teto do modelo, 40% da semana ou 110% da maior corrida (R-SES-30/31)";
      }
    } else if (it.slug === "rodagem-leve" || it.slug === "regenerativo") {
      const max = Math.min(EASY_MAX[level], sessionCap);
      if (it.minutes > max) {
        spill += it.minutes - max;
        it.minutes = max;
      }
    } else if (Number.isFinite(sessionCap) && it.minutes > sessionCap) {
      it.minutes = sessionCap;
    }
    it.minutes = Math.max(it.minutes, week.isRaceWeek ? 10 : MIN_SESSION);
  }
  // o excedente das rodagens vai para o longão, até o teto dele
  const long = items.find((it) => it.slug === "longao");
  if (long && spill > 0) {
    const cap = Math.min(template.longRunCapMinutes, Math.floor(weekly * 0.4), sessionCap);
    long.minutes = Math.min(cap, long.minutes + spill);
  }

  const sessions: MaterializedSession[] = items.map((it) => {
    const z = Z_MINUTES[it.slug];
    return {
      slot: it.t.slot, optional: false, slug: it.slug, kind: kindOf(it.slug), minutes: it.minutes,
      maxZone: zoneOf(it.slug), targetRpe: RPE[it.slug],
      ...(z ? { workMinutes: Math.max(Math.min(it.minutes - 20, level === "avancado" ? 30 : 20), 8) } : {}),
      ...(it.note ? { note: it.note } : {}),
    };
  });
  sessions.push(...complementary(week));
  return {
    ...header,
    weeklyRunMinutes: sessions.filter((s) => !s.optional).reduce((a, s) => a + s.minutes, 0),
    sessions: sessions.sort((a, b) => a.slot - b.slot),
    notes,
  };
}
