import { describe, expect, it } from "vitest";
import { allowsTraining, healthCheckDue, IncompleteScreeningError, screen, type ScreeningInput } from "../src/screening/screen";

const allNo = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
const noFollowUp = { "1": { has: false, answers: {} } };

const base = (over: Partial<ScreeningInput> = {}): ScreeningInput => ({
  general: allNo,
  pregnant: false,
  ageYears: 30,
  regularExercise3m: true,
  completedAt: "2026-10-10",
  now: "2026-10-10",
  ...over,
});

describe("TRI-v1 (docs/pesquisa/02-triagem.md)", () => {
  it("R-TRI-03: 7 gerais = NÃO → LIBERADO, livre, 12 meses", () => {
    const r = screen(base());
    expect(r).toMatchObject({ state: "LIBERADO", maxIntensity: "livre", validUntil: "2027-10-10" });
    expect(allowsTraining(r)).toBe(true);
  });

  it("R-TRI-03: SIM em geral comum e seguimento todo NÃO → LIBERADO", () => {
    const r = screen(base({ general: { ...allNo, 1: true }, followUp: { "4": { has: true, answers: { "4a": false, "4b": false } } } }));
    expect(r.state).toBe("LIBERADO");
  });

  it.each([2, 3, 7] as const)("R-TRI-04: pergunta geral %i = SIM bloqueia mesmo com seguimento NÃO", (q) => {
    const r = screen(base({ general: { ...allNo, [q]: true }, followUp: noFollowUp }));
    expect(r).toMatchObject({ state: "AVALIACAO_NECESSARIA", maxIntensity: "nenhuma", reasons: ["sintoma_geral"] });
    expect(allowsTraining(r)).toBe(false);
  });

  it("R-TRI-05: qualquer SIM no seguimento → AVALIACAO_NECESSARIA", () => {
    const r = screen(base({ general: { ...allNo, 1: true }, followUp: { "4": { has: true, answers: { "4a": false, "4b": true } } } }));
    expect(r).toMatchObject({ state: "AVALIACAO_NECESSARIA", reasons: ["seguimento_sim"] });
  });

  it("seguimento de seção não marcada não conta", () => {
    const r = screen(base({ general: { ...allNo, 1: true }, followUp: { "4": { has: false, answers: { "4a": true } } } }));
    expect(r.state).toBe("LIBERADO");
  });

  it("SIM nas gerais sem seguimento é erro (questionário incompleto)", () => {
    expect(() => screen(base({ general: { ...allNo, 1: true } }))).toThrow(IncompleteScreeningError);
  });

  describe("autodeclaração (R-TRI-05, R-TRI-06)", () => {
    const blocked = base({ general: { ...allNo, 2: true }, followUp: noFollowUp });
    it("sem restrições → LIBERADO_APOS_AVALIACAO, só Z1, 6 meses", () => {
      const r = screen({ ...blocked, now: "2026-10-20", evaluation: { result: "sem_restricoes", date: "2026-10-15", source: "medico" } });
      expect(r).toMatchObject({ state: "LIBERADO_APOS_AVALIACAO", maxIntensity: "leve_moderada", validUntil: "2027-04-15" });
    });
    it.each(["com_restricoes", "encaminhado_ao_medico", "nao_liberado"] as const)("%s mantém bloqueado (P3)", (res) => {
      const r = screen({ ...blocked, evaluation: { result: res, date: "2026-10-15", source: "medico" }, now: "2026-10-20" });
      expect(r.state).toBe("AVALIACAO_NECESSARIA");
    });
    it("nova declaração de vigoroso libera intensidade", () => {
      const r = screen({ ...blocked, now: "2026-10-20", evaluation: { result: "sem_restricoes", date: "2026-10-15", source: "medico", vigorousAllowedAt: "2026-10-16" } });
      expect(r.maxIntensity).toBe("livre");
    });
    it("avaliação anterior ao questionário não vale", () => {
      const r = screen({ ...blocked, evaluation: { result: "sem_restricoes", date: "2026-09-01", source: "medico" } });
      expect(r.state).toBe("AVALIACAO_NECESSARIA");
    });
    it("após 6 meses da avaliação → EXPIRADO", () => {
      const r = screen({ ...blocked, now: "2027-04-16", evaluation: { result: "sem_restricoes", date: "2026-10-15", source: "medico" } });
      expect(r).toMatchObject({ state: "EXPIRADO", maxIntensity: "nenhuma" });
    });
  });

  it("R-TRI-07: 45+ sem exercício regular → só Z1 até registrar consulta", () => {
    expect(screen(base({ ageYears: 45, regularExercise3m: false })).maxIntensity).toBe("leve_moderada");
    expect(screen(base({ ageYears: 44, regularExercise3m: false })).maxIntensity).toBe("livre");
    expect(screen(base({ ageYears: 50, regularExercise3m: false, consultedProfessionalAt: "2026-10-11" })).maxIntensity).toBe("livre");
  });

  it("R-TRI-09: gravidez → ADIADO", () => {
    expect(screen(base({ pregnant: true }))).toMatchObject({ state: "ADIADO", maxIntensity: "nenhuma" });
  });

  it("R-TRI-10: vence em 12 meses e avisa 30 dias antes", () => {
    expect(screen(base({ now: "2027-09-09" })).expiresSoon).toBe(false);
    expect(screen(base({ now: "2027-09-10" })).expiresSoon).toBe(true);
    expect(screen(base({ now: "2027-10-10" })).state).toBe("LIBERADO");
    expect(screen(base({ now: "2027-10-11" })).state).toBe("EXPIRADO");
  });

  it("R-TRI-11: mudança de saúde → EXPIRADO", () => {
    expect(screen(base({ healthChangedAt: "2026-11-01", now: "2026-11-01" }))).toMatchObject({ state: "EXPIRADO", reasons: ["saude_mudou"] });
  });

  it("R-TRI-11: a pergunta é semanal, conta da última resposta e só vale com liberação", () => {
    const due = (over: Partial<ScreeningInput>, confirmedAt?: string) => {
      const input = base(over);
      return healthCheckDue({ screening: screen(input), completedAt: input.completedAt, confirmedAt, now: input.now });
    };
    expect(due({ now: "2026-10-16" })).toBe(false); // 6 dias
    expect(due({ now: "2026-10-17" })).toBe(true); // 7 dias desde o preenchimento
    expect(due({ now: "2026-10-23" }, "2026-10-17")).toBe(false); // respondeu há 6 dias
    expect(due({ now: "2026-10-24" }, "2026-10-17")).toBe(true);
    expect(due({ now: "2026-10-24" }, "2026-10-01")).toBe(true); // resposta anterior ao preenchimento não conta
    // sem liberação não há o que invalidar
    expect(due({ now: "2026-10-24", pregnant: true })).toBe(false);
    expect(due({ now: "2026-10-24", healthChangedAt: "2026-10-20" })).toBe(false);
  });
});
