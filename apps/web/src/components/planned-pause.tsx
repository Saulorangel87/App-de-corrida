import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError, fetchApi } from "../lib/api";
import { addDays, formatDate, localToday } from "../lib/dates";
import { useErrorText } from "../lib/use-error-text";

type PauseState = {
  pause: { startDate: string; endDate: string; started: boolean } | null;
  returnBand: "segue" | "congela" | "reduzido" | "longa" | null;
};

const PAUSE_KEY = ["planned-pause"] as const;

const short = (iso: string, lang: string) => formatDate(iso, lang, { day: "numeric", month: "long" });

/** Aviso no painel: pausa planejada em curso ou marcada (R-PRG-14). */
export function PlannedPauseNotice({ pause, today }: { pause: { startDate: string; endDate: string } | null; today: string }) {
  const { t, i18n } = useTranslation();
  if (!pause) return null;
  const active = pause.startDate <= today;
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-[#0F172A]">
        <Plane size={18} className="text-[#C2410C]" aria-hidden="true" />
        {active
          ? t("pause.noticeActive", { end: short(pause.endDate, i18n.language) })
          : t("pause.noticeUpcoming", { start: short(pause.startDate, i18n.language), end: short(pause.endDate, i18n.language) })}
      </p>
      <Link to="/plano" hash="pausa" className="text-sm font-semibold text-[#C2410C] hover:underline">
        {t("pause.noticeLink")}
      </Link>
    </section>
  );
}

/** Marcar, mudar ou cancelar a pausa planejada, com a prévia da volta (tabela de R-PRG-08). */
export function PlannedPauseCard() {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const today = localToday();
  const state = useQuery({
    queryKey: PAUSE_KEY,
    queryFn: () => fetchApi<PauseState>(`/plan/pause?today=${today}`),
    retry: false,
  });
  const pause = state.data?.pause ?? null;
  const [start, setStart] = useState(addDays(today, 1));
  const [end, setEnd] = useState(addDays(today, 7));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pause) {
      setStart(pause.startDate);
      setEnd(pause.endDate);
    }
  }, [pause]);

  const done = (data: PauseState) => {
    queryClient.setQueryData(PAUSE_KEY, data);
    void queryClient.invalidateQueries({ queryKey: ["day"] });
    void queryClient.invalidateQueries({ queryKey: ["week"] });
    void queryClient.invalidateQueries({ queryKey: ["overview"] });
  };
  const save = useMutation({
    mutationFn: () => fetchApi<PauseState>("/plan/pause", { method: "PUT", body: JSON.stringify({ startDate: start, endDate: end, today }) }),
    onSuccess: (data) => {
      done(data);
      setSaved(true);
    },
  });
  const cancel = useMutation({
    mutationFn: () => fetchApi<PauseState>("/plan/pause", { method: "DELETE", body: JSON.stringify({ today }) }),
    onSuccess: (data) => {
      done(data);
      setSaved(false);
      setStart(addDays(today, 1));
      setEnd(addDays(today, 7));
    },
  });

  if (state.isLoading) return null;
  const error = save.error ?? cancel.error;
  const code =
    error instanceof ApiError && Array.isArray(error.details) ? (error.details as { code?: string }[])[0]?.code : undefined;
  const orderError = end < start;
  const started = !!pause?.started;

  return (
    <section id="pausa" className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <Plane size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("pause.title")}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">
        <p>{t("pause.text")}</p>
        {pause && (
          <p className="font-semibold text-[#0F172A]">
            {started
              ? t("pause.started", { end: short(pause.endDate, i18n.language) })
              : t("pause.current", { start: short(pause.startDate, i18n.language), end: short(pause.endDate, i18n.language) })}
          </p>
        )}
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            if (!orderError) save.mutate();
          }}
        >
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-[#111827]">{t("pause.start")}</span>
            <input
              type="date"
              value={start}
              min={today}
              disabled={started}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-[15px] text-[#0F172A] disabled:bg-gray-50"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-[#111827]">{t("pause.end")}</span>
            <input
              type="date"
              value={end}
              min={start < today ? today : start}
              aria-invalid={orderError}
              onChange={(e) => setEnd(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-[15px] text-[#0F172A]"
            />
          </label>
          <button
            type="submit"
            disabled={save.isPending || !start || !end}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] disabled:opacity-50"
          >
            {pause ? t("pause.update") : t("pause.save")}
          </button>
          {pause && (
            <button
              type="button"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-5 text-sm font-semibold text-[#0F172A] hover:bg-gray-50"
            >
              {started ? t("pause.end_now") : t("pause.cancel")}
            </button>
          )}
        </form>
        {orderError && (
          <p role="alert" className="text-sm text-red-700">
            {t("pause.errors.order")}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm font-semibold text-green-700">
            {t("pause.saved")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {code ? t(`pause.errors.${code}`, { defaultValue: errorText(error) }) : errorText(error)}
          </p>
        )}
        {state.data?.returnBand && (
          <div className="rounded-xl bg-[#F5F6F8] p-4 text-sm text-gray-800">
            <p className="font-semibold text-[#111827]">{t("pause.returnTitle")}</p>
            <p>{t(`pause.return.${state.data.returnBand}`)}</p>
            <p className="mt-1 text-gray-500">{t("pause.returnNote")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
