import { describe, expect, it } from "vitest";
import { allPlanTemplates, buildPlanTemplate, type PlanTemplate } from "../src/plan/templates";
import { ESCADA_CAMINHADA_CORRIDA } from "../src/plan/ladder";

// Invariantes dos 13 modelos (docs/pesquisa/10-planos-objetivo.md).
const all = allPlanTemplates();
const runs = (t: PlanTemplate, week: number) => t.weeks[week - 1]!.sessions.filter((s) => s.sharePct > 0);
const qualities = (t: PlanTemplate, week: number) => runs(t, week).filter((s) => s.kind === "qualidade");

describe("catálogo de modelos (R-PLN-13, R-PLN-04)", () => {
  it("são 13 modelos; 21 e 42 km não existem para iniciante", () => {
    expect(all).toHaveLength(13);
    expect(buildPlanTemplate("21k", "iniciante")).toBeNull();
    expect(buildPlanTemplate("42k", "iniciante")).toBeNull();
  });

  it.each([
    ["5k", "iniciante", 13], ["5k", "intermediario", 8], ["5k", "avancado", 10],
    ["10k", "iniciante", 12], ["10k", "intermediario", 10], ["10k", "avancado", 12],
    ["21k", "intermediario", 12], ["21k", "avancado", 12],
    ["42k", "intermediario", 16], ["42k", "avancado", 16],
    ["saude", "iniciante", 12], ["saude", "intermediario", 12], ["saude", "avancado", 12],
  ] as const)("%s %s tem %i semanas", (o, l, weeks) => {
    const t = buildPlanTemplate(o, l)!;
    expect(t.durationWeeks).toBe(weeks);
    expect(t.weeks).toHaveLength(weeks);
    expect(t.weeks.map((w) => w.weekNumber)).toEqual(Array.from({ length: weeks }, (_, i) => i + 1));
  });
});

describe("curvas de volume", () => {
  it("as 5 curvas publicadas entram como estão (R-PLN-13, curvas)", () => {
    expect(buildPlanTemplate("42k", "intermediario")!.weeks.map((w) => w.volumeIndex)).toEqual(
      [55, 59, 63, 47, 67, 72, 77, 57, 82, 88, 94, 70, 100, 80, 62, 40],
    );
    expect(buildPlanTemplate("10k", "intermediario")!.weeks.map((w) => w.volumeIndex)).toEqual([68, 73, 79, 59, 86, 93, 100, 75, 75, 55]);
  });

  it.each(all.map((t) => [t.slug, t] as const))("%s: pico 100, nunca acima, recuperação em 75% (R-PRG-07)", (_slug, t) => {
    const idx = t.weeks.map((w) => w.volumeIndex);
    expect(Math.max(...idx)).toBe(100);
    for (const w of t.weeks.filter((x) => x.isRecovery)) {
      const prev = t.weeks[w.weekNumber - 2]!.volumeIndex;
      expect(Math.abs(w.volumeIndex - Math.floor(prev * 0.75))).toBeLessThanOrEqual(1);
    }
  });

  it.each(all.map((t) => [t.slug, t] as const))("%s: carga cresce no máximo 10% sobre a última semana de construção (R-PRG-03/04)", (_slug, t) => {
    const ladder = t.weeks.some((w) => w.ladderStage !== undefined); // escada: isenta de 110% (R-PRG-03), não de 120%
    let lastBuild = 0;
    for (const w of t.weeks) {
      if (w.isRecovery || w.isTaper || w.isRaceWeek) continue;
      if (lastBuild > 0) {
        const growth = w.volumeIndex / lastBuild;
        // escada isenta de 110%, mas nunca acima de 120%; os demais, 110% com folga de arredondamento
        expect(growth).toBeLessThanOrEqual(ladder ? 1.2 : 1.1 + 0.005);
      }
      lastBuild = w.volumeIndex;
    }
  });

  it("polimento: 5 km −40%, 10/21 km −25% e −45%, 42 km −20/−38/−60% (R-PLN-10)", () => {
    const tail = (slug: string, n: number) => buildPlanTemplate(...(slug.split("-") as ["5k", "avancado"]))!.weeks.slice(-n).map((w) => w.volumeIndex);
    expect(tail("5k-avancado", 1)).toEqual([60]);
    expect(tail("10k-avancado", 2)).toEqual([75, 55]);
    expect(tail("21k-avancado", 2)).toEqual([75, 55]);
    expect(tail("42k-avancado", 3)).toEqual([80, 62, 40]);
  });
});

describe("sessões por semana (R-PLN-09, R-SES-*)", () => {
  it.each(all.map((t) => [t.slug, t] as const))("%s: volumes das corridas somam 100% e o longão não passa de 40%", (_slug, t) => {
    for (const w of t.weeks) {
      if (w.ladderStage) continue;
      const r = w.sessions.filter((s) => s.sharePct > 0);
      expect(r.reduce((a, s) => a + s.sharePct, 0)).toBe(100);
      for (const s of r.filter((x) => x.slug === "longao")) expect(s.sharePct).toBeLessThanOrEqual(40);
    }
  });

  it.each(all.map((t) => [t.slug, t] as const))("%s: frequência por nível e limite de qualidade", (_slug, t) => {
    // R-PLN-14: o modelo de saúde tem 3 corridas por semana em qualquer nível.
    const freq = t.objective === "saude" ? [3, 3] : { iniciante: [2, 3], intermediario: [3, 4], avancado: [5, 6] }[t.level];
    for (const w of t.weeks) {
      if (w.isRaceWeek) continue;
      const nRuns = w.ladderStage ? 3 : runs(t, w.weekNumber).length;
      expect(nRuns).toBeGreaterThanOrEqual(freq[0]!);
      expect(nRuns).toBeLessThanOrEqual(freq[1]!);
      const q = qualities(t, w.weekNumber);
      const max = t.level === "iniciante" ? 0 : t.level === "intermediario" ? 1 : 2;
      expect(q.length).toBeLessThanOrEqual(max);
      const hiit = q.filter((s) => s.maxZone === "Z3").length;
      expect(hiit).toBeLessThanOrEqual(t.level === "intermediario" ? 1 : 2);
      if (w.isRecovery) expect(q).toHaveLength(0); // R-PRG-07
    }
  });

  it("iniciante nunca tem sessão de qualidade (R-SES-40) nem longão antes da semana 5", () => {
    for (const t of all.filter((x) => x.level === "iniciante")) {
      for (const w of t.weeks) {
        expect(w.sessions.some((s) => s.kind === "qualidade")).toBe(false);
        if (w.weekNumber < 5) expect(w.sessions.some((s) => s.slug === "longao")).toBe(false);
      }
    }
  });

  it("avançado de 5 km: duas sessões de qualidade nas semanas de construção", () => {
    const t = buildPlanTemplate("5k", "avancado")!;
    expect(qualities(t, 6)).toHaveLength(2);
  });

  it("semana de prova: só duas corridas curtas e uma força (R-SES-70)", () => {
    const t = buildPlanTemplate("10k", "intermediario")!;
    const race = t.weeks[t.weeks.length - 1]!;
    expect(race).toMatchObject({ isRaceWeek: true, phase: "prova" });
    expect(race.sessions.filter((s) => s.sharePct > 0)).toHaveLength(2);
    expect(race.sessions.filter((s) => s.slug === "forca-corredor")).toHaveLength(1);
  });

  it("força é opcional e fora do volume de corrida; mobilidade ≥ 2 por semana", () => {
    const t = buildPlanTemplate("21k", "intermediario")!;
    const w = t.weeks[5]!;
    expect(w.sessions.filter((s) => s.slug === "mobilidade").length).toBeGreaterThanOrEqual(2);
    expect(w.sessions.filter((s) => s.optional).every((s) => s.sharePct === 0 && s.fixedMinutes !== undefined)).toBe(true);
  });
});

describe("5 km iniciante do zero (R-PLN-12, DEC-48)", () => {
  const t = buildPlanTemplate("5k", "iniciante")!;
  it("semana N = etapa N; 11 = 10b, 12 = 11, 13 = 12; sem recuperação fixa", () => {
    expect(t.weeks.map((w) => w.ladderStage)).toEqual(ESCADA_CAMINHADA_CORRIDA.map((e) => e.etapa));
    expect(t.weeks[10]!.ladderStage).toBe("10b");
    expect(t.weeks[11]!.ladderStage).toBe("11");
    expect(t.weeks[12]!.ladderStage).toBe("12");
    expect(t.weeks.some((w) => w.isRecovery || w.isTaper)).toBe(false);
  });
  it("3 sessões da escada por semana, todas em Z1", () => {
    for (const w of t.weeks) {
      const ladder = w.sessions.filter((s) => s.ladderSession);
      expect(ladder.map((s) => s.ladderSession)).toEqual([1, 2, 3]);
      expect(ladder.every((s) => s.maxZone === "Z1" && s.slug === "caminhada-corrida")).toBe(true);
    }
  });
});

describe("tetos de pico e longão (R-PLN-11)", () => {
  it.each([
    ["5k", "iniciante", 90, 40], ["5k", "intermediario", 150, 60], ["5k", "avancado", 240, 84],
    ["10k", "iniciante", 132, 60], ["10k", "intermediario", 210, 84], ["10k", "avancado", 330, 108],
    ["21k", "intermediario", 270, 114], ["21k", "avancado", 390, 126],
    ["42k", "intermediario", 330, 120], ["42k", "avancado", 480, 150],
  ] as const)("%s %s: %i min/semana, longão ≤ %i min", (o, l, peak, longRun) => {
    const t = buildPlanTemplate(o, l)!;
    expect(t.peakWeeklyCapMinutes).toBe(peak);
    expect(t.longRunCapMinutes).toBe(longRun);
  });
});
