import { z } from "zod";
import { isoDate } from "./interview";

// Acompanhamento diário (Fase 5): check-in, registro pós-treino com dor, pausa e histórico.
// As notas de 1 a 5 seguem a convenção do motor: 5 = melhor (estresse 5 = tranquilo,
// dor muscular 5 = sem dor).

const rating = z.number().int().min(1).max(5);
const pain010 = z.number().int().min(0).max(10);

/** Avaliação do bloco de 2 semanas ("como foi?", R-PLN-22). */
export const planReviewSchema = z.object({
  felt: z.enum(["facil", "no_ponto", "puxado", "nao_consegui"]),
});
export type PlanReviewInput = z.infer<typeof planReviewSchema>;

/** Check-in do dia (menos de 30 segundos). Tudo é opcional: o atleta pode pular o que não sabe. */
export const checkinSchema = z
  .object({
    sleepHours: z.number().min(0).max(24).optional(),
    sleepQuality: rating.optional(),
    energy: rating.optional(),
    mood: rating.optional(),
    stress: rating.optional(),
    muscleSoreness: rating.optional(),
    restingHr: z.number().int().min(25).max(220).optional(),
    /** Doença aguda hoje (febre, resfriado): o dia vira descanso (R-SON-16). */
    acuteIllness: z.boolean().optional(),
    /** Dor ao caminhar no dia a dia, 0–10: só perguntada com bloqueio por dor ativo (R-DOR-10). */
    dailyPainWalking: pain010.optional(),
  })
  .strict();
export type CheckinInput = z.infer<typeof checkinSchema>;

const flag = z.boolean().optional();

/** Relato de dor ou de sintomas (R-DOR-15). Os campos extras só valem com dor marcada. */
export const painReportSchema = z
  .object({
    moment: z.enum(["treino", "manha_seguinte", "checkin"]).default("treino"),
    /** Região do corpo (mapa clicável); "geral" para sintomas sem local. */
    region: z.string().trim().min(1).max(50).default("geral"),
    intensity: pain010,
    type: z.enum(["pontada", "difusa", "outra"]).optional(),
    suddenOnset: flag,
    changedStride: flag,
    worsensEachStrideOrNoWarmup: flag,
    bonePoint: flag,
    painWalking: flag,
    restOrNightPain: flag,
    highRiskBoneSite: flag,
    jointSwelling: flag,
    lockingOrGivingWay: flag,
    tinglingOrNumbness: flag,
    suddenWeaknessOrFootDrop: flag,
    darkUrineWithMuscleSwelling: flag,
    analgesicBeforeTraining: flag,
    stiffnessLongerThanWarmup: flag,
    /** Dor ao acordar no mesmo local, 0–10 (R-DOR-06). */
    morningSameSite: pain010.optional(),
    cardio: z
      .object({
        chestPain: flag,
        disproportionateBreathlessness: flag,
        dizzyLosingBalance: flag,
        fainting: flag,
        palpitations: flag,
      })
      .strict()
      .optional(),
    heat: z.object({ confusionOrCollapse: flag, headacheNauseaInHeat: flag }).strict().optional(),
    doms: z
      .object({
        muscleOnly: z.boolean(),
        diffuseBilateralOrLargeGroup: z.boolean(),
        startedHoursAfter: z.number().min(0).max(240),
        noLocalSwelling: z.boolean(),
        noStrideChange: z.boolean(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type PainReportInput = z.infer<typeof painReportSchema>;

/** Registro pós-treino: concluiu ou não, duração, sRPE (CR-10), dor e comentário. */
export const workoutLogSchema = z
  .object({
    completed: z.boolean(),
    durationMinutes: z.number().int().min(0).max(1440).optional(),
    distanceKm: z.number().min(0).max(300).optional(),
    srpe: pain010.optional(),
    notes: z.string().trim().max(1000).optional(),
    pain: z.array(painReportSchema).max(10).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.completed) return;
    if (!v.durationMinutes || v.durationMinutes < 1) {
      ctx.addIssue({ code: "custom", path: ["durationMinutes"], message: "informe a duração do treino concluído" });
    }
    if (v.srpe === undefined) {
      ctx.addIssue({ code: "custom", path: ["srpe"], message: "informe o esforço (CR-10) do treino concluído" });
    }
  });
export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;

/** Pausa por dor, lesão ou doença (R-PRG-09). */
export const pauseSchema = z
  .object({
    cause: z.enum(["dor", "lesao", "doenca"]),
    /** Data local do atleta (hoje ±1 dia). Sem ela, vale a data UTC do servidor. */
    date: isoDate.optional(),
  })
  .strict();

/** Trocar o dia de um treino dentro da semana do plano; `today` é a data local do atleta (hoje ±1 dia). */
export const workoutMoveSchema = z.object({ date: isoDate, today: isoDate }).strict();
export type WorkoutMoveInput = z.infer<typeof workoutMoveSchema>;

/** Autodeclaração de avaliação e liberação por profissional de saúde (R-DOR-10, R-PRG-09). */
export const clearanceSchema = z.object({ date: isoDate }).strict();

export const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).default(56),
});

/** Fuso IANA ("America/Sao_Paulo"): só o formato; o servidor confere se o fuso existe. */
const timeZone = z.string().trim().min(1).max(64).regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/);
/** Horário do lembrete, "HH:MM" (24 h). */
export const reminderTime = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
/** Endereço de notificação: sempre https (é o serviço de push do navegador). */
const pushEndpoint = z.string().trim().max(1000).url().startsWith("https://");

/** Lembrete do treino neste aparelho (Web Push): endereço, chaves de cifra, horário e fuso da pessoa. */
export const pushSubscriptionSchema = z
  .object({
    endpoint: pushEndpoint,
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }).strict(),
    time: reminderTime,
    timeZone,
  })
  .strict();
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.object({ endpoint: pushEndpoint }).strict();
