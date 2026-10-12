import { useEffect, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { evaluationSchema, parqTextFor, toParqLang, type ParqLang } from "@passo/shared";
import { PrimaryButton } from "../components/auth-ui";
import { CheckField, TextField } from "../components/field";
import { SelectField } from "../components/choice";
import { FlowLayout } from "../components/flow-layout";
import { ApiError, fetchApi } from "../lib/api";
import { useRequireUser } from "../lib/queries";
import { PlanNoticeCard, type PlanNotice } from "../components/plan-notice";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/resultado")({
  component: ResultPage,
});

type ScreeningState = "NAO_FEITA" | "LIBERADO" | "AVALIACAO_NECESSARIA" | "LIBERADO_APOS_AVALIACAO" | "ADIADO" | "EXPIRADO";
type Profile = {
  level: "iniciante" | "intermediario" | "avancado";
  explanation: { text: string };
  nextEvaluationDate: string;
  screening: {
    state: ScreeningState;
    validUntil: string | null;
    reasons: string[];
    allowsTraining: boolean;
  } | null;
  /** Por que não há plano com a triagem liberada: prova perto demais (R-PLN-05). */
  planNotice?: PlanNotice | null;
  plan: {
    objective: "saude" | "5k" | "10k" | "21k" | "42k";
    level: "iniciante" | "intermediario" | "avancado";
    durationWeeks: number;
    baseWeeks: number;
    startDate: string;
    endDate: string;
    /** Onde o plano começa na escada de caminhada e corrida (R-PLN-21); ausente nos outros planos. */
    selection?: { placement?: { etapa: string; reason: string } | null };
  } | null;
};

const PROFILE_KEY = ["profile"] as const;

/** Trechos entre ** viram negrito (o texto da explicação vem do servidor). */
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-[#0F172A]">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Linhas de lista ("- ...") do texto oficial; o PAR-Q+ é mostrado sem reescrever. */
function parqBullets(texts: Record<string, string>, key: string): string[] {
  return (texts[key] ?? "")
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2));
}

function Card({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "attention" | "ok" }) {
  const border = tone === "attention" ? "border-orange-200" : tone === "ok" ? "border-green-200" : "border-gray-200";
  return (
    <section className={`rounded-2xl border ${border} bg-white p-5 sm:p-6`}>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function ResultPage() {
  const { t, i18n } = useTranslation();
  // Texto oficial do PAR-Q+: a versão brasileira na tela em português, o original na tela em inglês.
  const textLang = toParqLang(i18n.language);
  const texts = parqTextFor(textLang);
  const errorText = useErrorText();
  const navigate = useNavigate();
  const { loading } = useRequireUser();

  const profile = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => fetchApi<{ profile: Profile }>("/profile").then((r) => r.profile),
    enabled: !loading,
    retry: false,
  });

  // Quem ainda não fez a entrevista vai para ela.
  const noProfile = profile.error instanceof ApiError && profile.error.status === 404;
  useEffect(() => {
    if (noProfile) void navigate({ to: "/entrevista" });
  }, [noProfile, navigate]);

  if (loading || profile.isLoading || noProfile) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <FlowLayout>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{profile.error ? errorText(profile.error) : t("result.loadError")}</p>
          <button type="button" onClick={() => void profile.refetch()} className="mt-3 font-semibold underline">
            {t("interview.retry")}
          </button>
        </div>
      </FlowLayout>
    );
  }

  const p = profile.data;
  const date = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const s = p.screening;
  const state: ScreeningState = s?.state ?? "NAO_FEITA";
  const blocked = state === "AVALIACAO_NECESSARIA";

  return (
    <FlowLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">{t("result.title")}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t("result.intro")}</p>
      </div>

      <div className="space-y-4">
        <Card title={t("result.levelTitle")}>
          <p className="text-2xl font-extrabold text-[#C2410C]">{t(`result.levels.${p.level}`)}</p>
          <p>
            <Bold text={p.explanation.text} />
          </p>
          <p className="text-sm text-gray-500">{t("result.nextEvaluation", { date: date(p.nextEvaluationDate) })}</p>
        </Card>

        <Card
          title={t("result.screeningTitle")}
          tone={s?.allowsTraining ? "ok" : "attention"}
        >
          <p className="font-semibold text-[#0F172A]">{t(`result.states.${state}.title`)}</p>
          <p>{t(`result.states.${state}.text`)}</p>
          {s && s.reasons.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {s.reasons.map((r) => (
                <li key={r}>{t(`result.reasons.${r}`, { defaultValue: "" })}</li>
              ))}
            </ul>
          )}
          {s?.validUntil && <p className="text-sm text-gray-500">{t("result.validUntil", { date: date(s.validUntil) })}</p>}

          {(state === "LIBERADO" || state === "LIBERADO_APOS_AVALIACAO") && (
            <OfficialList title={t("result.officialText")} lang={textLang} items={parqBullets(texts, "pagina4.todas_nao")} />
          )}
          {blocked && <OfficialBlock title={t("result.officialText")} lang={textLang} text={texts["pagina4.algum_sim"] ?? ""} />}
          {state === "ADIADO" && <OfficialBlock title={t("result.officialText")} lang={textLang} text={texts["pagina4.adiar"] ?? ""} />}
          {(state === "LIBERADO" || state === "LIBERADO_APOS_AVALIACAO" || blocked || state === "ADIADO") && textLang === "en" && (
            <p className="text-xs text-gray-500">{t("result.officialEnglish")}</p>
          )}

          <p className="text-xs text-gray-500">{t("result.disclaimer")}</p>
        </Card>

        {blocked && <EvaluationCard />}

        <Card title={t("result.planTitle")}>
          {p.plan ? (
            <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
              <Fact label={t("result.planObjective")} value={t(`result.objectives.${p.plan.objective}`)} />
              <Fact label={t("result.planLevel")} value={t(`result.levels.${p.plan.level}`)} />
              <Fact
                label={t("result.planTitle")}
                value={
                  t("result.planLength", { weeks: p.plan.durationWeeks }) +
                  (p.plan.baseWeeks > 0 ? ` ${t("result.planBase", { weeks: p.plan.baseWeeks })}` : "")
                }
              />
              {p.plan.selection?.placement && (
                <Fact
                  label={t("result.planEntry")}
                  value={t(`result.placement.${p.plan.selection.placement.reason}`, {
                    etapa: p.plan.selection.placement.etapa,
                    defaultValue: t("result.placement.default", { etapa: p.plan.selection.placement.etapa }),
                  })}
                />
              )}
              <Fact
                label={t("result.planStart")}
                value={t("result.planDates", { start: date(p.plan.startDate), end: date(p.plan.endDate) })}
              />
            </dl>
          ) : p.planNotice ? (
            <PlanNoticeCard notice={p.planNotice} />
          ) : (
            <p>{t("result.planNone")}</p>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center">
        <Link
          to="/painel"
          className="flex w-full items-center justify-center rounded-xl bg-[#C2410C] px-4 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#9A3412] min-[480px]:w-auto min-[480px]:px-8"
        >
          {t("result.toPanel")}
        </Link>
        <Link to="/entrevista" className="text-center text-sm font-semibold text-gray-600 hover:text-[#C2410C]">
          {t("result.redo")}
        </Link>
      </div>
    </FlowLayout>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="font-semibold text-[#0F172A]">{value}</dd>
    </div>
  );
}

function OfficialList({ title, items, lang }: { title: string; items: string[]; lang: ParqLang }) {
  return (
    <div lang={lang} className="rounded-xl bg-[#F5F6F8] p-4 text-sm">
      <p className="mb-2 font-semibold text-[#111827]">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function OfficialBlock({ title, text, lang }: { title: string; text: string; lang: ParqLang }) {
  return (
    <div lang={lang} className="rounded-xl bg-[#F5F6F8] p-4 text-sm">
      <p className="mb-2 font-semibold text-[#111827]">{title}</p>
      <p className="whitespace-pre-line">{text}</p>
    </div>
  );
}

// Autodeclaração de avaliação profissional (R-TRI-05): o app não pede documento.
type EvaluationForm = z.input<typeof evaluationSchema>;

function EvaluationCard() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EvaluationForm, unknown, z.output<typeof evaluationSchema>>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: { vigorousAllowed: false },
  });
  const today = new Date().toLocaleDateString("sv-SE");

  const send = useMutation({
    mutationFn: (data: z.output<typeof evaluationSchema>) =>
      fetchApi("/profile/screening/evaluation", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
  const required = (e?: { message?: string }) => (e ? t("interview.errors.required") : undefined);

  return (
    <Card title={t("result.evaluation.title")}>
      <p>{t("result.evaluation.text")}</p>
      <p className="text-sm">
        <a href="https://www.eparmedx.com" target="_blank" rel="noreferrer" className="font-semibold text-[#C2410C] hover:underline">
          {t("result.evaluation.eparmedx")}
        </a>
      </p>
      {send.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorText(send.error)}
        </div>
      )}
      {send.isSuccess && (
        <div role="status" className="rounded-xl bg-[#F5F6F8] p-3 text-sm">
          {t("result.evaluation.stillBlocked")}
        </div>
      )}
      <form className="space-y-4" noValidate onSubmit={handleSubmit((d) => send.mutate(d))}>
        <SelectField
          label={t("result.evaluation.result")}
          placeholder={t("result.evaluation.placeholder")}
          options={(["sem_restricoes", "com_restricoes", "encaminhado_ao_medico", "nao_liberado"] as const).map((v) => ({
            value: v,
            label: t(`result.evaluation.results.${v}`),
          }))}
          error={required(errors.result)}
          {...register("result")}
        />
        <TextField label={t("result.evaluation.date")} type="date" max={today} error={required(errors.date)} {...register("date")} />
        <SelectField
          label={t("result.evaluation.source")}
          placeholder={t("result.evaluation.placeholder")}
          options={(["eparmedx", "medico", "profissional_educacao_fisica"] as const).map((v) => ({
            value: v,
            label: t(`result.evaluation.sources.${v}`),
          }))}
          error={required(errors.source)}
          {...register("source")}
        />
        <CheckField label={t("result.evaluation.vigorous")} {...register("vigorousAllowed")} />
        <PrimaryButton disabled={send.isPending}>
          {send.isPending ? t("result.evaluation.saving") : t("result.evaluation.submit")}
        </PrimaryButton>
      </form>
    </Card>
  );
}
