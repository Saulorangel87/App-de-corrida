import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addDays } from "../lib/dates";
import { paceMinPerKm, paceText } from "../lib/pace";
import { useHistory } from "../lib/training";

const STORAGE_KEY = "passo:week-summary-seen";
/** O resumo aparece nos primeiros dias da semana nova (o dia em que ela começa e os 2 seguintes). */
const SHOW_DAYS = 3;

const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function readSeen(userId: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return typeof all[userId] === "string" ? all[userId]! : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, weekStart: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [userId]: weekStart }));
  } catch {
    /* sem armazenamento: o resumo volta na próxima visita, sem prejuízo */
  }
}

/**
 * "Como foi a semana passada": só soma e conta o que o atleta registrou (GET /history).
 * Não avalia nem sugere nada; some com "Entendi" (guardado só neste navegador).
 */
export function WeekSummaryCard({ userId, weekStart, calendarWeek, today }: { userId: string; weekStart: string; calendarWeek: number; today: string }) {
  const { t, i18n } = useTranslation();
  const prevStart = addDays(weekStart, -7);
  const inWindow = calendarWeek > 1 && dayDiff(weekStart, today) < SHOW_DAYS;
  const [seen, setSeen] = useState(() => readSeen(userId) === prevStart);
  const history = useHistory(14, inWindow && !seen);

  if (!inWindow || seen || !history.data) return null;
  const week = (history.data.weekly ?? []).find((w) => w.weekStart === prevStart);
  if (!week || week.plannedSessions === 0) return null;

  const prevEnd = addDays(prevStart, 6);
  const inWeek = (date: string) => date >= prevStart && date <= prevEnd;
  const sleeps = (history.data.sleep ?? []).filter((s) => inWeek(s.date) && s.hours !== null).map((s) => s.hours!);
  const painDays = new Set((history.data.pain ?? []).filter((p) => inWeek(p.date) && (p.intensity ?? 0) >= 1).map((p) => p.date)).size;
  const pace = paceMinPerKm(week.paceKm, week.paceMinutes);
  const number = (n: number) => n.toLocaleString(i18n.language, { maximumFractionDigits: 1 });

  const items: { label: string; value: string }[] = [
    { label: t("weekSummary.sessions"), value: t("weekSummary.sessionsValue", { done: week.completedSessions, total: week.plannedSessions }) },
    { label: t("weekSummary.time"), value: t("panel.minutes", { count: week.minutes }) },
  ];
  if (week.paceKm > 0) items.push({ label: t("weekSummary.distance"), value: t("weekSummary.km", { km: number(week.paceKm) }) });
  if (pace !== null) items.push({ label: t("weekSummary.pace"), value: t("weekSummary.paceValue", { pace: paceText(pace) }) });
  if (sleeps.length > 0) {
    items.push({ label: t("weekSummary.sleep"), value: t("weekSummary.hours", { hours: number(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) }) });
  }
  items.push({ label: t("weekSummary.pain"), value: painDays > 0 ? t("weekSummary.painDays", { count: painDays }) : t("weekSummary.painNone") });

  const dismiss = () => {
    writeSeen(userId, prevStart);
    setSeen(true);
  };

  return (
    <section aria-labelledby="week-summary-title" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 id="week-summary-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <CalendarCheck size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("weekSummary.title", { n: calendarWeek - 1 })}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{t("weekSummary.subtitle")}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 min-[640px]:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-[#F5F6F8] p-3">
            <dt className="text-xs font-semibold text-gray-500">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-extrabold tracking-tight text-[#0F172A]">{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412]"
        >
          {t("news.understood")}
        </button>
        <Link to="/historico" className="text-sm font-semibold text-[#C2410C] hover:underline">
          {t("dash.recent.seeAll")}
        </Link>
      </div>
    </section>
  );
}
