import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../lib/dates";

/**
 * Por que ainda não há plano quando a triagem já liberou: a prova está perto demais para a
 * distância escolhida (R-PLN-05). Os números vêm do motor; aqui só são escritos em linguagem simples.
 */
export type PlanNotice = {
  reason: "prazo_insuficiente";
  objective: string;
  weeksNeeded: number;
  weeksAvailable: number;
  earliestRaceDate: string;
  smallerThatFit: string[];
};

export function PlanNoticeCard({ notice }: { notice: PlanNotice }) {
  const { t, i18n } = useTranslation();
  const until =
    notice.weeksAvailable > 0 ? t("planNotice.until", { count: notice.weeksAvailable }) : t("planNotice.untilNone");
  const date = formatDate(notice.earliestRaceDate, i18n.language);
  const smaller = notice.smallerThatFit.map((d) => t(`planNotice.distances.${d}`, { defaultValue: d }));

  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-5 sm:p-6" aria-labelledby="plan-notice-title">
      <h2 id="plan-notice-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <CalendarClock size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("planNotice.title")}
      </h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-gray-700">
        <p>
          {t("planNotice.needs", { count: notice.weeksNeeded })} {until} {t("planNotice.safety")}
        </p>
        <p>
          {smaller.length > 0
            ? t("planNotice.chooseWithDistance", { date, distances: smaller.join(t("planNotice.or")) })
            : t("planNotice.choose", { date })}
        </p>
      </div>
      <Link
        to="/entrevista"
        search={{ etapa: "objetivo" }}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412]"
      >
        {t("planNotice.cta")}
      </Link>
    </section>
  );
}
