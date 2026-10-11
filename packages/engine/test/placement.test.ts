import { describe, expect, it } from "vitest";
import { buildPlanTemplate, ladderPlacement, longestBlockMinutes, materializeWeek, selectPlan, weeklyCaps, type PlanSelectionInput } from "../src";

const five = buildPlanTemplate("5k", "iniciante")!;
const health = buildPlanTemplate("saude", "iniciante")!;
const place = (minutes: number, extra: Partial<Parameters<typeof ladderPlacement>[0]> = {}, template = five) =>
  ladderPlacement({ template, canRunContinuousMinutes: minutes, ...extra })!;

describe("posicionamento na escada (R-PLN-21, DEC-49)", () => {
  it("o maior bloco contínuo de cada etapa vem da tabela da escada", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(longestBlockMinutes)).toEqual([1, 2, 3, 4, 4, 6, 9, 10, 14, 16, 20, 30, 40]);
  });

  it("menos de 10 min: etapa 1, como antes", () => {
    for (const m of [0, 1, 5, 9]) expect(place(m)).toMatchObject({ startWeek: 1, etapa: "1", reason: "abaixo_do_minimo" });
  });

  it("10 min ou mais: a etapa mais avançada que cabe, menos 1 de folga (tabela de R-PLN-21)", () => {
    const expected: [number, string, number][] = [
      [10, "7", 7],
      [13, "7", 7],
      [14, "8", 8],
      [15, "8", 8],
      [16, "9", 9],
      [19, "9", 9],
      [20, "10", 10],
      [29, "10", 10],
      [30, "10b", 11],
      [39, "10b", 11],
      [40, "11", 12],
      [90, "11", 12],
      [600, "11", 12],
    ];
    for (const [min, etapa, week] of expected) {
      expect(place(min), `${min} min`).toMatchObject({ etapa, startWeek: week, reason: "declarado" });
    }
  });

  it("nunca passa da última etapa: o plano de 5 km sempre tem a semana da etapa final", () => {
    expect(place(600).startWeek).toBeLessThan(five.durationWeeks);
  });

  it("IMC 30 ou mais, cautela de lesão e início do zero ficam na etapa 1, qualquer que seja a declaração", () => {
    expect(place(60, { bmi: 30 })).toMatchObject({ startWeek: 1, reason: "imc" });
    expect(place(60, { bmi: 29.9 })).toMatchObject({ reason: "declarado" });
    expect(place(60, { cautelaLesao: true })).toMatchObject({ startWeek: 1, reason: "cautela_lesao" });
    expect(place(60, { inicioDoZero: true })).toMatchObject({ startWeek: 1, reason: "inicio_do_zero" });
  });

  it("escada de saúde: a entrada não passa da etapa mais alta do modelo (a 9) e cai numa semana de carga", () => {
    const p = place(60, {}, health);
    expect(p.ordem).toBe(9);
    expect(health.weeks[p.startWeek - 1]!.isRecovery).toBe(false);
    expect(health.weeks[p.startWeek - 1]!.ladderStage).toBe("9");
    expect(place(20, {}, health)).toMatchObject({ etapa: "9", reason: "declarado" });
    expect(place(10, {}, health)).toMatchObject({ etapa: "7" });
  });

  it("o volume semanal que o atleta faz limita a entrada: a etapa não passa de 120% dele (R-PRG-04)", () => {
    const minutesOf = (ordem: number) => materializeWeek({ template: five, weekNumber: ordem, baseWeeklyMinutes: 0 }).weeklyRunMinutes;
    // 40 min seguidos levariam à etapa 11 (semana de 125 min), mas quem faz 90 min por semana tem teto de 108 min
    const free = place(40);
    const capped = place(40, { baseWeeklyMinutes: 90 });
    const cap = weeklyCaps(90, false).absolute!;
    expect(free.etapa).toBe("11");
    expect(capped.reason).toBe("teto_de_volume");
    expect(capped.ordem).toBeLessThan(free.ordem);
    expect(minutesOf(capped.ordem)).toBeLessThanOrEqual(cap);
    // é a etapa mais avançada que cabe: a seguinte já passaria do teto
    expect(minutesOf(capped.ordem + 1)).toBeGreaterThan(cap);
    // com volume muito baixo a entrada para na etapa 1 (a escada do zero, como antes)
    expect(place(40, { baseWeeklyMinutes: 30 })).toMatchObject({ ordem: 1, startWeek: 1 });
    // sem volume informado (0) não há teto
    expect(place(40, { baseWeeklyMinutes: 0 })).toMatchObject({ etapa: "11", reason: "declarado" });
    // volume alto não muda a entrada
    expect(place(40, { baseWeeklyMinutes: 200 })).toMatchObject({ etapa: "11", reason: "declarado" });
  });

  it("modelo sem escada não tem posicionamento", () => {
    expect(ladderPlacement({ template: buildPlanTemplate("10k", "iniciante")!, canRunContinuousMinutes: 60 })).toBeNull();
  });
});

describe("selectPlan com posicionamento", () => {
  const base: PlanSelectionInput = {
    goal: "saude",
    level: "iniciante",
    weeklyKm: 0,
    weeklySessions: 2,
    monthsRegular: 3,
    longestRecentKm: 0,
    canRunContinuousMinutes: 0,
    halfMarathonLast3m: false,
    injuryOrPersistentPainLast6w: false,
    runningInjuryLast3m: false,
    currentPain: 0,
    screening: { state: "LIBERADO", maxIntensity: "livre" },
    today: "2026-10-12",
  } as PlanSelectionInput;

  it("5 km de iniciante que corre 40 min: começa na etapa 11, faltam 2 semanas e o fim do plano acompanha", () => {
    const r = selectPlan({ ...base, goal: "primeira_prova", raceDistance: "5k", canRunContinuousMinutes: 40 });
    expect(r).toMatchObject({
      status: "atribuido",
      objective: "5k",
      templateWeeks: 13,
      startTemplateWeek: 12,
      remainingWeeks: 2,
      endDate: "2026-10-26",
      placement: { etapa: "11", reason: "declarado" },
    });
  });

  it("do zero continua igual: 13 semanas a partir da etapa 1", () => {
    const r = selectPlan({ ...base, goal: "primeira_prova", raceDistance: "5k" });
    expect(r).toMatchObject({ startTemplateWeek: 1, remainingWeeks: 13, endDate: "2027-01-11" });
  });

  it("prazo da prova usa as semanas que faltam, não as 13 do modelo", () => {
    // 3 semanas até a prova: do zero não cabe; quem já corre 30 min (etapa 10b, 3 semanas) cabe.
    const input = { ...base, goal: "primeira_prova" as const, raceDistance: "5k" as const, raceDate: "2026-11-02" };
    expect(selectPlan(input).status).toBe("prazo_insuficiente");
    expect(selectPlan({ ...input, canRunContinuousMinutes: 30 })).toMatchObject({ status: "atribuido", remainingWeeks: 3 });
  });
});
