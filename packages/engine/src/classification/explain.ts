import type { ClassificationResult, LimitingCriterion, LevelName } from "./classify";
import { CLS_SOURCES, clsV1 } from "./config";

export type Lang = "pt-BR" | "en";

const LEVEL_LABEL: Record<Lang, Record<LevelName, string>> = {
  "pt-BR": { iniciante: "iniciante", intermediario: "intermediário", avancado: "avançado" },
  en: { iniciante: "beginner", intermediario: "intermediate", avancado: "advanced" },
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function cutText(lang: Lang) {
  const m = clsV1.performance.advanced.M;
  const f = clsV1.performance.advanced.F;
  return lang === "en"
    ? `5 km in up to ${mmss(m.t5k)} or 10 km in up to ${mmss(m.t10k)}; for women, ${mmss(f.t5k)} and ${mmss(f.t10k)}`
    : `5 km em até ${mmss(m.t5k)} ou 10 km em até ${mmss(m.t10k)}; para mulheres, ${mmss(f.t5k)} e ${mmss(f.t10k)}`;
}

function reason(c: LimitingCriterion, lang: Lang): string {
  const en = lang === "en";
  switch (c.kind) {
    case "experiencia":
      return en
        ? `you have been running regularly for ${c.monthsRegular} months (the next level starts at ${c.needed})`
        : `você corre regularmente há ${c.monthsRegular} meses (o próximo nível começa em ${c.needed})`;
    case "volume":
      return en
        ? `your average volume over the last 4 weeks is ${c.weeklyKm} km per week`
        : `seu volume médio nas últimas 4 semanas é de ${c.weeklyKm} km por semana`;
    case "volume_sobreposicao":
      return en
        ? `your average volume is ${c.weeklyKm} km per week, and to count as intermediate in this range you need 12+ months of running and a recent 5 or 10 km time`
        : `seu volume médio é de ${c.weeklyKm} km por semana e, nessa faixa, contar como intermediário exige 12 meses ou mais de corrida e um tempo recente de 5 ou 10 km`;
    case "frequencia":
      return en
        ? `you run ${c.weeklySessions} times a week on average (advanced requires ${c.needed} or more)`
        : `você corre em média ${c.weeklySessions} vezes por semana (avançado exige ${c.needed} ou mais)`;
    case "desempenho_sem_tempo":
      return en
        ? `you have not yet reported a 5 or 10 km time from the last 6 months (for advanced: ${cutText(lang)})`
        : `você ainda não informou um tempo de 5 ou 10 km dos últimos 6 meses (para avançado: ${cutText(lang)})`;
    case "desempenho_tempo_acima":
      return en
        ? `your recent 5 or 10 km time is above the advanced cut-off (${cutText(lang)})`
        : `seu tempo recente de 5 ou 10 km está acima do corte de avançado (${cutText(lang)})`;
    case "pausa":
      return en ? `you have not run for ${c.days} days` : `você está há ${c.days} dias sem correr`;
    case "inicio_do_zero":
      return en
        ? "you are starting from scratch, without regular exercise in the last 3 months"
        : "você está começando do zero, sem exercício regular nos últimos 3 meses";
  }
}

const formatDate = (iso: string, lang: Lang) => {
  const [y, m, d] = iso.split("-");
  return lang === "en" ? `${y}-${m}-${d}` : `${d}/${m}/${y}`;
};

/** Texto simples do critério limitante, com aviso de estimativa conservadora (R-CLS-15). */
export function explainClassification(result: ClassificationResult, lang: Lang = "pt-BR") {
  if (!result.eligible) {
    return {
      text: lang === "en" ? "App de corrida is only available for people aged 18 or over." : "O App de corrida é só para maiores de 18 anos.",
      sources: [] as string[],
    };
  }
  const level = LEVEL_LABEL[lang][result.levelName];
  const reasons = result.limiting.map((c) => reason(c, lang));
  const because =
    reasons.length > 0
      ? (lang === "en" ? " because " : " porque ") + reasons.join(lang === "en" ? "; and " : "; e ")
      : "";
  const date = formatDate(result.nextReevaluation, lang);
  const tail =
    lang === "en"
      ? ` This is a conservative estimate and will be reviewed on ${date}, or earlier if you stop running for more than 28 days or get injured.`
      : ` Esta classificação é uma estimativa conservadora e será revista em ${date}, ou antes, se você ficar mais de 28 dias sem correr ou tiver uma lesão.`;
  const head = lang === "en" ? `Your level is **${level}**` : `Seu nível foi calculado como **${level}**`;
  return { text: `${head}${because}.${tail}`, sources: [...CLS_SOURCES] };
}
