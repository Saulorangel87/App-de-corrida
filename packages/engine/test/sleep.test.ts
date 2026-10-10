import { describe, expect, it } from "vitest";
import { classifyNight, evaluateWellbeing, plausibleHours, wellbeingScore } from "../src/day/sleep";
import type { Checkin, SessionKind } from "../src/day/types";

// Casos de docs/pesquisa/08-sono-recuperacao.md ("Casos de teste sugeridos") e bordas.
const START = "2026-10-01";
const day = (n: number) => new Date(Date.parse(`${START}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const ck = (n: number, hours: number | undefined, o: Partial<Checkin> = {}): Checkin => ({
  date: day(n),
  sleepHours: hours,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  stress: 4,
  muscleSoreness: 4,
  ...o,
});

/** n dias bons (7,5 h, W = 20) a partir de `from`. */
const goodDays = (from: number, count: number) => Array.from({ length: count }, (_, i) => ck(from + i, 7.5));

const run = (checkins: Checkin[], todayN: number, kind?: SessionKind, highLoadWeek = false) =>
  evaluateWellbeing({ checkins, today: day(todayN), todayKind: kind, highLoadWeek });

describe("noite (R-SON-01/02)", () => {
  it.each([
    [7.0, 4, "adequada"],
    [6.5, 4, "limitrofe"],
    [6.0, 4, "ruim"],
    [5.0, 4, "ruim"],
    [4.9, 4, "muito_ruim"],
    [8.0, 2, "ruim"], // qualidade ≤ 2 vale como noite ruim
    [6.5, 2, "ruim"],
  ] as const)("%s h, qualidade %s → %s", (h, q, expected) => {
    expect(classifyNight({ date: day(0), sleepHours: h, sleepQuality: q })).toBe(expected);
  });

  it("sem horas, usa só a qualidade (R-SON-13)", () => {
    expect(classifyNight({ date: day(0), sleepQuality: 2 })).toBe("ruim");
    expect(classifyNight({ date: day(0), sleepQuality: 4 })).toBe("adequada");
    expect(classifyNight({ date: day(0) })).toBe("desconhecida");
  });

  it("horas fora de 2–14 não são válidas e pedem confirmação", () => {
    expect(plausibleHours(1.5)).toBeUndefined();
    expect(plausibleHours(15)).toBeUndefined();
    expect(plausibleHours(2)).toBe(2);
    const r = run([ck(0, 20)], 0);
    expect(r.invalidHoursToday).toBe(true);
  });
});

describe("bem-estar (R-SON-03/04)", () => {
  it("soma dos cinco itens; incompleto não vale", () => {
    expect(wellbeingScore(ck(0, 7))).toBe(20);
    expect(wellbeingScore({ date: day(0), sleepQuality: 3, energy: 3 })).toBeUndefined();
  });

  it("faixas absolutas: ≥ 15 verde; 12–14 amarelo; ≤ 11 vermelho", () => {
    const w = (items: [number, number, number, number, number]) =>
      run([ck(0, 7.5, { sleepQuality: items[0], energy: items[1], mood: items[2], stress: items[3], muscleSoreness: items[4] })], 0);
    expect(w([3, 3, 3, 3, 3]).bn).toBe(0); // 15
    expect(w([3, 3, 2, 2, 3]).bn).toBe(1); // 13
    expect(w([2, 2, 2, 2, 3]).bn).toBe(2); // 11
  });

  it("um item = 1 leva a amarelo; dois itens = 1 levam a vermelho (R-SON-04)", () => {
    const base = { sleepQuality: 5, energy: 5, mood: 5, stress: 5, muscleSoreness: 5 };
    expect(run([ck(0, 7.5, { ...base, energy: 1 })], 0).bn).toBe(1);
    expect(run([ck(0, 7.5, { ...base, energy: 1, mood: 1 })], 0).bn).toBe(2);
  });
});

describe("sono (R-SON-06): casos da pesquisa", () => {
  it("1. uma noite de 5,5 h, bem-estar verde, treino fácil → L0", () => {
    const r = run([...goodDays(0, 3), ck(3, 5.5)], 3, "rodagem");
    expect(r.night).toBe("ruim");
    expect(r.s).toBe(0);
    expect(r.level).toBe(0);
  });

  it("2. uma noite de 4,5 h, bem-estar verde, treino de qualidade → L1", () => {
    const r = run([...goodDays(0, 3), ck(3, 4.5)], 3, "qualidade");
    expect(r.s).toBe(1);
    expect(r.level).toBe(1);
    expect(r.reasons.map((x) => x.code)).toContain("sono_s1");
  });

  it("2b. a mesma noite de 4,5 h com treino fácil não muda nada", () => {
    expect(run([...goodDays(0, 3), ck(3, 4.5)], 3, "rodagem").level).toBe(0);
  });

  it("2c. noite muito ruim antes do longão também reduz", () => {
    expect(run([...goodDays(0, 3), ck(3, 4.5)], 3, "longao").level).toBe(1);
  });

  it("3. noites de 6,0 / 5,5 / 6,0 h em dias seguidos → L2 (regenerativo)", () => {
    const r = run([...goodDays(0, 2), ck(2, 6.0), ck(3, 5.5), ck(4, 6.0)], 4, "rodagem");
    expect(r.s).toBe(2);
    expect(r.level).toBe(2);
  });

  it("4. sono ≥ 7 h, W = 13, média de 14 dias = 19 → vermelho por desvio, L2", () => {
    const history = Array.from({ length: 14 }, (_, i) => ck(i, 7.5, { sleepQuality: 4, energy: 4, mood: 4, stress: 4, muscleSoreness: 3 })); // W = 19
    const today = ck(14, 7.5, { sleepQuality: 3, energy: 3, mood: 3, stress: 2, muscleSoreness: 2 }); // W = 13
    const r = run([...history, today], 14, "rodagem");
    expect(r.w).toBe(13);
    expect(r.baseline).toBe(19);
    expect(r.delta).toBe(-6);
    expect(r.bn).toBe(2);
    expect(r.level).toBe(2);
  });

  it("4b. sem 7 registros na janela, o desvio não vale; só a faixa absoluta", () => {
    const history = Array.from({ length: 5 }, (_, i) => ck(i, 7.5, { energy: 5, mood: 5, stress: 5, muscleSoreness: 5, sleepQuality: 5 })); // W = 25
    const today = ck(5, 7.5, { sleepQuality: 4, energy: 4, mood: 4, stress: 4, muscleSoreness: 4 }); // W = 20, Δ seria −5
    const r = run([...history, today], 5);
    expect(r.baseline).toBeNull();
    expect(r.bn).toBe(0);
  });

  it("5. sono ruim em 2 de 3 noites + bem-estar amarelo → S1 e B1 viram L2", () => {
    const amarelo = { sleepQuality: 3, energy: 3, mood: 3, stress: 3, muscleSoreness: 2 }; // 14
    const r = run([...goodDays(0, 3), ck(3, 6.0), ck(4, 7.5), ck(5, 6.0, amarelo)], 5, "rodagem");
    expect(r.s).toBe(1);
    expect(r.bn).toBe(1);
    expect(r.level).toBe(2);
    expect(r.reasons.map((x) => x.code)).toContain("dois_sinais");
  });

  it("6. depois de L2, um dia bom continua L1; dois dias bons voltam a L0 (R-SON-10)", () => {
    const base = [...goodDays(0, 2), ck(2, 6.0), ck(3, 5.5), ck(4, 6.0)];
    expect(run(base, 4).level).toBe(2);
    expect(run([...base, ck(5, 7.5)], 5).level).toBe(1);
    expect(run([...base, ck(5, 7.5), ck(6, 7.5)], 6).level).toBe(0);
  });

  it("7. sem check-in há 6 dias: sem alerta, e pede o check-in (R-SON-13)", () => {
    const r = run([...goodDays(0, 3), ck(3, 4.0), ck(4, 4.0), ck(5, 4.0)], 11, "rodagem");
    expect(r.needsCheckin).toBe(true);
    expect(r.level).toBe(0);
    expect(r.carried).toBe(false);
  });

  it("7b. sem check-in hoje, mas com alerta de ontem: mantém o último nível (R-SON-13)", () => {
    const r = run([...goodDays(0, 2), ck(2, 6.0), ck(3, 5.5), ck(4, 6.0)], 5);
    expect(r.needsCheckin).toBe(true);
    expect(r.carried).toBe(true);
    expect(r.level).toBe(2);
  });

  it("9. doença aguda hoje: sem treino, e o dia não conta como noite ruim (R-SON-16)", () => {
    const r = run([...goodDays(0, 3), ck(3, 4.0, { acuteIllness: true })], 3);
    expect(r.acuteIllnessToday).toBe(true);
    expect(r.night).toBeNull();
    // no dia seguinte, a noite do dia de doença não entra na contagem
    const next = run([...goodDays(0, 3), ck(3, 4.0, { acuteIllness: true }), ck(4, 7.5)], 4);
    expect(next.s).toBe(0);
  });
});

describe("níveis altos e saída do alerta", () => {
  it("≥ 5 noites ruins em 7 dias → S3 (L3)", () => {
    const nights = [ck(0, 6.0), ck(1, 7.5), ck(2, 6.0), ck(3, 5.5), ck(4, 7.5), ck(5, 6.0), ck(6, 6.0)];
    const r = run(nights, 6);
    expect(r.s).toBe(3);
    expect(r.level).toBe(3);
  });

  it("≥ 3 noites muito ruins em 7 dias → S3", () => {
    const nights = [ck(0, 4.0), ck(1, 7.5), ck(2, 4.5), ck(3, 7.5), ck(4, 4.0)];
    expect(run(nights, 4).s).toBe(3);
  });

  it("S3 dura no máximo 2 dias seguidos; depois o sono fica em S2 (R-SON-10)", () => {
    // sequência que mantém ≥ 5 noites ruins nos 7 dias por vários dias
    const nights = Array.from({ length: 10 }, (_, i) => ck(i, i % 3 === 2 ? 7.5 : 5.5));
    const s = [5, 6, 7, 8, 9].map((n) => run(nights, n).s);
    const firstThree = s.indexOf(3);
    expect(firstThree).toBeGreaterThanOrEqual(0);
    let streak = 0;
    for (const v of s) {
      streak = v === 3 ? streak + 1 : 0;
      expect(streak).toBeLessThanOrEqual(2);
    }
  });

  it("vermelho em 2 dias seguidos → B3", () => {
    const red = { sleepQuality: 2, energy: 2, mood: 2, stress: 2, muscleSoreness: 3 }; // 11
    const r = run([...goodDays(0, 3), ck(3, 7.5, red), ck(4, 7.5, red)], 4);
    expect(r.bn).toBe(3);
    expect(r.level).toBe(3);
  });

  it("persistência: amarelo em 3 de 5 dias sobe um nível", () => {
    const amarelo = { sleepQuality: 3, energy: 3, mood: 3, stress: 3, muscleSoreness: 2 }; // 14
    const r = run([ck(0, 7.5, amarelo), ck(1, 7.5), ck(2, 7.5, amarelo), ck(3, 7.5), ck(4, 7.5, amarelo)], 4);
    expect(r.bn).toBe(2);
  });

  it("semana de carga alta sobe mais um nível só quando há sinal de bem-estar (R-SON-08)", () => {
    const amarelo = { sleepQuality: 3, energy: 3, mood: 3, stress: 3, muscleSoreness: 2 };
    const sinal = [ck(0, 7.5), ck(1, 7.5), ck(2, 7.5, amarelo)];
    expect(run(sinal, 2, undefined, false).level).toBe(1);
    expect(run(sinal, 2, undefined, true).level).toBe(2);
    expect(run([ck(0, 7.5), ck(1, 7.5), ck(2, 7.5)], 2, undefined, true).level).toBe(0);
  });

  it("sono bom nunca aumenta carga: o nível mínimo é L0 (R-SON-09)", () => {
    expect(run(goodDays(0, 10), 9).level).toBe(0);
  });

  it("R-SON-12: sono em S2 ou pior em ≥ 14 dos últimos 21 dias avisa", () => {
    const nights = Array.from({ length: 21 }, (_, i) => ck(i, 5.5));
    const r = run(nights, 20);
    expect(r.persistentSleepIssue).toBe(true);
    expect(r.reasons.map((x) => x.code)).toContain("sono_persistente");
    expect(run(goodDays(0, 21), 20).persistentSleepIssue).toBe(false);
  });
});
