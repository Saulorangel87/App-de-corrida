// Catálogo de treinos do App de corrida: 11 sessões de docs/pesquisa/07-tipos-sessao.md.
// Regras de ouro: nada aqui é inventado. Cada valor vem de 07-tipos-sessao.md (regras R-SES-*, tabela
// do catálogo e escada GRONORUN) e, em caso de conflito, prevalece docs/pesquisa/decisoes.md.
// Valores marcados "P" na pesquisa não têm evidência direta: foram aceitos pelo dono em 2026-10-10
// como ponto de partida e são recalibráveis (aparecem em `evidencia.provisoriosP`).
// Campos sem respaldo na pesquisa ficam null (objective, targetPaceRelative, estimatedLoad, distanceKm,
// durationMinutes; o app prescreve por tempo e a duração varia por nível, dentro de `structure.niveis`).
import type { workouts } from "../schema";
import { ESCADA_CAMINHADA_CORRIDA } from "@passo/engine";
import { referenceKeySet } from "./references";

export type WorkoutLevel = "iniciante" | "intermediario" | "avancado";

export type WorkoutSeed = Omit<typeof workouts.$inferInsert, "id" | "createdAt" | "updatedAt"> & {
  /** Chaves de `references.ts` ligadas ao treino (tabela workout_references). */
  referenceKeys: string[];
  /** Ligações de progressão/regressão por slug (tabela workout_progressions), como em 07. */
  links: { toSlug: string; type: "progression" | "regression" }[];
};

// ---------------------------------------------------------------------------------------------
// Zonas (R-INT-01) e blocos reutilizados
// ---------------------------------------------------------------------------------------------

const ZONAS = {
  Z1: {
    zona: "Z1",
    descricao: "leve",
    testeDaFala: "frases completas, sem pausa",
    cr10: "1-3",
    borg6a20: "<= 11",
    fcMaxMedida: "<= 75%",
    fcMaxEstimada: "<= 70%",
  },
  Z2: {
    zona: "Z2",
    descricao: "moderado",
    testeDaFala: "frases curtas, com esforço",
    cr10: "4-5",
    borg6a20: "12-14",
    fcMaxMedida: "76-87%",
    fcMaxEstimada: "71-82%",
  },
  Z3: {
    zona: "Z3",
    descricao: "forte",
    testeDaFala: "palavras soltas ou nada",
    cr10: "6-10",
    cr10AlvoDeProjeto: "7-8 [P]",
    borg6a20: ">= 15",
    fcMaxMedida: ">= 88%",
    fcMaxEstimada: ">= 83%",
  },
} as const;

const REGRA_CONSERVADORA =
  "Se os sinais divergirem (fala, esforço, frequência cardíaca), vale a zona mais alta (R-INT-02).";
const CONTROLE_Z3_CURTO =
  "Em esforços curtos de Z3 o controle é o esforço percebido (CR-10 >= 6) mais o tempo prescrito, não a frequência cardíaca nem o teste da fala (R-INT-07).";

const LIMITE_SESSAO_110 =
  "Nenhuma sessão passa de 110% da maior sessão de corrida dos últimos 30 dias; acima disso o motor reduz a sessão ao teto (R-SES-05).";
const REGRA_SESSAO_DE_QUALIDADE =
  "Conta como sessão de qualidade (bloco em Z2 ou Z3): nunca em dias consecutivos, com pelo menos 1 sessão Z1 ou descanso entre elas; se estourar o teto semanal de Z2/Z3, o motor encurta o bloco ou troca por Z1 (R-SES-03).";

type Bloqueio = { codigo: string; descricao: string; fonte: string };

const BLOQUEIO_TRIAGEM: Bloqueio = {
  codigo: "triagem_nao_liberada",
  descricao: "Triagem fora de LIBERADO / LIBERADO_APOS_AVALIACAO: nenhuma sessão é gerada.",
  fonte: "R-TRI-01; R-SES-07",
};

/** Contraindicações-padrão das sessões com bloco em Z2 ou Z3 (catálogo de 07). */
const BLOQUEIOS_INTENSIDADE: Bloqueio[] = [
  {
    codigo: "intensidade_maxima_leve_moderada",
    descricao: "Atleta liberado somente para intensidade leve/moderada (somente Z1): sessão bloqueada.",
    fonte: "R-SES-07; DEC-27",
  },
  {
    codigo: "dor_limite_progressao",
    descricao:
      "Dor >= 3/10 durante ou depois do treino, ou aumento >= 2 pontos sobre a linha de base na manhã seguinte (limite_dor_progressao).",
    fonte: "R-SES-07; DEC-24",
  },
  {
    codigo: "sono_s1_ou_pior",
    descricao: "Nível de sono S1 ou pior.",
    fonte: "catálogo de 07 (contraindicações-padrão) [P]",
  },
  {
    codigo: "retorno_de_pausa",
    descricao: "Retorno de pausa: sem Z3 nas duas primeiras semanas.",
    fonte: "R-SES-08; DEC-18",
  },
  {
    codigo: "doenca_aguda_febre",
    descricao: "Doença aguda ou febre no check-in (R-SON-16).",
    fonte: "catálogo de 07 (contraindicações-padrão) [P]",
  },
];

const ORIENTACAO_DOR =
  "O app não faz diagnóstico: com dor persistente ou sinais de alerta, orienta procurar um profissional de saúde.";


// ---------------------------------------------------------------------------------------------
// Treinos
// ---------------------------------------------------------------------------------------------

const caminhadaCorrida: WorkoutSeed = {
  slug: "caminhada-corrida",
  namePt: "Caminhada e corrida",
  nameEn: "Walk-run",
  type: "base-iniciante",
  objective: null,
  allowedLevels: ["iniciante"],
  targetRpe: 3, // CR-10 1-3
  targetHrZone: "Z1",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Alterna trechos de corrida e de caminhada em ritmo de conversa, sem falta de ar, no formato do programa GRONORUN (532 iniciantes). Cada etapa só avança quando as 3 sessões forem concluídas sem dor a partir de 3/10 e com esforço leve. O app não promete evitar lesões: nos dois programas estudados, cerca de 1 em cada 5 iniciantes teve alguma lesão (20,8% e 20,3%).",
    intensidade: {
      ...ZONAS.Z1,
      nota: 'Mesmo critério do GRONORUN: "conversa sem falta de ar". ' + REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: 5, descricao: "Caminhada rápida." },
    principal: {
      formato: "N x (corrida / caminhada), minutos de corrida e de caminhada por repetição",
      escada: {
        fonte: "Buist 2007, Tabela 2 (programa de 13 semanas), conferida no texto completo.",
        sessoesPorEtapa: 3,
        unidade: "minutos",
        etapas: ESCADA_CAMINHADA_CORRIDA,
        etapasUsadas: "1 a 12 mais o degrau 10b [P] (13 degraus); a semana 13 da fonte (só a sessão 1) não é usada.",
        ajustesP: [
          "Etapa 2, sessão 3: 2/1,5 x 5 em vez de 2/1,5 x 7 (menor volume, DEC-12).",
          "Etapa 11, sessão 3: 20/5 x 1 em vez de 20/5 x 2 (menor volume, DEC-12).",
          "Degrau 10b inserido entre as etapas 10 e 11 para respeitar R-SES-13 (bloco contínuo cresce no máximo 50% por etapa).",
        ],
      },
    },
    desaquecimento: { minutos: 5, descricao: "Caminhada rápida." },
    alongamento: "Alongamento estático não faz parte da sessão (como no GRONORUN).",
    frequenciaSemanal: { sessoes: 3, descanso: "Pelo menos 1 dia de descanso entre as sessões." },
    progressao: {
      regra:
        "Avançar para a etapa seguinte após as 3 sessões da etapa concluídas sem dor >= 3/10 (limite_dor_progressao) e com intensidade registrada em Z1 (CR-10 <= 3 e fala em frases completas).",
      aoConcluirEtapa12: "Passa para `rodagem-leve`.",
    },
    regressao: {
      regra: "Repetir a etapa ou voltar uma etapa.",
      semanaDeRecuperacao: "Repete a etapa anterior com 75% das repetições, sem avançar (DEC-16).",
      retornoDePausa:
        "Pausa de 29 dias ou mais: o iniciante recomeça na etapa anterior à última concluída (R-SES-08).",
    },
    limites: [
      "Isenta do teto semanal de 110% e do teto de sessão de 110% (progressão por tolerância); respeita o teto semanal absoluto de 120% (DEC-14).",
      "O maior bloco contínuo de corrida acima de 8 min não cresce mais de 50% de uma etapa para a seguinte (R-SES-13) [P].",
      "IMC >= 30: começa na etapa 1, mesmo declarando-se corredor sem histórico confirmável (R-SES-06).",
      "Não há evidência de que a escada mais lenta proteja mais do que a de 8 semanas (Buist 2008); o app combina a escada com a regra de dor e com o controle de intensidade.",
    ],
    evidencia: {
      fonteDireta: [
        "Escada de etapas 1 a 12 (exceto os ajustes P): Buist 2007, Tabela 2.",
        "Aquecimento e desaquecimento de 5 min de caminhada rápida; ritmo de conversa; 3 sessões por semana: Buist 2007.",
        "Taxa de lesão de cerca de 20% nos programas de 8 e 13 semanas: Buist 2008.",
      ],
      provisoriosP: [
        "Etapa 2, sessão 3 e etapa 11, sessão 3 (menor volume).",
        "Degrau 10b.",
        "Limite de 50% de crescimento do bloco contínuo.",
        "Avanço por tolerância (dor e RPE) em vez de apenas por calendário.",
      ],
    },
  },
  contraindications: {
    bloqueios: [
      BLOQUEIO_TRIAGEM,
      {
        codigo: "dor_ativa",
        descricao: "Dor ativa: a sessão não é prescrita; o app orienta procurar um profissional.",
        fonte: "catálogo de 07 (contraindicações-padrão)",
      },
    ],
    observacoes: [
      "IMC >= 30 não é bloqueio: o atleta começa na etapa 1 (Nielsen 2014c; Bertelsen 2018).",
      ORIENTACAO_DOR,
    ],
    fontes: ["Nielsen2014c", "Bertelsen2018"],
  },
  referenceKeys: ["Buist2007", "Buist2008", "Ooms2013", "Nielsen2014c", "Bertelsen2018", "Videbaek2015", "Relph2023"],
  links: [{ toSlug: "rodagem-leve", type: "progression" }],
};

const rodagemLeve: WorkoutSeed = {
  slug: "rodagem-leve",
  namePt: "Rodagem leve",
  nameEn: "Easy run",
  type: "aerobico-base",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: 3, // CR-10 1-3
  targetHrZone: "Z1",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Corrida contínua em ritmo de conversa, a base do plano. Nos estudos, mais tempo em baixa intensidade rendeu maior melhora de desempenho do que mais tempo em intensidade moderada (corredores sub-elite). A duração é um ponto de partida e pode ser recalibrada.",
    intensidade: {
      ...ZONAS.Z1,
      ancoraDeEnsaio: "~70% da FCmáx medida (braço de base de Helgerud 2007)",
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: 5, descricao: "Caminhada rápida (iniciante) ou ritmo bem leve." },
    principal: { formato: "Corrida contínua em Z1" },
    desaquecimento: {
      minutos: null,
      descricao: "Obrigatório; a duração para este treino não é definida na pesquisa (5 min de caminhada rápida para iniciante).",
    },
    niveis: {
      iniciante: { duracaoMin: [20, 40], frequenciaSemanal: [2, 3], evidencia: "P" },
      intermediario: { duracaoMin: [30, 60], frequenciaSemanal: [2, 3], evidencia: "P" },
      avancado: { duracaoMin: [40, 75], frequenciaSemanal: [3, 4], evidencia: "P" },
    },
    limites: [LIMITE_SESSAO_110, "Alongamento estático não é prescrito como parte obrigatória (R-SES-02)."],
    progressao: {
      regra: "Aumentar a duração até 110% da maior sessão dos últimos 30 dias, ou passar para `fartlek` quando o atleta cumprir os critérios de entrada na intensidade (R-SES-40).",
    },
    regressao: { regra: "`regenerativo`, depois `mobilidade` ou descanso." },
    evidencia: {
      fonteDireta: [
        "Teste da fala como instrução de intensidade em iniciantes: Buist 2007.",
        "Z1 como base: abaixo do limiar ventilatório (Esteve-Lanao 2007) e ~70% FCmáx (Helgerud 2007).",
        "20-30 min por dia cumprem as diretrizes de saúde pública: Garber 2011.",
      ],
      provisoriosP: ["Durações por nível", "Frequência por nível"],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM],
    observacoes: [ORIENTACAO_DOR],
    fontes: [],
  },
  referenceKeys: ["Helgerud2007", "EsteveLanao2007", "Seiler2010", "Garber2011", "Buist2007", "Frandsen2025"],
  links: [
    { toSlug: "regenerativo", type: "regression" },
    { toSlug: "longao", type: "progression" },
    { toSlug: "fartlek", type: "progression" },
  ],
};

const regenerativo: WorkoutSeed = {
  slug: "regenerativo",
  namePt: "Regenerativo",
  nameEn: "Recovery run",
  type: "recuperacao",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: 2, // CR-10 1-2 (subfaixa de Z1, P)
  targetHrZone: "Z1",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "A opção de menor carga de corrida: o app a usa para trocar um treino mais forte em dias de dor leve, sono ruim ou depois de um dia duro. Não há evidência de que a corrida regenerativa tenha benefício fisiológico próprio.",
    intensidade: {
      ...ZONAS.Z1,
      cr10: "1-2",
      nota: "Parte baixa de Z1 (subfaixa CR-10 1-2 é [P]); fala fluente. " + REGRA_CONSERVADORA,
    },
    aquecimento: { descricao: "Obrigatório antes de qualquer corrida; duração não definida na pesquisa para este treino." },
    principal: { formato: "Corrida contínua curta na parte baixa de Z1 (ou caminhada rápida para iniciante)" },
    desaquecimento: { descricao: "Obrigatório após qualquer corrida; duração não definida na pesquisa para este treino." },
    niveis: {
      iniciante: { formato: "Caminhada rápida", duracaoMin: [20, 30], evidencia: "P" },
      intermediario: { formato: "Corrida contínua", duracaoMin: [15, 30], evidencia: "P" },
      avancado: { formato: "Corrida contínua", duracaoMin: [15, 30], evidencia: "P" },
    },
    frequenciaSemanal: { sessoes: [0, 2], nota: "Usado como substituição de sessão." },
    limites: [LIMITE_SESSAO_110],
    progressao: { regra: "`rodagem-leve`." },
    regressao: { regra: "`mobilidade` ou descanso." },
    evidencia: {
      fonteDireta: [
        "Apoio indireto: recuperação ativa reduziu a dor muscular tardia em meta-análise (Dupuy 2018), que não define corrida regenerativa e aponta a massagem como a técnica mais eficaz.",
      ],
      provisoriosP: ["Durações", "Subfaixa CR-10 1-2"],
      semEvidenciaSuficiente: [
        "Benefício da corrida regenerativa comparada com descanso ou rodagem leve para acelerar a recuperação.",
      ],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM],
    observacoes: ["Bloqueado apenas em sinais de alerta que exigem parar e procurar profissional.", ORIENTACAO_DOR],
    fontes: [],
  },
  referenceKeys: ["Dupuy2018", "Garber2011"],
  links: [
    { toSlug: "mobilidade", type: "regression" },
    { toSlug: "rodagem-leve", type: "progression" },
  ],
};

const longao: WorkoutSeed = {
  slug: "longao",
  namePt: "Longão",
  nameEn: "Long run",
  type: "resistencia",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: 3, // CR-10 1-3
  targetHrZone: "Z1",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "A maior corrida da semana, em ritmo de conversa. Não existe estudo que defina a duração ideal por nível; o que há é evidência de risco: aumentar uma única corrida em mais de 10% sobre a maior dos últimos 30 dias esteve associado a mais lesões. Por isso o app limita o longão a 110% da sua maior corrida recente.",
    intensidade: {
      ...ZONAS.Z1,
      nota: "Se o atleta só conseguir falar frases curtas, a sessão vira Z2 pela regra do mais conservador e o app orienta reduzir o ritmo (R-SES-30).",
    },
    aquecimento: { descricao: "Obrigatório antes de qualquer corrida; duração não definida na pesquisa para este treino." },
    principal: { formato: "Corrida contínua em Z1; maior sessão da semana" },
    desaquecimento: { descricao: "Obrigatório após qualquer corrida; duração não definida na pesquisa para este treino." },
    niveis: {
      iniciante: {
        duracaoMin: [45, 60],
        prerequisito:
          "Só após a etapa 12 da escada, ou após uma corrida contínua de 40 min sem dor >= 3/10 para quem entra direto num plano.",
        evidencia: "P",
      },
      intermediario: {
        duracaoMin: [60, 90],
        duracaoMaxPlanos21e42kmMin: 120,
        evidencia: "P",
      },
      avancado: {
        duracaoMin: [75, 150],
        duracaoMaxPlanos21e42kmMin: 150,
        evidencia: "P",
      },
    },
    frequenciaSemanal: { nota: "1 por semana ou a cada 2 semanas." },
    limites: [
      "Não ultrapassa 110% da maior corrida dos últimos 30 dias (R-SES-31).",
      "Não é aumentado mais de uma vez por semana, nem em semana de dor/sono ruim ou de recuperação.",
      "Recomenda-se no máximo ~40% do tempo semanal de corrida [P].",
      "Nos planos, vale o menor valor entre este teto e o do plano (R-PLN-11).",
    ],
    progressao: { regra: "Aumento de até 110% da maior corrida dos últimos 30 dias." },
    regressao: { regra: "`rodagem-leve` com a mesma duração reduzida (mínimo 70% do longão planejado)." },
    evidencia: {
      fonteDireta: [
        "Picos de uma única sessão acima de 10% da maior corrida de 30 dias: mais lesão (HRR 1,64 a 2,28), enquanto razões semanais de carga não se associaram: Frandsen 2025 (observacional; distância autorrelatada; idade média 45,8 anos).",
      ],
      provisoriosP: ["Tetos de duração por nível", "Limite de ~40% do tempo semanal"],
      semEvidenciaSuficiente: ["Duração ideal do longão por nível."],
    },
  },
  contraindications: {
    bloqueios: [
      BLOQUEIO_TRIAGEM,
      {
        codigo: "dor_persistente_ou_fadiga_acumulada",
        descricao: "Dor persistente ou fadiga acumulada.",
        fonte: "catálogo de 07 (contraindicações-padrão)",
      },
      {
        codigo: "semana_de_recuperacao",
        descricao: "Semana de recuperação: o longão é encurtado.",
        fonte: "catálogo de 07; DEC-16",
      },
    ],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Frandsen2025"],
  },
  referenceKeys: ["Frandsen2025", "Damsted2018", "Seiler2010"],
  links: [{ toSlug: "rodagem-leve", type: "regression" }],
};

const limiarContinuo: WorkoutSeed = {
  slug: "limiar-continuo",
  namePt: "Limiar contínuo",
  nameEn: "Continuous threshold run",
  type: "limiar",
  objective: null,
  allowedLevels: ["intermediario", "avancado"],
  targetRpe: 5, // CR-10 5 (Z2 alta)
  targetHrZone: "Z2",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Blocos na parte alta de Z2, em esforço firme mas controlado, para trabalhar perto do limiar. O ritmo de limiar não é um número único: o app descreve por faixa de esforço e mantém o bloco contínuo abaixo de ~20-30 min. Fica limitado a 1 sessão por semana, porque mais tempo em Z1 rendeu melhores resultados que mais tempo em Z2.",
    intensidade: {
      ...ZONAS.Z2,
      cr10: "5",
      borg6a20: "13-14",
      alvo: "Parte alta de Z2",
      ancoraDeEnsaio: "~85% da FCmáx medida (Helgerud 2007) ou até 82% da estimada",
      limiteSuperior: "Nunca Z3: CR-10 <= 5 e FC < 88% da medida.",
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: [10, 15], descricao: "Em Z1." },
    principal: { formato: "Bloco(s) na parte alta de Z2, com 2 min de trote entre blocos" },
    desaquecimento: { minutos: 10, descricao: "Em Z1." },
    niveis: {
      intermediario: {
        opcoes: [
          { blocos: 1, minutosPorBloco: [15, 20] },
          { blocos: 2, minutosPorBloco: 10, trotePorEntreBlocosMin: 2 },
        ],
        evidencia: "P",
      },
      avancado: {
        opcoes: [
          { blocos: 1, minutosPorBloco: [20, 30] },
          { blocos: 3, minutosPorBloco: 10, trotePorEntreBlocosMin: 2 },
        ],
        evidencia: "P",
      },
    },
    frequenciaSemanal: { sessoes: [0, 1], nota: "Máximo 1 sessão por semana [P]." },
    limites: [
      "Teto de trabalho contínuo de ~20-30 min (a velocidade crítica só é sustentável por ~20-30 min: Jones 2019).",
      "O tempo total em Z2 da semana não passa de 15% do tempo semanal (R-DIS-03); o motor reduz o bloco ou troca por `fartlek` se o teto for ultrapassado.",
      REGRA_SESSAO_DE_QUALIDADE,
      LIMITE_SESSAO_110,
    ],
    progressao: { regra: "Aumentar o tempo de bloco em até 5 min, ou passar de 2 para 1 bloco contínuo [P]." },
    regressao: { regra: "`fartlek` (blocos Z2), depois `rodagem-leve` [P]." },
    evidencia: {
      fonteDireta: [
        "Treino perto do limiar melhora o limiar em sedentários; condicionados tendem a precisar de intensidade maior: Londeree 1997.",
        "Existem 25 conceitos de limiar de lactato, que diferem entre si: Faude 2009.",
        "Modelo polarizado teve melhor desempenho que o de limiar em atletas treinados (3 ensaios): Rosenblat 2019.",
      ],
      provisoriosP: ["Durações e número de blocos por nível", "Máximo de 1 sessão por semana", "Progressão"],
      semEvidenciaSuficiente: ["Limites de bloco sem evidência direta."],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM, ...BLOQUEIOS_INTENSIDADE],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Garber2011"],
  },
  referenceKeys: ["Londeree1997", "Faude2009", "Jones2019", "Helgerud2007", "Rosenblat2019", "EsteveLanao2007", "Garber2011"],
  links: [
    { toSlug: "fartlek", type: "regression" },
    { toSlug: "rodagem-leve", type: "regression" },
  ],
};

const intervaladoCurto: WorkoutSeed = {
  slug: "intervalado-curto",
  namePt: "Intervalado curto",
  nameEn: "Short intervals",
  type: "vo2max",
  objective: null,
  allowedLevels: ["intermediario", "avancado"],
  targetRpe: 8, // CR-10 6-10; alvo de projeto 7-8 [P]
  targetHrZone: "Z3",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Repetições curtas e fortes com recuperação leve, para trabalhar o VO2max. A evidência mostra que intervalos curtos (até 30 s) e baixo volume já são eficazes. Não é prescrito para iniciantes.",
    intensidade: {
      ...ZONAS.Z3,
      ancoraDeEnsaio: "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3",
      controle: CONTROLE_Z3_CURTO,
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: [10, 15], descricao: "Em Z1, mais 2 a 4 acelerações curtas." },
    principal: {
      formato: "Repetições de 15-30 s em Z3 com recuperação ativa",
      repeticaoSegundos: [15, 30],
      recuperacao: {
        zona: "Z1",
        descricao: "Recuperação ativa de igual duração (~70% da FCmáx medida) ou, para quem precisar, 2 vezes a duração do esforço.",
      },
    },
    desaquecimento: { minutos: 10, descricao: "Em Z1." },
    niveis: {
      intermediario: {
        volumeZ3Min: [4, 6],
        exemplo: "8-12 x 30 s",
        sessoesHiitPorSemanaMax: 1,
        evidencia: "P",
      },
      avancado: { volumeZ3MinAte: [8, 10], sessoesHiitPorSemanaMax: 2, evidencia: "P" },
    },
    limites: [
      "O tempo total em Z3 da semana respeita R-DIS-02 (<= 12% do tempo semanal no intermediário, <= 15% no avançado).",
      REGRA_SESSAO_DE_QUALIDADE,
      "Iniciante: não (Z3 = 0%).",
    ],
    progressao: { regra: "`intervalado-longo`." },
    regressao: { regra: "`fartlek`." },
    evidencia: {
      fonteDireta: [
        "Protocolo 15/15 (15 s a 90-95% da FCmáx + 15 s de recuperação ativa a 70%): Helgerud 2007.",
        "Intervalos curtos (<= 30 s), baixo volume (<= 5 min) e curto prazo (<= 4 semanas) já são eficazes: Wen 2019.",
        "Conceitos 10-20-30 e 30-30 melhoraram desempenho de forma semelhante em corredores recreacionais: Faelli 2019.",
      ],
      provisoriosP: ["Volume de Z3 por nível", "Alvo de projeto CR-10 7-8", "Progressão e regressão"],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM, ...BLOQUEIOS_INTENSIDADE],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Garber2011"],
  },
  referenceKeys: ["Helgerud2007", "Faelli2019", "Wen2019", "Milanovic2015", "Bacon2013", "Garber2011"],
  links: [
    { toSlug: "fartlek", type: "regression" },
    { toSlug: "intervalado-longo", type: "progression" },
  ],
};

const intervaladoLongo: WorkoutSeed = {
  slug: "intervalado-longo",
  namePt: "Intervalado longo",
  nameEn: "Long intervals",
  type: "vo2max",
  objective: null,
  allowedLevels: ["intermediario", "avancado"],
  targetRpe: 8, // CR-10 6-10; alvo de projeto 7-8 [P]
  targetHrZone: "Z3",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Repetições de 3 a 4 minutos em esforço forte com recuperação leve, no formato do protocolo 4 x 4 estudado para VO2max. Intervalos mais longos e maior volume deram efeitos maiores nas meta-análises. Não é prescrito para iniciantes.",
    intensidade: {
      ...ZONAS.Z3,
      ancoraDeEnsaio: "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3 (>= 88%)",
      controle: CONTROLE_Z3_CURTO,
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: [10, 15], descricao: "Em Z1." },
    principal: {
      formato: "Repetições de 3-4 min em Z3 com recuperação ativa",
      repeticaoMinutos: [3, 4],
      recuperacao: {
        zona: "Z1",
        minutos: [2, 3],
        descricao: "Recuperação ativa (~70% da FCmáx medida); 3 min no protocolo original.",
      },
    },
    desaquecimento: { minutos: 10, descricao: "Em Z1." },
    niveis: {
      intermediario: {
        de: { repeticoes: 3, minutos: 3 },
        ate: { repeticoes: 4, minutos: 4 },
        sessoesPorSemana: 1,
        tempoSemanalDeCorridaMinimoMin: 75,
        nota: "3 x 3 min (9 min de Z3) exige tempo semanal de corrida >= ~75 min (R-DIS-02).",
        evidencia: "P",
      },
      avancado: {
        protocolo: { repeticoes: 4, minutos: 4 },
        trabalhoTotalMin: 16,
        sessoesPorSemana: [1, 2],
        tempoSemanalDeCorridaMinimoMin: 107,
        nota: "4 x 4 min (16 min de Z3) exige tempo semanal de corrida >= ~107 min (R-DIS-02).",
        evidencia: "P",
      },
    },
    limites: [
      "Dentro do limite de 2 sessões de qualidade por semana e do teto semanal de Z3 (R-DIS-02).",
      "3 sessões de HIIT por semana não trouxeram benefício adicional claro sobre 2 (Lenk 2025).",
      REGRA_SESSAO_DE_QUALIDADE,
      "Iniciante: não (Z3 = 0%).",
    ],
    progressao: { regra: "+1 repetição a cada 2 semanas até o teto do nível [P]." },
    regressao: { regra: "`intervalado-curto` [P]." },
    evidencia: {
      fonteDireta: [
        "Protocolo 4 x 4 min a 90-95% da FCmáx com 3 min de recuperação a 70%: Helgerud 2007.",
        "Intervalos longos (>= 2 min) e volume >= 15 min dão efeitos maiores: Wen 2019; +0,8-0,9 L/min de VO2max em 6-13 semanas: Bacon 2013.",
      ],
      provisoriosP: ["Faixa de repetições por nível", "Progressão e regressão"],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM, ...BLOQUEIOS_INTENSIDADE],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Garber2011"],
  },
  referenceKeys: ["Helgerud2007", "Wen2019", "Bacon2013", "Milanovic2015", "Lenk2025", "Garber2011"],
  links: [{ toSlug: "intervalado-curto", type: "regression" }],
};

const fartlek: WorkoutSeed = {
  slug: "fartlek",
  namePt: "Fartlek estruturado",
  nameEn: "Structured fartlek",
  type: "misto",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: 5, // Z2 (CR-10 4-5); avançado pode chegar a Z3 (ver structure.niveis)
  targetHrZone: "Z1+Z2",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Uma rodagem leve com blocos de esforço moderado, de duração e zona fixas (não livre), como ponte entre a rodagem leve e o intervalado. Não existe estudo específico sobre fartlek em corredores; a estrutura é extrapolada do treino intervalado.",
    intensidade: {
      base: ZONAS.Z1,
      blocos: ZONAS.Z2,
      blocosAvancado: "Até Z3 (CR-10 6-10), controle por esforço percebido e tempo.",
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: 10, descricao: "Em Z1." },
    principal: {
      formato: "Blocos de 1-3 min em Z2 (ou até Z3, só avançado) separados por 2-3 min em Z1",
      recuperacao: { zona: "Z1", minutos: [2, 3] },
    },
    desaquecimento: { minutos: [5, 10], descricao: "Em Z1." },
    niveis: {
      iniciante: {
        formato: "Um único bloco contínuo de 5-8 min em Z2, dentro de uma rodagem leve; nunca Z3.",
        prerequisito:
          "Só após a etapa 12 da escada e >= 8 semanas de corrida regular (R-SES-40; o prazo de 8 semanas é [P]).",
        sessoesDeQualidadePorSemanaMax: 1,
        evidencia: "P",
      },
      intermediario: { blocos: [6, 8], minutosPorBloco: 2, zona: "Z2", evidencia: "P" },
      avancado: {
        minutosPorBloco: [1, 3],
        zona: "Z2 ou Z3",
        numeroDeBlocos: null,
        nota: "A pesquisa não define o número de blocos do avançado.",
        evidencia: "P",
      },
    },
    limites: [
      "O tempo em Z2 e em Z3 do fartlek entra nos tetos semanais de R-DIS-02/03.",
      REGRA_SESSAO_DE_QUALIDADE,
      LIMITE_SESSAO_110,
    ],
    progressao: { regra: "`limiar-continuo`, `intervalado-curto` ou `subidas` [P]." },
    regressao: { regra: "`rodagem-leve` [P]." },
    evidencia: {
      fonteDireta: [
        "Intervalos curtos (<= 30 s) são eficazes para o VO2max: Wen 2019 (extrapolação indireta).",
        "Intervalado aeróbico com repetições curtas a longas: Billat 2001a (extrapolação indireta).",
      ],
      provisoriosP: ["Toda a estrutura (blocos, duração e zonas)", "Prazo de 8 semanas do iniciante"],
      semEvidenciaSuficiente: ["Fartlek em corredores: nenhum ensaio ou revisão específica foi localizado."],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM, ...BLOQUEIOS_INTENSIDADE],
    observacoes: ["Iniciante: bloqueado até cumprir R-SES-40.", ORIENTACAO_DOR],
    fontes: ["Garber2011"],
  },
  referenceKeys: ["Wen2019", "Billat2001a", "Garber2011"],
  links: [
    { toSlug: "rodagem-leve", type: "regression" },
    { toSlug: "limiar-continuo", type: "progression" },
    { toSlug: "intervalado-curto", type: "progression" },
    { toSlug: "subidas", type: "progression" },
  ],
};

const subidas: WorkoutSeed = {
  slug: "subidas",
  namePt: "Subidas",
  nameEn: "Hill repeats",
  type: "forca-especifica",
  objective: null,
  allowedLevels: ["intermediario", "avancado"],
  targetRpe: 8, // CR-10 6-10; alvo de projeto 7-8 [P]
  targetHrZone: "Z3",
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Repetições curtas e fortes em subida moderada. Em corredores bem treinados, 6 semanas de intervalado em subida melhoraram o tempo de 5 km em cerca de 2%. A descida é feita caminhando ou em trote leve, porque correr em descida altera o apoio e a carga.",
    intensidade: {
      ...ZONAS.Z3,
      controle: CONTROLE_Z3_CURTO,
      nota: REGRA_CONSERVADORA,
    },
    aquecimento: { minutos: [10, 15], descricao: "Em Z1." },
    principal: {
      formato: "Repetições de 30-60 s em subida moderada em que a técnica se mantenha",
      repeticaoSegundos: [30, 60],
      recuperacao: "Descer caminhando ou em trote leve até a base.",
    },
    desaquecimento: { minutos: 10, descricao: "Em Z1." },
    niveis: {
      intermediario: { repeticoes: [4, 6], evidencia: "P" },
      avancado: { repeticoes: [6, 10], evidencia: "P" },
    },
    frequenciaSemanal: { sessoes: [0, 1], nota: "Máximo 1 por semana." },
    limites: [
      "Entra no teto semanal de Z3 (R-DIS-02).",
      REGRA_SESSAO_DE_QUALIDADE,
      "Iniciante: não.",
    ],
    progressao: { regra: "+1 repetição a cada 2 semanas até o teto do nível [P]." },
    regressao: { regra: "`fartlek` ou `intervalado-curto` no plano [P]." },
    evidencia: {
      fonteDireta: [
        "Intervalado em subida melhorou o 5 km em 2,0% (±0,6%); a intensidade mais alta foi a melhor para a economia de corrida: Barnes 2013 (n = 20, bem treinados).",
        "Subida exige mais atividade muscular e a descida altera o apoio: Vernillo 2017.",
      ],
      provisoriosP: ["Número de repetições", "Duração das repetições", "Progressão e regressão"],
      semEvidenciaSuficiente: ["Inclinação ideal, duração e número de repetições."],
    },
  },
  contraindications: {
    bloqueios: [
      BLOQUEIO_TRIAGEM,
      ...BLOQUEIOS_INTENSIDADE,
      {
        codigo: "dor_aquiles_canela_joelho",
        descricao: "Dor em tendão de Aquiles, canela ou joelho acima de 0 (tratada como dor ativa).",
        fonte: "R-SES-66 [P]",
      },
    ],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Garber2011", "Vernillo2017"],
  },
  referenceKeys: ["Barnes2013", "Vernillo2017", "Garber2011"],
  links: [
    { toSlug: "fartlek", type: "regression" },
    { toSlug: "intervalado-curto", type: "regression" },
  ],
};

const forcaCorredor: WorkoutSeed = {
  slug: "forca-corredor",
  namePt: "Força para corredores",
  nameEn: "Strength training for runners",
  type: "forca",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: null, // intensidade não se aplica (catálogo de 07)
  targetHrZone: null,
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Treino de força de 2 vezes por semana para melhorar a economia de corrida e a tolerância à carga. Para iniciantes o foco é a tolerância e o app não promete menos lesões: os estudos de prevenção são de esportes em geral e as cargas pesadas exigem técnica e orientação profissional.",
    intensidade: { nota: "Não se aplica zona de corrida (Z1/Z2/Z3)." },
    duracaoMin: [20, 40],
    frequenciaSemanal: {
      sessoes: 2,
      emPeriodoDeProva: 1,
      intervaloMinimoEntreSessoesHoras: 48,
      posicaoNaSemana:
        "Em dia diferente das sessões duras de corrida, ou separada por >= 5 h quando for no mesmo dia.",
    },
    principal: { formato: "2-4 exercícios de membro inferior e tronco" },
    niveis: {
      iniciante: {
        nivelDeForca: "A",
        carga: "Peso do corpo ou carga leve",
        exercicios: "2-3 exercícios de membro inferior e tronco (ex.: agachamento, avanço, elevação de panturrilha, ponte de glúteo, prancha)",
        series: [1, 2],
        repeticoes: [8, 15],
        pliometria: false,
        duracaoMin: [20, 30],
        progressao: "Progride para 3 séries ao longo de >= 8 semanas.",
        evidencia: "P",
      },
      intermediario: {
        nivelDeForca: "B",
        exercicios: "2-4 exercícios de membro inferior",
        series: 3,
        carga: "~70-85% de 1RM, 4-8 repetições, com técnica aprendida",
        pliometria: "De baixo impacto, até ~100 saltos",
        evidencia: "P",
        semTreinoPrevioOuSupervisao:
          "Sem treino de força prévio nem supervisão (R-SES-71): carga moderada de 8-12 repetições sem falha, em vez de 70-85% de 1RM. O app explica que cargas altas exigem orientação profissional.",
      },
      avancado: {
        nivelDeForca: "C",
        carga: "Força pesada, >= 80% de 1RM, 3-5 repetições",
        pliometria: "Até ~200 saltos",
        sprintsCurtos: [5, 10],
        duracaoDoBlocoSemanas: [8, 12],
        manutencao: "Depois, manutenção de 1 sessão por semana.",
        evidencia: "protocolos dos ensaios",
      },
    },
    limites: [
      "O app não prescreve cargas máximas (1RM) para quem não tem treino de força prévio nem supervisão: a progressão pára no nível B com carga moderada (R-SES-71).",
      "Dor ativa em articulação ou tendão: a sessão é bloqueada ou cai para exercícios sem dor.",
    ],
    progressao: { regra: "Nível seguinte após >= 4 semanas sem dor e com execução correta." },
    regressao: { regra: "Nível anterior ou `mobilidade`." },
    evidencia: {
      fonteDireta: [
        "Força melhora a economia de corrida em corredores (SMD -1,42): Balsalobre-Fernández 2016; revisão sistemática com 24 estudos: Blagrove 2018.",
        "Carga alta e métodos combinados melhoraram a economia; cargas submáximas (40-79% de 1RM) e isometria não foram eficazes: Llanos-Lagos 2024.",
        "Dose prática (1-2 séries até 3-6, >= 48 h entre sessões, 2 sessões por semana): Blagrove 2018.",
        "Força reduz lesões esportivas em geral (RR 0,338): Lauersen 2018 (extrapolação indireta para corrida).",
      ],
      provisoriosP: ["Todos os números do nível A (iniciante)", "Pliometria <= ~100 saltos do nível B"],
      semEvidenciaSuficiente: ["Dose ideal para iniciantes ou sem supervisão."],
    },
  },
  contraindications: {
    bloqueios: [
      BLOQUEIO_TRIAGEM,
      {
        codigo: "dor_articular_ou_tendinea_ativa",
        descricao: "Dor articular ou tendínea ativa.",
        fonte: "catálogo de 07 (contraindicações-padrão); R-SES-72",
      },
      {
        codigo: "sem_tecnica_para_carga_pesada",
        descricao: "Técnica de execução ainda não aprendida: sem carga pesada.",
        fonte: "catálogo de 07 (contraindicações-padrão)",
      },
    ],
    observacoes: [ORIENTACAO_DOR],
    fontes: ["Blagrove2018"],
  },
  referenceKeys: ["Balsalobre2016", "Blagrove2018", "Berryman2018", "Denadai2017", "LlanosLagos2024", "Lauersen2018"],
  links: [{ toSlug: "mobilidade", type: "regression" }],
};

const mobilidade: WorkoutSeed = {
  slug: "mobilidade",
  namePt: "Mobilidade",
  nameEn: "Mobility",
  type: "mobilidade",
  objective: null,
  allowedLevels: ["iniciante", "intermediario", "avancado"],
  targetRpe: null,
  targetHrZone: null,
  targetPaceRelative: null,
  durationMinutes: null,
  distanceKm: null,
  estimatedLoad: null,
  status: "published",
  version: "1.0.0",
  structure: {
    razao:
      "Sessão leve de mobilidade, alternativa ao descanso nos dias em que o app reduz a carga (sono ruim, dor leve). Não há evidência de que reduza lesões ou melhore o desempenho em corredores, e o app não a vende assim: ela entra pela recomendação geral do ACSM.",
    intensidade: { nota: "Abaixo de Z1; não conta na distribuição de zonas [P]." },
    duracaoMin: [10, 20],
    principal: {
      formato: "Exercícios dos principais grupos, cerca de 60 s no total por exercício, sem alongar até a dor",
      grupos: ["quadril", "posterior de coxa", "panturrilha", "tornozelo", "quadríceps", "torácica"],
      segundosPorExercicio: 60,
    },
    frequenciaSemanal: {
      sessoes: [1, 2],
      nota: "ACSM recomenda flexibilidade em >= 2 dias por semana (Garber 2011); o catálogo prevê 1-2 sessões por semana.",
    },
    limites: [
      "Se a região a ser alongada é a mesma da dor relatada, o exercício é removido da sessão e o app orienta procurar um profissional (R-SES-81) [P].",
    ],
    progressao: { regra: "Nenhuma." },
    regressao: { regra: "Descanso." },
    evidencia: {
      fonteDireta: [
        "Recomendação geral do ACSM de flexibilidade >= 2 dias por semana (60 s por exercício): Garber 2011.",
        "Alongamento isolado não reduziu lesões esportivas: Lauersen 2014; não alterou a economia de corrida: Warneke 2025.",
      ],
      provisoriosP: ["Duração de 10-20 min", "Posição abaixo de Z1"],
      semEvidenciaSuficiente: ["Benefício da mobilidade para desempenho ou prevenção de lesão em corredores."],
    },
  },
  contraindications: {
    bloqueios: [BLOQUEIO_TRIAGEM],
    observacoes: ["Bloqueada apenas em sinais de alerta que exigem parar e procurar profissional.", ORIENTACAO_DOR],
    fontes: [],
  },
  referenceKeys: ["Garber2011", "Lauersen2014", "Warneke2025"],
  links: [],
};

export const workoutSeeds: WorkoutSeed[] = [
  caminhadaCorrida,
  rodagemLeve,
  regenerativo,
  longao,
  limiarContinuo,
  intervaladoCurto,
  intervaladoLongo,
  fartlek,
  subidas,
  forcaCorredor,
  mobilidade,
];

// Validações de consistência (falham cedo, antes de tocar no banco).
const slugs = new Set(workoutSeeds.map((w) => w.slug));
if (slugs.size !== workoutSeeds.length) throw new Error("Slugs de treino duplicados.");
for (const w of workoutSeeds) {
  if (w.referenceKeys.length === 0) throw new Error(`Treino ${w.slug} sem referência (R-SES-01).`);
  for (const k of w.referenceKeys) {
    if (!referenceKeySet.has(k)) throw new Error(`Treino ${w.slug}: referência desconhecida ${k}.`);
  }
  for (const l of w.links) {
    if (!slugs.has(l.toSlug)) throw new Error(`Treino ${w.slug}: ligação para slug desconhecido ${l.toSlug}.`);
  }
}
