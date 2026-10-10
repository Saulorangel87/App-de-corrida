// Sono e bem-estar: docs/pesquisa/08-sono-recuperacao.md (R-SON-01 a R-SON-16).
import { diaV1 as cfg } from "./config";
import type { Checkin, DayReason, Rank, SessionKind } from "./types";

export type NightClass = "adequada" | "limitrofe" | "ruim" | "muito_ruim" | "desconhecida";
type Band = 0 | 1 | 2; // verde, amarelo, vermelho

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY_MS);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const isItem = (n: number | undefined): n is number => typeof n === "number" && n >= 1 && n <= 5;

/** Horas plausíveis (R-SON-13); fora do intervalo vira "não informado" e pede confirmação. */
export function plausibleHours(h: number | undefined): number | undefined {
  if (h === undefined) return undefined;
  return h < cfg.sleep.plausibleMinHours || h > cfg.sleep.plausibleMaxHours ? undefined : h;
}

/** R-SON-01 e R-SON-02: classifica a noite que o check-in descreve. */
export function classifyNight(c: Checkin): NightClass {
  const hours = plausibleHours(c.sleepHours);
  const quality = isItem(c.sleepQuality) ? c.sleepQuality : undefined;
  let night: NightClass = "desconhecida";
  if (hours !== undefined) {
    if (hours < cfg.sleep.veryBadBelowHours) night = "muito_ruim";
    else if (hours <= cfg.sleep.badMaxHours) night = "ruim";
    else if (hours < cfg.sleep.adequateMinHours) night = "limitrofe";
    else night = "adequada";
  }
  if (quality !== undefined) {
    if (night === "desconhecida") night = quality <= cfg.sleep.badQualityMax ? "ruim" : "adequada";
    else if (quality <= cfg.sleep.badQualityMax && (night === "adequada" || night === "limitrofe")) night = "ruim";
  }
  return night;
}

const isBad = (n: NightClass) => n === "ruim" || n === "muito_ruim";

/** R-SON-03: soma dos cinco itens (5 a 25); só vale com os cinco preenchidos. */
export function wellbeingScore(c: Checkin): number | undefined {
  const items = [c.sleepQuality, c.energy, c.mood, c.stress, c.muscleSoreness];
  return items.every(isItem) ? (items as number[]).reduce((a, b) => a + b, 0) : undefined;
}

/** R-SON-04: faixa absoluta, com itens críticos. */
function absoluteBand(c: Checkin, w: number): Band {
  const items = [c.sleepQuality, c.energy, c.mood, c.stress, c.muscleSoreness] as number[];
  const critical = items.filter((n) => n === cfg.wellbeing.criticalItem).length;
  let band: Band = w >= cfg.wellbeing.greenMin ? 0 : w >= cfg.wellbeing.yellowMin ? 1 : 2;
  if (critical >= cfg.wellbeing.criticalItemsForRed) band = 2;
  else if (critical >= 1 && band < 1) band = 1;
  return band;
}

type DayEval = {
  date: string;
  night: NightClass;
  w?: number;
  baseline?: number;
  delta?: number;
  band?: Band;
  s: Rank;
  rawBn: Rank;
  rawL: Rank;
  clean: boolean;
  sCapped: boolean;
};

export type WellbeingResult = {
  hasCheckinToday: boolean;
  needsCheckin: boolean;
  acuteIllnessToday: boolean;
  invalidHoursToday: boolean;
  night: NightClass | null;
  w: number | null;
  baseline: number | null;
  delta: number | null;
  s: Rank;
  bn: Rank;
  /** Nível final do dia (já com a regra de saída do alerta). */
  level: Rank;
  carried: boolean;
  persistentSleepIssue: boolean;
  reasons: DayReason[];
};

/**
 * Avalia sono e bem-estar até `today`. `todayKind`/`highLoadWeek` valem só para hoje.
 * Reproduz os dias em ordem para aplicar S3 (máx. 2 dias) e a saída do alerta (R-SON-10).
 */
export function evaluateWellbeing(input: {
  checkins: Checkin[];
  today: string;
  todayKind?: SessionKind;
  highLoadWeek?: boolean;
}): WellbeingResult {
  const { today } = input;
  const byDate = new Map<string, Checkin>();
  for (const c of input.checkins) if (c.date <= today) byDate.set(c.date, c);
  const todayCheckin = byDate.get(today);
  const acuteIllnessToday = todayCheckin?.acuteIllness === true;

  // R-SON-16: dia de doença aguda não conta como noite ruim nem como bem-estar.
  const records = [...byDate.values()]
    .filter((c) => !c.acuteIllness)
    .sort((a, b) => a.date.localeCompare(b.date));
  const rec = new Map(records.map((c) => [c.date, c]));

  const nightOf = new Map(records.map((c) => [c.date, classifyNight(c)]));
  const wOf = new Map<string, number>();
  const bandOf = new Map<string, Band>();
  for (const c of records) {
    const w = wellbeingScore(c);
    if (w !== undefined) {
      wOf.set(c.date, w);
      bandOf.set(c.date, absoluteBand(c, w));
    }
  }

  const evals: DayEval[] = [];
  let sPrev: Rank[] = []; // S final dos dias já processados (para o teto de S3)
  for (const c of records) {
    const d = c.date;
    const night = nightOf.get(d)!;

    // ---- S (R-SON-06) ----
    let bad7 = 0;
    let veryBad7 = 0;
    for (let k = 0; k < 7; k++) {
      const n = nightOf.get(addDays(d, -k));
      if (n && isBad(n)) bad7 += 1;
      if (n === "muito_ruim") veryBad7 += 1;
    }
    let bad3 = 0;
    for (let k = 0; k < 3; k++) {
      const n = nightOf.get(addDays(d, -k));
      if (n && isBad(n)) bad3 += 1;
    }
    let consecutive = 0;
    for (let k = 0; ; k++) {
      const n = nightOf.get(addDays(d, -k));
      if (n && isBad(n)) consecutive += 1;
      else break;
    }
    const kind = d === today ? input.todayKind : c.plannedKind;
    const qualityDay = kind === "qualidade" || kind === "longao";
    let s: Rank = 0;
    if ((night === "muito_ruim" && qualityDay) || bad3 >= cfg.sleep.s1BadIn3) s = 1;
    if (consecutive >= cfg.sleep.s2ConsecutiveBad || bad7 >= cfg.sleep.s2BadIn7) s = 2;
    if (bad7 >= cfg.sleep.s3BadIn7 || veryBad7 >= cfg.sleep.s3VeryBadIn7) s = 3;
    // R-SON-10: S3 isolado dura no máximo 2 dias seguidos; depois fica em S2.
    let sCapped = false;
    const lastTwo = sPrev.slice(-cfg.sleep.s3MaxConsecutiveDays);
    if (s === 3 && lastTwo.length === cfg.sleep.s3MaxConsecutiveDays && lastTwo.every((x) => x === 3)) {
      s = 2;
      sCapped = true;
    }
    sPrev = [...sPrev, s];

    // ---- Bn (R-SON-05 e R-SON-07) ----
    const w = wOf.get(d);
    let band: Band | undefined = bandOf.get(d);
    let baseline: number | undefined;
    let delta: number | undefined;
    if (w !== undefined) {
      const past: number[] = [];
      for (let k = 1; k <= cfg.wellbeing.baselineDays; k++) {
        const pw = wOf.get(addDays(d, -k));
        if (pw !== undefined) past.push(pw);
      }
      if (past.length >= cfg.wellbeing.baselineMinRecords) {
        baseline = median(past);
        delta = w - baseline;
        let dev: Band = 0;
        if (delta <= cfg.wellbeing.deviationRed) dev = 2;
        else if (delta <= cfg.wellbeing.deviationYellow) dev = 1;
        band = Math.max(band ?? 0, dev) as Band;
      }
    }
    let bn: Rank = (band ?? 0) as Rank;
    if (band === 2 && bandOf.get(addDays(d, -1)) === 2) bn = 3; // vermelho 2 dias seguidos
    // persistência: amarelo/vermelho em ≥ 3 dos últimos 5 dias com registro
    let flagged = 0;
    for (let k = 0; k < cfg.wellbeing.persistenceWindow; k++) {
      const b = bandOf.get(addDays(d, -k));
      if (b !== undefined && b >= 1) flagged += 1;
    }
    // R-SON-07: persistência sobe um nível (máx. 3), mesmo que hoje esteja verde [P, conservador].
    if (flagged >= cfg.wellbeing.persistenceMinDays) bn = Math.min(3, bn + 1) as Rank;

    // ---- L (R-SON-08) ----
    let rawL = Math.max(s, bn) as number;
    if (s >= 1 && bn >= 1) rawL += 1; // dois sinais independentes
    if (d === today && input.highLoadWeek && bn >= 1) rawL += 1; // semana de carga alta
    rawL = Math.min(3, rawL);

    const clean = night !== "ruim" && night !== "muito_ruim" && night !== "limitrofe" && (band ?? 0) === 0 && (delta === undefined || delta > cfg.wellbeing.deviationYellow);
    evals.push({ date: d, night, w, baseline, delta, band, s, rawBn: bn, rawL: rawL as Rank, clean, sCapped });
  }

  // ---- Suavização (R-SON-10): desce 1 degrau por dia; L0 só após 2 dias limpos ----
  let level: Rank = 0;
  let cleanStreak = 0;
  const finalOf = new Map<string, Rank>();
  for (const e of evals) {
    const prev = level;
    level = e.rawL >= level ? e.rawL : (Math.max(e.rawL, level - 1) as Rank);
    cleanStreak = e.clean ? cleanStreak + 1 : 0;
    if (level === 0 && prev > 0 && cleanStreak < cfg.recovery.daysWithoutSignalForL0) level = 1;
    finalOf.set(e.date, level);
  }

  // ---- Hoje ----
  const reasons: DayReason[] = [];
  const todayEval = evals.find((e) => e.date === today);
  const last = evals[evals.length - 1];
  const carried = !todayEval && !!last && daysBetween(last.date, today) <= cfg.carryLastLevelDays;
  const finalLevel: Rank = todayEval ? level : carried ? (finalOf.get(last!.date) ?? 0) : 0;

  if (todayEval) {
    const s = todayEval.s;
    if (s === 1) reasons.push({ rule: "R-SON-06", code: "sono_s1", sources: ["Walsh 2021", "Van Dongen 2003"] });
    if (s === 2) reasons.push({ rule: "R-SON-06", code: "sono_s2", sources: ["Van Dongen 2003", "Belenky 2003"] });
    if (s === 3) reasons.push({ rule: "R-SON-06", code: "sono_s3", sources: ["Van Dongen 2003", "Belenky 2003", "Milewski 2014"] });
    if (todayEval.sCapped) reasons.push({ rule: "R-SON-10", code: "sono_s3_limitado", sources: ["Belenky 2003"] });
    if (todayEval.rawBn >= 1) {
      reasons.push({
        rule: "R-SON-07",
        code: todayEval.delta !== undefined && todayEval.delta <= cfg.wellbeing.deviationYellow ? "bem_estar_desvio" : "bem_estar_faixa",
        detail: todayEval.delta !== undefined ? `W=${todayEval.w}; média 14 dias=${todayEval.baseline}` : `W=${todayEval.w}`,
        sources: ["Saw 2016", "Lathlean 2023", "Hooper 1995"],
      });
    }
    if (todayEval.s >= 1 && todayEval.rawBn >= 1) reasons.push({ rule: "R-SON-08", code: "dois_sinais", sources: ["Lathlean 2023"] });
    if (input.highLoadWeek && todayEval.rawBn >= 1) reasons.push({ rule: "R-SON-08", code: "semana_carga_alta", sources: ["Lathlean 2023"] });
    if (todayEval.rawL < level) reasons.push({ rule: "R-SON-10", code: "saida_gradual", sources: ["Belenky 2003"] });
  } else if (carried && finalLevel > 0) {
    reasons.push({ rule: "R-SON-13", code: "sem_checkin_ultimo_nivel", sources: [] });
  }

  // R-SON-12: sono insuficiente persistente (≥ 14 dos últimos 21 dias com S ≥ 2)
  let highS = 0;
  for (const e of evals) {
    const age = daysBetween(e.date, today);
    if (age >= 0 && age < cfg.sleep.persistentWindow && e.s >= 2) highS += 1;
  }
  const persistentSleepIssue = highS >= cfg.sleep.persistentDays;
  if (persistentSleepIssue) reasons.push({ rule: "R-SON-12", code: "sono_persistente", sources: ["Walsh 2021"] });

  const hoursToday = todayCheckin?.sleepHours;
  return {
    hasCheckinToday: !!todayCheckin,
    needsCheckin: !todayCheckin,
    acuteIllnessToday,
    invalidHoursToday: hoursToday !== undefined && plausibleHours(hoursToday) === undefined,
    night: todayEval?.night ?? null,
    w: todayEval?.w ?? null,
    baseline: todayEval?.baseline ?? null,
    delta: todayEval?.delta ?? null,
    s: (todayEval?.s ?? 0) as Rank,
    bn: (todayEval?.rawBn ?? 0) as Rank,
    level: acuteIllnessToday ? 0 : finalLevel,
    carried,
    persistentSleepIssue,
    reasons,
  };
}
