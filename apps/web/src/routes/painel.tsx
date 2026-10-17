import { useEffect, useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Footprints, Gauge, Moon, Route as RouteIcon, X, Zap, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlowLayout } from "../components/flow-layout";
import { DecisionSources } from "../components/decision-sources";
import { HealthChangeCard } from "../components/health-change";
import { NewsBanner } from "../components/news";
import { PlanNoticeCard, type PlanNotice } from "../components/plan-notice";
import { PlanReviewCard } from "../components/plan-review";
import { PanelSkeleton } from "../components/skeletons";
import { weekStats } from "../components/week-agenda";
import { ApiError, fetchApi } from "../lib/api";
import { addDays, formatDate, localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { useErrorText } from "../lib/use-error-text";
import { zoneUpTo } from "../lib/zone";
import {
  localized,
  useDay,
  useHistory,
  useWeek,
  type DayAction,
  type DayResponse,
  type SessionView,
  type WeekResponse,
} from "../lib/training";

export const Route = createFileRoute("/painel")({
  component: Panel,
});

type ProfileSummary = {
  plan: { objective: string; startDate: string; endDate: string; durationWeeks: number } | null;
  /** Último plano concluído, quando não há plano ativo: alimenta o cartão do próximo objetivo. */
  completedPlan?: { objective: string } | null;
  /** Por que ainda não há plano com a triagem liberada (prova perto demais); vem pronto do servidor. */
  planNotice?: PlanNotice | null;
  /** `healthCheckDue`: o servidor diz quando a pergunta semanal de saúde (R-TRI-11) deve aparecer. */
  screening: { healthCheckDue: boolean } | null;
};

// ---------------------------------------------------------------- utilidades de exibição
// Só formatação do que a API devolveu: nenhum treino, limite ou classificação é calculado aqui.

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** 132 → "2h 12 min"; 45 → "45 min". */
function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/** Minutos por km em "5:41". */
function paceText(minutesPerKm: number): string {
  const total = Math.round(minutesPerKm * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- cartões

const card = "rounded-2xl border border-[#E5E7EB] bg-white p-5";

function Card({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${card} ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  hint,
  progress,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  progress?: number;
}) {
  return (
    <div className={`${card} flex flex-col gap-3.5`}>
      <span className={`grid size-10 place-items-center rounded-[10px] ${tone}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-[13px] font-medium text-[#475569]">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0F172A]">{value}</span>
          {unit && <span className="text-[15px] font-semibold text-[#94A3B8]">{unit}</span>}
        </p>
      </div>
      {progress !== undefined && (
        <progress
          className="progress-reveal h-1.5 w-full overflow-hidden rounded-full bg-[#F5F6F8] [&::-moz-progress-bar]:bg-[#FF5A1F] [&::-webkit-progress-bar]:bg-[#F5F6F8] [&::-webkit-progress-value]:bg-[#FF5A1F]"
          max={100}
          value={Math.max(0, Math.min(100, progress))}
          aria-label={label}
        />
      )}
      <p className="text-xs text-[#94A3B8]">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------- tela

function Panel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const errorText = useErrorText();
  const { user, loading } = useRequireUser();
  const today = localToday();
  const [healthAnswered, setHealthAnswered] = useState(false);

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
  const history = useHistory(7, ready);

  if (loading || !user || profile.isLoading || noProfile || (ready && (day.isLoading || week.isLoading))) {
    return (
      <FlowLayout width="max-w-[1112px]">
        <PanelSkeleton />
      </FlowLayout>
    );
  }

  const failure = profile.error ?? day.error ?? week.error;
  if (failure || !day.data || !week.data) {
    return (
      <FlowLayout width="max-w-[1112px]">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {failure ? errorText(failure) : t("panel.loadError")}
        </div>
      </FlowLayout>
    );
  }

  const lang = i18n.language;
  const planInfo = day.data.plan;
  const goal = profile.data?.plan ?? null;
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greetMorning" : hour < 18 ? "greetAfternoon" : "greetEvening";
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const dateLabel = capitalize(formatDate(today, lang, { weekday: "long", day: "numeric", month: "long" }));
  const subtitle =
    planInfo && goal
      ? t("dash.subtitle", {
          date: dateLabel,
          week: planInfo.calendarWeek,
          total: goal.durationWeeks,
          objective: t(`result.objectives.${goal.objective}`, { defaultValue: goal.objective }),
        })
      : planInfo
        ? t("dash.subtitleShort", { date: dateLabel, week: planInfo.calendarWeek })
        : dateLabel;

  const mainSession = day.data.sessions.find((s) => !s.optional);

  return (
    <FlowLayout width="max-w-[1112px]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0F172A]">{t(`dash.${greetKey}`, { name: firstName })}</h1>
          <p className="mt-1 text-sm text-[#475569]">{subtitle}</p>
        </div>
        {/* Atalho só no desktop: no celular o mesmo botão já aparece no cartão do treino de hoje.
            O check-in tem um único botão, no aviso abaixo. */}
        {planInfo && mainSession && (
          <Link
            to="/registro/$id"
            params={{ id: mainSession.id }}
            className="hidden h-11 items-center justify-center gap-2 rounded-xl bg-[#C2410C] px-[18px] text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] sm:inline-flex"
          >
            <Footprints size={18} aria-hidden="true" />
            {mainSession.log ? t("panel.logEdit") : t("panel.logCta")}
          </Link>
        )}
      </div>

      {user && <NewsBanner user={user} />}

      {planInfo === null ? (
        <NoPlan completed={profile.data?.completedPlan ?? null} notice={profile.data?.planNotice ?? null} />
      ) : (
        <div className="stagger space-y-5">
          {(profile.data?.screening?.healthCheckDue || healthAnswered) && (
            <HealthChangeCard variant="banner" onAnswered={() => setHealthAnswered(true)} />
          )}
          <CheckinPrompt day={day.data} />
          <PlanReviewCard date={today} />

          <StatsRow week={week.data} sleep={history.data?.sleep ?? null} />

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <TodayCard day={day.data} />
            <div className="space-y-5">
              <WeeklyVolume week={week.data} today={today} />
              <Complementary day={day.data} />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[316px_minmax(0,1fr)_340px]">
            {goal && <GoalCard goal={goal} today={today} currentWeek={planInfo.calendarWeek} />}
            <WeekPlan week={week.data} today={today} className="md:order-3 md:col-span-2 xl:order-2 xl:col-span-1" />
            <RecentWorkouts week={week.data} className="md:order-2 xl:order-3" />
          </div>
        </div>
      )}
    </FlowLayout>
  );
}

function NoPlan({ completed, notice }: { completed: { objective: string } | null; notice: PlanNotice | null }) {
  const { t } = useTranslation();
  if (notice && !completed) return <PlanNoticeCard notice={notice} />;
  if (completed) {
    return (
      <section className={card}>
        <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">
          {t("review.completedTitle", { objective: t(`result.objectives.${completed.objective}`, { defaultValue: completed.objective }) })}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{t("review.completedText")}</p>
        <Link to="/entrevista" className="mt-4 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
          {t("review.completedCta")}
        </Link>
      </section>
    );
  }
  return (
    <section className={card}>
      <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{t("panel.noPlanTitle")}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{t("panel.noPlanText")}</p>
      <Link to="/resultado" className="mt-4 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
        {t("panel.seeProfile")}
      </Link>
    </section>
  );
}

function CheckinPrompt({ day }: { day: DayResponse }) {
  const { t } = useTranslation();
  const done = day.checkin !== null;
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border p-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between ${
        done ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
      }`}
    >
      <div>
        <p className="flex items-center gap-2 font-bold text-[#0F172A]">
          {done && <Check size={18} className="shrink-0 text-green-700" aria-hidden="true" />}
          {done ? t("panel.checkinDone") : t("panel.checkinTitle")}
        </p>
        <p className="text-sm text-gray-700">{done ? t("panel.checkinDoneText") : t("panel.checkinText")}</p>
      </div>
      {/* Único botão de check-in da tela: principal enquanto falta fazer, secundário depois de feito. */}
      <Link
        to="/checkin"
        className={`flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
          done
            ? "border border-green-300 bg-white text-green-800 hover:bg-green-100"
            : "bg-[#C2410C] text-white hover:bg-[#9A3412]"
        }`}
      >
        {done ? t("panel.checkinEdit") : t("panel.checkinCta")}
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------- resumo da semana

function StatsRow({ week, sleep }: { week: WeekResponse; sleep: { hours: number | null }[] | null }) {
  const { t, i18n } = useTranslation();
  const number = (n: number, digits = 1) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: digits }).format(n);
  const stats = weekStats(week.sessions);
  const doneRuns = week.sessions.filter((s) => !s.optional && s.log?.completed);

  const distance = doneRuns.reduce((sum, s) => sum + (s.log?.distanceKm ?? 0), 0);
  // Ritmo: só dos treinos em que o atleta informou distância e duração.
  const withBoth = doneRuns.filter((s) => (s.log?.distanceKm ?? 0) > 0 && (s.log?.durationMinutes ?? 0) > 0);
  const paceKm = withBoth.reduce((sum, s) => sum + (s.log?.distanceKm ?? 0), 0);
  const paceMin = withBoth.reduce((sum, s) => sum + (s.log?.durationMinutes ?? 0), 0);
  const sleepHours = (sleep ?? []).flatMap((s) => (s.hours === null ? [] : [s.hours]));
  const sleepAvg = sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={RouteIcon}
        tone="bg-[#FFEDE5] text-[#C2410C]"
        label={t("dash.stats.distance")}
        value={distance > 0 ? number(distance) : "—"}
        unit={distance > 0 ? "km" : undefined}
        hint={distance > 0 ? t("dash.stats.distanceHint") : t("dash.stats.distanceNone")}
      />
      <StatCard
        icon={Clock}
        tone="bg-[#DBEAFE] text-[#2563EB]"
        label={t("dash.stats.time")}
        value={duration(stats.doneMinutes)}
        hint={t("dash.stats.timeHint", { done: stats.done, total: stats.total })}
        progress={stats.total > 0 ? (stats.done / stats.total) * 100 : 0}
      />
      <StatCard
        icon={Gauge}
        tone="bg-[#EDE9FE] text-[#7C3AED]"
        label={t("dash.stats.pace")}
        value={paceKm > 0 ? paceText(paceMin / paceKm) : "—"}
        unit={paceKm > 0 ? "/km" : undefined}
        hint={paceKm > 0 ? t("dash.stats.paceHint") : t("dash.stats.paceNone")}
      />
      <StatCard
        icon={Moon}
        tone="bg-[#DCFCE7] text-[#16A34A]"
        label={t("dash.stats.sleep")}
        value={sleepAvg !== null ? number(sleepAvg) : "—"}
        unit={sleepAvg !== null ? "h" : undefined}
        hint={sleepAvg !== null ? t("dash.stats.sleepHint") : t("dash.stats.sleepNone")}
      />
    </div>
  );
}

// ---------------------------------------------------------------- treino de hoje

const ACTION_TONE_DARK: Record<DayAction, string> = {
  manter: "bg-green-500/15 text-green-300",
  reduzir: "bg-amber-500/15 text-amber-300",
  regenerativo: "bg-sky-500/15 text-sky-300",
  descanso_ou_mobilidade: "bg-white/10 text-slate-200",
  interromper_e_encaminhar: "bg-red-500/20 text-red-300",
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl bg-white/[0.06] p-3">
      <p className="text-[11px] font-medium text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-base font-bold leading-snug text-white">{value}</p>
    </div>
  );
}

function TodayCard({ day }: { day: DayResponse }) {
  const { t, i18n } = useTranslation();
  const d = day.decision;
  const rest = d.session.slug === null;
  const name = localized(day.todayName, i18n.language, t("panel.rest"));
  const mainSession = day.sessions.find((s) => !s.optional);
  const planned = mainSession && mainSession.slug === d.session.slug ? mainSession : undefined;
  const ladder = planned?.ladder ?? null;
  const zoneName = d.session.maxZone ? t(`panel.zoneNames.${d.session.maxZone}`, { defaultValue: d.session.maxZone }) : null;

  return (
    <section className="rounded-2xl bg-[#111827] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,90,31,0.15)] px-2.5 py-1 text-xs font-semibold text-[#FF5A1F]">
          <Zap size={14} aria-hidden="true" />
          <h2>{t("panel.todayTitle")}</h2>
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ACTION_TONE_DARK[d.action]}`}>
          {rest && d.action === "manter" ? t("panel.restPlanned") : t(`panel.actions.${d.action}`)}
        </span>
      </div>

      {d.urgent && (
        <p role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 p-3 text-sm font-semibold text-red-200">
          {t("panel.urgent")}
        </p>
      )}

      <p className="mt-4 text-2xl font-extrabold tracking-tight">{rest ? t("panel.rest") : name}</p>
      {rest ? (
        <p className="mt-1.5 text-sm text-[#94A3B8]">{t("panel.restText")}</p>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-[#94A3B8]">{d.session.maxZone && zoneUpTo(t, d.session.maxZone)}</p>
          <div className="mt-4 flex gap-3">
            <Chip label={t("dash.today.duration")} value={t("panel.minutes", { count: d.session.minutes })} />
            {d.session.maxZone && zoneName && (
              <Chip label={t("dash.today.zone")} value={t("dash.today.zoneShort", { level: capitalize(zoneName), zone: d.session.maxZone })} />
            )}
            {planned?.targetRpe != null && <Chip label={t("dash.today.effort")} value={t("dash.today.effortValue", { rpe: planned.targetRpe })} />}
          </div>
          {ladder && (
            <div className="mt-4 flex items-center gap-3">
              <span className="h-8 w-1 shrink-0 rounded bg-[#FF5A1F]" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold">{t("workout.ladderTitle", { etapa: ladder.etapa })}</p>
                <p className="text-xs text-[#94A3B8]">
                  {ladder.continua
                    ? t("workout.ladderContinuous", { run: ladder.corridaMin })
                    : t("workout.ladderRepeat", { reps: ladder.repeticoes, run: ladder.corridaMin, walk: ladder.caminhadaMin })}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 rounded-xl bg-white/[0.06] p-4 text-sm leading-relaxed text-[#CBD5E1]">
        <p className="mb-1 font-semibold text-white">{t("panel.whyTitle")}</p>
        {/* Texto do motor de regras, já no idioma da tela (as fontes vêm à parte). */}
        <p lang={i18n.language} className="whitespace-pre-line">
          {d.message}
        </p>
        <DecisionSources sources={d.sources ?? []} dark />
      </div>

      {mainSession && (
        <div className="mt-4 flex flex-col gap-2.5 min-[480px]:flex-row">
          <Link
            to="/registro/$id"
            params={{ id: mainSession.id }}
            className="flex h-[46px] flex-1 items-center justify-center rounded-xl bg-[#C2410C] px-4 text-sm font-bold text-white transition-colors hover:bg-[#9A3412]"
          >
            {mainSession.log ? t("panel.logEdit") : t("panel.logCta")}
          </Link>
          <Link
            to="/treino/$id"
            params={{ id: mainSession.id }}
            className="flex h-[46px] items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-[#E2E8F0] transition-colors hover:bg-white/5"
          >
            {t("panel.detailsCta")}
          </Link>
        </div>
      )}
    </section>
  );
}

function Complementary({ day }: { day: DayResponse }) {
  const { t, i18n } = useTranslation();
  const items = day.sessions.filter((s) => s.optional);
  if (items.length === 0) return null;
  return (
    <Card title={t("panel.complementary")}>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
            <Link to="/treino/$id" params={{ id: s.id }} className="font-medium text-[#0F172A] hover:text-[#C2410C] hover:underline">
              {localized(s.name, i18n.language, s.slug)}
            </Link>
            <span className="text-gray-500">{s.allowed === false ? t("panel.notAllowedToday") : t("panel.minutes", { count: s.minutes })}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- volume semanal

type DayBar = { date: string; planned: number; done: number };

function WeeklyVolume({ week, today }: { week: WeekResponse; today: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const plan = week.plan;
  if (!plan) return null;

  const days: DayBar[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(plan.weekStart, i);
    const sessions = week.sessions.filter((s) => s.date === date && !s.optional);
    return {
      date,
      planned: sessions.reduce((sum, s) => sum + s.minutes, 0),
      done: sessions.reduce((sum, s) => sum + (s.log?.completed ? (s.log.durationMinutes ?? 0) : 0), 0),
    };
  });
  const stats = weekStats(week.sessions);
  const max = Math.max(1, ...days.map((x) => Math.max(x.planned, x.done)));
  const BAR_MAX = 140;
  const H = 150;
  const km = week.sessions.reduce((sum, s) => sum + (!s.optional && s.log?.completed ? (s.log.distanceKm ?? 0) : 0), 0);

  return (
    <Card
      title={t("dash.volume.title")}
      aside={
        <div className="flex items-center gap-4 text-xs text-[#475569]">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[#FF5A1F]" aria-hidden="true" />
            {t("dash.volume.done")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] border border-dashed border-[#FFB394] bg-[#FFF4EF]" aria-hidden="true" />
            {t("dash.volume.planned")}
          </span>
        </div>
      }
    >
      <dl className="mb-5 flex flex-wrap gap-x-8 gap-y-3">
        <Figure label={t("dash.volume.minutesDone")} value={`${stats.doneMinutes} min`} />
        <Figure label={t("dash.volume.minutesLeft")} value={`${Math.max(0, stats.plannedMinutes - stats.doneMinutes)} min`} />
        <Figure label={t("dash.volume.sessions")} value={`${stats.done}/${stats.total}`} />
        {km > 0 && <Figure label={t("dash.volume.distance")} value={`${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(km)} km`} />}
      </dl>

      <div role="group" aria-label={t("dash.volume.chartLabel")} className="bars-stagger grid grid-cols-7 gap-2 border-b border-[#E5E7EB] pb-1 sm:gap-3.5">
        {days.map((x) => {
          const label = formatDate(x.date, lang, { weekday: "short" }).replace(".", "");
          const isToday = x.date === today;
          const value = x.done > 0 ? x.done : x.planned;
          const readout =
            x.planned === 0 && x.done === 0
              ? t("dash.volume.readoutRest", { day: label })
              : x.done > 0
                ? t("dash.volume.readout", { day: label, done: x.done, planned: x.planned })
                : t("dash.volume.readoutPlanned", { day: label, planned: x.planned });
          const hDone = x.done > 0 ? Math.max(8, Math.round((x.done / max) * BAR_MAX)) : 0;
          const hPlanned = x.planned > 0 ? Math.max(8, Math.round((x.planned / max) * BAR_MAX)) : 0;
          return (
            <div key={x.date} role="img" aria-label={readout} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-[#475569]">{value > 0 ? value : "—"}</span>
              <svg viewBox={`0 0 52 ${H}`} className="h-[150px] w-full max-w-[52px]" aria-hidden="true">
                {x.planned === 0 && x.done === 0 && <rect x="0" y={H - 6} width="52" height="6" rx="3" fill="#F5F6F8" />}
                {hPlanned > 0 && hPlanned >= hDone && (
                  <rect className="bar-grow" x="1" y={H - hPlanned + 1} width="50" height={hPlanned - 2} rx="7" fill="#FFF4EF" stroke="#FFB394" strokeWidth="2" strokeDasharray="5 4" />
                )}
                {hDone > 0 && <rect className="bar-grow" x="0" y={H - hDone} width="52" height={hDone} rx="7" fill="#FF5A1F" />}
              </svg>
              <span className={`pb-1 text-xs font-semibold ${isToday ? "text-[#C2410C]" : "text-[#94A3B8]"}`}>{capitalize(label)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-[22px] font-extrabold leading-tight tracking-tight text-[#0F172A]">{value}</dd>
      <dt className="text-xs text-[#475569]">{label}</dt>
    </div>
  );
}

// ---------------------------------------------------------------- objetivo

function GoalCard({ goal, today, currentWeek }: { goal: NonNullable<ProfileSummary["plan"]>; today: string; currentWeek: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const daysLeft = Math.max(0, dayDiff(today, goal.endDate));
  const total = Math.max(1, dayDiff(goal.startDate, goal.endDate));
  const pct = Math.max(0, Math.min(100, Math.round((dayDiff(goal.startDate, today) / total) * 100)));
  return (
    <Card title={t("panel.goalTitle")}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-extrabold tracking-tight text-[#0F172A]">
            {t(`result.objectives.${goal.objective}`, { defaultValue: goal.objective })}
          </p>
          <p className="mt-1 text-[13px] text-[#475569]">{t("panel.goalPlanEnds", { date: formatDate(goal.endDate, lang, { dateStyle: "long" }) })}</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Tile value={daysLeft} label={t("dash.goal.daysLeft")} />
          <Tile value={Math.ceil(daysLeft / 7)} label={t("dash.goal.weeksLeft")} />
          <Tile value={currentWeek} label={t("dash.goal.currentWeek")} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="text-[#475569]">{t("dash.goal.progress")}</span>
            <span className="font-bold text-[#0F172A]">{pct}%</span>
          </div>
          <progress
            className="progress-reveal h-1.5 w-full overflow-hidden rounded-full bg-[#F5F6F8] [&::-moz-progress-bar]:bg-[#FF5A1F] [&::-webkit-progress-bar]:bg-[#F5F6F8] [&::-webkit-progress-value]:bg-[#FF5A1F]"
            max={100}
            value={pct}
            aria-label={t("dash.goal.progress")}
          />
        </div>
        <Link to="/resultado" className="inline-block text-sm font-semibold text-[#C2410C] hover:underline">
          {t("panel.seeProfile")}
        </Link>
      </div>
    </Card>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-[#FFEDE5] px-2 py-3 text-center">
      <p className="text-[26px] font-extrabold leading-none tracking-tight text-[#C2410C]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#C2410C]">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------- plano da semana

const KIND_CHIP: Record<string, string> = {
  rodagem: "bg-[#DCFCE7] text-[#16A34A]",
  regenerativo: "bg-[#DCFCE7] text-[#16A34A]",
  qualidade: "bg-[#FFEDE5] text-[#C2410C]",
  longao: "bg-[#DBEAFE] text-[#2563EB]",
  "caminhada-corrida": "bg-[#EDE9FE] text-[#7C3AED]",
  forca: "bg-[#EDE9FE] text-[#7C3AED]",
  mobilidade: "bg-[#F5F6F8] text-[#475569]",
};

function StatusDot({ s, isToday }: { s: SessionView; isToday: boolean }) {
  const { t } = useTranslation();
  if (s.log?.completed)
    return (
      <span role="img" aria-label={t("dash.weekPlan.done")} className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#16A34A] text-white">
        <Check size={14} aria-hidden="true" />
      </span>
    );
  if (s.log)
    return (
      <span role="img" aria-label={t("dash.weekPlan.skipped")} className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#F5F6F8] text-[#94A3B8]">
        <X size={14} aria-hidden="true" />
      </span>
    );
  return (
    <span
      role="img"
      aria-label={isToday ? t("dash.weekPlan.today") : t("dash.weekPlan.pending")}
      className={`size-[26px] shrink-0 rounded-full border-2 ${isToday ? "border-[#FF5A1F]" : "border-[#E5E7EB]"}`}
    />
  );
}

function WeekPlan({ week, today, className = "" }: { week: WeekResponse; today: string; className?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const plan = week.plan;
  if (!plan) {
    return (
      <Card
        title={t("dash.weekPlan.title")}
        className={className}
        aside={
          <Link to="/plano" className="text-[13px] font-semibold text-[#C2410C] hover:underline">
            {t("dash.weekPlan.seeAll")}
          </Link>
        }
      >
        <p className="text-sm text-gray-600">{t("panel.noSessions")}</p>
      </Card>
    );
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(plan.weekStart, i));
  const tag = plan.isRaceWeek ? t("panel.raceWeek") : plan.isTaper ? t("panel.taperWeek") : plan.isRecovery ? t("panel.recoveryWeek") : null;

  return (
    <Card
      title={t("dash.weekPlan.title")}
      className={className}
      aside={
        <Link to="/plano" className="text-[13px] font-semibold text-[#C2410C] hover:underline">
          {t("dash.weekPlan.seeAll")}
        </Link>
      }
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t("panel.weekNumber", { n: plan.calendarWeek })} · {t(`panel.phases.${plan.phase}`, { defaultValue: plan.phase })}
        {tag ? ` · ${tag}` : ""}
      </p>
      <ol className="divide-y divide-[#E5E7EB]">
        {days.map((date) => {
          const items = week.sessions.filter((s) => s.date === date);
          const isToday = date === today;
          const weekday = formatDate(date, lang, { weekday: "short" }).replace(".", "");
          const dayNumber = Number(date.slice(8));
          return (
            <li key={date} className="flex items-start gap-3.5 py-2.5">
              <div className="w-10 shrink-0 text-center">
                <p className={`text-[11px] font-semibold uppercase ${isToday ? "text-[#C2410C]" : "text-[#94A3B8]"}`}>{weekday}</p>
                <p className={`text-[17px] font-extrabold leading-tight ${isToday ? "text-[#C2410C]" : "text-[#0F172A]"}`}>{dayNumber}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {items.length === 0 ? (
                  <div className="flex items-center gap-3.5">
                    <span className="w-[86px] shrink-0 rounded-md bg-[#F5F6F8] px-2 py-1 text-center text-[11px] font-bold text-[#475569]">
                      {t("dash.weekPlan.rest")}
                    </span>
                    <span className="text-sm text-[#94A3B8]">—</span>
                  </div>
                ) : (
                  items.map((s) => (
                    <div key={s.id} className="flex items-center gap-3.5">
                      <span
                        className={`w-[86px] shrink-0 truncate rounded-md px-2 py-1 text-center text-[11px] font-bold ${KIND_CHIP[s.kind] ?? "bg-[#F5F6F8] text-[#475569]"}`}
                      >
                        {t(`dash.kinds.${s.kind}`, { defaultValue: s.kind })}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/treino/$id"
                          params={{ id: s.id }}
                          className={`block text-sm font-semibold hover:text-[#C2410C] hover:underline ${
                            s.log && !s.log.completed ? "text-gray-400 line-through" : "text-[#0F172A]"
                          }`}
                        >
                          {localized(s.name, lang, s.slug)}
                          {s.optional && <span className="ml-1 text-xs font-normal text-gray-400">({t("panel.optional")})</span>}
                        </Link>
                        <p className="text-xs text-[#475569]">
                          {t("panel.minutes", { count: s.log?.completed && s.log.durationMinutes ? s.log.durationMinutes : s.minutes })}
                          {s.maxZone ? ` · ${zoneUpTo(t, s.maxZone)}` : ""}
                        </p>
                      </div>
                      <StatusDot s={s} isToday={isToday} />
                    </div>
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------- treinos recentes

function RecentWorkouts({ week, className = "" }: { week: WeekResponse; className?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const done = week.sessions
    .filter((s) => s.log?.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);
  return (
    <Card
      title={t("dash.recent.title")}
      className={className}
      aside={
        <Link to="/historico" className="text-[13px] font-semibold text-[#C2410C] hover:underline">
          {t("dash.recent.seeAll")}
        </Link>
      }
    >
      {done.length === 0 ? (
        <p className="text-sm text-gray-600">{t("dash.recent.empty")}</p>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {done.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-[#F1F5F9] text-[#475569]">
                <Footprints size={24} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <Link to="/treino/$id" params={{ id: s.id }} className="block truncate text-sm font-semibold text-[#0F172A] hover:text-[#C2410C] hover:underline">
                  {localized(s.name, lang, s.slug)}
                </Link>
                <p className="text-xs text-[#475569]">{capitalize(formatDate(s.date, lang, { weekday: "short", day: "numeric" }))}</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-extrabold text-[#0F172A]">
                  {s.log?.distanceKm ? `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(s.log.distanceKm)} km` : t("panel.minutes", { count: s.log?.durationMinutes ?? s.minutes })}
                </p>
                {s.log?.distanceKm ? <p className="text-xs text-[#94A3B8]">{t("panel.minutes", { count: s.log.durationMinutes ?? s.minutes })}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
