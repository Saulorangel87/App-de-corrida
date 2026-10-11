import { useEffect, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FlowLayout } from "../components/flow-layout";
import { ApiError, fetchApi } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { useErrorText } from "../lib/use-error-text";
import { zoneUpTo } from "../lib/zone";
import { DecisionSources } from "../components/decision-sources";
import { WeekAgenda, weekStats } from "../components/week-agenda";
import { localized, useDay, useWeek, type DayAction, type DayResponse, type WeekResponse } from "../lib/training";

export const Route = createFileRoute("/painel")({
  component: Panel,
});

type ProfileSummary = {
  plan: { objective: string; endDate: string } | null;
};

const ACTION_TONE: Record<DayAction, string> = {
  manter: "bg-green-100 text-green-700",
  reduzir: "bg-amber-100 text-amber-800",
  regenerativo: "bg-sky-100 text-sky-800",
  descanso_ou_mobilidade: "bg-gray-100 text-gray-700",
  interromper_e_encaminhar: "bg-red-100 text-red-700",
};

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Panel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();
  const today = localToday();

  // Quem ainda não fez a entrevista não tem perfil (404): vai para ela.
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchApi<{ profile: ProfileSummary }>("/profile").then((r) => r.profile),
    enabled: !loading,
    retry: false,
  });
  const noProfile = profile.error instanceof ApiError && profile.error.status === 404;
  useEffect(() => {
    if (noProfile) void navigate({ to: "/entrevista" });
  }, [noProfile, navigate]);

  const ready = !loading && !!user && profile.isSuccess;
  const day = useDay(today, ready);
  const week = useWeek(today, ready);

  if (loading || !user || profile.isLoading || noProfile || (ready && (day.isLoading || week.isLoading))) {
    return (
      <FlowLayout width="max-w-[960px]">
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }

  const failure = profile.error ?? day.error ?? week.error;
  if (failure || !day.data || !week.data) {
    return (
      <FlowLayout width="max-w-[960px]">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {failure ? errorText(failure) : t("panel.loadError")}
        </div>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout width="max-w-[960px]">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("panel.hello", { name: user.name })}</h1>
        <p className="text-sm text-gray-500">
          <DateText iso={today} />
        </p>
      </div>
      {day.data.plan === null ? (
        <NoPlan />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-4">
            <TodayCard day={day.data} />
          </div>
          <div className="space-y-4">
            <WeekCard week={week.data} today={today} />
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/plano"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-gray-50"
              >
                {t("panel.planCta")}
              </Link>
              <Link
                to="/historico"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-gray-50"
              >
                {t("history.title")}
              </Link>
            </div>
            {profile.data?.plan && <GoalCard plan={profile.data.plan} />}
          </div>
        </div>
      )}
    </FlowLayout>
  );
}

function DateText({ iso }: { iso: string }) {
  const { i18n } = useTranslation();
  return <>{formatDate(iso, i18n.language, { dateStyle: "full" })}</>;
}

function NoPlan() {
  const { t } = useTranslation();
  return (
    <Card title={t("panel.noPlanTitle")}>
      <p className="text-[15px] leading-relaxed text-gray-700">{t("panel.noPlanText")}</p>
      <Link to="/resultado" className="mt-4 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
        {t("panel.seeProfile")}
      </Link>
    </Card>
  );
}

function TodayCard({ day }: { day: DayResponse }) {
  const { t, i18n } = useTranslation();
  const d = day.decision;
  const rest = d.session.slug === null;
  const complementary = day.sessions.filter((s) => s.optional);
  const name = localized(day.todayName, i18n.language, t("panel.rest"));
  // Treino principal de hoje (o registro pós-treino fica nele).
  const mainSession = day.sessions.find((s) => !s.optional);

  return (
    <>
      <Card
        title={t("panel.todayTitle")}
        aside={
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ACTION_TONE[d.action]}`}>
            {rest && d.action === "manter" ? t("panel.restPlanned") : t(`panel.actions.${d.action}`)}
          </span>
        }
      >
        {d.urgent && (
          <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {t("panel.urgent")}
          </p>
        )}
        <p className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{rest ? t("panel.rest") : name}</p>
        {rest ? (
          <p className="mt-1 text-gray-600">{t("panel.restText")}</p>
        ) : (
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
            <Fact>{t("panel.minutes", { count: d.session.minutes })}</Fact>
            {d.session.maxZone && <Fact>{zoneUpTo(t, d.session.maxZone)}</Fact>}
            {day.sessions.find((s) => !s.optional && s.slug === d.session.slug)?.targetRpe != null && (
              <Fact>{t("panel.rpe", { rpe: day.sessions.find((s) => !s.optional && s.slug === d.session.slug)!.targetRpe })}</Fact>
            )}
          </dl>
        )}

        {mainSession && (
          <Link
            to="/registro/$id"
            params={{ id: mainSession.id }}
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-gray-50"
          >
            {mainSession.log ? t("panel.logEdit") : t("panel.logCta")}
          </Link>
        )}
        {mainSession && (
          <Link
            to="/treino/$id"
            params={{ id: mainSession.id }}
            className="mt-3 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline"
          >
            {t("panel.detailsCta")}
          </Link>
        )}

        <div className="mt-4 rounded-xl bg-[#F5F6F8] p-4 text-sm leading-relaxed text-gray-700">
          <p className="mb-1 font-semibold text-[#111827]">{t("panel.whyTitle")}</p>
          {/* Texto do motor de regras, com as fontes entre colchetes; só em português por enquanto. */}
          <p lang="pt-BR" className="whitespace-pre-line">
            {d.message}
          </p>
          <DecisionSources sources={d.sources ?? []} />
        </div>
      </Card>

      <CheckinPrompt day={day} />

      {complementary.length > 0 && (
        <Card title={t("panel.complementary")}>
          <ul className="space-y-2">
            {complementary.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <Link to="/treino/$id" params={{ id: s.id }} className="font-medium text-[#0F172A] hover:text-[#FF5A1F] hover:underline">
                  {localized(s.name, i18n.language, s.slug)}
                </Link>
                <span className="text-gray-500">
                  {s.allowed === false ? t("panel.notAllowedToday") : t("panel.minutes", { count: s.minutes })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return <div className="font-semibold">{children}</div>;
}

function CheckinPrompt({ day }: { day: DayResponse }) {
  const { t } = useTranslation();
  const done = day.checkin !== null;
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border p-5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between ${
        done ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
      }`}
    >
      <div>
        <p className="font-bold text-[#0F172A]">{done ? t("panel.checkinDone") : t("panel.checkinTitle")}</p>
        {!done && <p className="text-sm text-gray-700">{t("panel.checkinText")}</p>}
      </div>
      <Link
        to="/checkin"
        className="flex items-center justify-center rounded-xl bg-[#FF5A1F] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#e6511a]"
      >
        {done ? t("panel.checkinEdit") : t("panel.checkinCta")}
      </Link>
    </section>
  );
}

function WeekCard({ week, today }: { week: WeekResponse; today: string }) {
  const { t } = useTranslation();
  const plan = week.plan;
  if (!plan) {
    return (
      <Card title={t("panel.weekTitle")}>
        <p className="text-sm text-gray-600">{t("panel.noSessions")}</p>
      </Card>
    );
  }
  const { total, done, plannedMinutes, doneMinutes } = weekStats(week.sessions);
  const tag = plan.isRaceWeek ? t("panel.raceWeek") : plan.isTaper ? t("panel.taperWeek") : plan.isRecovery ? t("panel.recoveryWeek") : null;

  return (
    <Card
      title={t("panel.weekTitle")}
      aside={<span className="text-xs font-semibold text-gray-500">{t("panel.weekNumber", { n: plan.calendarWeek })}</span>}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t(`panel.phases.${plan.phase}`, { defaultValue: plan.phase })}
        {tag ? ` · ${tag}` : ""}
      </p>
      <div className="mb-4 space-y-2">
        <p className="text-sm font-semibold text-[#0F172A]">{t("panel.weekDone", { done, total })}</p>
        <progress
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 [&::-moz-progress-bar]:bg-[#FF5A1F] [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-[#FF5A1F]"
          max={Math.max(plannedMinutes, 1)}
          value={Math.min(doneMinutes, plannedMinutes)}
          aria-label={t("panel.weekMinutes", { done: doneMinutes, total: plannedMinutes })}
        />
        <p className="text-xs text-gray-500">{t("panel.weekMinutes", { done: doneMinutes, total: plannedMinutes })}</p>
      </div>
      <WeekAgenda weekStart={plan.weekStart} sessions={week.sessions} today={today} />
    </Card>
  );
}

function GoalCard({ plan }: { plan: { objective: string; endDate: string } }) {
  const { t, i18n } = useTranslation();
  return (
    <Card title={t("panel.goalTitle")}>
      <p className="font-semibold text-[#0F172A]">{t(`result.objectives.${plan.objective}`, { defaultValue: plan.objective })}</p>
      <p className="text-sm text-gray-600">{t("panel.goalPlanEnds", { date: formatDate(plan.endDate, i18n.language) })}</p>
      <Link to="/resultado" className="mt-3 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
        {t("panel.seeProfile")}
      </Link>
    </Card>
  );
}
