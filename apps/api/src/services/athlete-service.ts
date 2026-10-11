import { and, desc, eq, sql } from "drizzle-orm";
import {
  athletePlanWeeks,
  athletePlans,
  athleteProfiles,
  consents,
  dailyCheckins,
  engineDecisions,
  healthScreenings,
  interviewResponses,
  painReports,
  planTemplates,
  scheduledWorkouts,
  users,
  withAthlete,
  workoutLogs,
  type Database,
  type Transaction,
} from "@passo/db";
import {
  classify,
  explainClassification,
  screen,
  selectPlan,
  allowsTraining,
  CLS_VERSION,
  type ClassificationInput,
  type Evaluation,
  type LevelName,
  type PlanSelection,
  type PlanSelectionInput,
  type ScreeningInput,
  type ScreeningResult,
} from "@passo/engine";
import {
  INTERVIEW_STEPS,
  INTERVIEW_VERSION,
  PARQ_INSTRUMENT,
  interviewSchema,
  interviewSteps,
  type Interview,
  type InterviewStep,
} from "@passo/shared";
import { AppError, errors } from "../lib/errors";
import type { Logger } from "../lib/logger";

// Toda leitura e escrita de dados do atleta passa por withAthlete (RLS) e
// recebe o userId da sessão no servidor (seção 10.2 da especificação).

export const ENGINE_VERSION = "engine-2026.10";

const today = (now: Date) => now.toISOString().slice(0, 10);
/** O cliente manda a data local (fuso de −12 a +14): aceita até um dia à frente da data UTC. */
const tomorrow = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * Idade a partir de mês/ano (sem o dia, por minimização de dados).
 * min: aniversário no fim do mês (para o corte de 18 anos);
 * max: aniversário no início do mês (para a regra dos 45 anos). Ambos conservadores.
 */
export function ageRange(birthYear: number, birthMonth: number, on: string) {
  const [y, m] = on.split("-").map(Number) as [number, number];
  const years = y - birthYear;
  return { min: m > birthMonth ? years : years - 1, max: m >= birthMonth ? years : years - 1 };
}

const incomplete = (missing: string[]) =>
  new AppError(400, "INTERVIEW_INCOMPLETE", "Faltam etapas da entrevista.", missing.map((s) => ({ path: s, code: "missing" })));

// details.canDeleteAccount: o front oferece excluir a conta (DELETE /auth/account).
const underage = () =>
  new AppError(400, "UNDERAGE", "O Let's Go Run é só para maiores de 18 anos.", { canDeleteAccount: true });

/** Entradas guardadas no perfil para refazer a escolha do plano depois (ex.: após a avaliação). */
export type StoredInputs = {
  birth: { year: number; month: number };
  classification: ClassificationInput;
  plan: Omit<PlanSelectionInput, "screening" | "today" | "level">;
};

/** Entradas da triagem recalculadas para `on` a partir da linha guardada (validade, R-TRI-10). */
export const screeningInputFrom = (row: typeof healthScreenings.$inferSelect, ageMax: number, on: string): ScreeningInput => {
  const answers = row.answers as Pick<ScreeningInput, "general" | "followUp">;
  return {
    general: answers.general,
    followUp: answers.followUp,
    pregnant: row.pregnant,
    ageYears: ageMax,
    regularExercise3m: row.regularExercise3m,
    consultedProfessionalAt: row.consultedProfessionalOn ?? undefined,
    completedAt: row.completedOn,
    evaluation: (row.evaluation as Evaluation | null) ?? undefined,
    healthChangedAt: row.healthChangedOn ?? undefined,
    now: on,
  };
};

export function athleteService(d: { db: Database; logger: Logger; now: () => Date }) {
  const { db, logger } = d;

  const audit = (tx: Transaction, userId: string, appliedRule: string, context: unknown, output: unknown) =>
    tx.insert(engineDecisions).values({
      userId,
      appliedRule,
      context,
      outputDecision: JSON.stringify(output).slice(0, 255),
      engineVersion: ENGINE_VERSION,
    });

  const draftOf = async (tx: Transaction, userId: string) =>
    (
      await tx
        .select()
        .from(interviewResponses)
        .where(and(eq(interviewResponses.userId, userId), eq(interviewResponses.status, "draft")))
        .limit(1)
    )[0];

  const latestScreening = async (tx: Transaction, userId: string) =>
    (
      await tx
        .select()
        .from(healthScreenings)
        .where(eq(healthScreenings.userId, userId))
        .orderBy(desc(healthScreenings.createdAt))
        .limit(1)
    )[0];

  /** Atribui o plano se a escolha deu "atribuido"; encerra o plano ativo anterior. */
  async function assignPlan(tx: Transaction, userId: string, selection: PlanSelection) {
    if (selection.status !== "atribuido") return null;
    const slug = `${selection.objective}-${selection.level}`;
    const [template] = await tx.select().from(planTemplates).where(eq(planTemplates.slug, slug)).limit(1);
    if (!template) throw new Error(`modelo de plano ausente: ${slug} (rode o seed)`);
    await tx
      .update(athletePlans)
      .set({ status: "abandoned", updatedAt: d.now() })
      .where(and(eq(athletePlans.userId, userId), eq(athletePlans.status, "active")));
    const [plan] = await tx
      .insert(athletePlans)
      .values({
        userId,
        planTemplateId: template.id,
        goalTag: selection.goalTag,
        baseWeeks: selection.baseWeeks,
        selection,
        startDate: selection.startDate,
        endDate: selection.endDate,
      })
      .returning();
    return plan!;
  }

  function planInput(stored: StoredInputs, level: LevelName, s: ScreeningResult, on: string): PlanSelectionInput {
    return { ...stored.plan, level, screening: { state: s.state, maxIntensity: s.maxIntensity }, today: on };
  }

  return {
    /** Exportação de todos os dados do atleta (LGPD, seção 10): JSON, sem segredos de autenticação. */
    async exportData(userId: string) {
      return withAthlete(db, userId, async (tx) => {
        const [account] = await tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            language: users.language,
            emailVerifiedAt: users.emailVerifiedAt,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, userId));
        const [
          consentRows, profile, interviews, screenings, plans, planWeeks, scheduled, logs, checkins, pain, decisions,
        ] = await Promise.all([
          tx.select().from(consents).where(eq(consents.userId, userId)),
          tx.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)),
          tx.select().from(interviewResponses).where(eq(interviewResponses.userId, userId)),
          tx.select().from(healthScreenings).where(eq(healthScreenings.userId, userId)),
          tx.select().from(athletePlans).where(eq(athletePlans.userId, userId)),
          tx.select().from(athletePlanWeeks).where(eq(athletePlanWeeks.userId, userId)),
          tx.select().from(scheduledWorkouts).where(eq(scheduledWorkouts.userId, userId)),
          tx.select().from(workoutLogs).where(eq(workoutLogs.userId, userId)),
          tx.select().from(dailyCheckins).where(eq(dailyCheckins.userId, userId)),
          tx.select().from(painReports).where(eq(painReports.userId, userId)),
          tx.select().from(engineDecisions).where(eq(engineDecisions.userId, userId)),
        ]);
        return {
          exportedAt: d.now().toISOString(),
          account,
          consents: consentRows,
          profile: profile[0] ?? null,
          interviews,
          healthScreenings: screenings,
          plans,
          planWeeks,
          scheduledWorkouts: scheduled,
          workoutLogs: logs,
          dailyCheckins: checkins,
          painReports: pain,
          engineDecisions: decisions,
        };
      });
    },

    async getInterview(userId: string) {
      return withAthlete(db, userId, async (tx) => {
        const draft = await draftOf(tx, userId);
        const responses = (draft?.responses ?? {}) as Partial<Interview>;
        return {
          version: INTERVIEW_VERSION,
          steps: INTERVIEW_STEPS,
          completed: INTERVIEW_STEPS.filter((s) => responses[s] !== undefined),
          responses,
          updatedAt: draft?.updatedAt ?? null,
        };
      });
    },

    /** Salva uma etapa no rascunho ("salvar e continuar depois"). */
    async saveStep(userId: string, step: InterviewStep, data: unknown) {
      const parsed = interviewSteps[step].safeParse(data);
      if (!parsed.success) {
        throw errors.validation(parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })));
      }
      if (step === "basicos") {
        const b = parsed.data as Interview["basicos"];
        if (ageRange(b.birthYear, b.birthMonth, today(d.now())).min < 18) throw underage();
      }
      const now = d.now();
      await withAthlete(db, userId, async (tx) => {
        const draft = await draftOf(tx, userId);
        if (draft) {
          await tx
            .update(interviewResponses)
            .set({
              responses: sql`${interviewResponses.responses} || ${JSON.stringify({ [step]: parsed.data })}::jsonb`,
              updatedAt: now,
            })
            .where(eq(interviewResponses.id, draft.id));
        } else {
          await tx.insert(interviewResponses).values({
            userId,
            responses: { [step]: parsed.data },
            version: INTERVIEW_VERSION,
            status: "draft",
          });
        }
      });
    },

    /** Envia a entrevista: triagem, classificação, plano e auditoria numa transação. */
    async submit(userId: string) {
      const now = d.now();
      const on = today(now);
      const result = await withAthlete(db, userId, async (tx) => {
        const draft = await draftOf(tx, userId);
        const responses = (draft?.responses ?? {}) as Partial<Interview>;
        const missing = INTERVIEW_STEPS.filter((s) => responses[s] === undefined);
        if (!draft || missing.length) throw incomplete(missing.length ? missing : [...INTERVIEW_STEPS]);
        const parsed = interviewSchema.safeParse(responses);
        if (!parsed.success) throw errors.validation(parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })));
        const iv = parsed.data;

        const age = ageRange(iv.basicos.birthYear, iv.basicos.birthMonth, on);
        if (age.min < 18) throw underage();

        // 1. Triagem (TRI-v1). Respostas SIM/NÃO ficam só em health_screenings (R-TRI-15).
        const screeningInput: ScreeningInput = {
          general: iv.triagem.general as unknown as ScreeningInput["general"],
          followUp: iv.triagem.followUp,
          pregnant: iv.triagem.pregnant,
          ageYears: age.max,
          regularExercise3m: iv.historico.regularExercise3m,
          completedAt: on,
          now: on,
        };
        const screening = screen(screeningInput);
        const [screeningRow] = await tx
          .insert(healthScreenings)
          .values({
            userId,
            instrumentVersion: PARQ_INSTRUMENT.version,
            answers: { general: iv.triagem.general, followUp: iv.triagem.followUp ?? null },
            pregnant: iv.triagem.pregnant,
            regularExercise3m: iv.historico.regularExercise3m,
            completedOn: on,
            state: screening.state,
            maxIntensity: screening.maxIntensity,
            validUntil: screening.validUntil,
            ruleVersion: screening.ruleVersion,
          })
          .returning({ id: healthScreenings.id });
        await audit(tx, userId, screening.ruleVersion, { stateInputs: "health_screenings", screeningId: screeningRow!.id }, screening);

        // 2. Classificação (CLS-v1).
        const classificationInput: ClassificationInput = {
          ageYears: age.min,
          sex: iv.basicos.sex,
          monthsRegular: iv.historico.monthsRegular,
          weeklyVolume: iv.historico.weeklyVolume,
          weeklySessions: iv.historico.weeklySessions,
          t5k: iv.historico.t5k,
          t10k: iv.historico.t10k,
          daysSinceLastRun: iv.historico.daysSinceLastRun,
          active3m: iv.historico.regularExercise3m,
          injury12m: iv.lesoes.injury12m,
          asOf: on,
        };
        const classification = classify(classificationInput);
        if (!classification.eligible) throw underage();
        await audit(tx, userId, CLS_VERSION, classificationInput, { level: classification.levelName, flags: classification.flags });

        // 3. Escolha do plano (PLN-v1).
        const bmi = iv.basicos.weightKg ? iv.basicos.weightKg / (iv.basicos.heightCm / 100) ** 2 : undefined;
        const stored: StoredInputs = {
          birth: { year: iv.basicos.birthYear, month: iv.basicos.birthMonth },
          classification: classificationInput,
          plan: {
            goal: iv.objetivo.goal,
            raceDistance: iv.objetivo.raceDistance,
            raceDate: iv.objetivo.raceDate,
            weeklyKm: classification.weeklyKm,
            weeklySessions: iv.historico.weeklySessions,
            monthsRegular: iv.historico.monthsRegular,
            longestRecentKm: iv.historico.longestRecentKm,
            canRunContinuousMinutes: iv.historico.canRunContinuousMinutes,
            halfMarathonLast3m: iv.historico.halfMarathonLast3m,
            injuryOrPersistentPainLast6w: iv.lesoes.injuryOrPersistentPainLast6w,
            runningInjuryLast3m: iv.lesoes.runningInjuryLast3m,
            currentPain: iv.lesoes.currentPain.intensity,
            bmi,
          },
        };
        const selection = selectPlan(planInput(stored, classification.levelName, screening, on));
        await audit(tx, userId, selection.ruleVersion, stored.plan, { status: selection.status });
        const plan = await assignPlan(tx, userId, selection);

        // 4. Perfil (R-CLS-14) e reavaliação: 12 semanas ou fim do ciclo, o que vier antes (R-CLS-11).
        const nextEvaluation =
          selection.status === "atribuido" && selection.endDate < classification.nextReevaluation
            ? selection.endDate
            : classification.nextReevaluation;
        const profileValues = {
          interviewResult: stored,
          calculatedLevel: classification.levelName,
          rulesVersion: classification.ruleVersion,
          nextEvaluationDate: new Date(`${nextEvaluation}T00:00:00Z`),
          cautelaLesao: classification.flags.includes("cautela_lesao"),
          flags: classification.flags,
          limitingCriteria: classification.limiting,
          bmi: bmi ? bmi.toFixed(2) : null,
          updatedAt: now,
        };
        await tx
          .insert(athleteProfiles)
          .values({ userId, ...profileValues })
          .onConflictDoUpdate({ target: athleteProfiles.userId, set: profileValues });

        // 5. O rascunho vira histórico versionado, sem as respostas da triagem (já em health_screenings).
        const { triagem: _triagem, ...rest } = iv;
        await tx
          .update(interviewResponses)
          .set({ responses: { ...rest, triagem: { screeningId: screeningRow!.id } }, status: "submitted", submittedAt: now, updatedAt: now })
          .where(eq(interviewResponses.id, draft.id));

        return { classification, screening, selection, planId: plan?.id ?? null, nextEvaluation };
      });
      logger.info("interview_submitted", {
        userId,
        level: result.classification.eligible ? result.classification.levelName : null,
        screening: result.screening.state,
        plan: result.selection.status,
      });
      return result;
    },

    /** Perfil atual, com a triagem recalculada para hoje (validade, R-TRI-10). */
    async getProfile(userId: string, lang: "pt-BR" | "en") {
      const on = today(d.now());
      return withAthlete(db, userId, async (tx) => {
        const [profile] = await tx.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
        if (!profile) throw errors.notFound();
        const stored = profile.interviewResult as StoredInputs;
        const row = await latestScreening(tx, userId);
        const classification = classify({ ...stored.classification }); // mesma versão e entradas: mesmo resultado
        const ageMax = ageRange(stored.birth.year, stored.birth.month, on).max;
        const screening = row ? screen(screeningInputFrom(row, ageMax, on)) : null;
        const [plan] = await tx
          .select({ plan: athletePlans, template: planTemplates })
          .from(athletePlans)
          .innerJoin(planTemplates, eq(athletePlans.planTemplateId, planTemplates.id))
          .where(and(eq(athletePlans.userId, userId), eq(athletePlans.status, "active")))
          .limit(1);
        return {
          level: profile.calculatedLevel,
          flags: profile.flags,
          ruleVersion: profile.rulesVersion,
          explanation: explainClassification(classification, lang),
          nextEvaluationDate: profile.nextEvaluationDate.toISOString().slice(0, 10),
          // Pausa por dor, lesão ou doença e a liberação profissional declarada (R-PRG-09, R-DOR-10).
          pause: {
            cause: profile.pauseCause ?? null,
            declaredOn: profile.pauseDeclaredOn ?? null,
            clearedByProfessionalOn: profile.clearedByProfessionalOn ?? null,
          },
          screening: screening ? {
            state: screening.state,
            maxIntensity: screening.maxIntensity,
            validUntil: screening.validUntil,
            expiresSoon: screening.expiresSoon,
            reasons: screening.reasons,
            allowsTraining: allowsTraining(screening),
          } : null,
          plan: plan ? {
            id: plan.plan.id,
            template: plan.template.slug,
            objective: plan.template.objective,
            level: plan.template.level,
            durationWeeks: plan.template.durationWeeks,
            baseWeeks: plan.plan.baseWeeks,
            goalTag: plan.plan.goalTag,
            startDate: plan.plan.startDate,
            endDate: plan.plan.endDate,
            selection: plan.plan.selection,
          } : null,
        };
      });
    },

    /** Autodeclaração de avaliação (R-TRI-05); se liberar, atribui o plano. */
    async declareEvaluation(userId: string, input: { result: Evaluation["result"]; date: string; source: Evaluation["source"]; vigorousAllowed: boolean }) {
      const on = today(d.now());
      if (input.date > tomorrow(on)) throw errors.validation([{ path: "date", code: "future_date" }]);
      return withAthlete(db, userId, async (tx) => {
        const row = await latestScreening(tx, userId);
        const [profile] = await tx.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
        if (!row || !profile) throw errors.notFound();
        const stored = profile.interviewResult as StoredInputs;
        const current = screen(screeningInputFrom(row, ageRange(stored.birth.year, stored.birth.month, on).max, on));
        if (current.state !== "AVALIACAO_NECESSARIA") {
          throw new AppError(409, "EVALUATION_NOT_REQUIRED", "A triagem atual não pede avaliação.");
        }
        const evaluation: Evaluation = {
          result: input.result,
          date: input.date,
          source: input.source,
          ...(input.vigorousAllowed ? { vigorousAllowedAt: on } : {}),
        };
        const next = screen({ ...screeningInputFrom(row, ageRange(stored.birth.year, stored.birth.month, on).max, on), evaluation });
        await tx
          .update(healthScreenings)
          .set({ evaluation, state: next.state, maxIntensity: next.maxIntensity, validUntil: next.validUntil, updatedAt: d.now() })
          .where(eq(healthScreenings.id, row.id));
        await audit(tx, userId, next.ruleVersion, { evaluation: { result: input.result, source: input.source } }, next);

        let selection: PlanSelection | null = null;
        if (allowsTraining(next)) {
          selection = selectPlan(planInput(stored, profile.calculatedLevel as LevelName, next, on));
          await audit(tx, userId, selection.ruleVersion, stored.plan, { status: selection.status });
          await assignPlan(tx, userId, selection);
        }
        logger.info("screening_evaluation_declared", { userId, state: next.state });
        return { screening: next, selection };
      });
    },

    /** Registro de consulta a profissional de educação física (R-TRI-07). */
    async declareProfessionalConsulted(userId: string, date: string) {
      const on = today(d.now());
      if (date > tomorrow(on)) throw errors.validation([{ path: "date", code: "future_date" }]);
      return withAthlete(db, userId, async (tx) => {
        const row = await latestScreening(tx, userId);
        const [profile] = await tx.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
        if (!row || !profile) throw errors.notFound();
        const stored = profile.interviewResult as StoredInputs;
        const next = screen({ ...screeningInputFrom(row, ageRange(stored.birth.year, stored.birth.month, on).max, on), consultedProfessionalAt: date });
        await tx
          .update(healthScreenings)
          .set({ consultedProfessionalOn: date, state: next.state, maxIntensity: next.maxIntensity, updatedAt: d.now() })
          .where(eq(healthScreenings.id, row.id));
        await audit(tx, userId, next.ruleVersion, { consultedProfessional: true }, next);
        return { screening: next };
      });
    },
  };
}

export type AthleteService = ReturnType<typeof athleteService>;
