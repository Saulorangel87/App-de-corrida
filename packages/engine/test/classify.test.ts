import { describe, expect, it } from "vitest";
import { classify, type ClassificationInput } from "../src/classification/classify";
import { explainClassification } from "../src/classification/explain";

// Casos de docs/pesquisa/01-classificacao.md ("Casos de teste sugeridos").
// Todos assumem ativo nos últimos 3 meses, sem pausa e sem lesão, salvo indicação.
const AS_OF = "2026-10-10";
const recent = (mmss: string) => {
  const [m, s] = mmss.split(":").map(Number);
  return { seconds: m! * 60 + s!, date: "2026-09-01" };
};

const base = (over: Partial<ClassificationInput>): ClassificationInput => ({
  ageYears: 30,
  sex: "M",
  monthsRegular: 24,
  weeklyVolume: { unit: "km", value: 25 },
  weeklySessions: 3,
  daysSinceLastRun: 2,
  active3m: true,
  injury12m: false,
  asOf: AS_OF,
  ...over,
});

const caso4 = base({ monthsRegular: 24, weeklySessions: 3, weeklyVolume: { unit: "km", value: 25 } });
const caso5 = base({ monthsRegular: 24, weeklySessions: 3, weeklyVolume: { unit: "km", value: 16 } });
const caso7 = base({ monthsRegular: 48, weeklySessions: 5, weeklyVolume: { unit: "km", value: 60 }, t5k: recent("19:30") });
const caso10 = { ...caso7, sex: "F" as const, t5k: recent("21:30") };

function expectLevel(input: ClassificationInput, level: string, flags: string[] = []) {
  const r = classify(input);
  if (!r.eligible) throw new Error("esperava elegível");
  expect(r.levelName).toBe(level);
  expect([...r.flags].sort()).toEqual([...flags].sort());
  return r;
}

describe("CLS-v1: casos da pesquisa", () => {
  it("1. nunca correu e sem exercício regular → iniciante, inicio_do_zero", () => {
    expectLevel(base({ monthsRegular: 0, weeklyVolume: { unit: "km", value: 0 }, weeklySessions: 0, active3m: false }), "iniciante", ["inicio_do_zero"]);
  });
  it("2. 8 meses, 3x, 18 km → iniciante (experiência)", () => {
    const r = expectLevel(base({ monthsRegular: 8, weeklyVolume: { unit: "km", value: 18 } }), "iniciante");
    expect(r.limiting.some((l) => l.kind === "experiencia")).toBe(true);
  });
  it("3. 12 meses exatos, 3x, 20 km → intermediário", () => {
    expectLevel(base({ monthsRegular: 12, weeklyVolume: { unit: "km", value: 20 } }), "intermediario");
  });
  it("4. 24 meses, 3x, 25 km, sem tempo → intermediário", () => {
    expectLevel(caso4, "intermediario");
  });
  it("5. 24 meses, 3x, 16 km, sem tempo → iniciante (sobreposição)", () => {
    const r = expectLevel(caso5, "iniciante");
    expect(r.limiting).toEqual([{ kind: "volume_sobreposicao", weeklyKm: 16 }]);
  });
  it("6. caso 5 com 5 km em 28:00 (M) → intermediário", () => {
    expectLevel({ ...caso5, t5k: recent("28:00") }, "intermediario");
  });
  it("7. 48 meses, 5x, 60 km, 5 km em 19:30 (M) → avançado", () => {
    expectLevel(caso7, "avancado");
  });
  it("8. caso 7 sem tempo → intermediário", () => {
    const r = expectLevel({ ...caso7, t5k: undefined }, "intermediario");
    expect(r.limiting).toEqual([{ kind: "desempenho_sem_tempo", sex: "M" }]);
  });
  it("9. caso 7 com 4x/semana → intermediário", () => {
    expectLevel({ ...caso7, weeklySessions: 4 }, "intermediario");
  });
  it("10. 48 meses, 5x, 60 km, F, 5 km em 21:30 → avançado", () => {
    expectLevel(caso10, "avancado");
  });
  it("11. caso 10 com 23:00 → intermediário", () => {
    expectLevel({ ...caso10, t5k: recent("23:00") }, "intermediario");
  });
  it("12. caso 7 com 42 dias sem correr → intermediário, retorno_de_pausa", () => {
    const r = expectLevel({ ...caso7, daysSinceLastRun: 42 }, "intermediario", ["retorno_de_pausa"]);
    expect(r.limiting).toEqual([{ kind: "pausa", days: 42 }]);
  });
  it("13. caso 7 com 98 dias sem correr → iniciante, retorno_de_pausa", () => {
    expectLevel({ ...caso7, daysSinceLastRun: 98 }, "iniciante", ["retorno_de_pausa"]);
  });
  it("14. caso 4 com lesão há 6 meses → intermediário, cautela_lesao", () => {
    expectLevel({ ...caso4, injury12m: true }, "intermediario", ["cautela_lesao"]);
  });
  it("15. 36 meses, 5x, 50 km exatos, 5 km em 22:00 → intermediário", () => {
    expectLevel(base({ monthsRegular: 36, weeklySessions: 5, weeklyVolume: { unit: "km", value: 50 }, t5k: recent("22:00") }), "intermediario");
  });
  it("16. idade 17 → fora do app", () => {
    expect(classify(base({ ageYears: 17 }))).toMatchObject({ eligible: false, reason: "menor_de_18" });
  });
  it("17. caso 7 com 28 dias sem correr → avançado, sem mudança", () => {
    expectLevel({ ...caso7, daysSinceLastRun: 28 }, "avancado");
  });
  it("18. caso 7 com 29 dias sem correr → intermediário, retorno_de_pausa", () => {
    expectLevel({ ...caso7, daysSinceLastRun: 29 }, "intermediario", ["retorno_de_pausa"]);
  });
  it("19. caso 7 em F com 22:00 → avançado", () => {
    expectLevel({ ...caso7, sex: "F", t5k: recent("22:00") }, "avancado");
  });
  it("20. caso 7 em F com 22:01 e sem 10 km → intermediário", () => {
    expectLevel({ ...caso7, sex: "F", t5k: recent("22:01") }, "intermediario");
  });
  it("21. caso 4 com 140 min/semana (= 20 km a 7 min/km) → intermediário", () => {
    expectLevel({ ...caso4, weeklyVolume: { unit: "min", value: 140 } }, "intermediario");
  });
});

describe("CLS-v1: bordas extras", () => {
  it("sexo não informado usa os cortes masculinos", () => {
    expectLevel({ ...caso7, sex: "nao_informado", t5k: recent("21:30") }, "intermediario");
  });
  it("tempo com mais de 6 meses não conta", () => {
    expectLevel({ ...caso7, t5k: { seconds: 19 * 60, date: "2026-01-01" } }, "intermediario");
  });
  it("10 km também comprova desempenho (M ≤ 42:00)", () => {
    expectLevel({ ...caso7, t5k: undefined, t10k: recent("42:00") }, "avancado");
  });
  it("reavaliação em 12 semanas", () => {
    const r = classify(caso4);
    expect(r.eligible && r.nextReevaluation).toBe("2027-01-02");
  });
});

describe("explicação (R-CLS-15)", () => {
  it("cita o critério limitante, a data de revisão e a fonte", () => {
    const e = explainClassification(classify({ ...caso7, t5k: undefined }));
    expect(e.text).toContain("**intermediário**");
    expect(e.text).toContain("5 km em até 20:00");
    expect(e.text).toContain("02/01/2027");
    expect(e.sources).toEqual(["Honert 2020"]);
  });
  it("em inglês", () => {
    expect(explainClassification(classify(caso5), "en").text).toMatch(/^Your level is \*\*beginner\*\* because/);
  });
});
