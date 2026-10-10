import { describe, expect, it } from "vitest";
import { availableWeekdays, buildAthleteWeek } from "../src/plan/week";
import { buildPlanTemplate } from "../src/plan/templates";
import { daysSinceLastRun, interviewLastRun, lastBuildWeekMinutes, pauseReturnStartedOn } from "../src/day/derive";

const tpl = (o: Parameters<typeof buildPlanTemplate>[0], l: Parameters<typeof buildPlanTemplate>[1]) => buildPlanTemplate(o, l)!;

describe("dias da semana do atleta", () => {
  it("inclui sempre o dia do longão e a quantidade pedida", () => {
    for (let n = 1; n <= 7; n++) {
      for (let long = 1; long <= 7; long++) {
        const d = availableWeekdays(n, long);
        expect(d).toHaveLength(n);
        expect(d).toContain(long);
        expect(new Set(d).size).toBe(n);
      }
    }
  });

  it("espalha os dias: 3 dias com longão no domingo = segunda ou terça, quinta e domingo (sem dias seguidos)", () => {
    const d = availableWeekdays(3, 7);
    const gaps = d.map((x, i) => (i + 1 < d.length ? d[i + 1]! - x : d[0]! + 7 - x));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
  });

  it("7 dias: todos; 1 dia: só o do longão", () => {
    expect(availableWeekdays(7, 3)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(availableWeekdays(1, 6)).toEqual([6]);
  });
});

describe("semana do atleta (modelo → minutos → dias)", () => {
  const base = { baseWeeklyMinutes: 140, daysPerWeek: 4, minutesPerSession: 90, longRunDay: 7, startWeekday: 3 } as const;

  it("limita cada sessão ao tempo disponível e recalcula o total", () => {
    const wide = buildAthleteWeek({ ...base, template: tpl("10k", "intermediario"), weekNumber: 7 });
    const narrow = buildAthleteWeek({ ...base, minutesPerSession: 30, template: tpl("10k", "intermediario"), weekNumber: 7 });
    for (const p of narrow.placed.filter((x) => !x.session.optional)) expect(p.session.minutes).toBeLessThanOrEqual(30);
    expect(narrow.week.weeklyRunMinutes).toBeLessThan(wide.week.weeklyRunMinutes);
    expect(narrow.placed.some((p) => p.session.note?.includes("tempo disponível"))).toBe(true);
  });

  it("nunca aumenta: sessões que já cabem ficam como estão", () => {
    const wide = buildAthleteWeek({ ...base, minutesPerSession: 300, template: tpl("10k", "intermediario"), weekNumber: 5 });
    const raw = wide.week.sessions.map((s) => s.minutes);
    expect(wide.placed.map((p) => p.session.minutes).sort()).toEqual(raw.sort());
  });

  it("o longão cai no dia pedido, medido na janela de 7 dias", () => {
    // janela começa na quarta (3); domingo (7) é o 5º dia → offset 4
    const w = buildAthleteWeek({ ...base, template: tpl("10k", "intermediario"), weekNumber: 5 });
    const long = w.placed.find((p) => p.session.kind === "longao");
    expect(long?.dayOffset).toBe(4);
  });

  it("qualidade nunca em dias seguidos da janela, nem corrida em dias seguidos na escada", () => {
    const w = buildAthleteWeek({ ...base, daysPerWeek: 5, template: tpl("10k", "avancado"), weekNumber: 6 });
    const quality = w.placed.filter((p) => p.session.kind === "qualidade").map((p) => p.dayOffset).sort();
    for (let i = 1; i < quality.length; i++) expect(quality[i]! - quality[i - 1]!).toBeGreaterThan(1);

    const ladder = buildAthleteWeek({
      template: tpl("5k", "iniciante"), weekNumber: 3, baseWeeklyMinutes: 0, daysPerWeek: 4, minutesPerSession: 60, longRunDay: 6, startWeekday: 1,
    });
    const runs = ladder.placed.filter((p) => !p.session.optional).map((p) => p.dayOffset).sort();
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < runs.length; i++) expect(runs[i]! - runs[i - 1]!).toBeGreaterThan(1);
  });

  it("escada não é encurtada pelo tempo disponível", () => {
    const w = buildAthleteWeek({
      template: tpl("5k", "iniciante"), weekNumber: 10, baseWeeklyMinutes: 0, daysPerWeek: 3, minutesPerSession: 10, longRunDay: 7, startWeekday: 1,
    });
    const runs = w.placed.filter((p) => !p.session.optional);
    expect(runs.every((p) => p.session.ladder)).toBe(true);
    expect(runs.some((p) => p.session.minutes > 10)).toBe(true);
  });

  it("menos dias que corridas: as leves saem e o volume é repartido entre as que ficam (sem perder carga em silêncio)", () => {
    const five = buildAthleteWeek({ ...base, daysPerWeek: 5, template: tpl("10k", "avancado"), weekNumber: 6 });
    const two = buildAthleteWeek({ ...base, daysPerWeek: 2, template: tpl("10k", "avancado"), weekNumber: 6 });
    const runs = two.placed.filter((p) => !p.session.optional);
    expect(runs).toHaveLength(2);
    expect(runs.some((p) => p.session.kind === "longao")).toBe(true);
    expect(runs.some((p) => p.session.kind === "qualidade")).toBe(true);
    expect(two.week.weeklyRunMinutes).toBeGreaterThanOrEqual(Math.floor(five.week.weeklyRunMinutes * 0.7));
    expect(two.week.notes.some((n) => n.includes("seus dias disponíveis"))).toBe(true);
  });
});

describe("derivados do histórico", () => {
  it("dias desde a última corrida: registros ganham da entrevista, quando mais recentes", () => {
    const last = interviewLastRun({ daysSinceLastRun: 20, asOf: "2026-10-01" });
    expect(last).toBe("2026-09-11");
    expect(daysSinceLastRun([], "2026-10-10", last)).toBe(29);
    expect(daysSinceLastRun(["2026-10-07", "2026-10-05"], "2026-10-10", last)).toBe(3);
    expect(daysSinceLastRun(["2026-10-12"], "2026-10-10", last)).toBe(29); // futuro não conta
  });

  it("retorno de pausa: primeira corrida depois de 15 dias ou mais sem correr (R-PRG-08)", () => {
    expect(pauseReturnStartedOn(["2026-09-20", "2026-09-22"], "2026-09-25", "2026-09-01")).toBe("2026-09-20");
    // 14 dias sem correr ainda não é pausa de 15
    expect(pauseReturnStartedOn(["2026-09-15"], "2026-09-20", "2026-09-01")).toBeNull();
    // a última pausa vale
    expect(pauseReturnStartedOn(["2026-08-01", "2026-08-03", "2026-09-10"], "2026-09-12", "2026-07-01")).toBe("2026-09-10");
  });

  it("semana de construção: ignora recuperação, polimento e semanas sem corrida", () => {
    const weeks = [
      { isRecovery: false, isTaper: false, minutes: 100 },
      { isRecovery: false, isTaper: false, minutes: 120 },
      { isRecovery: true, isTaper: false, minutes: 90 },
      { isRecovery: false, isTaper: false, minutes: 0 },
    ];
    expect(lastBuildWeekMinutes(weeks, 80)).toBe(120);
    expect(lastBuildWeekMinutes([], 80)).toBe(80);
    expect(lastBuildWeekMinutes([{ isRecovery: true, isTaper: false, minutes: 60 }], 80)).toBe(80);
  });
});
