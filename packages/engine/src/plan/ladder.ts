// Escada caminhada-corrida (docs/pesquisa/07-tipos-sessao.md, R-SES-10/11). Fonte única para o
// catálogo (seed) e para a montagem das semanas do plano de 5 km do zero.
// ---------------------------------------------------------------------------------------------
// Escada de caminhada-corrida (GRONORUN, Buist 2007, Tabela 2; ajustes [P] de decisoes.md DEC-12/DEC-15)
// ---------------------------------------------------------------------------------------------

export type SessaoEscada = {
  corridaMin: number;
  caminhadaMin: number;
  repeticoes: number;
  continua?: true;
  ajusteP?: { original: { corridaMin: number; caminhadaMin: number; repeticoes: number }; motivo: string };
};

export type EtapaEscada = {
  etapa: string;
  ordem: number;
  sessoes: [SessaoEscada, SessaoEscada, SessaoEscada];
  totalCorridaMin: number;
  totalCaminhadaMin: number;
  degrauIntermediarioP?: true;
};

const rw = (corridaMin: number, caminhadaMin: number, repeticoes: number): SessaoEscada => ({
  corridaMin,
  caminhadaMin,
  repeticoes,
});
const cont = (corridaMin: number): SessaoEscada => ({ corridaMin, caminhadaMin: 0, repeticoes: 1, continua: true });

const MOTIVO_ETAPA_2 =
  "A fonte imprime células que somam 38/28,5 min, mas totais de 34/25,5 min; decisão do dono (DEC-12): usar o menor volume (o total impresso).";
const MOTIVO_ETAPA_11 =
  "A fonte imprime células que somam 100/20 min, mas totais de 80/15 min; decisão do dono (DEC-12): usar o menor volume (o total impresso).";

export const ESCADA_CAMINHADA_CORRIDA: EtapaEscada[] = [
  { etapa: "1", ordem: 1, sessoes: [rw(1, 1, 10), rw(1, 1, 10), rw(1, 1, 10)], totalCorridaMin: 30, totalCaminhadaMin: 30 },
  {
    etapa: "2",
    ordem: 2,
    sessoes: [
      rw(2, 1.5, 5),
      rw(2, 1.5, 7),
      { ...rw(2, 1.5, 5), ajusteP: { original: rw(2, 1.5, 7), motivo: MOTIVO_ETAPA_2 } },
    ],
    totalCorridaMin: 34,
    totalCaminhadaMin: 25.5,
  },
  { etapa: "3", ordem: 3, sessoes: [rw(3, 2, 4), rw(3, 2, 4), rw(3, 2, 4)], totalCorridaMin: 36, totalCaminhadaMin: 24 },
  { etapa: "4", ordem: 4, sessoes: [rw(4, 2, 3), rw(4, 2, 4), rw(4, 2, 3)], totalCorridaMin: 40, totalCaminhadaMin: 20 },
  { etapa: "5", ordem: 5, sessoes: [rw(4, 2, 4), rw(4, 2, 4), rw(4, 2, 3)], totalCorridaMin: 44, totalCaminhadaMin: 22 },
  { etapa: "6", ordem: 6, sessoes: [rw(6, 2, 3), rw(6, 2, 3), rw(6, 2, 2)], totalCorridaMin: 48, totalCaminhadaMin: 16 },
  { etapa: "7", ordem: 7, sessoes: [rw(6, 2, 3), rw(9, 3, 2), rw(6, 2, 3)], totalCorridaMin: 54, totalCaminhadaMin: 18 },
  { etapa: "8", ordem: 8, sessoes: [rw(6, 2, 3), rw(6, 2, 3), rw(10, 3, 2)], totalCorridaMin: 56, totalCaminhadaMin: 18 },
  { etapa: "9", ordem: 9, sessoes: [rw(8, 2, 3), cont(12), rw(14, 4, 2)], totalCorridaMin: 64, totalCaminhadaMin: 14 },
  { etapa: "10", ordem: 10, sessoes: [rw(10, 2, 2), rw(16, 5, 2), rw(10, 2, 2)], totalCorridaMin: 72, totalCaminhadaMin: 18 },
  {
    etapa: "10b",
    ordem: 11,
    sessoes: [cont(20), rw(16, 5, 2), cont(20)],
    totalCorridaMin: 72,
    totalCaminhadaMin: 10,
    degrauIntermediarioP: true,
  },
  {
    etapa: "11",
    ordem: 12,
    sessoes: [
      rw(15, 5, 2),
      cont(30),
      { ...rw(20, 5, 1), ajusteP: { original: rw(20, 5, 2), motivo: MOTIVO_ETAPA_11 } },
    ],
    totalCorridaMin: 80,
    totalCaminhadaMin: 15,
  },
  { etapa: "12", ordem: 13, sessoes: [cont(30), cont(20), cont(40)], totalCorridaMin: 90, totalCaminhadaMin: 0 },
];

// Confere se as sessões fecham exatamente os totais impressos na fonte (falha cedo se alguém editar errado).
for (const e of ESCADA_CAMINHADA_CORRIDA) {
  const corrida = e.sessoes.reduce((s, x) => s + x.corridaMin * x.repeticoes, 0);
  const caminhada = e.sessoes.reduce((s, x) => s + x.caminhadaMin * x.repeticoes, 0);
  if (corrida !== e.totalCorridaMin || caminhada !== e.totalCaminhadaMin) {
    throw new Error(
      `Escada, etapa ${e.etapa}: sessões somam ${corrida}/${caminhada} min, totais da fonte ${e.totalCorridaMin}/${e.totalCaminhadaMin}`,
    );
  }
}
