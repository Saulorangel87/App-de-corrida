import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { addDays, formatDate } from "../lib/dates";
import { localized, type SessionView } from "../lib/training";

/** Contagem exibida da semana: só soma o que a API devolveu (treinos principais; complementares ficam de fora). */
export function weekStats(sessions: SessionView[]) {
  const main = sessions.filter((s) => !s.optional);
  const done = main.filter((s) => s.log?.completed);
  return {
    total: main.length,
    done: done.length,
    plannedMinutes: main.reduce((sum, s) => sum + s.minutes, 0),
    doneMinutes: done.reduce((sum, s) => sum + (s.log?.durationMinutes ?? 0), 0),
  };
}

/** Os 7 dias da semana, um por linha, com os treinos de cada dia (cada nome leva ao detalhe do treino). */
export function WeekAgenda({ weekStart, sessions, today }: { weekStart: string; sessions: SessionView[]; today?: string }) {
  const { t, i18n } = useTranslation();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <ol className="divide-y divide-gray-100">
      {days.map((date) => {
        const items = sessions.filter((s) => s.date === date);
        const isToday = date === today;
        return (
          <li key={date} className={`flex gap-3 py-2 text-sm ${isToday ? "font-semibold" : ""}`}>
            <div className="w-16 shrink-0 text-gray-500">
              {formatDate(date, i18n.language, { weekday: "short", day: "numeric" })}
              {isToday && <span className="block text-[10px] font-bold uppercase text-[#C2410C]">{t("panel.todayTag")}</span>}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              {items.length === 0 ? (
                <span className="text-gray-400">—</span>
              ) : (
                items.map((s) => <SessionLine key={s.id} s={s} lang={i18n.language} />)
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SessionLine({ s, lang }: { s: SessionView; lang: string }) {
  const { t } = useTranslation();
  const state = s.log ? (s.log.completed ? "completed" : "skipped") : "pending";
  const tone = state === "completed" ? "text-green-700" : state === "skipped" ? "text-gray-400 line-through" : "text-[#0F172A]";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`min-w-0 ${tone}`}>
        <Link to="/treino/$id" params={{ id: s.id }} className="hover:text-[#C2410C] hover:underline">
          {localized(s.name, lang, s.slug)}
        </Link>
        {s.optional && <span className="ml-1 text-xs font-normal text-gray-400">({t("panel.optional")})</span>}
      </span>
      <span className="shrink-0 text-xs text-gray-500">
        {state === "completed" ? t("panel.status.completed") : t("panel.minutes", { count: s.minutes })}
      </span>
    </div>
  );
}
