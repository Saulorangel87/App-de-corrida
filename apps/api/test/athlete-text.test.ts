import { describe, expect, it } from "vitest";
import { ESCADA_CAMINHADA_CORRIDA } from "@passo/engine";
import { HOW_BY_SLUG, TECHNICAL_MARKERS, ladderHow } from "@passo/db";

// "Como fazer" em linguagem simples (docs/textos-para-o-atleta.md, seção 6, aprovada em 2026-10-11).

const SIGLAS = /\bZ[123]\b|\bFC\b|\bRPE\b|\bCR-10\b|\bN x\b/;

describe("caminhada e corrida: texto montado com os números da sessão", () => {
  it("etapa 3: exemplo aprovado, em português e em inglês", () => {
    const s = { etapa: "3", corridaMin: 3, caminhadaMin: 2, repeticoes: 4 };
    const pt = ladderHow("pt-BR", s, 2);
    expect(pt.warmup.text).toBe("Caminhe 5 minutos em passo rápido, para o corpo esquentar.");
    expect(pt.main.text).toBe("Corra 3 minutos e depois caminhe 2 minutos. Faça isso 4 vezes ao todo.");
    expect(pt.cooldown.text).toBe("Caminhe 5 minutos devagar, para o corpo desacelerar.");
    expect(pt.main.facts).toEqual([
      { label: "Onde você está", value: "Sessão 2 de 3 da etapa 3." },
      {
        label: "Ritmo",
        value: "Corra num ritmo em que você consiga conversar, falando frases completas. Se ficar sem ar, diminua o ritmo.",
      },
    ]);
    const en = ladderHow("en", s, 2);
    expect(en.main.text).toBe("Run for 3 minutes and then walk for 2 minutes. Do this 4 times in total.");
    expect(en.main.facts[0]).toEqual({ label: "Where you are", value: "Session 2 of 3 of step 3." });
  });

  it("corrida contínua, repetição única e meio minuto", () => {
    expect(ladderHow("pt-BR", { etapa: "12", corridaMin: 40, caminhadaMin: 0, repeticoes: 1, continua: true }, 3).main.text).toBe(
      "Corra 40 minutos seguidos, bem devagar, sem parar.",
    );
    expect(ladderHow("pt-BR", { etapa: "11", corridaMin: 20, caminhadaMin: 5, repeticoes: 1 }, 3).main.text).toBe(
      "Corra 20 minutos e depois caminhe 5 minutos.",
    );
    expect(ladderHow("pt-BR", { etapa: "2", corridaMin: 2, caminhadaMin: 1.5, repeticoes: 5 }, 1).main.text).toBe(
      "Corra 2 minutos e depois caminhe 1 minuto e meio. Faça isso 5 vezes ao todo.",
    );
    expect(ladderHow("pt-BR", { etapa: "1", corridaMin: 1, caminhadaMin: 1, repeticoes: 10 }, 1).main.text).toBe(
      "Corra 1 minuto e depois caminhe 1 minuto. Faça isso 10 vezes ao todo.",
    );
  });

  it("todas as sessões de todas as etapas: números da escada, sem sigla nem código", () => {
    for (const stage of ESCADA_CAMINHADA_CORRIDA) {
      stage.sessoes.forEach((s, k) => {
        for (const lang of ["pt-BR", "en"] as const) {
          const how = ladderHow(lang, { etapa: stage.etapa, ...s }, k + 1);
          const all = [how.warmup, how.main, how.cooldown].flatMap((x) => [x.text ?? "", ...x.facts.map((f) => `${f.label} ${f.value}`)]);
          for (const text of all) {
            expect(text, `${stage.etapa}/${k + 1}/${lang}`).not.toMatch(SIGLAS);
            expect(text).not.toMatch(TECHNICAL_MARKERS);
          }
          // o número de repetições e os minutos da escada aparecem na frase
          expect(how.main.text).toContain(String(s.corridaMin).replace(".5", ""));
          if (s.repeticoes > 1 && s.caminhadaMin > 0) expect(how.main.text).toContain(String(s.repeticoes));
        }
      });
    }
  });
});

describe("demais treinos: texto fixo do catálogo", () => {
  it("cada treino tem o texto aprovado, sem sigla e sem código", () => {
    expect(Object.keys(HOW_BY_SLUG).sort()).toEqual(
      [
        "caminhada-corrida", "fartlek", "forca-corredor", "intervalado-curto", "intervalado-longo", "limiar-continuo",
        "longao", "mobilidade", "regenerativo", "rodagem-leve", "subidas",
      ].sort(),
    );
    for (const [slug, how] of Object.entries(HOW_BY_SLUG)) {
      for (const step of [how.warmup, how.main, how.cooldown]) {
        if (!step?.text) continue;
        expect(step.text, slug).not.toMatch(SIGLAS);
        expect(step.text, slug).not.toMatch(TECHNICAL_MARKERS);
        expect(step.facts, slug).toEqual([]);
      }
    }
    expect(HOW_BY_SLUG["rodagem-leve"]!.main!.text).toBe("Corra sem parar, em ritmo leve: você deve conseguir conversar.");
  });
});
