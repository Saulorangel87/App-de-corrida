import { describe, expect, it } from "vitest";
import { selectPlan, type PlanSelectionInput } from "../src/plan/select";

const base = (over: Partial<PlanSelectionInput> = {}): PlanSelectionInput => ({
  goal: "primeira_prova",
  raceDistance: "10k",
  level: "intermediario",
  weeklyKm: 25,
  weeklySessions: 3,
  monthsRegular: 24,
  longestRecentKm: 12,
  canRunContinuousMinutes: 60,
  halfMarathonLast3m: false,
  injuryOrPersistentPainLast6w: false,
  runningInjuryLast3m: false,
  currentPain: 0,
  screening: { state: "LIBERADO", maxIntensity: "livre" },
  today: "2026-10-12",
  ...over,
});

describe("PLN-v1 (docs/pesquisa/10-planos-objetivo.md)", () => {
  it("R-PLN-02: triagem não liberada bloqueia o plano", () => {
    for (const state of ["NAO_FEITA", "AVALIACAO_NECESSARIA", "ADIADO", "EXPIRADO"] as const) {
      expect(selectPlan(base({ screening: { state, maxIntensity: "nenhuma" } }))).toMatchObject({ status: "bloqueado", reason: "triagem" });
    }
  });

  it("R-PLN-02: dor atual ≥ 3/10 bloqueia; 2/10 não", () => {
    expect(selectPlan(base({ currentPain: 3 }))).toMatchObject({ status: "bloqueado", reason: "dor_atual" });
    expect(selectPlan(base({ goal: "saude", currentPain: 2 })).status).toBe("atribuido");
  });

  it("R-PLN-01: emagrecimento vira saúde com controle_de_peso; 12 semanas", () => {
    expect(selectPlan(base({ goal: "emagrecimento", raceDistance: undefined }))).toMatchObject({
      status: "atribuido", objective: "saude", goalTag: "controle_de_peso", templateWeeks: 12, endDate: "2027-01-04",
    });
  });

  it("R-PLN-17: IMC < 18,5 bloqueia a etiqueta de peso", () => {
    expect(selectPlan(base({ goal: "emagrecimento", bmi: 18.4 }))).toMatchObject({ goalTag: null, weightTagBlocked: true });
  });

  it("R-PLN-04: iniciante que pede 21 km recebe 10 km (se tiver base) ou 5 km", () => {
    const withBase = selectPlan(base({ level: "iniciante", raceDistance: "21k" }));
    expect(withBase).toMatchObject({ objective: "10k", requestedObjective: "21k", downgrades: ["nivel_iniciante"], templateWeeks: 12 });
    const noBase = selectPlan(base({ level: "iniciante", raceDistance: "42k", canRunContinuousMinutes: 10, longestRecentKm: 2 }));
    expect(noBase).toMatchObject({ objective: "5k", downgrades: ["nivel_iniciante", "nivel_iniciante", "base_10k"], templateWeeks: 13 });
  });

  it("R-PLN-03: 42 km exige meia recente, 30 km/sem e maior distância ≥ 16 km", () => {
    const ready = base({ raceDistance: "42k", weeklyKm: 35, longestRecentKm: 18, halfMarathonLast3m: true });
    expect(selectPlan(ready)).toMatchObject({ objective: "42k", templateWeeks: 16 });
    expect(selectPlan({ ...ready, halfMarathonLast3m: false })).toMatchObject({ objective: "21k", downgrades: ["base_42k"] });
    expect(selectPlan({ ...ready, runningInjuryLast3m: true })).toMatchObject({ objective: "21k" });
  });

  it("R-PLN-03: 10 km exige 30 min contínuos e 2x/semana", () => {
    expect(selectPlan(base({ canRunContinuousMinutes: 25, longestRecentKm: 4 }))).toMatchObject({ objective: "5k", downgrades: ["base_10k"] });
    expect(selectPlan(base({ canRunContinuousMinutes: 25, longestRecentKm: 5 }))).toMatchObject({ objective: "10k" });
    expect(selectPlan(base({ weeklySessions: 1 }))).toMatchObject({ objective: "5k" });
  });

  it("R-PLN-05: prazo menor que o modelo não encurta; sugere data e distâncias menores", () => {
    const r = selectPlan(base({ raceDistance: "21k", weeklyKm: 25, longestRecentKm: 12, raceDate: "2026-12-21" }));
    expect(r).toMatchObject({
      status: "prazo_insuficiente", objective: "21k", weeksNeeded: 12, weeksAvailable: 10,
      earliestRaceDate: "2027-01-04", smallerThatFit: ["5k", "10k"],
    });
  });

  it("R-PLN-05: prazo maior → semanas extras viram base e o plano termina na prova", () => {
    expect(selectPlan(base({ raceDate: "2027-02-01" }))).toMatchObject({ status: "atribuido", templateWeeks: 10, baseWeeks: 6, endDate: "2027-02-01" });
  });

  it("R-PLN-13: 5 km iniciante = 13 semanas (escada do zero)", () => {
    expect(selectPlan(base({ level: "iniciante", raceDistance: "5k" }))).toMatchObject({ objective: "5k", templateWeeks: 13 });
  });
});
