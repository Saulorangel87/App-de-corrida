// TRI-v1 — camada do app sobre o PAR-Q+. Fonte: docs/pesquisa/02-triagem.md.
// O questionário em si é o oficial, sem alteração (R-TRI-02); isto é só a regra.

export const TRI_VERSION = "TRI-v1";

export const triV1 = {
  // R-TRI-04 [Whitfield 2017] + decisão do dono P2 [P]: perguntas gerais 2 (dor no peito),
  // 3 (tontura/perda de consciência) e 7 (só atividade supervisionada) bloqueiam sempre.
  alwaysBlockGeneral: [2, 3, 7] as const,

  validity: {
    // R-TRI-10 [Bredin 2013; Warburton 2011a]: PAR-Q+ 12 meses; após avaliação 6 meses (ePARmed-X+)
    clearedMonths: 12,
    clearedAfterEvaluationMonths: 6,
    // R-TRI-10 [P]: aviso 30 dias antes de vencer
    warnDaysBefore: 30,
  },

  // R-TRI-07 [PARQ+ 2025; Whitfield 2017]: 45+ sem exercício regular → leve/moderada (só Z1)
  // até registrar consulta a profissional de educação física.
  ageRegularExerciseCheck: 45,
} as const;
