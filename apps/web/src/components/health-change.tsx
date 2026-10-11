import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../lib/api";
import { localToday } from "../lib/dates";
import { useErrorText } from "../lib/use-error-text";
import { PrimaryButton, SecondaryButton } from "./auth-ui";

type Step = "ask" | "confirm" | "same";

/**
 * Pergunta "mudou algo na sua saúde?" (R-TRI-11). O servidor diz quando ela deve aparecer; aqui só se
 * pergunta e se grava. "Sim" invalida a liberação (os treinos ficam em espera até refazer o PAR-Q+),
 * por isso pede uma confirmação antes de gravar.
 */
export function HealthChangeCard({ variant, onAnswered }: { variant: "banner" | "inline"; onAnswered?: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("ask");

  const answer = useMutation({
    mutationFn: (changed: boolean) =>
      fetchApi("/profile/screening/health-change", { method: "POST", body: JSON.stringify({ changed, date: localToday() }) }),
    onSuccess: (_data, changed) => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["day"] });
      void queryClient.invalidateQueries({ queryKey: ["week"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      onAnswered?.();
      if (changed) void navigate({ to: "/resultado" });
      else setStep("same");
    },
  });

  const frame =
    variant === "banner"
      ? "rounded-2xl border border-orange-200 bg-orange-50 p-5"
      : "rounded-xl bg-[#F5F6F8] p-4";

  if (step === "same") {
    return (
      <section className={frame} role="status">
        <p className="font-semibold text-[#0F172A]">{t("healthChange.thanks")}</p>
        <p className="text-sm text-gray-700">{t("healthChange.thanksText")}</p>
      </section>
    );
  }

  return (
    <section className={`${frame} space-y-3`} aria-labelledby="health-change-title">
      <h2 id="health-change-title" className={variant === "banner" ? "text-lg font-bold tracking-tight text-[#0F172A]" : "text-sm font-bold text-[#0F172A]"}>
        {step === "ask" ? t("healthChange.title") : t("healthChange.confirmTitle")}
      </h2>
      {answer.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorText(answer.error)}
        </p>
      )}

      {step === "ask" ? (
        <>
          <p className="text-sm leading-relaxed text-gray-700">{t("healthChange.text")}</p>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <SecondaryButton disabled={answer.isPending} onClick={() => answer.mutate(false)}>
              {t("healthChange.no")}
            </SecondaryButton>
            <SecondaryButton disabled={answer.isPending} onClick={() => setStep("confirm")}>
              {t("healthChange.yes")}
            </SecondaryButton>
          </div>
          <p className="text-xs text-gray-500">{t("result.disclaimer")}</p>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-gray-700">{t("healthChange.confirmText")}</p>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <PrimaryButton type="button" disabled={answer.isPending} onClick={() => answer.mutate(true)}>
              {answer.isPending ? t("healthChange.saving") : t("healthChange.confirmCta")}
            </PrimaryButton>
            <SecondaryButton disabled={answer.isPending} onClick={() => setStep("ask")}>
              {t("healthChange.back")}
            </SecondaryButton>
          </div>
        </>
      )}
    </section>
  );
}
