import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  athletePlanWeeks,
  athletePlans,
  athleteProfiles,
  dailyCheckins,
  engineDecisions,
  healthScreenings,
  interviewResponses,
  ladderHow,
  painReports,
  planReviews,
  planTemplates,
  references as referencesTable,
  scheduledWorkouts,
  workoutLogs,
  workoutReferences,
  workouts,
  withAthlete,
  type Database,
  type Transaction,
} from "@passo/db";
import {
  DIA_VERSION,
  ESCADA_CAMINHADA_CORRIDA,
  buildAthleteWeek,
  buildPlanTemplate,
  clsV1,
  daysSinceLastRun,
  decideDay,
  diaV1,
  interviewLastRun,
  lastBuildWeekMinutes,
  nextLadderStep,
  pauseReturnStartedOn,
  screen,
  weeklyCaps,
  type Checkin,
  type ClosedWeek,
  type DayDecision,
  type DayInput,
  type LevelName,
  type Objective,
  type PainReport,
  type PlanTemplate,
  type PlannedSession,
  type SessionKind,
  type WorkoutLog,
  type Zone,
} from "@passo/engine";
import { isHighRiskBoneRegion, type CheckinInput, type PainReportInput, type PlanReviewInput, type WorkoutLogInput } from "@passo/shared";
import { AppError, errors } from "../lib/errors";
import type { Logger } from "../lib/logger";
import { ENGINE_VERSION, ageRange, screeningInputFrom, type StoredInputs } from "./athlete-service";

// Acompanhamento diário (Fase 5): agenda das semanas, check-in, registro pós-treino com dor,
// decisão do dia e histórico. Todo acesso passa por withAthlete (RLS) com o userId da sessão.

export type Lang = "pt-BR" | "en";

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);
const diff = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);
const isoWeekday = (d: string) => ((new Date(parse(d)).getUTCDay() + 6) % 7) + 1;
const num = (v: string | number | null | undefined) => (v === null || v === undefined ? undefined : Number(v));

/** O cliente manda a data local; aceita só hoje e os vizinhos (fusos vão de −12 a +14). */
const DATE_TOLERANCE_DAYS = 1;
const RUN_KINDS_EXCLUDED = new Set<string>(["forca", "mobilidade"]);

type Avail = { daysPerWeek: number; minutesPerSession: number; longRunDay: number };
type Ctx = {
  profile: typeof athleteProfiles.$inferSelect;
  stored: StoredInputs;
  avail: Avail;
  plan: typeof athletePlans.$inferSelect | null;
  template: PlanTemplate | null;
  /** Média semanal de corrida da entrevista, em minutos. */
  baseWeekly: number;
  /** Idioma dos textos calculados (mensagem do dia). */
  lang: Lang;
};

type SessionRow = typeof scheduledWorkouts.$inferSelect & { slug: string; namePt?: string; nameEn?: string };
type WeekRow = typeof athletePlanWeeks.$inferSelect;
type LogRow = typeof workoutLogs.$inferSelect;

export type SessionView = {
  id: string;
  date: string;
  slug: string;
  /** Nome do treino no catálogo, nos dois idiomas. */
  name: { "pt-BR": string; en: string } | null;
  kind: string;
  minutes: number;
  maxZone: string;
  targetRpe: number | null;
  optional: boolean;
  ladder: unknown;
  note: string | null;
  status: string;
  log: { completed: boolean; durationMinutes: number | null; distanceKm: number | null; srpe: number | null; notes: string | null } | null;
};

/** Uma semana do plano completo: criada (com sessões) ou prevista pelo modelo (sem sessões). */
export type OverviewWeek = {
  calendarWeek: number;
  templateWeek: number;
  startDate: string;
  endDate: string;
  phase: string;
  isRecovery: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  ladderStage: string | null;
  state: "past" | "current" | "upcoming";
  /** Semana ainda não criada: a posição no modelo é uma previsão e pode mudar. */
  projected: boolean;
  sessions: SessionView[];
};

const view = (s: SessionRow, log: LogRow | undefined): SessionView => ({
  id: s.id,
  date: s.scheduledDate,
  slug: s.slug,
  name: s.namePt && s.nameEn ? { "pt-BR": s.namePt, en: s.nameEn } : null,
  kind: s.kind,
  minutes: s.plannedMinutes,
  maxZone: s.maxZone,
  targetRpe: s.targetRpe,
  optional: s.optional,
  ladder: s.ladder,
  note: s.note,
  status: s.status,
  log: log
    ? { completed: log.completed, durationMinutes: log.durationMinutes, distanceKm: num(log.distanceKm) ?? null, srpe: log.srpe, notes: log.notes }
    : null,
});

// ---- Detalhe do treino: só o bloco `atleta` do catálogo (texto sem código de regra, gerado no seed).
// Os campos técnicos de `structure` (códigos, `[P]`, âncoras) nunca saem da API.
type Fact = { label: string; value: string };
type AthleteLevel = "iniciante" | "intermediario" | "avancado";

export type WorkoutDetail = {
  summary: string | null;
  intensity: {
    groups: { title: string | null; zone: string | null; facts: Fact[]; watch: Fact[] }[];
    notes: string[];
    studies: string[];
  } | null;
  how: {
    warmup: { minutes: string | null; text: string | null; facts: Fact[] } | null;
    main: { minutes: string | null; text: string | null; facts: Fact[] } | null;
    cooldown: { minutes: string | null; text: string | null; facts: Fact[] } | null;
  };
  /** Parâmetros do treino para o nível do próprio atleta. */
  level: Fact[] | null;
  frequency: Fact[];
  limits: string[];
  progression: string[];
  regression: string[];
  evidence: { direct: string[]; initial: string[]; insufficient: string[] };
};

const EMPTY_DETAIL: WorkoutDetail = {
  summary: null,
  intensity: null,
  how: { warmup: null, main: null, cooldown: null },
  level: null,
  frequency: [],
  limits: [],
  progression: [],
  regression: [],
  evidence: { direct: [], initial: [], insufficient: [] },
};

/**
 * Sessão da escada de caminhada e corrida: o "Como fazer" é montado com os números da própria sessão
 * (etapa, minutos de corrida e de caminhada, repetições), em frases simples (textos aprovados em
 * docs/textos-para-o-atleta.md, seção 6). Os números vêm do motor; nada é calculado aqui.
 */
function withLadderText(detail: WorkoutDetail, row: { ladder: unknown; slot: number }, lang: Lang): WorkoutDetail {
  const l = row.ladder as { etapa: string; corridaMin: number; caminhadaMin: number; repeticoes: number; continua?: boolean } | null;
  if (!l) return detail;
  return { ...detail, how: ladderHow(lang, l, row.slot) };
}

export function workoutDetail(structure: unknown, level: string, lang: Lang = "pt-BR"): WorkoutDetail {
  const st = typeof structure === "object" && structure !== null ? (structure as Record<string, unknown>) : {};
  // Em inglês, o bloco traduzido (`atletaEn`); se faltar, cai no português em vez de ficar sem texto.
  const a = (lang === "en" ? (st.atletaEn ?? st.atleta) : st.atleta) as (Partial<WorkoutDetail> & { levels?: Partial<Record<AthleteLevel, Fact[]>> }) | undefined;
  if (!a || typeof a !== "object") return EMPTY_DETAIL;
  return {
    summary: a.summary ?? null,
    intensity: a.intensity ?? null,
    how: a.how ?? EMPTY_DETAIL.how,
    level: a.levels?.[level as AthleteLevel] ?? null,
    frequency: a.frequency ?? [],
    limits: a.limits ?? [],
    progression: a.progression ?? [],
    regression: a.regression ?? [],
    evidence: a.evidence ?? EMPTY_DETAIL.evidence,
  };
}

const painToRow = (p: PainReportInput) => {
  const { moment, region, intensity, type, changedStride, ...rest } = p;
  // O sítio de alto risco vem do mapa do corpo (R-DOR-03), não só do que o cliente mandou.
  const extra = isHighRiskBoneRegion(region) ? { ...rest, highRiskBoneSite: true } : rest;
  return {
    bodyPart: region,
    intensity,
    painType: type ?? null,
    moment,
    alteredStride: !!changedStride,
    extraSymptoms: Object.keys(extra).length ? extra : null,
  };
};

const rowToPain = (r: typeof painReports.$inferSelect): PainReport => ({
  ...((r.extraSymptoms ?? {}) as Partial<PainReport>),
  date: r.reportedOn,
  moment: r.moment as PainReport["moment"],
  region: r.bodyPart,
  intensity: r.intensity,
  ...(r.painType ? { type: r.painType as PainReport["type"] } : {}),
  changedStride: r.alteredStride,
});

export function trainingService(d: { db: Database; logger: Logger; now: () => Date }) {
  const { db, logger } = d;
  const todayUtc = () => d.now().toISOString().slice(0, 10);

  /** Datas do atleta: hoje ou um dia de diferença do relógio do servidor. */
  const assertDate = (date: string) => {
    if (Math.abs(diff(todayUtc(), date)) > DATE_TOLERANCE_DAYS) {
      throw errors.validation([{ path: "date", code: "date_out_of_range" }]);
    }
  };

  // ---------------------------------------------------------------- contexto

  async function loadContext(tx: Transaction, userId: string, lang: Lang = "pt-BR"): Promise<Ctx> {
    const [profile] = await tx.select().from(athleteProfiles).where(eq(athleteProfiles.userId, userId)).limit(1);
    if (!profile) throw new AppError(409, "INTERVIEW_REQUIRED", "Conclua a entrevista para receber treinos.");
    const stored = profile.interviewResult as StoredInputs;

    const [submitted] = await tx
      .select({ responses: interviewResponses.responses })
      .from(interviewResponses)
      .where(and(eq(interviewResponses.userId, userId), eq(interviewResponses.status, "submitted")))
      .orderBy(desc(interviewResponses.submittedAt))
      .limit(1);
    const availability = (submitted?.responses as { disponibilidade?: Avail } | undefined)?.disponibilidade;
    const avail: Avail = availability ?? { daysPerWeek: 3, minutesPerSession: 60, longRunDay: 7 };

    const [row] = await tx
      .select({ plan: athletePlans, template: planTemplates })
      .from(athletePlans)
      .innerJoin(planTemplates, eq(athletePlans.planTemplateId, planTemplates.id))
      .where(and(eq(athletePlans.userId, userId), eq(athletePlans.status, "active")))
      .limit(1);
    const template = row ? buildPlanTemplate(row.template.objective as Objective, row.template.level as LevelName) : null;
    return {
      profile,
      stored,
      avail,
      plan: row?.plan ?? null,
      template,
      baseWeekly: Math.round((stored.plan.weeklyKm ?? 0) * clsV1.load.minutesPerKm),
      lang,
    };
  }

  const weeksOf = (tx: Transaction, planId: string) =>
    tx.select().from(athletePlanWeeks).where(eq(athletePlanWeeks.athletePlanId, planId)).orderBy(asc(athletePlanWeeks.calendarWeek));

  const sessionsOf = async (tx: Transaction, userId: string, filter: ReturnType<typeof and>): Promise<SessionRow[]> => {
    const rows = await tx
      .select({ s: scheduledWorkouts, slug: workouts.slug, namePt: workouts.namePt, nameEn: workouts.nameEn })
      .from(scheduledWorkouts)
      .innerJoin(workouts, eq(scheduledWorkouts.workoutId, workouts.id))
      .where(and(eq(scheduledWorkouts.userId, userId), filter))
      .orderBy(asc(scheduledWorkouts.scheduledDate), asc(scheduledWorkouts.slot));
    return rows.map((r) => ({ ...r.s, slug: r.slug, namePt: r.namePt, nameEn: r.nameEn }));
  };

  const logsByWorkout = async (tx: Transaction, userId: string, ids: string[]) => {
    if (ids.length === 0) return new Map<string, LogRow>();
    const rows = await tx
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), inArray(workoutLogs.scheduledWorkoutId, ids)));
    return new Map(rows.map((r) => [r.scheduledWorkoutId, r]));
  };

  // ---------------------------------------------------------- semanas do plano

  /** Fecha a semana (ladder e sessões não feitas) e diz qual semana do modelo vem a seguir. */
  async function closeWeek(tx: Transaction, ctx: Ctx, prev: WeekRow): Promise<{ templateWeek: number; repeatedOnce: boolean }> {
    const template = ctx.template!;
    const tw = template.weeks[prev.templateWeek - 1];
    let next = prev.templateWeek + 1;
    let repeatedOnce = false;
    let action: string | null = null;

    if (tw?.ladderStage) {
      const rows = await sessionsOf(tx, ctx.profile.userId, eq(scheduledWorkouts.athletePlanWeekId, prev.id));
      const ladder = rows.filter((r) => r.ladder !== null);
      const done = ladder.filter((r) => r.status === "completed").length;
      const reports = await tx
        .select()
        .from(painReports)
        .where(
          and(
            eq(painReports.userId, ctx.profile.userId),
            gte(painReports.reportedOn, prev.startDate),
            lte(painReports.reportedOn, addDays(prev.startDate, 6)),
          ),
        );
      const painAtLimit = reports.some((r) => r.intensity >= diaV1.pain.progressionLimit);
      const stage = ESCADA_CAMINHADA_CORRIDA.find((e) => e.etapa === tw.ladderStage)!;
      const bmi = ctx.profile.bmi ? Number(ctx.profile.bmi) : 0;
      // Sessões que não couberam nos dias do atleta não contam como "não concluídas".
      const result = nextLadderStep({
        step: { ordem: stage.ordem, repeatedOnce: prev.ladderRepeatedOnce },
        sessionsCompleted: Math.min(3, done + (3 - ladder.length)),
        painAtLimit,
        slowMode: ctx.profile.cautelaLesao || bmi >= 30,
      });
      action = result.action;
      repeatedOnce = result.repeatedOnce;
      if (result.action === "repetir") next = prev.templateWeek;

      // R-PLN-22: "puxado" ou "não consegui" na avaliação do bloco repetem a etapa. Só segura: nunca avança.
      if (result.action !== "repetir" && ctx.plan) {
        const [review] = await tx
          .select({ felt: planReviews.felt })
          .from(planReviews)
          .where(and(eq(planReviews.athletePlanId, ctx.plan.id), eq(planReviews.calendarWeek, prev.calendarWeek)))
          .limit(1);
        if (review && (review.felt === "puxado" || review.felt === "nao_consegui")) {
          action = "repetir";
          repeatedOnce = prev.ladderRepeatedOnce;
          next = prev.templateWeek;
        }
      }
    }

    await tx
      .update(scheduledWorkouts)
      .set({ status: "skipped", updatedAt: d.now() })
      .where(and(eq(scheduledWorkouts.athletePlanWeekId, prev.id), eq(scheduledWorkouts.status, "pending")));
    await tx
      .update(athletePlanWeeks)
      .set({ status: "closed", ladderAction: action, closedAt: d.now() })
      .where(eq(athletePlanWeeks.id, prev.id));
    return { templateWeek: next, repeatedOnce };
  }

  /** Maior sessão de corrida concluída nos 30 dias antes de `before`, em minutos (R-PRG-02). */
  const longestBefore = (runs: { date: string; minutes: number }[], before: string, ctx: Ctx) => {
    let longest = runs.filter((r) => diff(r.date, before) > 0 && diff(r.date, before) <= 30).reduce((m, r) => Math.max(m, r.minutes), 0);
    if (ctx.plan && diff(ctx.plan.startDate, before) < 30) {
      longest = Math.max(longest, Math.round((ctx.stored.plan.longestRecentKm ?? 0) * clsV1.load.minutesPerKm));
    }
    return longest;
  };

  /** Corridas concluídas (data e minutos) de todo o histórico do atleta. */
  async function completedRuns(tx: Transaction, userId: string) {
    const rows = await tx
      .select({ date: scheduledWorkouts.scheduledDate, minutes: workoutLogs.durationMinutes, kind: scheduledWorkouts.kind, weekId: scheduledWorkouts.athletePlanWeekId })
      .from(workoutLogs)
      .innerJoin(scheduledWorkouts, eq(workoutLogs.scheduledWorkoutId, scheduledWorkouts.id))
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, true)));
    return rows
      .filter((r) => !RUN_KINDS_EXCLUDED.has(r.kind))
      .map((r) => ({ date: r.date, minutes: r.minutes ?? 0, weekId: r.weekId }));
  }

  /** Cria as semanas do plano até a semana `upTo` (e as sessões de cada uma), fechando as anteriores. */
  async function ensureWeeks(tx: Transaction, ctx: Ctx, upTo: number): Promise<WeekRow[]> {
    const { plan, template } = ctx;
    if (!plan || !template) return [];
    const userId = ctx.profile.userId;
    const weeks = await weeksOf(tx, plan.id);
    if (weeks.length >= upTo) return weeks;

    const catalog = new Map((await tx.select({ id: workouts.id, slug: workouts.slug }).from(workouts)).map((w) => [w.slug, w.id]));
    const runs = await completedRuns(tx, userId);

    while (weeks.length < upTo) {
      const calendarWeek = weeks.length + 1;
      let templateWeek = plan.startTemplateWeek; // R-PLN-21: onde o atleta entrou na escada
      let repeatedOnce = false;
      if (calendarWeek > 1) {
        const prev = weeks[weeks.length - 1]!;
        if (prev.status !== "closed") {
          const r = await closeWeek(tx, ctx, prev);
          prev.status = "closed";
          templateWeek = r.templateWeek;
          repeatedOnce = r.repeatedOnce;
        } else {
          // semana anterior já fechada: o que veio dela está em templateWeek+1 (ou repetida)
          templateWeek = prev.ladderAction === "repetir" ? prev.templateWeek : prev.templateWeek + 1;
          repeatedOnce = prev.ladderAction === "repetir" ? prev.ladderRepeatedOnce || false : false;
        }
      }
      if (templateWeek > template.durationWeeks) {
        await tx.update(athletePlans).set({ status: "completed", updatedAt: d.now() }).where(eq(athletePlans.id, plan.id));
        break;
      }

      const startDate = addDays(plan.startDate, 7 * (calendarWeek - 1));
      const minutesByWeek = new Map<string, number>();
      for (const r of runs) minutesByWeek.set(r.weekId, (minutesByWeek.get(r.weekId) ?? 0) + r.minutes);
      const previous: ClosedWeek[] = weeks.map((w) => {
        const t = template.weeks[w.templateWeek - 1];
        return { isRecovery: !!t?.isRecovery, isTaper: !!(t?.isTaper || t?.isRaceWeek), minutes: minutesByWeek.get(w.id) ?? 0 };
      });
      const aw = buildAthleteWeek({
        lastBuildWeekMinutes: lastBuildWeekMinutes(previous, ctx.baseWeekly),
        template,
        weekNumber: templateWeek,
        baseWeeklyMinutes: ctx.baseWeekly,
        longest30: longestBefore(runs, startDate, ctx),
        cautelaLesao: ctx.profile.cautelaLesao,
        daysPerWeek: ctx.avail.daysPerWeek,
        minutesPerSession: ctx.avail.minutesPerSession,
        longRunDay: ctx.avail.longRunDay,
        startWeekday: isoWeekday(startDate),
      });

      const [inserted] = await tx
        .insert(athletePlanWeeks)
        .values({ userId, athletePlanId: plan.id, calendarWeek, templateWeek, startDate, ladderRepeatedOnce: repeatedOnce })
        .onConflictDoNothing()
        .returning();
      // Corrida simultânea criou a mesma semana: usa a existente (as sessões já estão lá).
      if (!inserted) return weeksOf(tx, plan.id);
      if (aw.placed.length > 0) {
        await tx.insert(scheduledWorkouts).values(
          aw.placed.map((p) => {
            const workoutId = catalog.get(p.session.slug);
            if (!workoutId) throw new Error(`treino fora do catálogo: ${p.session.slug} (rode o seed)`);
            return {
              userId,
              athletePlanId: plan.id,
              athletePlanWeekId: inserted.id,
              workoutId,
              scheduledDate: addDays(startDate, p.dayOffset),
              slot: p.session.slot,
              kind: p.session.kind,
              plannedMinutes: p.session.minutes,
              maxZone: p.session.maxZone,
              targetRpe: p.session.targetRpe ?? null,
              optional: p.session.optional,
              ladder: p.session.ladder ?? null,
              note: p.session.note ?? null,
            };
          }),
        );
      }
      weeks.push(inserted);
    }
    return weeks;
  }

  const weekFor = (ctx: Ctx, date: string) => {
    if (!ctx.plan || diff(ctx.plan.startDate, date) < 0) return null;
    return Math.floor(diff(ctx.plan.startDate, date) / 7) + 1;
  };

  /**
   * O registro da última sessão da semana já olha o "dia seguinte", que cria a semana seguinte e fecha
   * esta. Se o atleta responde "puxado" depois disso (ainda dentro da semana), a semana seguinte, que
   * ainda não tem nenhum registro, é refeita para repetir a etapa. Só na escada, só segura carga.
   */
  async function holdAlreadyClosedWeek(tx: Transaction, ctx: Ctx, calendarWeek: number) {
    if (!ctx.plan || !ctx.template) return;
    const weeks = await weeksOf(tx, ctx.plan.id);
    const reviewed = weeks.find((w) => w.calendarWeek === calendarWeek);
    const following = weeks.find((w) => w.calendarWeek === calendarWeek + 1);
    if (!reviewed || !following || reviewed.status !== "closed" || reviewed.ladderAction === "repetir") return;
    if (!ctx.template.weeks[reviewed.templateWeek - 1]?.ladderStage) return;
    const sessions = await tx
      .select({ id: scheduledWorkouts.id })
      .from(scheduledWorkouts)
      .where(eq(scheduledWorkouts.athletePlanWeekId, following.id));
    const ids = sessions.map((s) => s.id);
    if (ids.length > 0) {
      const logged = await tx.select({ id: workoutLogs.id }).from(workoutLogs).where(inArray(workoutLogs.scheduledWorkoutId, ids)).limit(1);
      if (logged.length > 0) return; // a semana seguinte já começou: tarde demais para refazer
      await tx.delete(scheduledWorkouts).where(inArray(scheduledWorkouts.id, ids));
    }
    await tx.delete(athletePlanWeeks).where(eq(athletePlanWeeks.id, following.id));
    await tx.update(athletePlanWeeks).set({ ladderAction: "repetir" }).where(eq(athletePlanWeeks.id, reviewed.id));
  }

  /** Estado da avaliação do bloco para a data (R-PLN-22). */
  async function reviewState(tx: Transaction, ctx: Ctx, date: string) {
    const none = { due: false, calendarWeek: null as number | null, felt: null as string | null, advanceSuggested: false };
    if (!ctx.plan) return none;
    const c = weekFor(ctx, date);
    const rows = await tx
      .select({ calendarWeek: planReviews.calendarWeek, felt: planReviews.felt })
      .from(planReviews)
      .where(eq(planReviews.athletePlanId, ctx.plan.id))
      .orderBy(desc(planReviews.calendarWeek));
    // Sugestão: a avaliação mais recente deste plano foi "fácil".
    const advanceSuggested = rows[0]?.felt === "facil";
    if (c === null || c % 2 !== 0) return { ...none, advanceSuggested };
    const lastDays = diff(ctx.plan.startDate, date) % 7 >= 4; // os 3 últimos dias da semana
    const answered = rows.find((r) => r.calendarWeek === c) ?? null;
    return { due: lastDays && !answered, calendarWeek: c, felt: answered?.felt ?? null, advanceSuggested };
  }

  // ------------------------------------------------------------ decisão do dia

  /** Monta a entrada do motor (DayInput) a partir do que está no banco. */
  async function buildDayInput(tx: Transaction, ctx: Ctx, userId: string, date: string, weeks: WeekRow[]) {
    const since = addDays(date, -42);
    const [checkinRows, painRows, logRows, sessions, screeningRow] = await Promise.all([
      tx
        .select()
        .from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.date, since), lte(dailyCheckins.date, date)))
        .orderBy(asc(dailyCheckins.date)),
      tx
        .select()
        .from(painReports)
        .where(and(eq(painReports.userId, userId), lte(painReports.reportedOn, date)))
        .orderBy(asc(painReports.reportedOn)),
      tx
        .select({ log: workoutLogs, s: scheduledWorkouts })
        .from(workoutLogs)
        .innerJoin(scheduledWorkouts, eq(workoutLogs.scheduledWorkoutId, scheduledWorkouts.id))
        .where(eq(workoutLogs.userId, userId)),
      sessionsOf(tx, userId, lte(scheduledWorkouts.scheduledDate, addDays(date, 7))),
      tx
        .select()
        .from(healthScreenings)
        .where(eq(healthScreenings.userId, userId))
        .orderBy(desc(healthScreenings.createdAt))
        .limit(1),
    ]);

    const runSessions = sessions.filter((s) => !s.optional);
    const logBySession = new Map(logRows.map((r) => [r.s.id, r.log]));

    // Tipo da sessão planejada de cada dia (R-SON-06, S1).
    const kindByDate = new Map<string, SessionKind>();
    for (const s of runSessions) if (!kindByDate.has(s.scheduledDate)) kindByDate.set(s.scheduledDate, s.kind as SessionKind);
    const checkins: Checkin[] = checkinRows.map((c) => ({
      date: c.date,
      sleepHours: num(c.sleepHours),
      sleepQuality: c.sleepQuality ?? undefined,
      energy: c.energy ?? undefined,
      mood: c.mood ?? undefined,
      stress: c.stress ?? undefined,
      muscleSoreness: c.generalMuscleSoreness ?? undefined,
      acuteIllness: c.acuteIllness,
      plannedKind: kindByDate.get(c.date),
    }));

    // Corridas registradas e, antes de hoje, as planejadas e não registradas (contam como não feitas).
    // O treino de hoje é o objeto da decisão, não histórico: fica de fora.
    const logs: WorkoutLog[] = [];
    for (const s of runSessions.filter((x) => !RUN_KINDS_EXCLUDED.has(x.kind))) {
      const log = logBySession.get(s.id);
      if (s.scheduledDate >= date) continue;
      logs.push({
        date: s.scheduledDate,
        completed: log?.completed ?? false,
        minutes: log?.completed ? (log.durationMinutes ?? 0) : 0,
        targetRpe: s.targetRpe ?? undefined,
        reportedRpe: log?.srpe ?? undefined,
        exempt: s.ladder !== null,
      });
    }
    const runDates = [...new Set(logs.filter((l) => l.completed).map((l) => l.date))];

    // Dor: a dor da manhã seguinte entra no relato do treino; basal e persistência (R-DOR-15).
    const all: PainReport[] = painRows.map(rowToPain);
    const morningOf = (p: PainReport) =>
      all.find((o) => o.moment === "manha_seguinte" && o.region === p.region && o.date === addDays(p.date, 1));
    const reports: PainReport[] = all
      .filter(
        (p) => !(p.moment === "manha_seguinte" && all.some((o) => o.moment === "treino" && o.region === p.region && addDays(o.date, 1) === p.date)),
      )
      .map((p) => {
        const morning = p.moment === "treino" ? morningOf(p) : undefined;
        let persistent = 0;
        while (all.some((o) => o.region === p.region && o.intensity >= 1 && o.date === addDays(p.date, -persistent))) persistent++;
        const prior = all.filter(
          (o) => o.region === p.region && diff(o.date, p.date) > 0 && diff(o.date, p.date) <= 7 && !runDates.includes(o.date),
        );
        const baseline = prior.length ? prior.reduce((s, o) => s + o.intensity, 0) / prior.length : 0;
        return {
          ...p,
          ...(morning && p.morningSameSite === undefined ? { morningSameSite: morning.intensity } : {}),
          persistentDaysSameSite: persistent,
          baseline,
        };
      });

    // Semana atual, semanas já concluídas e tetos de progressão.
    const c = weekFor(ctx, date);
    const current = c ? weeks.find((w) => w.calendarWeek === c) : undefined;
    const tw = current ? ctx.template?.weeks[current.templateWeek - 1] : undefined;
    const minutesByWeek = new Map<string, number>();
    for (const r of logRows) {
      if (!r.log.completed || RUN_KINDS_EXCLUDED.has(r.s.kind)) continue;
      minutesByWeek.set(r.s.athletePlanWeekId, (minutesByWeek.get(r.s.athletePlanWeekId) ?? 0) + (r.log.durationMinutes ?? 0));
    }
    const closed: ClosedWeek[] = weeks
      .filter((w) => (current ? w.calendarWeek < current.calendarWeek : false))
      .map((w) => {
        const t = ctx.template?.weeks[w.templateWeek - 1];
        return { isRecovery: !!t?.isRecovery, isTaper: !!(t?.isTaper || t?.isRaceWeek), minutes: minutesByWeek.get(w.id) ?? 0 };
      });
    const lastBuild = lastBuildWeekMinutes(closed, ctx.baseWeekly);
    const cautela = ctx.profile.cautelaLesao;
    const weekPlanned = current
      ? runSessions.filter((s) => s.athletePlanWeekId === current.id).reduce((sum, s) => sum + s.plannedMinutes, 0)
      : 0;
    const target = weeklyCaps(lastBuild, cautela).target;
    const inLadderWeek = !!tw?.ladderStage;
    const highLoadWeek = !!current && !inLadderWeek && !tw?.isRecovery && target !== null && weekPlanned >= target;

    const primary = runSessions.find((s) => s.scheduledDate === date);
    const planned: PlannedSession | null = primary
      ? {
          slug: primary.slug,
          kind: primary.kind as SessionKind,
          minutes: primary.plannedMinutes,
          maxZone: primary.maxZone as Zone,
          ...(primary.targetRpe !== null ? { targetRpe: primary.targetRpe } : {}),
        }
      : null;

    // Pausa e retorno (R-PRG-08, R-PRG-09): o episódio fecha 2 semanas depois da primeira corrida liberada.
    // Quem começa do zero nunca correu: a contagem de dias sem correr parte da entrevista,
    // não do "400 dias" informado (que só quer dizer "nunca").
    const lastRunOnInterview = (ctx.profile.flags as string[]).includes("inicio_do_zero")
      ? ctx.stored.classification.asOf
      : interviewLastRun({
          daysSinceLastRun: ctx.stored.classification.daysSinceLastRun,
          asOf: ctx.stored.classification.asOf,
        });
    const cleared = ctx.profile.clearedByProfessionalOn;
    const firstAfterClearance = cleared ? [...runDates].filter((x) => x >= cleared).sort()[0] : undefined;
    const windowDays = diaV1.returnFromPause.noZ3Weeks * 7;
    const episodeOpen =
      !!ctx.profile.pauseCause && !(firstAfterClearance && diff(firstAfterClearance, date) >= windowDays);

    const ageMax = ageRange(ctx.stored.birth.year, ctx.stored.birth.month, date).max;
    const screening = screeningRow[0] ? screen(screeningInputFrom(screeningRow[0], ageMax, date)) : null;

    // A data vai junto: o motor só aceita a resposta dada depois do relato de dor (R-DOR-10).
    const walkingRow = [...checkinRows].reverse().find((r) => r.dailyPainWalking !== null);
    const dailyPainWalking = walkingRow?.dailyPainWalking ?? null;

    const input: DayInput = {
      today: date,
      level: ctx.profile.calculatedLevel as LevelName,
      flags: ctx.profile.flags as DayInput["flags"],
      screening: screening
        ? { state: screening.state, maxIntensity: screening.maxIntensity }
        : { state: "NAO_FEITA", maxIntensity: "nenhuma" },
      planned,
      checkins,
      pain: reports,
      logs,
      daysSinceLastRun: daysSinceLastRun(runDates, date, lastRunOnInterview),
      pauseCause: episodeOpen ? (ctx.profile.pauseCause as DayInput["pauseCause"]) : null,
      clearedByProfessionalAt: cleared,
      lastBuildWeekMinutes: lastBuild,
      highLoadWeek,
      weekStartedOn: current?.startDate,
      isRecoveryWeek: !!tw?.isRecovery,
      inLadder: !!primary?.ladder,
      dailyPainWalking,
      dailyPainWalkingOn: walkingRow?.date ?? null,
      pauseReturnStartedOn: episodeOpen && firstAfterClearance ? firstAfterClearance : pauseReturnStartedOn(runDates, date, lastRunOnInterview),
    };
    return { input, current, tw, sessionsToday: sessions.filter((s) => s.scheduledDate === date), logBySession };
  }

  const decisionLabel = (dec: DayDecision) => `${dec.action}|${dec.session.slug ?? "descanso"}|${dec.session.minutes}`;
  const ruleLabel = (dec: DayDecision) => `${DIA_VERSION}:${[...new Set(dec.reasons.map((r) => r.rule))].join(",")}`.slice(0, 255);

  /** Grava a decisão em engine_decisions quando ela é nova ou mudou em relação à última do dia. */
  async function persistDecision(tx: Transaction, userId: string, date: string, input: DayInput, dec: DayDecision) {
    const [last] = await tx
      .select({ out: engineDecisions.outputDecision, rule: engineDecisions.appliedRule })
      .from(engineDecisions)
      .where(and(eq(engineDecisions.userId, userId), eq(engineDecisions.forDate, date)))
      .orderBy(desc(engineDecisions.createdAt))
      .limit(1);
    if (last && last.out === decisionLabel(dec) && last.rule === ruleLabel(dec)) return;
    await tx.insert(engineDecisions).values({
      userId,
      forDate: date,
      appliedRule: ruleLabel(dec),
      context: input,
      outputDecision: decisionLabel(dec),
      engineVersion: ENGINE_VERSION,
    });
  }

  /** Visão do dia: sessões, check-in, decisão do motor e o que o app ainda precisa perguntar. */
  async function dayView(tx: Transaction, ctx: Ctx, userId: string, date: string) {
    const c = weekFor(ctx, date);
    const weeks = c && ctx.plan ? await ensureWeeks(tx, ctx, c) : [];
    const built = await buildDayInput(tx, ctx, userId, date, weeks);
    const full = decideDay(built.input);
    await persistDecision(tx, userId, date, built.input, full);
    // O motor devolve a mensagem nos dois idiomas; o atleta recebe só a do idioma do app.
    const { messageEn, ...rest } = full;
    const decision = { ...rest, message: ctx.lang === "en" ? messageEn : full.message };

    const [checkin] = await tx
      .select()
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, date)))
      .limit(1);

    // Complementares (força e mobilidade) só quando o dia permite.
    const allowedComplementary = (kind: string) =>
      kind === "forca" ? decision.action === "manter" || decision.action === "reduzir" : decision.action !== "interromper_e_encaminhar";

    // Nome do que o motor mandou fazer hoje (pode ser diferente do planejado: regenerativo, mobilidade).
    const [decided] = decision.session.slug
      ? await tx
          .select({ namePt: workouts.namePt, nameEn: workouts.nameEn })
          .from(workouts)
          .where(eq(workouts.slug, decision.session.slug))
          .limit(1)
      : [];
    const todayName = decided ? { "pt-BR": decided.namePt, en: decided.nameEn } : null;

    const questions: string[] = [];
    if (decision.needsCheckin) questions.push("checkin");
    if (decision.levels.painBlock) questions.push("daily_pain_walking");
    if (decision.reasons.some((r) => r.code === "pausa_aguardando_liberacao") || (decision.refer && decision.levels.painBlock)) {
      questions.push("professional_clearance");
    }
    if (!ctx.profile.pauseCause && (decision.returnBand === "reduzido" || decision.returnBand === "longa")) questions.push("pause_cause");

    return {
      date,
      plan:
        ctx.plan && built.current && built.tw
          ? {
              id: ctx.plan.id,
              template: ctx.template?.slug ?? null,
              calendarWeek: built.current.calendarWeek,
              templateWeek: built.current.templateWeek,
              phase: built.tw.phase,
              isRecovery: built.tw.isRecovery,
              isTaper: built.tw.isTaper,
              isRaceWeek: built.tw.isRaceWeek,
              ladderStage: built.tw.ladderStage ?? null,
              weekStart: built.current.startDate,
              weekEnd: addDays(built.current.startDate, 6),
            }
          : null,
      sessions: built.sessionsToday.map((s) => ({
        ...view(s, built.logBySession.get(s.id)),
        allowed: s.optional ? allowedComplementary(s.kind) : true,
      })),
      checkin: checkin
        ? {
            sleepHours: num(checkin.sleepHours) ?? null,
            sleepQuality: checkin.sleepQuality,
            energy: checkin.energy,
            mood: checkin.mood,
            stress: checkin.stress,
            muscleSoreness: checkin.generalMuscleSoreness,
            restingHr: checkin.restingHr,
            acuteIllness: checkin.acuteIllness,
            dailyPainWalking: checkin.dailyPainWalking,
          }
        : null,
      decision,
      /** Nome (pt/en) do treino indicado pela decisão; `null` no descanso. */
      todayName,
      questions,
    };
  }

  const meaningful = (p: PainReportInput) =>
    p.intensity > 0 ||
    !!p.cardio && Object.values(p.cardio).some(Boolean) ||
    !!p.heat && Object.values(p.heat).some(Boolean) ||
    !!p.darkUrineWithMuscleSwelling ||
    !!p.suddenWeaknessOrFootDrop ||
    !!p.tinglingOrNumbness ||
    !!p.jointSwelling ||
    !!p.lockingOrGivingWay;

  // ---------------------------------------------------------------- API do serviço

  return {
    /** Decisão e sessões do dia (cria a semana do plano na primeira consulta). */
    async day(userId: string, date: string, lang: Lang = "pt-BR") {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => dayView(tx, await loadContext(tx, userId, lang), userId, date));
    },

    /** Semana do plano que contém `date`, com as sessões, os registros e as sem registro. */
    async week(userId: string, date: string) {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId);
        const c = weekFor(ctx, date);
        const weeks = c && ctx.plan ? await ensureWeeks(tx, ctx, c) : [];
        const current = c ? weeks.find((w) => w.calendarWeek === c) : undefined;
        if (!current || !ctx.template) return { plan: null, sessions: [] as SessionView[] };
        const rows = await sessionsOf(tx, userId, eq(scheduledWorkouts.athletePlanWeekId, current.id));
        const logs = await logsByWorkout(tx, userId, rows.map((r) => r.id));
        const tw = ctx.template.weeks[current.templateWeek - 1]!;
        return {
          plan: {
            id: ctx.plan!.id,
            template: ctx.template.slug,
            calendarWeek: current.calendarWeek,
            templateWeek: current.templateWeek,
            phase: tw.phase,
            isRecovery: tw.isRecovery,
            isTaper: tw.isTaper,
            isRaceWeek: tw.isRaceWeek,
            ladderStage: tw.ladderStage ?? null,
            weekStart: current.startDate,
            weekEnd: addDays(current.startDate, 6),
          },
          sessions: rows.map((r) => view(r, logs.get(r.id))),
        };
      });
    },

    /**
     * Plano inteiro do atleta: as semanas já criadas (com sessões e registros) e, para as que faltam,
     * só o contorno do modelo (fase, recuperação, polimento, etapa da escada). As sessões das semanas
     * futuras não existem ainda: dependem do que o atleta fizer até lá, então não são inventadas.
     */
    async overview(userId: string, date: string) {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId);
        const { plan, template } = ctx;
        if (!plan || !template) return { plan: null, currentWeek: null as number | null, weeks: [] as OverviewWeek[] };

        const c = weekFor(ctx, date);
        const created = c ? await ensureWeeks(tx, ctx, c) : await weeksOf(tx, plan.id);
        const rows = await sessionsOf(tx, userId, eq(scheduledWorkouts.athletePlanId, plan.id));
        const logs = await logsByWorkout(tx, userId, rows.map((r) => r.id));

        const shape = (w: { calendarWeek: number; templateWeek: number; startDate: string }, projected: boolean, sessions: SessionView[]): OverviewWeek => {
          const tw = template.weeks[w.templateWeek - 1]!;
          return {
            calendarWeek: w.calendarWeek,
            templateWeek: w.templateWeek,
            startDate: w.startDate,
            endDate: addDays(w.startDate, 6),
            phase: tw.phase,
            isRecovery: tw.isRecovery,
            isTaper: tw.isTaper,
            isRaceWeek: tw.isRaceWeek,
            ladderStage: tw.ladderStage ?? null,
            state: c === null ? "upcoming" : w.calendarWeek < c ? "past" : w.calendarWeek === c ? "current" : "upcoming",
            projected,
            sessions,
          };
        };

        const weeks = created.map((w) =>
          shape(
            w,
            false,
            rows.filter((r) => r.athletePlanWeekId === w.id).map((r) => view(r, logs.get(r.id))),
          ),
        );

        // Semanas que ainda não existem: seguem o modelo a partir da última criada. Na escada, repetir
        // uma etapa empurra tudo uma semana, por isso é só uma previsão ("se tudo correr como o previsto").
        const last = created[created.length - 1];
        let templateWeek = last
          ? last.status === "closed" && last.ladderAction === "repetir"
            ? last.templateWeek
            : last.templateWeek + 1
          : plan.startTemplateWeek;
        let calendarWeek = (last?.calendarWeek ?? 0) + 1;
        while (templateWeek <= template.durationWeeks) {
          weeks.push(shape({ calendarWeek, templateWeek, startDate: addDays(plan.startDate, 7 * (calendarWeek - 1)) }, true, []));
          templateWeek += 1;
          calendarWeek += 1;
        }

        return {
          plan: {
            template: template.slug,
            objective: template.objective,
            level: template.level,
            // Semanas que faltam do modelo a partir de onde o atleta entrou (R-PLN-21).
            durationWeeks: template.durationWeeks - (plan.startTemplateWeek - 1),
            startDate: plan.startDate,
            endDate: plan.endDate,
          },
          currentWeek: c,
          weeks,
        };
      });
    },

    /**
     * Avaliação do bloco de 2 semanas (R-PLN-22). Aparece nos 3 últimos dias das semanas 2, 4, 6...;
     * "facil" só gera uma sugestão de reavaliar, nunca muda a carga do plano atual.
     */
    async review(userId: string, date: string) {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => reviewState(tx, await loadContext(tx, userId), date));
    },

    async saveReview(userId: string, date: string, input: PlanReviewInput) {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId);
        const state = await reviewState(tx, ctx, date);
        if (!ctx.plan || state.calendarWeek === null || (!state.due && state.felt === null)) {
          throw new AppError(409, "REVIEW_NOT_DUE", "A avaliação aparece nos últimos dias de cada bloco de 2 semanas.");
        }
        await tx
          .insert(planReviews)
          .values({ userId, athletePlanId: ctx.plan.id, calendarWeek: state.calendarWeek, felt: input.felt, answeredOn: date })
          .onConflictDoUpdate({
            target: [planReviews.athletePlanId, planReviews.calendarWeek],
            set: { felt: input.felt, answeredOn: date, updatedAt: d.now() },
          });
        if (input.felt === "puxado" || input.felt === "nao_consegui") {
          await holdAlreadyClosedWeek(tx, ctx, state.calendarWeek);
        }
        logger.info("plan_review_saved", { userId, calendarWeek: state.calendarWeek, felt: input.felt });
        return reviewState(tx, ctx, date);
      });
    },

    /**
     * Detalhe de um treino agendado do próprio atleta: a sessão, o registro e o recorte do catálogo
     * (razão, intensidade, blocos, limites, evidência) com as referências. De outro atleta: 404.
     */
    async workout(userId: string, scheduledWorkoutId: string, lang: Lang = "pt-BR") {
      return withAthlete(db, userId, async (tx) => {
        const [row] = await sessionsOf(tx, userId, eq(scheduledWorkouts.id, scheduledWorkoutId));
        if (!row) throw errors.notFound();
        const [catalog] = await tx
          .select({ structure: workouts.structure, version: workouts.version })
          .from(workouts)
          .where(eq(workouts.id, row.workoutId))
          .limit(1);
        const [profile] = await tx
          .select({ level: athleteProfiles.calculatedLevel })
          .from(athleteProfiles)
          .where(eq(athleteProfiles.userId, userId))
          .limit(1);
        const logs = await logsByWorkout(tx, userId, [row.id]);
        const refs = await tx
          .select({
            citation: referencesTable.citation,
            doi: referencesTable.doi,
            url: referencesTable.url,
            studyType: referencesTable.studyType,
          })
          .from(workoutReferences)
          .innerJoin(referencesTable, eq(workoutReferences.referenceId, referencesTable.id))
          .where(eq(workoutReferences.workoutId, row.workoutId))
          .orderBy(asc(referencesTable.citation));
        return {
          session: view(row, logs.get(row.id)),
          detail: withLadderText(workoutDetail(catalog?.structure, profile?.level ?? "", lang), row, lang),
          catalogVersion: catalog?.version ?? null,
          references: refs,
        };
      });
    },

    /** Check-in do dia: grava (um por dia) e devolve a decisão recalculada. */
    async saveCheckin(userId: string, date: string, input: CheckinInput, lang: Lang = "pt-BR") {
      assertDate(date);
      const values = {
        sleepHours: input.sleepHours !== undefined ? input.sleepHours.toFixed(1) : null,
        sleepQuality: input.sleepQuality ?? null,
        energy: input.energy ?? null,
        mood: input.mood ?? null,
        stress: input.stress ?? null,
        generalMuscleSoreness: input.muscleSoreness ?? null,
        restingHr: input.restingHr ?? null,
        acuteIllness: input.acuteIllness ?? false,
        dailyPainWalking: input.dailyPainWalking ?? null,
      };
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId, lang);
        await tx
          .insert(dailyCheckins)
          .values({ userId, date, ...values })
          .onConflictDoUpdate({ target: [dailyCheckins.userId, dailyCheckins.date], set: { ...values, updatedAt: d.now() } });
        return dayView(tx, ctx, userId, date);
      });
    },

    /** Relato de dor ou sintoma fora do registro de treino (check-in, manhã seguinte). */
    async savePain(userId: string, date: string, report: PainReportInput, lang: Lang = "pt-BR") {
      assertDate(date);
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId, lang);
        await tx.insert(painReports).values({ userId, reportedOn: date, ...painToRow(report) });
        logger.info("pain_reported", { userId, moment: report.moment, intensity: report.intensity });
        return dayView(tx, ctx, userId, date);
      });
    },

    /**
     * Registro pós-treino (substitui o anterior da mesma sessão) e a decisão do dia seguinte:
     * é aí que o atleta vê o ajuste e o motivo.
     */
    async logWorkout(userId: string, scheduledWorkoutId: string, input: WorkoutLogInput, lang: Lang = "pt-BR") {
      return withAthlete(db, userId, async (tx) => {
        const [row] = await sessionsOf(tx, userId, eq(scheduledWorkouts.id, scheduledWorkoutId));
        if (!row) throw errors.notFound();
        if (diff(todayUtc(), row.scheduledDate) > DATE_TOLERANCE_DAYS) {
          throw errors.validation([{ path: "scheduledWorkoutId", code: "future_session" }]);
        }
        const ctx = await loadContext(tx, userId, lang);
        const values = {
          completed: input.completed,
          durationMinutes: input.completed ? (input.durationMinutes ?? null) : null,
          distanceKm: input.completed && input.distanceKm !== undefined ? input.distanceKm.toFixed(2) : null,
          srpe: input.completed ? (input.srpe ?? null) : null,
          notes: input.notes ?? null,
        };
        const [log] = await tx
          .insert(workoutLogs)
          .values({ userId, scheduledWorkoutId, ...values })
          .onConflictDoUpdate({ target: workoutLogs.scheduledWorkoutId, set: { ...values, updatedAt: d.now() } })
          .returning();
        await tx.delete(painReports).where(and(eq(painReports.userId, userId), eq(painReports.workoutLogId, log!.id)));
        const reports = input.pain.filter(meaningful);
        if (reports.length > 0) {
          await tx
            .insert(painReports)
            .values(reports.map((p) => ({ userId, workoutLogId: log!.id, reportedOn: row.scheduledDate, ...painToRow(p) })));
        }
        const [updated] = await tx
          .update(scheduledWorkouts)
          .set({ status: input.completed ? "completed" : "skipped", updatedAt: d.now() })
          .where(eq(scheduledWorkouts.id, scheduledWorkoutId))
          .returning();
        logger.info("workout_logged", { userId, completed: input.completed, painReports: reports.length });

        const sameDay = await dayView(tx, ctx, userId, row.scheduledDate);
        const nextDay = await dayView(tx, ctx, userId, addDays(row.scheduledDate, 1));
        return { session: view({ ...updated!, slug: row.slug, namePt: row.namePt, nameEn: row.nameEn }, log), day: sameDay, nextDay };
      });
    },

    /** Pausa por dor, lesão ou doença: exige liberação profissional para voltar (R-PRG-09). */
    async declarePause(userId: string, cause: "dor" | "lesao" | "doenca", date?: string) {
      if (date !== undefined) assertDate(date);
      return withAthlete(db, userId, async (tx) => {
        await loadContext(tx, userId);
        // Data do calendário do atleta, para casar com a data da liberação (que ele também informa).
        const on = date ?? todayUtc();
        await tx
          .update(athleteProfiles)
          .set({ pauseCause: cause, pauseDeclaredOn: on, clearedByProfessionalOn: null, updatedAt: d.now() })
          .where(eq(athleteProfiles.userId, userId));
        return { pauseCause: cause, pauseDeclaredOn: on, clearedByProfessionalOn: null };
      });
    },

    /** Autodeclaração de que um profissional avaliou e liberou (R-DOR-10, R-PRG-09). */
    async declareClearance(userId: string, date: string) {
      if (diff(todayUtc(), date) > DATE_TOLERANCE_DAYS) throw errors.validation([{ path: "date", code: "future_date" }]);
      return withAthlete(db, userId, async (tx) => {
        const ctx = await loadContext(tx, userId);
        await tx
          .update(athleteProfiles)
          .set({ clearedByProfessionalOn: date, updatedAt: d.now() })
          .where(eq(athleteProfiles.userId, userId));
        logger.info("professional_clearance_declared", { userId });
        return { pauseCause: ctx.profile.pauseCause, pauseDeclaredOn: ctx.profile.pauseDeclaredOn, clearedByProfessionalOn: date };
      });
    },

    /** Sono, carga semanal (sRPE × minutos), dor e aderência (seção 8 da especificação). */
    async history(userId: string, days: number) {
      const to = todayUtc();
      const from = addDays(to, -(days - 1));
      return withAthlete(db, userId, async (tx) => {
        const [checkinRows, painRows, weekRows, logRows] = await Promise.all([
          tx
            .select()
            .from(dailyCheckins)
            .where(and(eq(dailyCheckins.userId, userId), gte(dailyCheckins.date, from), lte(dailyCheckins.date, to)))
            .orderBy(asc(dailyCheckins.date)),
          tx
            .select()
            .from(painReports)
            .where(and(eq(painReports.userId, userId), gte(painReports.reportedOn, from), lte(painReports.reportedOn, to)))
            .orderBy(asc(painReports.reportedOn)),
          tx
            .select()
            .from(athletePlanWeeks)
            .where(and(eq(athletePlanWeeks.userId, userId), gte(athletePlanWeeks.startDate, addDays(from, -6)), lte(athletePlanWeeks.startDate, to)))
            .orderBy(asc(athletePlanWeeks.startDate)),
          tx
            .select({ log: workoutLogs, s: scheduledWorkouts })
            .from(scheduledWorkouts)
            .leftJoin(workoutLogs, eq(workoutLogs.scheduledWorkoutId, scheduledWorkouts.id))
            .where(and(eq(scheduledWorkouts.userId, userId), gte(scheduledWorkouts.scheduledDate, addDays(from, -6)), lte(scheduledWorkouts.scheduledDate, to))),
        ]);

        const weekly = weekRows.map((w) => {
          const rows = logRows.filter((r) => r.s.athletePlanWeekId === w.id && !r.s.optional);
          const due = rows.filter((r) => r.s.scheduledDate <= to);
          const done = due.filter((r) => r.log?.completed);
          const minutes = done.reduce((s, r) => s + (r.log?.durationMinutes ?? 0), 0);
          const load = done.reduce((s, r) => s + (r.log?.durationMinutes ?? 0) * (r.log?.srpe ?? 0), 0);
          return {
            weekStart: w.startDate,
            plannedSessions: due.length,
            completedSessions: done.length,
            adherencePct: due.length ? Math.round((done.length / due.length) * 100) : null,
            minutes,
            /** Carga interna em unidades arbitrárias (sRPE CR-10 × minutos, Foster). */
            srpeLoad: load,
          };
        });

        return {
          from,
          to,
          sleep: checkinRows.map((c) => ({ date: c.date, hours: num(c.sleepHours) ?? null, quality: c.sleepQuality })),
          pain: painRows.map((p) => ({ date: p.reportedOn, region: p.bodyPart, intensity: p.intensity, moment: p.moment })),
          weekly,
        };
      });
    },
  };
}

export type TrainingService = ReturnType<typeof trainingService>;
