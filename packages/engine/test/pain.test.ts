import { describe, expect, it } from "vitest";
import { evaluatePain } from "../src/day/pain";
import type { PainReport } from "../src/day/types";

// Regras de docs/pesquisa/09-dor.md (R-DOR-01 a R-DOR-14).
const TODAY = "2026-10-20";
const d = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const rep = (n: number, o: Partial<PainReport>): PainReport => ({ date: d(n), moment: "treino", intensity: 0, ...o });
const run = (reports: PainReport[], o: { walking?: number | null; cleared?: string | null; today?: string } = {}) =>
  evaluatePain({ today: o.today ?? TODAY, reports, dailyPainWalking: o.walking, clearedAt: o.cleared });
const codes = (r: ReturnType<typeof run>) => r.findings.map((f) => f.code);

describe("sinais de alerta (R-DOR-01 a R-DOR-03)", () => {
  it.each([
    ["dor no peito", { chestPain: true }],
    ["falta de ar desproporcional", { disproportionateBreathlessness: true }],
    ["tontura com perda de equilíbrio", { dizzyLosingBalance: true }],
    ["desmaio", { fainting: true }],
    ["palpitações", { palpitations: true }],
  ] as const)("R-DOR-01: %s → urgente, bloqueia e exige avaliação", (_label, cardio) => {
    const r = run([rep(0, { cardio })]);
    expect(r).toMatchObject({ urgent: true, blockRunning: true, refer: true, needsEvaluation: true });
    expect(r.findings[0]!.sources).toContain("Warburton 2023");
  });

  it("R-DOR-01: o bloqueio continua nos dias seguintes até a autodeclaração datada (R-DOR-10)", () => {
    const reports = [rep(-5, { cardio: { chestPain: true } })];
    expect(run(reports).urgent).toBe(true);
    expect(run(reports, { cleared: d(-6) }).urgent).toBe(true); // liberação anterior ao relato não vale
    expect(run(reports, { cleared: d(-1) })).toMatchObject({ urgent: false, blockRunning: false, needsEvaluation: false });
  });

  it("R-DOR-02: confusão ou colapso no calor é urgente; cefaleia/náusea interrompe o dia", () => {
    expect(run([rep(0, { heat: { confusionOrCollapse: true } })]).urgent).toBe(true);
    const r = run([rep(0, { heat: { headacheNauseaInHeat: true } })]);
    expect(r).toMatchObject({ urgent: false, blockRunning: true, refer: false });
  });

  it("R-DOR-02: sintomas de calor em 2 treinos → encaminhar", () => {
    const r = run([rep(-6, { heat: { headacheNauseaInHeat: true } }), rep(0, { heat: { headacheNauseaInHeat: true } })]);
    expect(r.refer).toBe(true);
  });

  it("R-DOR-03: dor em ponto do osso em sítio de alto risco bloqueia mesmo sem outros critérios", () => {
    const r = run([rep(0, { bonePoint: true, highRiskBoneSite: true, intensity: 1, region: "tibia" })]);
    expect(r).toMatchObject({ blockRunning: true, refer: true });
    expect(codes(r)).toContain("suspeita_lesao_ossea");
  });

  it("R-DOR-03: ponto no osso com dor ao caminhar bloqueia; sem critério nenhum, não", () => {
    expect(run([rep(0, { bonePoint: true, painWalking: true, intensity: 2 })]).blockRunning).toBe(true);
    expect(run([rep(0, { bonePoint: true, intensity: 2 })]).blockRunning).toBe(false);
  });

  it("R-DOR-03: só libera com a autodeclaração profissional", () => {
    const reports = [rep(-3, { bonePoint: true, highRiskBoneSite: true, intensity: 3, region: "tibia" })];
    expect(run(reports, { walking: 0 }).blockRunning).toBe(true); // dor ao caminhar baixa não basta
    expect(run(reports, { cleared: d(-1) }).blockRunning).toBe(false);
  });
});

describe("faixas de dor durante o treino (R-DOR-04)", () => {
  it.each([0, 1, 2])("dor %i: continua", (n) => {
    expect(run([rep(-1, { intensity: n, region: "joelho" })])).toMatchObject({ reduce: false, blockRunning: false });
  });

  it.each([3, 4])("dor %i: reduz (troca a qualidade e −20%%)", (n) => {
    const r = run([rep(-1, { intensity: n, region: "joelho" })]);
    expect(r).toMatchObject({ reduce: true, blockRunning: false, refer: false, freezeProgression: true });
    expect(codes(r)).toEqual(["dor_3_4"]);
  });

  it("dor ≥ 5: interrompe e bloqueia até o dia seguinte e até a dor ao caminhar ≤ 2", () => {
    const r = [rep(-1, { intensity: 5, region: "joelho" })];
    expect(run(r, { today: d(-1) }).blockRunning).toBe(true);
    expect(run(r).blockRunning).toBe(true); // amanhã ainda vale (bloqueio mínimo até o dia seguinte)
    expect(run(r, { today: d(1) }).blockRunning).toBe(true); // sem informar a dor ao caminhar
    expect(run(r, { today: d(1), walking: 2 }).blockRunning).toBe(false);
    expect(run(r, { today: d(1), walking: 3 }).blockRunning).toBe(true);
  });

  it("2 ocorrências ≥ 5 em 14 dias → encaminhar", () => {
    const r = run([rep(-10, { intensity: 6, region: "joelho" }), rep(-1, { intensity: 5, region: "joelho" })]);
    expect(r.refer).toBe(true);
    expect(codes(r)).toContain("dor_ge_5_repetida");
  });

  it("dor de um treino antigo (≥ 2 dias) com intensidade 3–4 não reduz o treino de hoje", () => {
    expect(run([rep(-3, { intensity: 4, region: "joelho" })]).reduce).toBe(false);
  });
});

describe("tipo, passada e dia seguinte (R-DOR-05 a R-DOR-07)", () => {
  it("R-DOR-05: pontada com intensidade ≥ 3 interrompe e bloqueia 48 h", () => {
    const r = [rep(-1, { intensity: 3, type: "pontada", region: "panturrilha" })];
    expect(run(r, { walking: 0 })).toMatchObject({ blockRunning: true });
    expect(run(r, { today: d(2), walking: 0 }).blockRunning).toBe(false); // 48 h + dor ao caminhar ok
  });

  it("R-DOR-05: pontada que persiste → encaminhar", () => {
    const r = run([
      rep(-3, { intensity: 4, suddenOnset: true, region: "panturrilha" }),
      rep(-1, { intensity: 3, region: "panturrilha", moment: "checkin" }),
    ], { today: d(-1) });
    expect(r.refer).toBe(true);
  });

  it("R-DOR-05: mesma região em 3 treinos com dor ≥ 3 → encaminhar", () => {
    const r = run([
      rep(-12, { intensity: 3, region: "quadril" }),
      rep(-8, { intensity: 3, region: "quadril" }),
      rep(-4, { intensity: 4, region: "quadril" }),
    ]);
    expect(codes(r)).toContain("dor_recorrente_mesma_regiao");
    expect(r.refer).toBe(true);
  });

  it("R-DOR-07: passada alterada com qualquer dor > 0 bloqueia por 48 h e encaminha", () => {
    const r = run([rep(-1, { intensity: 1, changedStride: true, region: "tornozelo" })]);
    expect(r).toMatchObject({ blockRunning: true, refer: true });
    expect(run([rep(-1, { intensity: 0, changedStride: true })]).blockRunning).toBe(false);
  });

  it("R-DOR-06: dor na manhã seguinte ≥ 2 pontos acima da basal → reduz", () => {
    const r = run([rep(0, { moment: "manha_seguinte", intensity: 3, baseline: 1, region: "joelho" })]);
    expect(r).toMatchObject({ reduce: true, freezeProgression: true });
    expect(run([rep(0, { moment: "manha_seguinte", intensity: 2, baseline: 1 })]).reduce).toBe(false);
  });

  it("R-DOR-06: qualquer aumento com rigidez maior que o aquecimento também reduz", () => {
    const r = run([rep(0, { moment: "manha_seguinte", intensity: 2, baseline: 1, stiffnessLongerThanWarmup: true })]);
    expect(r.reduce).toBe(true);
  });

  it("R-DOR-06: dor ≥ 5 no dia seguinte bloqueia a corrida", () => {
    expect(run([rep(0, { moment: "manha_seguinte", intensity: 5, region: "joelho" })]).blockRunning).toBe(true);
  });

  it("R-DOR-06: o campo novo 'dor ao acordar no mesmo local' vale como manhã seguinte", () => {
    const r = run([rep(-1, { intensity: 1, morningSameSite: 4, baseline: 0, region: "joelho" })]);
    expect(r.reduce).toBe(true);
  });
});

describe("DOMS e persistência (R-DOR-08, R-DOR-09)", () => {
  const doms = { muscleOnly: true, diffuseBilateralOrLargeGroup: true, startedHoursAfter: 24, noLocalSwelling: true, noStrideChange: true };

  it("R-DOR-08: padrão de DOMS reduz e não bloqueia", () => {
    const r = run([rep(-1, { moment: "manha_seguinte", intensity: 3, doms, region: "coxas" })]);
    expect(r).toMatchObject({ reduce: true, blockRunning: false, refer: false });
    expect(codes(r)).toEqual(["doms"]);
  });

  it("R-DOR-08: um critério falhando (começou durante o treino) cai nas regras de dor comum", () => {
    const r = run([rep(-1, { intensity: 4, doms: { ...doms, startedHoursAfter: 2 }, region: "coxas" })]);
    expect(codes(r)).toEqual(["dor_3_4"]);
  });

  it("R-DOR-08: DOMS com inchaço localizado não é DOMS", () => {
    const r = run([rep(-1, { intensity: 3, doms: { ...doms, noLocalSwelling: false } })]);
    expect(codes(r)).not.toContain("doms");
  });

  it("R-DOR-08: acima de 7 dias → encaminhar", () => {
    const r = run([
      rep(-8, { moment: "manha_seguinte", intensity: 3, doms }),
      rep(-4, { moment: "manha_seguinte", intensity: 3, doms }),
      rep(0, { moment: "manha_seguinte", intensity: 3, doms }),
    ]);
    expect(r.refer).toBe(true);
  });

  it("R-DOR-09: dor ≥ 3 em 3 treinos seguidos → encaminhar e exige avaliação", () => {
    const r = run([
      rep(-5, { intensity: 3, region: "joelho" }),
      rep(-3, { intensity: 3, region: "joelho" }),
      rep(-1, { intensity: 3, region: "joelho" }),
    ]);
    expect(r.refer).toBe(true);
    expect(codes(r)).toContain("dor_persistente_3_treinos");
  });

  it("R-DOR-09: dor piorando em 3 relatos (cada um ≥ 1 ponto acima) → encaminhar", () => {
    const r = run([
      rep(-6, { intensity: 1, region: "joelho" }),
      rep(-3, { intensity: 2, region: "joelho" }),
      rep(-1, { intensity: 3, region: "joelho" }),
    ]);
    expect(codes(r)).toContain("dor_piorando");
  });
});

describe("check-in antes do treino e demais sintomas (R-DOR-11 a R-DOR-14)", () => {
  it("R-DOR-11: dor 3–4 no check-in reduz; ≥ 5 bloqueia", () => {
    expect(run([rep(0, { moment: "checkin", intensity: 3 })]).reduce).toBe(true);
    expect(run([rep(0, { moment: "checkin", intensity: 4 })]).blockRunning).toBe(false);
    expect(run([rep(0, { moment: "checkin", intensity: 5 })]).blockRunning).toBe(true);
    expect(run([rep(0, { moment: "checkin", intensity: 2 })])).toMatchObject({ reduce: false, blockRunning: false });
  });

  it("R-DOR-12: inchaço ou travamento na articulação bloqueia e encaminha, qualquer intensidade", () => {
    expect(run([rep(-1, { intensity: 0, jointSwelling: true })])).toMatchObject({ blockRunning: true, refer: true });
    expect(run([rep(-1, { intensity: 1, lockingOrGivingWay: true })]).refer).toBe(true);
  });

  it("R-DOR-13: formigamento, fraqueza súbita ou urina escura bloqueiam e encaminham", () => {
    expect(run([rep(-1, { intensity: 2, tinglingOrNumbness: true })])).toMatchObject({ blockRunning: true, refer: true });
    expect(run([rep(-1, { intensity: 2, suddenWeaknessOrFootDrop: true })]).refer).toBe(true);
    const r = run([rep(-1, { intensity: 6, darkUrineWithMuscleSwelling: true })]);
    expect(r.sameDayMedical).toBe(true);
  });

  it("R-DOR-14: analgésico antes do treino não conta como melhora", () => {
    const r = run([
      rep(-3, { intensity: 4, region: "joelho" }),
      rep(-1, { intensity: 1, region: "joelho", analgesicBeforeTraining: true }),
    ]);
    expect(r.reduce).toBe(true);
    const semAnalgesico = run([rep(-3, { intensity: 4, region: "joelho" }), rep(-1, { intensity: 1, region: "joelho" })]);
    expect(semAnalgesico.reduce).toBe(false);
  });

  it("sem relatos: nada a fazer", () => {
    expect(run([])).toMatchObject({ reduce: false, blockRunning: false, refer: false, urgent: false, worstRecentPain: 0 });
  });
});
