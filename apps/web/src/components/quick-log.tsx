import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { workoutLogSchema } from "@passo/shared";
import { PrimaryButton, SecondaryButton } from "./auth-ui";
import { ChoiceGroup } from "./choice";
import { TextField } from "./field";
import { fetchApi } from "../lib/api";
import { formatDate } from "../lib/dates";
import { toNumber } from "../lib/step-form";
import { isRunSession, localized, workoutKey, type DayResponse, type SessionView } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";

type Step = "choose" | "done" | "skipped" | "saved";
type Result = { session: SessionView; day: DayResponse; nextDay: DayResponse };

/** Treinos de antes de hoje sem registro: o motor conta como não feitos, então vale lembrar o atleta. */
export const unlogged = (sessions: SessionView[], today: string) => sessions.filter((s) => !s.optional && !s.log && s.date < today);

/**
 * Círculo de situação do treino que também registra: "fiz" ou "não fiz" sem sair da lista.
 * Dor ou mal-estar sempre levam ao registro completo (mapa do corpo e sinais de alerta), e um
 * registro que já existe só é mudado lá, porque salvar substitui as dores dele.
 */
export function QuickLog({ session, today }: { session: SessionView; today: string }) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const name = localized(session.name, i18n.language, session.slug);
  const isToday = session.date === today;

  // Treino futuro: a API não aceita registro; o círculo só mostra a situação.
  if (session.date > today) return <Dot s={session} isToday={false} />;

  const open = () => {
    setStep("choose");
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={session.log ? t("quickLog.openLogged", { name }) : t("quickLog.open", { name })}
        className="grid size-11 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50"
      >
        <Dot s={session} isToday={isToday} decorative />
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`quick-log-${session.id}`}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl bg-white p-0 text-left shadow-xl backdrop:bg-[#0F172A]/50"
      >
        {/* A chave recomeça o formulário a cada abertura (e ao voltar para a escolha). */}
        <QuickLogBody
          key={step === "choose" ? "choose" : "flow"}
          session={session}
          name={name}
          step={step}
          setStep={setStep}
          onClose={close}
        />
      </dialog>
    </>
  );
}

function QuickLogBody({
  session,
  name,
  step,
  setStep,
  onClose,
}: {
  session: SessionView;
  name: string;
  step: Step;
  setStep: (s: Step) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(String(session.minutes));
  const [srpe, setSrpe] = useState<number | undefined>(undefined);
  const [unwell, setUnwell] = useState<boolean | undefined>(undefined);
  const [errors, setErrors] = useState<{ duration?: string; srpe?: string; unwell?: string }>({});
  const [result, setResult] = useState<Result | null>(null);
  const isRun = isRunSession(session);

  const save = useMutation({
    mutationFn: (payload: unknown) => fetchApi<Result>(`/workouts/${session.id}/log`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      setResult(data);
      setStep("saved");
      void queryClient.invalidateQueries({ queryKey: ["day"] });
      void queryClient.invalidateQueries({ queryKey: ["week"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      void queryClient.invalidateQueries({ queryKey: workoutKey(session.id) });
    },
  });

  const submit = () => {
    const found: typeof errors = {};
    if (unwell === undefined) found.unwell = t("interview.errors.required");
    // Força e mobilidade: vale o tempo do plano, sem perguntar.
    const minutes = isRun ? toNumber(duration) : session.minutes;
    const payload = step === "done" ? { completed: true, durationMinutes: minutes, srpe, pain: [] } : { completed: false, pain: [] };
    const parsed = workoutLogSchema.safeParse(JSON.parse(JSON.stringify(payload)));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "durationMinutes") found.duration = t("interview.errors.required");
        if (issue.path[0] === "srpe") found.srpe = t("interview.errors.required");
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0 || unwell) return;
    save.mutate(JSON.parse(JSON.stringify(payload)));
  };

  const heading = (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={`quick-log-${session.id}`} className="text-lg font-extrabold tracking-tight text-[#0F172A]">
          {name}
        </h2>
        <p className="text-sm text-gray-500">
          {formatDate(session.date, i18n.language, { weekday: "long", day: "numeric", month: "long" })} · {t("panel.minutes", { count: session.minutes })}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("quickLog.close")}
        className="grid size-9 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );

  const fullLink = (label: string, primary = false) => (
    <Link
      to="/registro/$id"
      params={{ id: session.id }}
      className={
        primary
          ? "flex w-full items-center justify-center rounded-xl bg-[#C2410C] px-4 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#9A3412]"
          : "block text-center text-sm font-semibold text-[#C2410C] hover:underline"
      }
    >
      {label}
    </Link>
  );

  if (step === "saved" && result) {
    const urgent = result.day.decision.urgent || result.nextDay.decision.urgent;
    return (
      <div className="p-5">
        {heading}
        <p role="status" className="mb-3 font-semibold text-green-700">
          {t("log.doneTitle")}
        </p>
        {urgent && (
          <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {t("panel.urgent")}
          </p>
        )}
        <div className="rounded-xl bg-[#F5F6F8] p-4 text-sm leading-relaxed text-gray-700">
          <p className="mb-1 font-semibold text-[#111827]">{t("log.nextDayTitle")}</p>
          {/* Texto do motor de regras, já no idioma da tela. */}
          <p lang={i18n.language} className="whitespace-pre-line">
            {result.nextDay.decision.message}
          </p>
        </div>
        <PrimaryButton type="button" className="mt-4" onClick={onClose}>
          {t("quickLog.close")}
        </PrimaryButton>
      </div>
    );
  }

  // Registro que já existe: mudar só no registro completo, que reabre a dor informada.
  if (session.log) {
    return (
      <div className="p-5">
        {heading}
        <p className="mb-1 font-semibold text-[#0F172A]">{session.log.completed ? t("quickLog.wasDone") : t("quickLog.wasSkipped")}</p>
        <p className="mb-4 text-sm text-gray-600">{t("quickLog.editHint")}</p>
        {fullLink(t("panel.logEdit"), true)}
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="p-5">
        {heading}
        <p className="mb-3 text-sm font-semibold text-[#111827]">{t("log.didIt")}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStep("done")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-green-600 bg-green-50 px-3 text-[15px] font-bold text-green-800 hover:bg-green-100"
          >
            <Check size={18} aria-hidden="true" />
            {t("quickLog.did")}
          </button>
          <button
            type="button"
            onClick={() => setStep("skipped")}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-[15px] font-bold text-[#0F172A] hover:bg-gray-50"
          >
            <X size={18} aria-hidden="true" />
            {t("quickLog.didNot")}
          </button>
        </div>
        <div className="mt-4">{fullLink(t("quickLog.full"))}</div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {heading}
      <p className="text-sm font-semibold text-[#0F172A]">{step === "done" ? t("quickLog.markedDone") : t("quickLog.markedSkipped")}</p>
      {step === "done" && (
        <>
          {isRun ? (
            <TextField
              label={t("log.duration")}
              hint={t("log.durationHint")}
              inputMode="numeric"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                setErrors((p) => ({ ...p, duration: undefined }));
              }}
              error={errors.duration}
            />
          ) : (
            <p className="text-sm text-gray-600">{t("log.plannedTime", { count: session.minutes })}</p>
          )}
          <ChoiceGroup
            name={`srpe-${session.id}`}
            legend={t("log.srpe")}
            hint={t("log.srpeScale")}
            value={srpe}
            onChange={(v) => {
              setSrpe(v);
              setErrors((p) => ({ ...p, srpe: undefined }));
            }}
            error={errors.srpe}
            columns="grid-cols-5"
            options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
          />
        </>
      )}
      <ChoiceGroup
        name={`unwell-${session.id}`}
        legend={step === "done" ? t("quickLog.unwell") : t("quickLog.unwellSkipped")}
        hint={t("quickLog.unwellHint")}
        value={unwell}
        onChange={(v) => {
          setUnwell(v);
          setErrors((p) => ({ ...p, unwell: undefined }));
        }}
        error={errors.unwell}
        options={[
          { value: true, label: t("interview.yes") },
          { value: false, label: t("interview.no") },
        ]}
      />
      {unwell ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-orange-50 p-3 text-sm text-gray-800">{t("quickLog.goFull")}</p>
          {fullLink(t("quickLog.continueFull"), true)}
        </div>
      ) : (
        <>
          {save.error && (
            <p role="alert" className="text-sm text-red-700">
              {errorText(save.error)}
            </p>
          )}
          <PrimaryButton type="submit" disabled={save.isPending}>
            {save.isPending ? t("log.saving") : t("log.submit")}
          </PrimaryButton>
        </>
      )}
      <SecondaryButton onClick={() => setStep("choose")} className="w-full">
        {t("quickLog.back")}
      </SecondaryButton>
    </form>
  );
}

/** Círculo de situação: feito (verde), não feito (cinza com X) ou planejado (contorno; laranja hoje). */
export function Dot({ s, isToday, decorative = false }: { s: SessionView; isToday: boolean; decorative?: boolean }) {
  const { t } = useTranslation();
  const a11y = (label: string) => (decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": label });
  if (s.log?.completed)
    return (
      <span {...a11y(t("dash.weekPlan.done"))} className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#16A34A] text-white">
        <Check size={14} aria-hidden="true" />
      </span>
    );
  if (s.log)
    return (
      <span {...a11y(t("dash.weekPlan.skipped"))} className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#F5F6F8] text-[#94A3B8]">
        <X size={14} aria-hidden="true" />
      </span>
    );
  return (
    <span
      {...a11y(isToday ? t("dash.weekPlan.today") : t("dash.weekPlan.pending"))}
      className={`size-[26px] shrink-0 rounded-full border-2 ${isToday ? "border-[#FF5A1F]" : "border-[#E5E7EB]"}`}
    />
  );
}
