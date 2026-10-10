import { z } from "zod";
import { PARQ_FOLLOW_UP, PARQ_GENERAL } from "./parq/structure";

// Entrevista em 8 etapas (seção 6 da especificação). Cada etapa é validada ao
// salvar; o envio final exige todas. Nada de texto livre além do necessário (LGPD).

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "data inválida");

const raceTime = (minSeconds: number, maxSeconds: number) =>
  z.object({ seconds: z.number().int().min(minSeconds).max(maxSeconds), date: isoDate });

export const basicsStep = z.object({
  birthMonth: z.number().int().min(1).max(12),
  birthYear: z.number().int().min(1900).max(2100),
  sex: z.enum(["M", "F", "nao_informado"]),
  heightCm: z.number().int().min(120).max(230),
  weightKg: z.number().min(30).max(300).optional(),
});

const followUpSection = z.object({ has: z.boolean(), answers: z.record(z.string(), z.boolean()) });

export const screeningStep = z
  .object({
    general: z.object(Object.fromEntries(PARQ_GENERAL.map((q) => [String(q), z.boolean()])) as Record<string, z.ZodBoolean>),
    followUp: z.record(z.string(), followUpSection).optional(),
    pregnant: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const anyYes = Object.values(v.general).some(Boolean);
    if (anyYes && !v.followUp) {
      ctx.addIssue({ code: "custom", path: ["followUp"], message: "seguimento obrigatório quando há SIM" });
      return;
    }
    for (const [section, data] of Object.entries(v.followUp ?? {})) {
      const ids = (PARQ_FOLLOW_UP as Record<string, readonly string[]>)[section];
      if (!ids) {
        ctx.addIssue({ code: "custom", path: ["followUp", section], message: "seção inexistente" });
        continue;
      }
      if (!data.has) continue;
      for (const id of ids) {
        if (typeof data.answers[id] !== "boolean") {
          ctx.addIssue({ code: "custom", path: ["followUp", section, "answers", id], message: "resposta obrigatória" });
        }
      }
      for (const id of Object.keys(data.answers)) {
        if (!ids.includes(id)) ctx.addIssue({ code: "custom", path: ["followUp", section, "answers", id], message: "pergunta inexistente" });
      }
    }
    if (anyYes) {
      for (const section of Object.keys(PARQ_FOLLOW_UP)) {
        if (!v.followUp?.[section]) ctx.addIssue({ code: "custom", path: ["followUp", section], message: "seção obrigatória" });
      }
    }
  });

export const historyStep = z.object({
  /** Meses seguidos correndo pelo menos 1x/semana, sem pausas longas (R-CLS-02). */
  monthsRegular: z.number().int().min(0).max(720),
  weeklySessions: z.number().min(0).max(14),
  weeklyVolume: z.discriminatedUnion("unit", [
    z.object({ unit: z.literal("km"), value: z.number().min(0).max(300) }),
    z.object({ unit: z.literal("min"), value: z.number().min(0).max(2000) }),
  ]),
  longestRecentKm: z.number().min(0).max(100),
  canRunContinuousMinutes: z.number().int().min(0).max(600),
  t5k: raceTime(10 * 60, 90 * 60).optional(),
  t10k: raceTime(20 * 60, 180 * 60).optional(),
  daysSinceLastRun: z.number().int().min(0).max(36500),
  halfMarathonLast3m: z.boolean(),
  /** Exercício regular (ACSM) nos últimos 3 meses: usado na classificação e na triagem (R-CLS-08, R-TRI-07). */
  regularExercise3m: z.boolean(),
});

export const injuriesStep = z.object({
  injury12m: z.boolean(),
  runningInjuryLast3m: z.boolean(),
  injuryOrPersistentPainLast6w: z.boolean(),
  currentPain: z.object({
    intensity: z.number().int().min(0).max(10),
    bodyPart: z.string().trim().max(50).optional(),
  }),
});

export const goalStep = z
  .object({
    goal: z.enum(["saude", "emagrecimento", "primeira_prova", "melhorar_tempo"]),
    raceDistance: z.enum(["5k", "10k", "21k", "42k"]).optional(),
    raceDate: isoDate.optional(),
  })
  .superRefine((v, ctx) => {
    const race = v.goal === "primeira_prova" || v.goal === "melhorar_tempo";
    if (race && !v.raceDistance) ctx.addIssue({ code: "custom", path: ["raceDistance"], message: "obrigatória para prova" });
    if (!race && (v.raceDistance || v.raceDate)) ctx.addIssue({ code: "custom", path: ["raceDistance"], message: "só para prova" });
  });

export const availabilityStep = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  minutesPerSession: z.number().int().min(10).max(300),
  longRunDay: z.number().int().min(1).max(7), // 1 = segunda … 7 = domingo
});

export const recoveryStep = z.object({
  sleepHours: z.number().min(3).max(12),
  stress: z.number().int().min(1).max(5),
  workType: z.enum(["sedentario", "misto", "fisico"]),
  otherSportsMinutesPerWeek: z.number().int().min(0).max(1500),
  strengthTraining: z.boolean(),
});

export const resourcesStep = z.object({
  hrDevice: z.enum(["nenhum", "relogio", "cinta"]),
  track: z.boolean(),
  treadmill: z.boolean(),
  terrain: z.array(z.enum(["plano", "subidas", "trilha"])).max(3),
});

export const interviewSteps = {
  basicos: basicsStep,
  triagem: screeningStep,
  historico: historyStep,
  lesoes: injuriesStep,
  objetivo: goalStep,
  disponibilidade: availabilityStep,
  recuperacao: recoveryStep,
  recursos: resourcesStep,
} as const;

export type InterviewStep = keyof typeof interviewSteps;
export const INTERVIEW_STEPS = Object.keys(interviewSteps) as InterviewStep[];
export const INTERVIEW_VERSION = "ENT-v1";

export const interviewSchema = z.object(interviewSteps);
export type Interview = z.infer<typeof interviewSchema>;
export type InterviewDraft = Partial<Interview>;

/** Autodeclaração de avaliação profissional (R-TRI-05). */
export const evaluationSchema = z.object({
  result: z.enum(["sem_restricoes", "com_restricoes", "encaminhado_ao_medico", "nao_liberado"]),
  date: isoDate,
  source: z.enum(["eparmedx", "medico", "profissional_educacao_fisica"]),
  vigorousAllowed: z.boolean().default(false),
});
