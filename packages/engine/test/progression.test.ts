import { describe, expect, it } from "vitest";
import {
  freezeReasons,
  levelAfterPause,
  longestSessionLast30,
  ranOverCap,
  recoveryWeekMinutes,
  returnFromPause,
  rpeOverTarget,
  sessionCapMinutes,
  weeklyCaps,
} from "../src/day/progression";
import type { WorkoutLog } from "../src/day/types";

// Regras de docs/pesquisa/05-progressao-carga.md (R-PRG-02 a R-PRG-09) e R-CRG-07.
const TODAY = "2026-10-20";
const d = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const log = (n: number, minutes: number, o: Partial<WorkoutLog> = {}): WorkoutLog => ({ date: d(n), completed: minutes > 0, minutes, ...o });

describe("tetos (R-PRG-02 a R-PRG-04)", () => {
  it("R-PRG-02: teto de sessão = 110% da maior sessão concluída em 30 dias, para baixo", () => {
    expect(sessionCapMinutes(40)).toBe(44);
    expect(sessionCapMinutes(33)).toBe(36); // 36,3 → 36
    expect(sessionCapMinutes(0)).toBeNull();
  });

  it("R-PRG-05: a base é o concluído; sessão não concluída vale 0 e sessão de 31 dias não conta", () => {
    const logs = [log(-40, 90), log(-10, 30), log(-3, 50, { completed: false }), log(-2, 45)];
    expect(longestSessionLast30(logs, TODAY)).toBe(45);
  });

  it("R-PRG-03/04: teto semanal 110% (105% com cautela_lesao) e absoluto 120% (110%)", () => {
    expect(weeklyCaps(100, false)).toEqual({ target: 110, absolute: 120 });
    expect(weeklyCaps(100, true)).toEqual({ target: 105, absolute: 110 });
    expect(weeklyCaps(0, false)).toEqual({ target: null, absolute: null });
  });

  it("R-PRG-03: em volumes pequenos, arredonda para o múltiplo de 5 mais próximo sem passar do absoluto", () => {
    // 40 min: 110% = 44 → 45 (≤ absoluto 48)
    expect(weeklyCaps(40, false).target).toBe(45);
    // 20 min: 110% = 22 → 20 pelo múltiplo mais próximo, mas nunca abaixo do piso de 22
    expect(weeklyCaps(20, false).target).toBe(22);
    // nunca passa de 120%: 30 min → 33 → múltiplo 35 > 36? não: 35 ≤ 36
    expect(weeklyCaps(30, false).target).toBe(35);
    expect(weeklyCaps(30, false).absolute).toBe(36);
    // 28 min: 30,8 → 30; absoluto 33
    expect(weeklyCaps(28, false).target).toBe(30);
  });

  it("R-PRG-07: semana de recuperação = 75% da última de construção", () => {
    expect(recoveryWeekMinutes(120)).toBe(90);
    expect(recoveryWeekMinutes(90)).toBe(67); // 67,5 → 67
  });
});

describe("congelamento (R-PRG-06, R-CRG-07)", () => {
  it("(c) mais de 1 sessão não concluída na semana", () => {
    const base = { painLimit: false, sleepS1OrWorseThisWeek: false, today: TODAY };
    expect(freezeReasons({ ...base, logs: [log(-1, 0), log(-3, 40)] })).toEqual([]);
    expect(freezeReasons({ ...base, logs: [log(-1, 0), log(-3, 0)] })).toEqual(["sessoes_nao_concluidas"]);
  });

  it("(d) corrida acima de 110% da maior dos 30 dias anteriores congela; escada é isenta", () => {
    const history = [log(-20, 40), log(-10, 40)];
    expect(ranOverCap([...history, log(-1, 45)], TODAY)).toBe(true); // 45 > 44
    expect(ranOverCap([...history, log(-1, 44)], TODAY)).toBe(false);
    expect(ranOverCap([...history, log(-1, 60, { exempt: true })], TODAY)).toBe(false);
  });

  it("(a) e (b) vêm dos módulos de dor e sono", () => {
    const r = freezeReasons({ painLimit: true, sleepS1OrWorseThisWeek: true, logs: [], today: TODAY });
    expect(r).toEqual(["dor_limite", "sono_s1_na_semana"]);
  });

  it("R-CRG-07: RPE ≥ 2 pontos acima do alvo (alvo ≤ 4) em 2 das últimas 3 sessões", () => {
    const mk = (n: number, target: number, rpe: number) => log(n, 30, { targetRpe: target, reportedRpe: rpe });
    expect(rpeOverTarget([mk(-5, 3, 5), mk(-3, 3, 5), mk(-1, 3, 3)])).toBe(true);
    expect(rpeOverTarget([mk(-5, 3, 4), mk(-3, 3, 5), mk(-1, 3, 3)])).toBe(false);
    expect(rpeOverTarget([mk(-3, 3, 5), mk(-1, 3, 5)])).toBe(false); // menos de 3 sessões
    expect(rpeOverTarget([mk(-5, 6, 8), mk(-3, 6, 9), mk(-1, 6, 9)])).toBe(false); // alvo > 4
  });
});

describe("volta de pausa (R-PRG-08, tabela única)", () => {
  const r = (D: number, o: Partial<Parameters<typeof returnFromPause>[0]> = {}) =>
    returnFromPause({ level: "intermediario", daysSinceLastRun: D, lastBuildWeekMinutes: 120, longest30: 50, today: TODAY, ...o });

  it("até 7 dias: segue o plano", () => {
    expect(r(7)).toMatchObject({ band: "segue", weeklyMinutesCap: null, noZ3: false });
  });

  it("8 a 14 dias: congela, repete o volume da última semana", () => {
    expect(r(8)).toMatchObject({ band: "congela", weeklyMinutesCap: 120 });
    expect(r(14)).toMatchObject({ band: "congela" });
  });

  it("15 a 28 dias: 70% do volume e da maior sessão, sem Z3", () => {
    expect(r(15)).toMatchObject({ band: "reduzido", weeklyMinutesCap: 84, sessionMinutesCap: 35, noZ3: true });
    expect(r(28)).toMatchObject({ band: "reduzido" });
  });

  it("29 dias ou mais: o menor entre 50% e a fase inicial; rebaixa 1 nível; reaplica a triagem", () => {
    const x = r(29);
    expect(x).toMatchObject({ band: "longa", effectiveLevel: "iniciante", reapplyScreening: true, noZ3: true });
    expect(x.weeklyMinutesCap).toBe(40); // min(60, fase inicial do iniciante = 40)
    expect(x.restartWith).toBe("caminhada-corrida");
  });

  it("avançado com 30 dias vira intermediário: min(50% de 200 = 100, 60)", () => {
    const x = r(30, { level: "avancado", lastBuildWeekMinutes: 200 });
    expect(x).toMatchObject({ effectiveLevel: "intermediario", weeklyMinutesCap: 60, restartWith: "rodagem-leve" });
  });

  it("mais de 84 dias volta a iniciante (R-CLS-07)", () => {
    expect(levelAfterPause("avancado", 85)).toBe("iniciante");
    expect(levelAfterPause("avancado", 84)).toBe("intermediario");
    expect(levelAfterPause("iniciante", 40)).toBe("iniciante");
    expect(levelAfterPause("avancado", 28)).toBe("avancado");
  });

  it("R-PRG-09: pausa por dor, lesão ou doença espera a liberação e volta pela linha ≥ 29", () => {
    const waiting = r(10, { pauseCause: "lesao" });
    expect(waiting).toMatchObject({ band: "longa", waitingProfessional: true });
    const cleared = r(10, { pauseCause: "lesao", clearedByProfessionalAt: d(-1) });
    expect(cleared).toMatchObject({ band: "longa", waitingProfessional: false, effectiveLevel: "intermediario" });
    expect(cleared.weeklyMinutesCap).toBe(60); // mesmo com D = 10, no máximo a fase inicial
  });

  it("sem Z3 por 2 semanas depois da primeira corrida de volta", () => {
    expect(r(2, { pauseReturnStartedOn: d(-13) }).noZ3).toBe(true);
    expect(r(2, { pauseReturnStartedOn: d(-14) }).noZ3).toBe(false);
  });
});
