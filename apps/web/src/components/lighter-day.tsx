import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../lib/api";
import { dayKey, type DayResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

/**
 * "Não estou 100% hoje": pede um treino mais leve sem relatar sintoma (R-PRG-13). O app só reduz
 * (20% mais curto e sem trechos fortes); dor e mal-estar continuam indo para o check-in e o registro.
 */
export function LighterDay({ day }: { day: DayResponse }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const on = !!day.lighterRequested;
  const main = day.sessions.find((s) => !s.optional);

  const toggle = useMutation({
    mutationFn: (next: boolean) => fetchApi<DayResponse>(`/day/${day.date}/lighter`, { method: "PUT", body: JSON.stringify({ on: next }) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(dayKey(day.date), updated);
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });

  // Só faz sentido com treino de hoje ainda por fazer e quando o dia já não está mais leve por outro motivo.
  if (!main || main.log || main.paused) return null;
  if (!on && day.decision.action !== "manter") return null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 p-4 text-sm">
      {on ? (
        <>
          <p className="text-[#CBD5E1]">{t("lighter.onText")}</p>
          <button
            type="button"
            onClick={() => toggle.mutate(false)}
            disabled={toggle.isPending}
            className="mt-2 font-semibold text-[#FDBA74] underline-offset-2 hover:underline disabled:opacity-50"
          >
            {t("lighter.undo")}
          </button>
        </>
      ) : (
        <>
          <p className="text-[#CBD5E1]">{t("lighter.text")}</p>
          <button
            type="button"
            onClick={() => toggle.mutate(true)}
            disabled={toggle.isPending}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-white/20 px-4 font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {t("lighter.cta")}
          </button>
        </>
      )}
      {toggle.error && (
        <p role="alert" className="mt-2 text-red-300">
          {errorText(toggle.error)}
        </p>
      )}
    </div>
  );
}
