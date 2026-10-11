import { useEffect, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FlowLayout } from "../components/flow-layout";
import { WeekAgenda, weekStats } from "../components/week-agenda";
import { ApiError } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { usePlanOverview, type OverviewWeek, type PlanOverviewResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/plano")({
  component: PlanPage,
});

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">{value}</p>
    </div>
  );
}

function PlanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();
  const today = localToday();
  const overview = usePlanOverview(today, !loading && !!user);

  // Sem entrevista concluída ainda não há plano: segue para ela, como o painel.
  const needsInterview = overview.error instanceof ApiError && overview.error.status === 409;
  useEffect(() => {
    if (needsInterview) void navigate({ to: "/entrevista" });
  }, [needsInterview, navigate]);

  return (
    <FlowLayout width="max-w-[960px]">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("plan.title")}</h1>
      {loading || !user || overview.isLoading || needsInterview ? (
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      ) : overview.error || !overview.data ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {overview.error ? errorText(overview.error) : t("plan.loadError")}
        </div>
      ) : overview.data.plan === null ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{t("panel.noPlanTitle")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{t("panel.noPlanText")}</p>
          <Link to="/resultado" className="mt-4 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
            {t("panel.seeProfile")}
          </Link>
        </section>
      ) : (
        <PlanBody data={overview.data} plan={overview.data.plan} today={today} />
      )}
    </FlowLayout>
  );
}

function PlanBody({ data, plan, today }: { data: PlanOverviewResponse; plan: NonNullable<PlanOverviewResponse["plan"]>; today: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const fullDate = (iso: string) => formatDate(iso, lang, { dateStyle: "long" });

  // Resumo: só soma e conta o que a API devolveu.
  const started = data.weeks.filter((w) => !w.projected);
  const stats = started.map((w) => weekStats(w.sessions));
  const done = stats.reduce((s, x) => s + x.done, 0);
  const planned = stats.reduce((s, x) => s + x.total, 0);
  const current = data.weeks.find((w) => w.state === "current");
  const finished = !current && data.weeks.length > 0 && data.weeks.every((w) => w.state === "past");
  const hasLadder = data.weeks.some((w) => w.ladderStage !== null);

  const weekTile = current
    ? t("plan.tileWeekValue", { n: current.calendarWeek, total: data.weeks.length })
    : finished
      ? t("plan.tileFinished")
      : t("plan.tileNotStarted", { date: fullDate(plan.startDate) });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold text-[#0F172A]">
          {t("plan.goalLine", {
            objective: t(`result.objectives.${plan.objective}`, { defaultValue: plan.objective }),
            level: t(`result.levels.${plan.level}`, { defaultValue: plan.level }),
          })}
        </p>
        <p className="text-sm text-gray-500">{t("plan.dates", { start: fullDate(plan.startDate), end: fullDate(plan.endDate) })}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <Tile label={t("plan.tileWeek")} value={weekTile} />
        <Tile label={t("plan.tileDone")} value={t("plan.tileDoneValue", { done, total: planned })} />
        <Tile label={t("plan.tileEnds")} value={formatDate(plan.endDate, lang, { day: "numeric", month: "short", year: "numeric" })} />
      </div>

      <p className="rounded-xl bg-white p-4 text-sm leading-relaxed text-gray-600">
        {t("plan.note")}
        {hasLadder && <> {t("plan.noteLadder")}</>}
      </p>

      <section aria-labelledby="plan-weeks">
        <h2 id="plan-weeks" className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">
          {t("plan.weeksTitle")}
        </h2>
        <ol className="space-y-3">
          {data.weeks.map((w) => (
            <li key={w.calendarWeek}>
              <WeekRow week={w} today={today} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function WeekRow({ week, today }: { week: OverviewWeek; today: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const short = (iso: string) => formatDate(iso, lang, { day: "numeric", month: "short" });
  const isCurrent = week.state === "current";

  const tags = [t(`panel.phases.${week.phase}`, { defaultValue: week.phase })];
  if (week.isRaceWeek) tags.push(t("panel.raceWeek"));
  else if (week.isTaper) tags.push(t("panel.taperWeek"));
  else if (week.isRecovery) tags.push(t("panel.recoveryWeek"));
  if (week.ladderStage) tags.push(t("workout.ladderTitle", { etapa: week.ladderStage }));

  const frame = `rounded-2xl border bg-white ${isCurrent ? "border-[#FF5A1F]" : "border-gray-200"}`;

  const heading = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold text-[#0F172A]">{t("panel.weekNumber", { n: week.calendarWeek })}</span>
        {isCurrent && <Badge tone="bg-orange-100 text-orange-800">{t("plan.current")}</Badge>}
        {week.projected && <Badge tone="bg-gray-100 text-gray-600">{t("plan.projected")}</Badge>}
      </div>
      <p className="text-sm text-gray-500">
        {short(week.startDate)} – {short(week.endDate)}
      </p>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tags.join(" · ")}</p>
    </div>
  );

  // Semana ainda não criada: só o contorno do modelo, sem treinos.
  if (week.projected) {
    return <div className={`${frame} p-4`}>{heading}</div>;
  }

  const stats = weekStats(week.sessions);
  return (
    <details className={frame} open={isCurrent}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
        {heading}
        <span className="shrink-0 text-right text-sm font-semibold text-[#0F172A]">
          {t("panel.weekDone", { done: stats.done, total: stats.total })}
          <span className="block text-xs font-normal text-gray-500">{t("panel.weekMinutes", { done: stats.doneMinutes, total: stats.plannedMinutes })}</span>
        </span>
      </summary>
      <div className="border-t border-gray-100 px-4 pb-3">
        {week.sessions.length === 0 ? (
          <p className="py-3 text-sm text-gray-600">{t("plan.noSessions")}</p>
        ) : (
          <WeekAgenda weekStart={week.startDate} sessions={week.sessions} today={today} />
        )}
      </div>
    </details>
  );
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{children}</span>;
}
