import { describe, expect, it } from "vitest";
import { materializeWeek, weeklyMinutesFor } from "../src/plan/materialize";
import { nextLadderStep } from "../src/plan/ladder-progress";
import { scheduleWeek } from "../src/plan/schedule";
import { allPlanTemplates, buildPlanTemplate } from "../src/plan/templates";

const tpl = (o: Parameters<typeof buildPlanTemplate>[0], l: Parameters<typeof buildPlanTemplate>[1]) => buildPlanTemplate(o, l)!;
const mat = (o: Parameters<typeof buildPlanTemplate>[0], l: Parameters<typeof buildPlanTemplate>[1], week: number, base: number, extra: object = {}) =>
  materializeWeek({ template: tpl(o, l), weekNumber: week, baseWeeklyMinutes: base, ...extra });

describe("volume da semana (normalização e tetos)", () => {
  it("semana 1 ≈ média atual; o pico nunca passa do teto do modelo (R-PLN-11)", () => {
    const m = weeklyMinutesFor({ template: tpl("10k", "intermediario"), baseWeeklyMinutes: 140 });
    expect(m[0]).toBe(140);
    expect(Math.max(...m)).toBeLessThanOrEqual(210);
  });

  it("base acima do teto: usa o teto e não cai abaixo de ~90% da base na semana 1", () => {
    const m = weeklyMinutesFor({ template: tpl("5k", "intermediario"), baseWeeklyMinutes: 400 });
    expect(Math.max(...m)).toBeLessThanOrEqual(150);
    expect(m[0]).toBe(150); // min(teto, max(índice × teto, 90% da base))
  });

  it("crescimento de no máximo 10% entre semanas de carga e 5% com cautela_lesao (R-PRG-03)", () => {
    for (const t of allPlanTemplates().filter((x) => !x.weeks.some((w) => w.ladderStage))) {
      for (const cautela of [false, true]) {
        const m = weeklyMinutesFor({ template: t, baseWeeklyMinutes: 100, cautelaLesao: cautela });
        let last = 0;
        t.weeks.forEach((w, i) => {
          if (w.isRecovery || w.isTaper || w.isRaceWeek) return;
          if (last > 0) expect(m[i]!).toBeLessThanOrEqual(Math.floor((last * (cautela ? 105 : 110)) / 100));
          last = m[i]!;
        });
      }
    }
  });

  it("semana de recuperação = 75% da última de construção, para baixo (R-PRG-07)", () => {
    const m = weeklyMinutesFor({ template: tpl("21k", "intermediario"), baseWeeklyMinutes: 120 });
    expect(m[3]).toBe(Math.floor(m[2]! * 0.75));
    expect(m[7]).toBe(Math.floor(m[6]! * 0.75));
  });

  it("polimento reduz sobre o pico (10 km: −25% e −45%)", () => {
    const t = tpl("10k", "intermediario");
    const m = weeklyMinutesFor({ template: t, baseWeeklyMinutes: 120 });
    const peak = Math.max(...m.slice(0, 7));
    expect(m[8]).toBe(Math.round(peak * 0.75));
    expect(m[9]).toBe(Math.round(peak * 0.55));
  });
});

describe("semana concreta", () => {
  it("o longão respeita o teto do modelo, 40% da semana e 110% da maior corrida", () => {
    const w = mat("10k", "intermediario", 7, 150, { longest30: 60 });
    const long = w.sessions.find((s) => s.slug === "longao")!;
    expect(long.minutes).toBeLessThanOrEqual(66); // 110% de 60
    expect(long.minutes).toBeLessThanOrEqual(84);
    expect(long.minutes).toBeLessThanOrEqual(Math.floor(w.weeklyRunMinutes * 0.4) + 1);
  });

  it("orçamento de intensidade: Z3 ≤ 12% da semana no intermediário; senão regride (R-DIS-02)", () => {
    const w = mat("10k", "intermediario", 3, 40); // semana pequena, intervalado-longo não cabe
    const heavy = w.sessions.find((s) => s.slug === "intervalado-longo");
    expect(heavy).toBeUndefined();
  });

  it("nenhum treino passa de Z1 em semana de recuperação (R-PRG-07)", () => {
    const w = mat("21k", "intermediario", 4, 120);
    expect(w.isRecovery).toBe(true);
    expect(w.sessions.filter((s) => !s.optional).every((s) => s.maxZone === "Z1")).toBe(true);
  });

  it("toda sessão de corrida tem pelo menos 15 min e a soma bate com o total", () => {
    const w = mat("5k", "avancado", 5, 200);
    const runs = w.sessions.filter((s) => !s.optional);
    expect(runs.every((s) => s.minutes >= 15)).toBe(true);
    expect(runs.reduce((a, s) => a + s.minutes, 0)).toBe(w.weeklyRunMinutes);
  });

  it("semana de prova: duas corridas curtas", () => {
    const t = tpl("10k", "intermediario");
    const w = materializeWeek({ template: t, weekNumber: 10, baseWeeklyMinutes: 140 });
    expect(w.isRaceWeek).toBe(true);
    expect(w.sessions.filter((s) => !s.optional)).toHaveLength(2);
    expect(w.weeklyRunMinutes).toBeLessThan(140);
  });

  it("5 km do zero: semana 1 é a etapa 1 (1 min corre / 1 min anda × 10) com aquecimento e desaquecimento", () => {
    const w = mat("5k", "iniciante", 1, 0);
    const first = w.sessions.find((s) => s.ladder)!;
    expect(first.ladder).toMatchObject({ etapa: "1", corridaMin: 1, caminhadaMin: 1, repeticoes: 10 });
    expect(first.minutes).toBe(30); // 10 × (1 + 1) + 10 de aquecimento/desaquecimento
    expect(w.sessions.filter((s) => s.ladder)).toHaveLength(3);
  });

  it("5 km do zero: semana 13 tem corridas contínuas de 30, 20 e 40 min (etapa 12)", () => {
    const w = mat("5k", "iniciante", 13, 0);
    const mins = w.sessions.filter((s) => s.ladder).map((s) => s.ladder!.corridaMin);
    expect(mins).toEqual([30, 20, 40]);
    expect(w.sessions.filter((s) => s.ladder).every((s) => s.ladder!.continua)).toBe(true);
  });

  it("saúde iniciante: semana de recuperação repete a etapa a 75% das repetições", () => {
    const normal = mat("saude", "iniciante", 3, 0).sessions.find((s) => s.ladder)!;
    const rec = mat("saude", "iniciante", 4, 0).sessions.find((s) => s.ladder)!;
    expect(rec.ladder!.etapa).toBe(normal.ladder!.etapa);
    expect(rec.ladder!.repeticoes).toBe(Math.floor(normal.ladder!.repeticoes * 0.75));
    expect(rec.minutes).toBeLessThan(normal.minutes);
  });

  it("força e mobilidade são opcionais, com duração fixa", () => {
    const w = mat("10k", "intermediario", 6, 140);
    const extras = w.sessions.filter((s) => s.optional);
    expect(extras.map((s) => s.slug).sort()).toEqual(["forca-corredor", "forca-corredor", "mobilidade", "mobilidade"]);
    expect(extras.find((s) => s.slug === "forca-corredor")!.minutes).toBe(30);
  });
});

describe("avanço da escada (R-PLN-12)", () => {
  const step = { ordem: 5, repeatedOnce: false };
  const base = { step, sessionsCompleted: 3, painAtLimit: false, slowMode: false };

  it("3 sessões sem dor: avança", () => {
    expect(nextLadderStep(base)).toMatchObject({ action: "avancar", ordem: 6 });
  });
  it("dor no limite: repete, nunca avança", () => {
    expect(nextLadderStep({ ...base, painAtLimit: true })).toMatchObject({ action: "repetir", ordem: 5, reason: "dor_no_limite" });
  });
  it("2 sessões não concluídas: repete; 1 não concluída ainda avança", () => {
    expect(nextLadderStep({ ...base, sessionsCompleted: 1 }).action).toBe("repetir");
    expect(nextLadderStep({ ...base, sessionsCompleted: 2 }).action).toBe("avancar");
  });
  it("progressão lenta (cautela_lesao ou IMC ≥ 30): cada etapa repete uma vez", () => {
    const first = nextLadderStep({ ...base, slowMode: true });
    expect(first).toMatchObject({ action: "repetir", repeatedOnce: true, reason: "progressao_lenta" });
    const second = nextLadderStep({ ...base, step: { ordem: 5, repeatedOnce: true }, slowMode: true });
    expect(second).toMatchObject({ action: "avancar", ordem: 6, repeatedOnce: false });
  });
  it("na última etapa conclui", () => {
    expect(nextLadderStep({ ...base, step: { ordem: 13, repeatedOnce: false } }).action).toBe("concluida");
  });
});

describe("agenda da semana", () => {
  const sessions = (o: Parameters<typeof buildPlanTemplate>[0], l: Parameters<typeof buildPlanTemplate>[1], week: number, base: number) =>
    mat(o, l, week, base).sessions;
  const dayOf = (r: ReturnType<typeof scheduleWeek>, slug: string) => r.placed.filter((p) => p.session.slug === slug).map((p) => p.day);

  it("longão no dia escolhido; qualidade nunca em dias seguidos", () => {
    const r = scheduleWeek({ sessions: sessions("21k", "avancado", 6, 250), availableDays: [1, 2, 3, 4, 5, 6, 7], longRunDay: 7 });
    expect(dayOf(r, "longao")).toEqual([7]);
    const q = r.placed.filter((p) => p.session.kind === "qualidade").map((p) => p.day).sort();
    for (let i = 1; i < q.length; i++) expect(q[i]! - q[i - 1]!).toBeGreaterThan(1);
    expect(r.unplaced).toHaveLength(0);
  });

  it("escada: sessões em dias não consecutivos", () => {
    const r = scheduleWeek({ sessions: sessions("5k", "iniciante", 3, 0), availableDays: [1, 2, 3, 4, 5, 6, 7], noConsecutiveRuns: true });
    const d = r.placed.filter((p) => p.session.ladder).map((p) => p.day);
    expect(d).toHaveLength(3);
    for (let i = 1; i < d.length; i++) expect(d[i]! - d[i - 1]!).toBeGreaterThan(1);
  });

  it("poucos dias disponíveis: corridas leves ficam de fora, sem apertar as duras", () => {
    const s = sessions("10k", "intermediario", 6, 150);
    const r = scheduleWeek({ sessions: s, availableDays: [2, 6], longRunDay: 6 });
    const runs = r.placed.filter((p) => !p.session.optional);
    expect(runs.length).toBeLessThanOrEqual(2);
    expect(runs.some((p) => p.session.kind === "longao")).toBe(true);
    expect(r.unplaced.length).toBeGreaterThan(0);
  });

  it("força em dia sem sessão dura e com 48 h entre elas", () => {
    const r = scheduleWeek({ sessions: sessions("10k", "intermediario", 6, 150), availableDays: [1, 2, 3, 4, 5, 6, 7], longRunDay: 7 });
    const hard = new Set(r.placed.filter((p) => p.session.kind === "longao" || p.session.kind === "qualidade").map((p) => p.day));
    const strength = r.placed.filter((p) => p.session.kind === "forca").map((p) => p.day);
    expect(strength.every((d) => !hard.has(d))).toBe(true);
    if (strength.length === 2) expect(Math.abs(strength[0]! - strength[1]!)).toBeGreaterThanOrEqual(2);
  });
});

describe("do plano ao dia", () => {
  it("a sessão materializada entra direto no motor diário", async () => {
    const { decideDay } = await import("../src/day/decide");
    const week = materializeWeek({ template: tpl("10k", "intermediario"), weekNumber: 6, baseWeeklyMinutes: 150, longest30: 55 });
    const quality = week.sessions.find((s) => s.kind === "qualidade")!;
    const today = "2026-10-20";
    const d = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
    const decision = decideDay({
      today, level: "intermediario", flags: [], screening: { state: "LIBERADO", maxIntensity: "livre" },
      planned: quality, checkins: [{ date: today, sleepHours: 4.5, sleepQuality: 3, energy: 4, mood: 4, stress: 4, muscleSoreness: 4 }],
      pain: [], logs: [{ date: d(-3), completed: true, minutes: 55 }], daysSinceLastRun: 3,
      lastBuildWeekMinutes: 140, highLoadWeek: false,
    });
    expect(decision.action).toBe("reduzir");
    expect(decision.session.slug).toBe("rodagem-leve");
    expect(decision.session.minutes).toBeLessThanOrEqual(quality.minutes);
  });
});
