import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  jsonb,
  integer,
  decimal,
  primaryKey,
  index,
  uniqueIndex,
  check,
  date,
} from "drizzle-orm/pg-core";

// Todas as datas com fuso (timestamptz).
const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").defaultNow().notNull();
const updatedAt = () => ts("updated_at").defaultNow().notNull();

// ---------------------------------------------------------------------------
// Autenticação. Sem RLS: o login acontece antes de existir sessão; o acesso
// passa só pela camada de repositório de auth (ver docs/adr/0002-rls.md).
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    // Sempre em minúsculas (normalizado na API e garantido pelo check).
    email: varchar("email", { length: 254 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    emailVerifiedAt: ts("email_verified_at"),
    language: varchar("language", { length: 10 }).default("pt-BR").notNull(),
    role: varchar("role", { length: 20 }).default("athlete").notNull(),
    // Bloqueio após falhas de login (por conta).
    failedLoginCount: integer("failed_login_count").default(0).notNull(),
    failedLoginWindowStart: ts("failed_login_window_start"),
    lockedUntil: ts("locked_until"),
    lockoutLevel: integer("lockout_level").default(0).notNull(),
    passwordChangedAt: ts("password_changed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_language", sql`${t.language} in ('pt-BR', 'en')`),
    check("users_role", sql`${t.role} in ('athlete', 'admin')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // HMAC-SHA256 do token; o token em si só existe no cookie.
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    rememberMe: boolean("remember_me").default(false).notNull(),
    userAgent: varchar("user_agent", { length: 200 }),
    lastSeenAt: ts("last_seen_at").defaultNow().notNull(),
    absoluteExpiresAt: ts("absolute_expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    type: varchar("type", { length: 30 }).notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("auth_tokens_user_type_idx").on(t.userId, t.type),
    check("auth_tokens_type", sql`${t.type} in ('email_verification', 'password_reset')`),
  ],
);

// ---------------------------------------------------------------------------
// Dados do atleta. Todas com user_id e RLS (migração 0001_rls.sql).
// ---------------------------------------------------------------------------

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    termsVersion: varchar("terms_version", { length: 50 }).notNull(),
    healthDataAccepted: boolean("health_data_accepted").notNull(),
    adultDeclared: boolean("adult_declared").default(false).notNull(), // "tenho 18 anos ou mais"
    acceptedAt: ts("accepted_at").defaultNow().notNull(),
  },
  (t) => [index("consents_user_id_idx").on(t.userId)],
);

export const athleteProfiles = pgTable(
  "athlete_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    interviewResult: jsonb("interview_result").notNull(),
    calculatedLevel: varchar("calculated_level", { length: 50 }).notNull(), // 'iniciante' | 'intermediario' | 'avancado'
    rulesVersion: varchar("rules_version", { length: 50 }).notNull(),
    nextEvaluationDate: ts("next_evaluation_date").notNull(),
    cautelaLesao: boolean("cautela_lesao").default(false).notNull(),
    flags: jsonb("flags").default([]).notNull(), // CLS-v1: inicio_do_zero, retorno_de_pausa, cautela_lesao
    limitingCriteria: jsonb("limiting_criteria").default([]).notNull(), // R-CLS-14
    bmi: decimal("bmi", { precision: 5, scale: 2 }),
    // Pausa por dor, lesão ou doença (R-PRG-09) e autodeclaração de liberação profissional (R-DOR-10).
    pauseCause: varchar("pause_cause", { length: 20 }), // 'dor' | 'lesao' | 'doenca'
    pauseDeclaredOn: date("pause_declared_on"),
    clearedByProfessionalOn: date("cleared_by_professional_on"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const interviewResponses = pgTable(
  "interview_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    responses: jsonb("responses").notNull(),
    version: varchar("version", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft' | 'submitted'
    submittedAt: ts("submitted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("interview_responses_user_id_idx").on(t.userId),
    // Um rascunho por atleta ("salvar e continuar depois").
    uniqueIndex("interview_responses_one_draft").on(t.userId).where(sql`${t.status} = 'draft'`),
    check("interview_responses_status", sql`${t.status} in ('draft', 'submitted')`),
  ],
);

/** Triagem de saúde (PAR-Q+ + camada TRI-v1). Só respostas SIM/NÃO; sem texto livre (R-TRI-15). */
export const healthScreenings = pgTable(
  "health_screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    instrumentVersion: varchar("instrument_version", { length: 50 }).notNull(),
    answers: jsonb("answers").notNull(), // { general, followUp }
    pregnant: boolean("pregnant").notNull(),
    regularExercise3m: boolean("regular_exercise_3m").notNull(),
    completedOn: date("completed_on").notNull(),
    evaluation: jsonb("evaluation"), // autodeclaração (R-TRI-05)
    consultedProfessionalOn: date("consulted_professional_on"), // R-TRI-07
    healthChangedOn: date("health_changed_on"), // R-TRI-11: "sim, algo mudou"
    healthConfirmedOn: date("health_confirmed_on"), // R-TRI-11: última resposta à pergunta semanal (sim ou não)
    state: varchar("state", { length: 30 }).notNull(),
    maxIntensity: varchar("max_intensity", { length: 20 }).notNull(),
    validUntil: date("valid_until"),
    ruleVersion: varchar("rule_version", { length: 20 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("health_screenings_user_id_idx").on(t.userId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Catálogo (público, só leitura para a API).
// ---------------------------------------------------------------------------

export const references = pgTable("references", {
  id: uuid("id").primaryKey().defaultRandom(),
  doi: varchar("doi", { length: 255 }),
  url: varchar("url", { length: 500 }),
  citation: text("citation").notNull(),
  studyType: varchar("study_type", { length: 100 }),
  createdAt: createdAt(),
});

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    namePt: varchar("name_pt", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    objective: varchar("objective", { length: 100 }),
    allowedLevels: jsonb("allowed_levels").notNull(), // array de níveis
    structure: jsonb("structure").notNull(),
    targetRpe: integer("target_rpe"),
    targetHrZone: varchar("target_hr_zone", { length: 50 }),
    targetPaceRelative: varchar("target_pace_relative", { length: 100 }),
    durationMinutes: integer("duration_minutes"),
    distanceKm: decimal("distance_km", { precision: 5, scale: 2 }),
    estimatedLoad: integer("estimated_load"),
    contraindications: jsonb("contraindications"),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    version: varchar("version", { length: 50 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("workouts_status", sql`${t.status} in ('draft', 'review', 'published')`)],
);

export const workoutProgressions = pgTable("workout_progressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromWorkoutId: uuid("from_workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  toWorkoutId: uuid("to_workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'progression' | 'regression'
});

export const workoutReferences = pgTable(
  "workout_references",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.workoutId, t.referenceId] })],
);

export const planTemplates = pgTable("plan_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // ex.: 10k-intermediario
  objective: varchar("objective", { length: 100 }).notNull(),
  level: varchar("level", { length: 50 }).notNull(),
  durationWeeks: integer("duration_weeks").notNull(), // R-PLN-13
  ruleVersion: varchar("rule_version", { length: 20 }).notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Semana de um modelo: fase, índice de volume (pico = 100) e marcas de recuperação e polimento. */
export const planTemplateWeeks = pgTable(
  "plan_template_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planTemplateId: uuid("plan_template_id")
      .notNull()
      .references(() => planTemplates.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    phase: varchar("phase", { length: 20 }).notNull(), // base | construcao | especifica | polimento | prova
    volumeIndex: integer("volume_index").notNull(), // 0–100, pico = 100 (R-PLN-10)
    isRecovery: boolean("is_recovery").default(false).notNull(),
    isTaper: boolean("is_taper").default(false).notNull(),
    isRaceWeek: boolean("is_race_week").default(false).notNull(),
    ladderStage: varchar("ladder_stage", { length: 5 }), // etapa da escada (5 km do zero, saúde iniciante)
    ladderRecoveryPct: integer("ladder_recovery_pct"), // repete a etapa com este % das repetições
  },
  (t) => [
    uniqueIndex("plan_template_weeks_unique").on(t.planTemplateId, t.weekNumber),
    check("plan_template_weeks_phase", sql`${t.phase} in ('base', 'construcao', 'especifica', 'polimento', 'prova')`),
    check("plan_template_weeks_index", sql`${t.volumeIndex} between 0 and 100`),
  ],
);

/** Sessão de uma semana do modelo: sempre um treino do catálogo e a parte do volume semanal. */
export const planTemplateSessions = pgTable(
  "plan_template_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekId: uuid("week_id")
      .notNull()
      .references(() => planTemplateWeeks.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(), // ordem na semana; o dia vem da disponibilidade do atleta
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id),
    sharePct: integer("share_pct").notNull(), // % do volume semanal de corrida (0 se duração fixa)
    fixedMinutes: integer("fixed_minutes"), // força e mobilidade
    optional: boolean("optional").default(false).notNull(),
    ladderSession: integer("ladder_session"), // 1 a 3 (sessão da etapa)
  },
  (t) => [
    uniqueIndex("plan_template_sessions_unique").on(t.weekId, t.slot),
    check("plan_template_sessions_share", sql`${t.sharePct} between 0 and 100`),
  ],
);

// ---------------------------------------------------------------------------
// Plano e execução do atleta (RLS).
// ---------------------------------------------------------------------------

export const athletePlans = pgTable(
  "athlete_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planTemplateId: uuid("plan_template_id")
      .notNull()
      .references(() => planTemplates.id),
    status: varchar("status", { length: 50 }).notNull().default("active"), // 'active' | 'completed' | 'abandoned'
    goalTag: varchar("goal_tag", { length: 30 }), // controle_de_peso (R-PLN-01)
    baseWeeks: integer("base_weeks").default(0).notNull(), // R-PLN-05
    // Semana do modelo em que o plano começa (posicionamento na escada, R-PLN-21); 1 = do início.
    startTemplateWeek: integer("start_template_week").default(1).notNull(),
    selection: jsonb("selection").notNull(), // pedido, rebaixamentos e motivos (PLN-v1)
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("athlete_plans_user_id_idx").on(t.userId)],
);

/**
 * Uma linha por semana do plano do atleta (janela de 7 dias a partir de start_date).
 * `template_week` diz qual semana do modelo vale; na escada, repetir uma etapa mantém a mesma.
 */
export const athletePlanWeeks = pgTable(
  "athlete_plan_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athletePlanId: uuid("athlete_plan_id")
      .notNull()
      .references(() => athletePlans.id, { onDelete: "cascade" }),
    calendarWeek: integer("calendar_week").notNull(), // 1 = semana do início do plano
    templateWeek: integer("template_week").notNull(),
    startDate: date("start_date").notNull(),
    ladderRepeatedOnce: boolean("ladder_repeated_once").default(false).notNull(), // R-PLN-12
    status: varchar("status", { length: 20 }).notNull().default("open"), // 'open' | 'closed'
    ladderAction: varchar("ladder_action", { length: 20 }), // avancar | repetir | concluida (ao fechar)
    closedAt: ts("closed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("athlete_plan_weeks_plan_week_idx").on(t.athletePlanId, t.calendarWeek),
    index("athlete_plan_weeks_user_id_idx").on(t.userId),
  ],
);

export const scheduledWorkouts = pgTable(
  "scheduled_workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    athletePlanId: uuid("athlete_plan_id")
      .notNull()
      .references(() => athletePlans.id, { onDelete: "cascade" }),
    athletePlanWeekId: uuid("athlete_plan_week_id")
      .notNull()
      .references(() => athletePlanWeeks.id, { onDelete: "cascade" }),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id),
    scheduledDate: date("scheduled_date").notNull(),
    slot: integer("slot").notNull(), // ordem na semana do modelo
    kind: varchar("kind", { length: 30 }).notNull(), // SessionKind do motor
    plannedMinutes: integer("planned_minutes").notNull(),
    maxZone: varchar("max_zone", { length: 2 }).notNull(), // Z1 | Z2 | Z3
    targetRpe: integer("target_rpe"), // CR-10 do catálogo (R-CRG-07)
    optional: boolean("optional").default(false).notNull(), // força e mobilidade
    ladder: jsonb("ladder"), // estrutura da escada caminhada-corrida
    note: text("note"),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'completed' | 'skipped'
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("scheduled_workouts_user_date_idx").on(t.userId, t.scheduledDate),
    uniqueIndex("scheduled_workouts_week_slot_idx").on(t.athletePlanWeekId, t.slot),
  ],
);

export const workoutLogs = pgTable(
  "workout_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scheduledWorkoutId: uuid("scheduled_workout_id")
      .notNull()
      .unique()
      .references(() => scheduledWorkouts.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull(),
    durationMinutes: integer("duration_minutes"),
    distanceKm: decimal("distance_km", { precision: 5, scale: 2 }),
    srpe: integer("srpe"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("workout_logs_user_id_idx").on(t.userId)],
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    // Notas de 1 a 5, sempre "5 = melhor" (convenção do motor): estresse 5 = tranquilo, dor muscular 5 = sem dor.
    sleepHours: decimal("sleep_hours", { precision: 4, scale: 1 }),
    sleepQuality: integer("sleep_quality"),
    energy: integer("energy"),
    stress: integer("stress"),
    generalMuscleSoreness: integer("general_muscle_soreness"),
    mood: integer("mood"),
    restingHr: integer("resting_hr"),
    acuteIllness: boolean("acute_illness").default(false).notNull(), // R-SON-16
    dailyPainWalking: integer("daily_pain_walking"), // 0–10, só com bloqueio por dor ativo (R-DOR-10)
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("daily_checkins_user_date_idx").on(t.userId, t.date)],
);

export const painReports = pgTable(
  "pain_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutLogId: uuid("workout_log_id").references(() => workoutLogs.id, { onDelete: "set null" }),
    reportedOn: date("reported_on").notNull(),
    moment: varchar("moment", { length: 20 }).notNull().default("treino"), // treino | manha_seguinte | checkin
    bodyPart: varchar("body_part", { length: 100 }).notNull(),
    intensity: integer("intensity").notNull(),
    painType: varchar("pain_type", { length: 100 }), // muscular, articular, pontada
    timing: varchar("timing", { length: 50 }), // antes, durante, depois
    alteredStride: boolean("altered_stride").default(false).notNull(),
    // Campos extras de R-DOR-15 (dor ao acordar, ponto ósseo, repouso/noite, inchaço etc.)
    extraSymptoms: jsonb("extra_symptoms"),
    createdAt: createdAt(),
  },
  (t) => [
    index("pain_reports_user_id_idx").on(t.userId, t.reportedOn),
    check("pain_reports_intensity", sql`${t.intensity} between 0 and 10`),
  ],
);

export const engineDecisions = pgTable(
  "engine_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    context: jsonb("context").notNull(), // entradas
    appliedRule: varchar("applied_rule", { length: 255 }).notNull(),
    outputDecision: varchar("output_decision", { length: 255 }).notNull(),
    engineVersion: varchar("engine_version", { length: 50 }).notNull(),
    forDate: date("for_date"), // dia a que a decisão se refere (decisão do dia)
    createdAt: createdAt(),
  },
  (t) => [index("engine_decisions_user_id_idx").on(t.userId, t.forDate)],
);

/** Tabelas com dados do atleta: RLS por user_id (ver 0001_rls.sql). */
export const athleteTables = [
  "consents",
  "health_screenings",
  "athlete_profiles",
  "interview_responses",
  "athlete_plans",
  "athlete_plan_weeks",
  "scheduled_workouts",
  "workout_logs",
  "daily_checkins",
  "pain_reports",
  "engine_decisions",
] as const;
