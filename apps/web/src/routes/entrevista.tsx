import { useEffect, useRef, useState, type ComponentType } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { INTERVIEW_STEPS, type InterviewStep } from "@passo/shared";
import { PrimaryButton } from "../components/auth-ui";
import { FlowLayout } from "../components/flow-layout";
import { TextField } from "../components/field";
import { ApiError, fetchApi } from "../lib/api";
import { AUTH_KEY, useRequireUser } from "../lib/queries";
import { useErrorText } from "../lib/use-error-text";
import { BasicsStep } from "../features/interview/basics";
import type { StepProps } from "../features/interview/common";
import { HistoryStep } from "../features/interview/history";
import { AvailabilityStep, GoalStep, InjuriesStep, RecoveryStep, ResourcesStep } from "../features/interview/rest";
import { ScreeningStep } from "../features/interview/screening";

export const Route = createFileRoute("/entrevista")({
  component: InterviewPage,
});

type InterviewData = {
  version: string;
  steps: InterviewStep[];
  completed: InterviewStep[];
  responses: Partial<Record<InterviewStep, unknown>>;
};

const INTERVIEW_KEY = ["interview"] as const;

const VIEWS: Record<InterviewStep, ComponentType<StepProps>> = {
  basicos: BasicsStep,
  triagem: ScreeningStep,
  historico: HistoryStep,
  lesoes: InjuriesStep,
  objetivo: GoalStep,
  disponibilidade: AvailabilityStep,
  recuperacao: RecoveryStep,
  recursos: ResourcesStep,
};

function InterviewPage() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading } = useRequireUser();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const interview = useQuery({
    queryKey: INTERVIEW_KEY,
    queryFn: () => fetchApi<InterviewData>("/interview"),
    enabled: !loading,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const save = useMutation({
    mutationFn: async (v: { step: InterviewStep; payload: unknown; last: boolean; nextIndex: number }) => {
      await fetchApi(`/interview/${v.step}`, { method: "PUT", body: JSON.stringify(v.payload) });
      if (v.last) await fetchApi("/interview/submit", { method: "POST" });
    },
    onSuccess: (_data, v) => {
      if (v.last) {
        queryClient.removeQueries({ queryKey: INTERVIEW_KEY });
        queryClient.removeQueries({ queryKey: ["profile"] });
        void navigate({ to: "/resultado" });
        return;
      }
      queryClient.setQueryData<InterviewData>(INTERVIEW_KEY, (old) =>
        old
          ? {
              ...old,
              responses: { ...old.responses, [v.step]: v.payload },
              completed: Array.from(new Set([...old.completed, v.step])),
            }
          : old,
      );
      setIndex(v.nextIndex);
    },
    onError: (err) => {
      // Faltou alguma etapa (rascunho incompleto no servidor): volta para a primeira que falta.
      if (err instanceof ApiError && err.code === "INTERVIEW_INCOMPLETE" && Array.isArray(err.details)) {
        const missing = (err.details as { path?: string }[]).map((d) => INTERVIEW_STEPS.indexOf(d.path as InterviewStep));
        const first = Math.min(...missing.filter((i) => i >= 0));
        if (Number.isFinite(first)) {
          void queryClient.invalidateQueries({ queryKey: INTERVIEW_KEY });
          setIndex(first);
        }
      }
    },
  });

  const data = interview.data;
  const firstIncomplete = data ? INTERVIEW_STEPS.findIndex((s) => !data.completed.includes(s)) : 0;
  const current = index ?? (firstIncomplete === -1 ? INTERVIEW_STEPS.length - 1 : firstIncomplete);
  const step = INTERVIEW_STEPS[current] ?? INTERVIEW_STEPS[0]!;

  // Leitor de tela e teclado: o foco vai para o título da etapa nova.
  useEffect(() => {
    if (data) headingRef.current?.focus();
  }, [current, data]);

  // O 401 da sessão que acabou no meio da entrevista leva ao login.
  useEffect(() => {
    if (interview.error instanceof ApiError && interview.error.status === 401) {
      queryClient.setQueryData(AUTH_KEY, null);
      void navigate({ to: "/entrar" });
    }
  }, [interview.error, navigate, queryClient]);

  if (loading || interview.isLoading) {
    return (
      <FlowLayout chrome="focus">
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }

  if (interview.isError || !data) {
    return (
      <FlowLayout chrome="focus">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{interview.error ? errorText(interview.error) : t("interview.loadError")}</p>
          <button type="button" onClick={() => void interview.refetch()} className="mt-3 font-semibold underline">
            {t("interview.retry")}
          </button>
        </div>
      </FlowLayout>
    );
  }

  if (save.error instanceof ApiError && save.error.code === "UNDERAGE") {
    return (
      <FlowLayout chrome="focus">
        <UnderageNotice />
      </FlowLayout>
    );
  }

  const View = VIEWS[step];
  const total = INTERVIEW_STEPS.length;
  const last = current === total - 1;

  return (
    <FlowLayout chrome="focus">
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>{t("interview.stepOf", { current: current + 1, total })}</span>
          <span>{t(`interview.steps.${step}.name`)}</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("interview.progress")}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
          className="flex gap-1.5"
        >
          {INTERVIEW_STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= current ? "bg-[#FF5A1F]" : "bg-gray-200"}`} />
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight text-[#0F172A] outline-none">
          {t(`interview.steps.${step}.title`)}
        </h1>
        <p className="mt-1 mb-4 text-[15px] leading-snug text-gray-600">{t(`interview.steps.${step}.text`)}</p>
        {/* A chave refaz o formulário (e seus valores iniciais) a cada etapa. */}
        <View
          key={step}
          saved={data.responses[step]}
          all={data.responses}
          pending={save.isPending}
          last={last}
          error={save.isError ? errorText(save.error) : undefined}
          onBack={current > 0 ? () => setIndex(current - 1) : undefined}
          onSubmit={(payload) => {
            save.reset();
            save.mutate({ step, payload, last, nextIndex: current + 1 });
          }}
        />
      </section>
      <p className="mt-2 text-center text-xs text-gray-500">{t("interview.saveNote")}</p>
    </FlowLayout>
  );
}

/** Menor de 18 anos: o app não monta plano; oferece excluir a conta (precisa da senha). */
function UnderageNotice() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const remove = useMutation({
    mutationFn: () => fetchApi("/auth/account", { method: "DELETE", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_KEY, null);
      void navigate({ to: "/entrar" });
    },
  });
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("interview.underage.title")}</h1>
      <p className="mt-2 mb-6 text-[15px] leading-relaxed text-gray-600">{t("interview.underage.text")}</p>
      {remove.isError && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorText(remove.error)}
        </div>
      )}
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (password) remove.mutate();
        }}
      >
        <TextField
          label={t("interview.underage.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PrimaryButton disabled={remove.isPending || !password}>
          {remove.isPending ? t("interview.underage.deleting") : t("interview.underage.delete")}
        </PrimaryButton>
      </form>
    </section>
  );
}
