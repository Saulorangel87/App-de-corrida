// CLS-v1 — limiares da classificação. Fonte: docs/pesquisa/01-classificacao.md.
// Mudar qualquer valor exige nova versão (CLS-v2) e novos testes (R-CLS-14).
// [P] = decisão de projeto/do dono, sem fonte direta.

export const CLS_VERSION = "CLS-v1";

export const clsV1 = {
  minAgeYears: 18, // AGENTS.md: idade mínima 18 anos

  experience: {
    // R-CLS-03 [Honert 2020]: < 12 meses iniciante; 12–35 intermediário; ≥ 36 elegível a avançado
    intermediateMonths: 12,
    advancedMonths: 36,
  },

  load: {
    // R-CLS-04 [Honert 2020]: < 20 km/sem iniciante; 20–50 intermediário; > 50 avançado
    intermediateMinKm: 20,
    advancedAboveKm: 50,
    // Zona de sobreposição 15 a < 20 km [Honert 2020], resolvida por [P]
    overlapMinKm: 15,
    // R-CLS-05 [Honert 2020]: avançado exige ≥ 5 sessões/semana ("mais de 4")
    advancedMinSessions: 5,
    // R-CLS-04 [P]: quem informa minutos converte a 7 min/km (conservador)
    minutesPerKm: 7,
  },

  // R-CLS-06: tempos em segundos. Homens [Honert 2020]; mulheres = fator 1,1 [P] (dono, 2026-10-10).
  // Sexo não informado usa os cortes masculinos (mais exigentes).
  performance: {
    advanced: { M: { t5k: 20 * 60, t10k: 42 * 60 }, F: { t5k: 22 * 60, t10k: 46 * 60 } },
    // Corte de "não novato" da zona de sobreposição [Honert 2020]; F com fator 1,1 [P]
    notNovice: { M: { t5k: 30 * 60, t10k: 60 * 60 }, F: { t5k: 33 * 60, t10k: 66 * 60 } },
    validityDays: 183, // R-CLS-06 [P]: tempo dos últimos 6 meses
  },

  pause: {
    // R-CLS-07 [Mujika 2000a; 2000b; Riebe 2015], rebaixamentos [P]
    noChangeMaxDays: 28,
    downgradeOneMaxDays: 84,
  },

  // R-CLS-11 [P]: reavaliar em 12 semanas ou no fim do ciclo, o que vier antes
  reevaluationDays: 84,
} as const;

export const CLS_SOURCES = ["Honert 2020"] as const;
