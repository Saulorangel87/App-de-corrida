// Texto do "Como fazer" da caminhada e corrida, montado com os números de cada sessão
// (docs/textos-para-o-atleta.md, seção 6, aprovada em 2026-10-11). Os números vêm do motor
// (escada, R-SES-10); aqui só viram frases do dia a dia, em português e em inglês.
import type { AthleteStep } from "./athlete-text";

export type LadderSession = { etapa: string; corridaMin: number; caminhadaMin: number; repeticoes: number; continua?: boolean };
export type LadderHow = { warmup: AthleteStep; main: AthleteStep; cooldown: AthleteStep };

const minutesPt = (m: number) => {
  if (Number.isInteger(m)) return m === 1 ? "1 minuto" : `${m} minutos`;
  const whole = Math.floor(m);
  return whole === 0 ? "30 segundos" : `${whole} ${whole === 1 ? "minuto" : "minutos"} e meio`;
};
const minutesEn = (m: number) => (m === 1 ? "1 minute" : `${m} minutes`);

const TEXT = {
  "pt-BR": {
    warmup: "Caminhe 5 minutos em passo rápido, para o corpo esquentar.",
    cooldown: "Caminhe 5 minutos devagar, para o corpo desacelerar.",
    continuous: (c: number) => `Corra ${minutesPt(c)} seguidos, bem devagar, sem parar.`,
    once: (c: number, w: number) => `Corra ${minutesPt(c)} e depois caminhe ${minutesPt(w)}.`,
    repeated: (c: number, w: number, n: number) =>
      `Corra ${minutesPt(c)} e depois caminhe ${minutesPt(w)}. Faça isso ${n} vezes ao todo.`,
    whereLabel: "Onde você está",
    where: (n: number, etapa: string) => `Sessão ${n} de 3 da etapa ${etapa}.`,
    paceLabel: "Ritmo",
    pace: "Corra num ritmo em que você consiga conversar, falando frases completas. Se ficar sem ar, diminua o ritmo.",
  },
  en: {
    warmup: "Walk briskly for 5 minutes to warm up.",
    cooldown: "Walk slowly for 5 minutes to wind down.",
    continuous: (c: number) => `Run ${minutesEn(c)} straight, very slowly, without stopping.`,
    once: (c: number, w: number) => `Run for ${minutesEn(c)} and then walk for ${minutesEn(w)}.`,
    repeated: (c: number, w: number, n: number) =>
      `Run for ${minutesEn(c)} and then walk for ${minutesEn(w)}. Do this ${n} times in total.`,
    whereLabel: "Where you are",
    where: (n: number, etapa: string) => `Session ${n} of 3 of step ${etapa}.`,
    paceLabel: "Pace",
    pace: "Run at a pace where you can talk in full sentences. If you run out of breath, slow down.",
  },
} as const;

/** `ordinal` é a posição da sessão na etapa (1 a 3). */
export function ladderHow(lang: "pt-BR" | "en", s: LadderSession, ordinal: number): LadderHow {
  const t = TEXT[lang];
  const main =
    s.continua || s.caminhadaMin === 0
      ? t.continuous(s.corridaMin)
      : s.repeticoes > 1
        ? t.repeated(s.corridaMin, s.caminhadaMin, s.repeticoes)
        : t.once(s.corridaMin, s.caminhadaMin);
  return {
    warmup: { minutes: null, text: t.warmup, facts: [] },
    main: {
      minutes: null,
      text: main,
      facts: [
        { label: t.whereLabel, value: t.where(ordinal, s.etapa) },
        { label: t.paceLabel, value: t.pace },
      ],
    },
    cooldown: { minutes: null, text: t.cooldown, facts: [] },
  };
}
