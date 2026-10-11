import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../lib/api";
import { useErrorText } from "../lib/use-error-text";
import { SecondaryButton } from "./auth-ui";

type Felt = "facil" | "no_ponto" | "puxado" | "nao_consegui";
const OPTIONS: Felt[] = ["facil", "no_ponto", "puxado", "nao_consegui"];

type ReviewState = { due: boolean; calendarWeek: number | null; felt: Felt | null; advanceSuggested: boolean };

const reviewKey = (date: string) => ["review", date] as const;

/**
 * Avaliação do bloco de 2 semanas ("como foi?", R-PLN-22). O servidor diz quando perguntar. A resposta
 * só segura carga ("puxado" repete a etapa); "fácil" não muda o plano e só gera a sugestão de reavaliar.
 */
export function PlanReviewCard({ date }: { date: string }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const [last, setLast] = useState<Felt | null>(null);

  const review = useQuery({
    queryKey: reviewKey(date),
    queryFn: () => fetchApi<ReviewState>(`/plan/review/${date}`),
    retry: false,
  });

  const answer = useMutation({
    mutationFn: (felt: Felt) => fetchApi<ReviewState>(`/plan/review/${date}`, { method: "PUT", body: JSON.stringify({ felt }) }),
    onSuccess: (state, felt) => {
      setLast(felt);
      queryClient.setQueryData(reviewKey(date), state);
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });

  const state = review.data;
  if (!state) return null;

  return (
    <>
      {state.due && (
        <section className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50 p-5" aria-labelledby="plan-review-title">
          <h2 id="plan-review-title" className="text-lg font-bold tracking-tight text-[#0F172A]">
            {t("review.title")}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">{t("review.text")}</p>
          {answer.isError && (
            <p role="alert" className="text-sm text-red-700">
              {errorText(answer.error)}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
            {OPTIONS.map((felt) => (
              <SecondaryButton key={felt} disabled={answer.isPending} onClick={() => answer.mutate(felt)}>
                {t(`review.options.${felt}`)}
              </SecondaryButton>
            ))}
          </div>
        </section>
      )}

      {!state.due && last && (
        <section role="status" className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-[#0F172A]">{t("review.saved")}</p>
          <p className="text-sm text-gray-700">{t(`review.effect.${last}`)}</p>
        </section>
      )}

      {state.advanceSuggested && !state.due && (
        <section className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="plan-advance-title">
          <h2 id="plan-advance-title" className="text-lg font-bold tracking-tight text-[#0F172A]">
            {t("review.suggestTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">{t("review.suggestText")}</p>
          <Link to="/entrevista" className="inline-block text-sm font-semibold text-[#C2410C] hover:underline">
            {t("review.suggestCta")}
          </Link>
        </section>
      )}
    </>
  );
}
