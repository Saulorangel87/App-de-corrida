// DIA-v1 — decisão do dia. Fontes: docs/pesquisa/05 (progressão), 08 (sono), 09 (dor).
// Cada valor traz a regra e a fonte. [E] = vem de evidência; [P] = convenção de projeto
// aceita pelo dono, para recalibrar com dados reais. Mudar um valor exige nova versão.

export const DIA_VERSION = "DIA-v1";

export const diaV1 = {
  // ---- Sono (R-SON-01 a R-SON-16) ----
  sleep: {
    adequateMinHours: 7.0, // [E] R-SON-01, Watson 2015a
    badMaxHours: 6.0, // [E] R-SON-01, Watson 2015b (≤ 6 h inapropriado)
    veryBadBelowHours: 5.0, // [P] R-SON-01, Belenky 2003; Roberts 2019
    badQualityMax: 2, // [P] R-SON-02
    plausibleMinHours: 2, // [P] R-SON-13
    plausibleMaxHours: 14, // [P] R-SON-13
    s1BadIn3: 2, // [P] R-SON-06: 2 noites ruins nas últimas 3
    s2ConsecutiveBad: 3, // [P] R-SON-06, Van Dongen 2003; Belenky 2003
    s2BadIn7: 4, // [P] R-SON-06
    s3BadIn7: 5, // [P] R-SON-06
    s3VeryBadIn7: 3, // [P] R-SON-06
    s3MaxConsecutiveDays: 2, // [P] R-SON-10
    persistentDays: 14, // [P] R-SON-12
    persistentWindow: 21, // [P] R-SON-12
  },
  // ---- Bem-estar (R-SON-03 a R-SON-07) ----
  wellbeing: {
    greenMin: 15, // [P] R-SON-04
    yellowMin: 12, // [P] R-SON-04
    criticalItem: 1, // [P] R-SON-04
    criticalItemsForRed: 2, // [P] R-SON-04
    baselineDays: 14, // [P] R-SON-05, Buchheit 2014 (princípio)
    baselineMinRecords: 7, // [P] R-SON-05
    deviationYellow: -3, // [P] R-SON-05
    deviationRed: -5, // [P] R-SON-05
    persistenceWindow: 5, // [P] R-SON-07
    persistenceMinDays: 3, // [P] R-SON-07
  },
  // ---- Saída do estado de alerta (R-SON-10) ----
  recovery: { daysWithoutSignalForL0: 2 }, // [P] Belenky 2003
  // ---- Sem check-in hoje (R-SON-13): usa a última decisão até este limite de dias [P] ----
  carryLastLevelDays: 3,
  // ---- Redução reativa (R-PRG-12) ----
  reactiveReductionPct: 20, // [P] único parâmetro: sono L1, dor 3–4, dia seguinte, DOMS

  // ---- Dor (R-DOR-04 a R-DOR-14) ----
  pain: {
    continueMax: 2, // [E] R-DOR-04, Silbernagel 2007 via Smith 2017; Sprague 2021
    reduceMax: 4, // [P] R-DOR-04 (degrau mais conservador que o modelo supervisionado)
    stopFrom: 5, // [E] R-DOR-04 / R-DOR-06, Silbernagel 2020 (5–6 = carga alta)
    progressionLimit: 3, // [P] R-DOR-04: limite_dor_progressao
    morningRiseLimit: 2, // [P] R-DOR-06, Farrar 2003 (critério operacional)
    stopRepeatsIn14d: 2, // [P] R-DOR-04: 2 ocorrências em 14 dias → encaminhar
    suddenAtLeast: 3, // [P] R-DOR-05, Mueller-Wohlfahrt 2013
    blockHours: 48, // [P] R-DOR-05 e R-DOR-07
    recurrentA: { count: 3, minIntensity: 3, days: 14 }, // [P] R-DOR-05, Yamato 2015
    recurrentB: { count: 2, minIntensity: 5, days: 14 }, // [P] R-DOR-05
    persistentTrainings: 3, // [P] R-DOR-09, Yamato 2015
    persistentDays: 7, // [P] R-DOR-09
    worseningReports: 3, // [P] R-DOR-09
    domsMaxIntensity: 4, // [E/P] R-DOR-08, Hody 2019
    domsMinHoursAfter: 12, // [E/P] R-DOR-08
    domsReferAfterDays: 7, // [P] R-DOR-08
    returnWalkingMax: 2, // [E] R-DOR-10, Silbernagel 2020 (≤ 1–2/10; usa o limite superior: confirmar com o dono)
    heatRepeatsToRefer: 2, // [P] R-DOR-02, Casa 2015
  },

  // ---- Progressão (R-PRG-02 a R-PRG-12, R-CRG-07) ----
  progression: {
    sessionCapPct: 110, // [P] R-PRG-02, Frandsen 2025 (distância → duração é extrapolação)
    sessionCapWindowDays: 30, // [P] R-PRG-02
    weeklyCapPct: 110, // [P] R-PRG-03 (convenção; nunca "regra científica")
    weeklyCapInjuryPct: 105, // [P] R-PRG-03 / R-CLS-09 (cautela_lesao)
    absoluteCapPct: 120, // [P] R-PRG-04
    absoluteCapInjuryPct: 110, // [P] R-PRG-04 / R-CLS-09
    recoveryWeekPct: 75, // [P] R-PRG-07, Meeusen 2013; Mujika 2000b
    freezeSessionsMissed: 1, // [P] R-PRG-06(c): mais de 1 sessão não concluída
    rpeOverTarget: 2, // [P] R-CRG-07: ≥ 2 pontos acima, em sessões com alvo ≤ 4
    rpeOverTargetMaxTarget: 4, // [P] R-CRG-07
    rpeOverSessions: { of: 3, atLeast: 2 }, // [P] R-CRG-07, Haddad 2017
  },

  // ---- Retorno após pausa (R-PRG-08, tabela única) ----
  returnFromPause: {
    keepPlanMaxDays: 7,
    freezeMaxDays: 14, // 8–14 dias: congela
    reducedMaxDays: 28, // 15–28 dias: 70% do volume e da maior sessão
    reducedPct: 70, // [P] R-PRG-08
    resetToLevel1AfterDays: 84, // R-CLS-07 (12 semanas): volta a iniciante
    longPauseVolumePct: 50, // [P] R-PRG-08 (≥ 29 dias)
    noZ3Weeks: 2, // [P] R-PRG-08 / R-SES-08
    // "Fase inicial do nível" (R-PRG-08/09): interpretação do projeto [P], A CONFIRMAR COM O
    // DONO: sessões/semana mínimas × duração mínima da rodagem leve do nível (R-SES-20).
    initialPhaseWeeklyMinutes: { iniciante: 40, intermediario: 60, avancado: 120 },
    initialPhaseSessionMinutes: { iniciante: 20, intermediario: 30, avancado: 40 },
  },
} as const;

/** Slugs do catálogo (docs/pesquisa/07-tipos-sessao.md) e o papel de cada um. */
export const CATALOG = {
  quality: ["limiar-continuo", "intervalado-curto", "intervalado-longo", "fartlek", "subidas"],
  longRun: "longao",
  easyRun: "rodagem-leve",
  recovery: "regenerativo",
  walkRun: "caminhada-corrida",
  strength: "forca-corredor",
  mobility: "mobilidade",
} as const;
