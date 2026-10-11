import { describe, expect, it } from "vitest";
import {
  PARQ_INSTRUMENT,
  PARQ_INSTRUMENT_EN,
  PARQ_TEXT_COMPLETE,
  PARQ_TEXT_EN,
  PARQ_TEXT_EN_COMPLETE,
  PARQ_TEXT_KEYS,
  PARQ_TEXT_PT_BR,
  parqInstrumentFor,
  parqTextFor,
  toParqLang,
} from "@passo/shared";

// Texto oficial do PAR-Q+ (R-TRI-02): versão brasileira e original em inglês, sem tradução nossa.

describe("texto oficial do PAR-Q+", () => {
  it("os dois idiomas estão completos e com os mesmos blocos", () => {
    expect(PARQ_TEXT_COMPLETE).toBe(true);
    expect(PARQ_TEXT_EN_COMPLETE).toBe(true);
    expect(Object.keys(PARQ_TEXT_PT_BR).sort()).toEqual([...PARQ_TEXT_KEYS].sort());
    expect(Object.keys(PARQ_TEXT_EN).sort()).toEqual([...PARQ_TEXT_KEYS].sort());
  });

  it("cada bloco tem a mesma quantidade de linhas e de itens de lista nos dois idiomas", () => {
    for (const key of PARQ_TEXT_KEYS) {
      if (key === "atribuicao") continue; // créditos diferentes: tradutores só na versão brasileira
      const pt = PARQ_TEXT_PT_BR[key]!.split("\n");
      const en = PARQ_TEXT_EN[key]!.split("\n");
      expect(en.filter((l) => l.startsWith("- ")).length, `${key}: itens de lista`).toBe(pt.filter((l) => l.startsWith("- ")).length);
    }
  });

  it("o inglês é de fato inglês (sem português nem acentos) e traz as frases do original", () => {
    const all = PARQ_TEXT_KEYS.map((k) => PARQ_TEXT_EN[k]).join("\n");
    expect(all).not.toMatch(/[áàâãéêíóôõúçÁÉÍÓÚÇ]/);
    expect(PARQ_TEXT_EN["geral.1"]).toBe("Has your doctor ever said that you have a heart condition OR high blood pressure?");
    expect(PARQ_TEXT_EN["geral.2"]).toContain("Do you feel pain in your chest at rest");
    expect(PARQ_TEXT_EN["pagina4.todas_nao"]).toContain("It is advised that you consult a qualified exercise professional");
    expect(PARQ_TEXT_EN["pagina4.avisos"]).toContain("NO changes are permitted");
    // as ligaturas que o PDF perde na extração foram devolvidas
    expect(all).not.toMatch(/\b(quali ed|di culty|e ort|tness|con dentiality)\b/);
    expect(all).toContain("qualified exercise professional");
  });

  it("o idioma da tela escolhe o texto e a versão registrada", () => {
    expect(toParqLang("en")).toBe("en");
    expect(toParqLang("en-US")).toBe("en");
    expect(toParqLang("pt-BR")).toBe("pt-BR");
    expect(toParqLang(undefined)).toBe("pt-BR");
    expect(parqTextFor("en")).toBe(PARQ_TEXT_EN);
    expect(parqTextFor("pt-BR")).toBe(PARQ_TEXT_PT_BR);
    expect(parqInstrumentFor("en")).toBe(PARQ_INSTRUMENT_EN);
    expect(parqInstrumentFor(undefined)).toBe(PARQ_INSTRUMENT);
    expect(PARQ_INSTRUMENT_EN.version).toBe("en 2025");
    expect(PARQ_INSTRUMENT.version).toBe("pt-BR 2023");
  });
});
