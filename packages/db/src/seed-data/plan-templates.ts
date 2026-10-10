// Modelos de plano: só objetivo, nível e duração (R-PLN-13, docs/pesquisa/10-planos-objetivo.md).
// As semanas (plan_template_weeks) entram na Fase 4, com o motor de progressão.
// 21 e 42 km não existem para iniciante (R-PLN-04). Durações lidas do motor (fonte única).
import { PLN_VERSION, plnV1 } from "@passo/engine";

type Seed = { slug: string; objective: string; level: string; durationWeeks: number; description: string };

const levels = ["iniciante", "intermediario", "avancado"] as const;
const weeks: Record<string, Record<(typeof levels)[number], number | null>> = plnV1.weeks;

const label: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  "21k": "meia-maratona (21 km)",
  "42k": "maratona (42 km)",
  saude: "saúde e condicionamento (ciclo)",
};

export const planTemplateSeeds: (Seed & { ruleVersion: string })[] = Object.entries(weeks).flatMap(([objective, byLevel]) =>
  levels.flatMap((level) => {
    const durationWeeks = byLevel[level];
    if (durationWeeks === null) return [];
    const description =
      objective === "5k" && level === "iniciante"
        ? "Plano de 5 km do zero: escada caminhada-corrida em 13 etapas, uma por semana (R-PLN-12, DEC-48)."
        : `Plano de ${label[objective]} para nível ${level}, ${durationWeeks} semanas (R-PLN-13).`;
    return [{ slug: `${objective}-${level}`, objective, level, durationWeeks, description, ruleVersion: PLN_VERSION }];
  }),
);
