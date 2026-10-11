import type { LevelName } from "../classification/classify";
import type { MaxIntensity, ScreeningState } from "../screening/screen";
import { PLN_SOURCES, PLN_VERSION, RACE_ORDER, plnV1 as cfg, type Objective } from "./config";
import { clsV1 } from "../classification/config";
import { ladderPlacement, type LadderPlacement } from "./placement";
import { buildPlanTemplate } from "./templates";

export type Goal = "saude" | "emagrecimento" | "primeira_prova" | "melhorar_tempo";
export type RaceDistance = (typeof RACE_ORDER)[number];

export type PlanSelectionInput = {
  goal: Goal;
  /** Obrigatória para primeira_prova e melhorar_tempo. */
  raceDistance?: RaceDistance;
  raceDate?: string; // AAAA-MM-DD
  level: LevelName;
  weeklyKm: number;
  weeklySessions: number;
  monthsRegular: number;
  longestRecentKm: number;
  canRunContinuousMinutes: number;
  halfMarathonLast3m: boolean;
  injuryOrPersistentPainLast6w: boolean;
  runningInjuryLast3m: boolean;
  currentPain: number; // 0–10
  bmi?: number;
  /** Flags da classificação (R-CLS-08/09): entram no posicionamento na escada (R-PLN-21). */
  cautelaLesao?: boolean;
  inicioDoZero?: boolean;
  screening: { state: ScreeningState; maxIntensity: MaxIntensity };
  today: string; // AAAA-MM-DD
};

export type DowngradeReason =
  | "nivel_iniciante" // R-PLN-04
  | "base_10k" // R-PLN-03
  | "base_21k"
  | "base_42k";

export type PlanSelection =
  | {
      status: "bloqueado";
      reason: "triagem" | "dor_atual";
      ruleVersion: typeof PLN_VERSION;
    }
  | {
      status: "prazo_insuficiente"; // R-PLN-05: não encurta; sugere data ou distância
      objective: Objective;
      weeksNeeded: number;
      weeksAvailable: number;
      earliestRaceDate: string;
      smallerThatFit: RaceDistance[];
      ruleVersion: typeof PLN_VERSION;
    }
  | {
      status: "atribuido";
      objective: Objective;
      requestedObjective: Objective;
      downgrades: DowngradeReason[];
      goalTag: "controle_de_peso" | null;
      weightTagBlocked: boolean; // R-PLN-17
      level: LevelName;
      templateWeeks: number;
      /** Semana do modelo em que o plano começa e o porquê (escada, R-PLN-21); null sem escada. */
      startTemplateWeek: number;
      placement: LadderPlacement | null;
      /** Semanas que faltam do modelo a partir da entrada (templateWeeks - startTemplateWeek + 1). */
      remainingWeeks: number;
      baseWeeks: number; // semanas extras de base antes do modelo (R-PLN-05/07)
      startDate: string;
      endDate: string;
      sources: string[];
      ruleVersion: typeof PLN_VERSION;
    };

const DAY = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const weeksBetween = (a: string, b: string) => Math.floor((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / (7 * DAY));

/** Cumpre a base do objetivo (R-PLN-03, R-PLN-04)? Retorna o motivo da recusa ou null. */
function blockerFor(objective: RaceDistance, i: PlanSelectionInput): DowngradeReason | null {
  const p = cfg.prerequisites;
  switch (objective) {
    case "5k":
      return null;
    case "10k": {
      const ok =
        (i.canRunContinuousMinutes >= p["10k"].continuousMinutes || i.longestRecentKm >= p["10k"].orContinuousKm) &&
        i.weeklySessions >= p["10k"].minSessionsPerWeek &&
        i.currentPain === 0;
      return ok ? null : "base_10k";
    }
    case "21k": {
      if (i.level === "iniciante") return "nivel_iniciante";
      const r = p["21k"];
      const ok =
        i.monthsRegular * 4 >= r.minRegularWeeks &&
        i.weeklySessions >= r.minSessionsPerWeek &&
        i.weeklyKm >= r.minWeeklyKm &&
        i.longestRecentKm >= r.minLongestKm &&
        !i.injuryOrPersistentPainLast6w;
      return ok ? null : "base_21k";
    }
    case "42k": {
      if (i.level === "iniciante") return "nivel_iniciante";
      const r = p["42k"];
      const ok =
        i.monthsRegular >= r.minRegularMonths &&
        i.halfMarathonLast3m &&
        i.weeklyKm >= r.minWeeklyKm &&
        i.longestRecentKm >= r.minLongestKm &&
        !i.runningInjuryLast3m;
      return ok ? null : "base_42k";
    }
  }
}

/** Escolhe o modelo de plano (docs/pesquisa/10-planos-objetivo.md, R-PLN-01 a R-PLN-05, R-PLN-13, R-PLN-17). */
export function selectPlan(i: PlanSelectionInput): PlanSelection {
  // R-PLN-02 / R-TRI-01: sem triagem liberada, nenhum plano.
  if (i.screening.state !== "LIBERADO" && i.screening.state !== "LIBERADO_APOS_AVALIACAO") {
    return { status: "bloqueado", reason: "triagem", ruleVersion: PLN_VERSION };
  }
  // R-PLN-02: dor atual ≥ 3/10.
  if (i.currentPain >= cfg.painBlocksAt) {
    return { status: "bloqueado", reason: "dor_atual", ruleVersion: PLN_VERSION };
  }

  // R-PLN-01: emagrecimento → saúde com etiqueta; prova → distância da prova.
  const isRace = i.goal === "primeira_prova" || i.goal === "melhorar_tempo";
  if (isRace && !i.raceDistance) throw new Error("raceDistance obrigatória para objetivo de prova");
  const requested: Objective = isRace ? i.raceDistance! : "saude";

  // R-PLN-03/04: desce um objetivo por vez até caber na base atual.
  let objective: Objective = requested;
  const downgrades: DowngradeReason[] = [];
  if (objective !== "saude") {
    let idx = RACE_ORDER.indexOf(objective);
    for (;;) {
      const blocker = blockerFor(RACE_ORDER[idx]!, i);
      if (!blocker) break;
      downgrades.push(blocker);
      idx -= 1; // 5 km não tem pré-requisito: o laço sempre termina
    }
    objective = RACE_ORDER[idx]!;
  }

  const templateWeeks = cfg.weeks[objective][i.level];
  if (templateWeeks === null) throw new Error("modelo inexistente após rebaixamento"); // inalcançável: R-PLN-04 já rebaixou

  // R-PLN-21: onde o plano começa na escada (o que o atleta já consegue não é repetido).
  const template = buildPlanTemplate(objective, i.level);
  const placement = template
    ? ladderPlacement({
        template,
        canRunContinuousMinutes: i.canRunContinuousMinutes,
        baseWeeklyMinutes: Math.round(i.weeklyKm * clsV1.load.minutesPerKm),
        bmi: i.bmi,
        cautelaLesao: i.cautelaLesao,
        inicioDoZero: i.inicioDoZero,
      })
    : null;
  const startTemplateWeek = placement?.startWeek ?? 1;
  const remainingWeeks = templateWeeks - (startTemplateWeek - 1);

  // R-PLN-05: prazo até a prova. Só vale se a prova é a pedida (rebaixado = sem data de prova).
  let baseWeeks = 0;
  let endDate = addDays(i.today, remainingWeeks * 7);
  if (isRace && i.raceDate && downgrades.length === 0) {
    const available = weeksBetween(i.today, i.raceDate);
    if (available < remainingWeeks) {
      const smallerThatFit = RACE_ORDER.slice(0, RACE_ORDER.indexOf(objective as RaceDistance)).filter((d) => {
        const w = cfg.weeks[d][i.level];
        return w !== null && w <= available && blockerFor(d, i) === null;
      });
      return {
        status: "prazo_insuficiente",
        objective,
        weeksNeeded: remainingWeeks,
        weeksAvailable: available,
        earliestRaceDate: addDays(i.today, remainingWeeks * 7),
        smallerThatFit,
        ruleVersion: PLN_VERSION,
      };
    }
    baseWeeks = available - remainingWeeks; // semanas extras viram base (R-PLN-05/07)
    endDate = i.raceDate;
  }

  // R-PLN-17: IMC < 18,5 bloqueia controle_de_peso.
  const wantsWeightTag = i.goal === "emagrecimento";
  const weightTagBlocked = wantsWeightTag && i.bmi !== undefined && i.bmi < cfg.minBmiForWeightTag;

  return {
    status: "atribuido",
    objective,
    requestedObjective: requested,
    downgrades,
    goalTag: wantsWeightTag && !weightTagBlocked ? "controle_de_peso" : null,
    weightTagBlocked,
    level: i.level,
    templateWeeks,
    startTemplateWeek,
    placement,
    remainingWeeks,
    baseWeeks,
    startDate: i.today,
    endDate,
    sources: PLN_SOURCES[objective],
    ruleVersion: PLN_VERSION,
  };
}
