import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError, fetchApi } from "../lib/api";
import { formatDate, localToday } from "../lib/dates";
import { workoutKey, type WorkoutDetailResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

/**
 * Trocar o dia do treino dentro da semana do plano. Os dias oferecidos vêm da API (regras do
 * agendador: treino forte nunca em dias seguidos, descanso entre corridas no começo, força longe do treino forte).
 */
export function MoveWorkout({ data }: { data: WorkoutDetailResponse }) {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { session } = data;
  const options = data.moveTo ?? [];

  const move = useMutation({
    mutationFn: (date: string) =>
      fetchApi<WorkoutDetailResponse>(`/workouts/${session.id}/date`, {
        method: "PUT",
        body: JSON.stringify({ date, today: localToday() }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(workoutKey(session.id), updated);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["day"] });
      void queryClient.invalidateQueries({ queryKey: ["week"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  // Só treino de hoje em diante e sem registro; sem dia possível, explica em vez de esconder.
  if (session.log || session.date < localToday()) return null;

  const reason = move.error instanceof ApiError && move.error.code === "MOVE_NOT_ALLOWED" ? (move.error.details as { reason?: string })?.reason : undefined;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <CalendarDays size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("move.title")}
      </h2>
      {options.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-gray-700">{t("move.none")}</p>
      ) : !open ? (
        <>
          <p className="text-[15px] leading-relaxed text-gray-700">{t("move.text")}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-5 text-sm font-semibold text-[#0F172A] hover:bg-gray-50"
          >
            {t("move.cta")}
          </button>
        </>
      ) : (
        <fieldset>
          <legend className="mb-2 text-[15px] text-gray-700">{t("move.pick")}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((d) => (
              <button
                key={d}
                type="button"
                disabled={move.isPending}
                onClick={() => move.mutate(d)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] disabled:opacity-50"
              >
                {formatDate(d, i18n.language, { weekday: "long", day: "numeric", month: "short" })}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-[#0F172A] hover:bg-gray-50"
            >
              {t("move.cancel")}
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500">{t("move.rules")}</p>
        </fieldset>
      )}
      {move.isSuccess && (
        <p role="status" className="mt-3 text-sm font-semibold text-green-700">
          {t("move.done", { date: formatDate(session.date, i18n.language, { weekday: "long", day: "numeric", month: "short" }) })}
        </p>
      )}
      {move.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {reason ? t(`move.blocked.${reason}`, { defaultValue: t("move.blocked.generic") }) : errorText(move.error)}
        </p>
      )}
    </section>
  );
}
