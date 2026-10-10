import { pgTable, uuid, varchar, timestamp, boolean, text, jsonb, integer, decimal, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  language: varchar("language", { length: 10 }).default("pt-BR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // 'email_verification' | 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 50 }).notNull(),
  healthDataAccepted: boolean("health_data_accepted").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

export const athleteProfiles = pgTable("athlete_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  interviewResult: jsonb("interview_result").notNull(),
  calculatedLevel: varchar("calculated_level", { length: 50 }).notNull(), // 'iniciante' | 'intermediario' | 'avancado'
  rulesVersion: varchar("rules_version", { length: 50 }).notNull(),
  nextEvaluationDate: timestamp("next_evaluation_date").notNull(),
  cautelaLesao: boolean("cautela_lesao").default(false).notNull(),
  bmi: decimal("bmi", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviewResponses = pgTable("interview_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responses: jsonb("responses").notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const references = pgTable("references", {
  id: uuid("id").primaryKey().defaultRandom(),
  doi: varchar("doi", { length: 255 }),
  url: varchar("url", { length: 255 }),
  citation: text("citation").notNull(),
  studyType: varchar("study_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  namePt: varchar("name_pt", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  objective: varchar("objective", { length: 100 }),
  allowedLevels: jsonb("allowed_levels").notNull(), // array of levels
  structure: jsonb("structure").notNull(),
  targetRpe: integer("target_rpe"),
  targetHrZone: varchar("target_hr_zone", { length: 50 }),
  targetPaceRelative: varchar("target_pace_relative", { length: 100 }),
  durationMinutes: integer("duration_minutes"),
  distanceKm: decimal("distance_km", { precision: 5, scale: 2 }),
  estimatedLoad: integer("estimated_load"),
  contraindications: jsonb("contraindications"),
  status: varchar("status", { length: 50 }).notNull().default("draft"), // 'draft' | 'review' | 'published'
  version: varchar("version", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutProgressions = pgTable("workout_progressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromWorkoutId: uuid("from_workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  toWorkoutId: uuid("to_workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'progression' | 'regression'
});

export const workoutReferences = pgTable("workout_references", {
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  referenceId: uuid("reference_id").notNull().references(() => references.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.workoutId, t.referenceId] }),
}));

export const planTemplates = pgTable("plan_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  objective: varchar("objective", { length: 100 }).notNull(),
  level: varchar("level", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planTemplateWeeks = pgTable("plan_template_weeks", {
  id: uuid("id").primaryKey().defaultRandom(),
  planTemplateId: uuid("plan_template_id").notNull().references(() => planTemplates.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1-7
});

export const athletePlans = pgTable("athlete_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planTemplateId: uuid("plan_template_id").notNull().references(() => planTemplates.id),
  status: varchar("status", { length: 50 }).notNull().default("active"), // 'active' | 'completed' | 'abandoned'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  athletePlanId: uuid("athlete_plan_id").notNull().references(() => athletePlans.id, { onDelete: "cascade" }),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending' | 'completed' | 'skipped'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scheduledWorkoutId: uuid("scheduled_workout_id").notNull().references(() => scheduledWorkouts.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull(),
  durationMinutes: integer("duration_minutes"),
  distanceKm: decimal("distance_km", { precision: 5, scale: 2 }),
  srpe: integer("srpe"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dailyCheckins = pgTable("daily_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  sleepHours: decimal("sleep_hours", { precision: 4, scale: 1 }),
  sleepQuality: integer("sleep_quality"),
  energy: integer("energy"),
  stress: integer("stress"),
  generalMuscleSoreness: integer("general_muscle_soreness"),
  mood: integer("mood"),
  restingHr: integer("resting_hr"),
  acuteIllness: boolean("acute_illness").default(false), // From DEC-31
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const painReports = pgTable("pain_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutLogId: uuid("workout_log_id").references(() => workoutLogs.id, { onDelete: "set null" }),
  bodyPart: varchar("body_part", { length: 100 }).notNull(),
  intensity: integer("intensity").notNull(), // 0-10
  painType: varchar("pain_type", { length: 100 }), // muscular, articular, pontada
  timing: varchar("timing", { length: 50 }), // antes, durante, depois
  alteredStride: boolean("altered_stride").default(false),
  // Additional fields from DEC-05 (dor ao acordar no mesmo local, ponto doloroso no osso, dor em repouso/noite, inchaço, travamento/falseio, formigamento/dormência, fraqueza súbita, urina escura, analgésico etc.)
  extraSymptoms: jsonb("extra_symptoms"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const engineDecisions = pgTable("engine_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  context: jsonb("context").notNull(), // Inputs
  appliedRule: varchar("applied_rule", { length: 255 }).notNull(),
  outputDecision: varchar("output_decision", { length: 255 }).notNull(),
  engineVersion: varchar("engine_version", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
