// PLN-v1 — escolha do modelo de plano. Fonte: docs/pesquisa/10-planos-objetivo.md.
// Todos os valores são [P] (decisão de projeto conservadora), salvo a fonte indicada.

import type { LevelName } from "../classification/classify";

export const PLN_VERSION = "PLN-v1";

export type Objective = "5k" | "10k" | "21k" | "42k" | "saude";
export const RACE_ORDER = ["5k", "10k", "21k", "42k"] as const;

export const plnV1 = {
  // R-PLN-13: duração do modelo em semanas, por objetivo e nível (null = não oferecido, R-PLN-04).
  weeks: {
    "5k": { iniciante: 13, intermediario: 8, avancado: 10 },
    "10k": { iniciante: 12, intermediario: 10, avancado: 12 },
    "21k": { iniciante: null, intermediario: 12, avancado: 12 },
    "42k": { iniciante: null, intermediario: 16, avancado: 16 },
    saude: { iniciante: 12, intermediario: 12, avancado: 12 },
  } satisfies Record<Objective, Record<LevelName, number | null>>,

  // R-PLN-03: pré-requisitos de entrada.
  prerequisites: {
    "10k": { continuousMinutes: 30, orContinuousKm: 5, minSessionsPerWeek: 2 },
    // 21 km: ≥ 12 semanas regulares (≥ 2x/sem), ≥ 15 km/sem, maior distância ≥ 10 km,
    // sem lesão ou dor persistente nas últimas 6 semanas [Fokkema 2020; van Poppel 2021]
    "21k": { minRegularWeeks: 12, minSessionsPerWeek: 2, minWeeklyKm: 15, minLongestKm: 10 },
    // 42 km: ≥ 12 meses, meia nos últimos 3 meses, ≥ 30 km/sem [Rasmussen 2013], maior ≥ 16 km,
    // sem lesão por corrida nos últimos 3 meses [Rasmussen 2013; van Poppel 2021; Toresdahl 2022]
    "42k": { minRegularMonths: 12, minWeeklyKm: 30, minLongestKm: 16 },
  },

  // R-PLN-02 / R-DOR-04: dor atual ≥ 3/10 (limite_dor_progressao) bloqueia a liberação do plano.
  painBlocksAt: 3,

  // R-PLN-17: IMC < 18,5 bloqueia a etiqueta controle_de_peso.
  minBmiForWeightTag: 18.5,
} as const;

export const PLN_SOURCES: Record<Objective, string[]> = {
  "5k": ["Buist 2007", "Kluitenberg 2015b"],
  "10k": [],
  "21k": ["Fokkema 2020", "van Poppel 2021"],
  "42k": ["Rasmussen 2013", "Toresdahl 2022", "van Poppel 2021"],
  saude: ["Bull 2020", "Garber 2011"],
};
