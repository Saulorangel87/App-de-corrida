import { useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { baseRegionId, workoutLogSchema } from "@passo/shared";
import { PrimaryButton } from "../components/auth-ui";
import { BodyMap } from "../components/body-map";
import { ChoiceGroup } from "../components/choice";
import { CheckField, TextField } from "../components/field";
import { FlowLayout } from "../components/flow-layout";
import { fetchApi } from "../lib/api";
import { useRequireUser } from "../lib/queries";
import { paceMinPerKm, paceText } from "../lib/pace";
import { toNumber, toText } from "../lib/step-form";
import { isRunSession, useWorkout, workoutKey, type DayResponse, type LoggedPain, type SessionView } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";
import { zoneUpTo } from "../lib/zone";

export const Route = createFileRoute("/registro/$id")({
  component: LogPage,
});

type PainType = "pontada" | "difusa" | "outra";
type PainDetail = { intensity?: number; type?: PainType; flags: Record<string, boolean> };

/** Perguntas por região com dor (R-DOR-15); só aparecem depois de marcar o local. */
const REGION_FLAGS = [
  "suddenOnset",
  "changedStride",
  "worsensEachStrideOrNoWarmup",
  "bonePoint",
  "restOrNightPain",
  "painWalking",
  "jointSwelling",
  "lockingOrGivingWay",
  "tinglingOrNumbness",
  "suddenWeaknessOrFootDrop",
  "darkUrineWithMuscleSwelling",
  "analgesicBeforeTraining",
] as const;
const CARDIO = ["chestPain", "disproportionateBreathlessness", "dizzyLosingBalance", "fainting", "palpitations"] as const;
const HEAT = ["confusionOrCollapse", "headacheNauseaInHeat"] as const;

type Result = { session: SessionView; day: DayResponse; nextDay: DayResponse };

function LogPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { loading } = useRequireUser();
  // Busca o treino pelo id, e não pela semana atual: o treino de domingo à noite
  // continua registrável na segunda-feira, quando a semana do plano já virou.
  const workout = useWorkout(id, !loading);

  if (loading || workout.isLoading) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }
  const session = workout.data?.session;
  if (!session) {
    return (
      <FlowLayout>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-gray-700">{t("log.notFound")}</p>
          <Link to="/painel" className="mt-3 inline-block text-sm font-semibold text-[#C2410C] hover:underline">
            {t("log.backToPanel")}
          </Link>
        </div>
      </FlowLayout>
    );
  }
  return <LogForm session={session} logged={workout.data?.logPain ?? []} />;
}

/** O que já foi registrado volta para o formulário: salvar substitui as dores do registro, então nada pode ficar de fora. */
function fromLogged(logged: LoggedPain[]) {
  const sites = logged.filter((p) => p.region !== "geral");
  const general = logged.filter((p) => p.region === "geral");
  const pick = (m: Record<string, boolean> | undefined) => Object.fromEntries(Object.entries(m ?? {}).filter(([, v]) => v === true));
  return {
    regions: sites.map((p) => p.region),
    pain: Object.fromEntries(
      sites.map((p) => [
        p.region,
        { intensity: p.intensity, type: p.type, flags: Object.fromEntries(REGION_FLAGS.filter((f) => p[f] === true).map((f) => [f, true])) },
      ]),
    ) as Record<string, PainDetail>,
    cardio: Object.assign({}, ...general.map((p) => pick(p.cardio))) as Record<string, boolean>,
    heat: Object.assign({}, ...general.map((p) => pick(p.heat))) as Record<string, boolean>,
  };
}

function LogForm({ session, logged }: { session: SessionView; logged: LoggedPain[] }) {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const queryClient = useQueryClient();
  const log = session.log;

  const [completed, setCompleted] = useState<boolean | undefined>(log?.completed);
  const [duration, setDuration] = useState(log?.durationMinutes != null ? String(log.durationMinutes) : "");
  const [distance, setDistance] = useState(log?.distanceKm != null ? String(log.distanceKm).replace(".", ",") : "");
  const [srpe, setSrpe] = useState<number | undefined>(log?.srpe ?? undefined);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const isRun = isRunSession(session);
  const pace = paceMinPerKm(toNumber(distance), toNumber(duration));
  const [initial] = useState(() => fromLogged(logged));
  const [regions, setRegions] = useState<string[]>(initial.regions);
  const [pain, setPain] = useState<Record<string, PainDetail>>(initial.pain);
  const [cardio, setCardio] = useState<Record<string, boolean>>(initial.cardio);
  const [heat, setHeat] = useState<Record<string, boolean>>(initial.heat);
  const [errors, setErrors] = useState<{ completed?: string; duration?: string; srpe?: string; distance?: string; pain?: string }>({});
  const [result, setResult] = useState<Result | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** Apaga o erro de um campo assim que a pessoa mexe nele. */
  const clear = (...keys: (keyof typeof errors)[]) =>
    setErrors((prev) => (keys.some((k) => prev[k]) ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev));

  const name = session.name ? (i18n.language === "en" ? session.name.en : session.name["pt-BR"]) : session.slug;

  const regionLabel = (region: string) => {
    const side = region.endsWith("_d") ? "d" : region.endsWith("_e") ? "e" : "x";
    return t(`body.regions.${baseRegionId(region)}.${side}`, { defaultValue: region });
  };

  const toggleRegion = (region: string) => {
    clear("pain");
    setRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]));
    setPain((prev) => (prev[region] ? prev : { ...prev, [region]: { flags: {} } }));
  };
  const patchPain = (region: string, patch: Partial<PainDetail>) => {
    clear("pain");
    setPain((prev) => ({ ...prev, [region]: { ...(prev[region] ?? { flags: {} }), ...patch } }));
  };
  const setFlag = (region: string, flag: string, on: boolean) =>
    setPain((prev) => ({
      ...prev,
      [region]: { ...(prev[region] ?? { flags: {} }), flags: { ...(prev[region]?.flags ?? {}), [flag]: on } },
    }));

  const only = (m: Record<string, boolean>) => {
    const entries = Object.entries(m).filter(([, v]) => v);
    return entries.length ? Object.fromEntries(entries.map(([k]) => [k, true])) : undefined;
  };

  const save = useMutation({
    mutationFn: (payload: unknown) => fetchApi<Result>(`/workouts/${session.id}/log`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["day"] });
      void queryClient.invalidateQueries({ queryKey: ["week"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: workoutKey(session.id) });
    },
  });

  const submit = () => {
    const found: typeof errors = {};
    if (completed === undefined) found.completed = t("interview.errors.required");

    const reports: unknown[] = regions.map((region) => {
      const d = pain[region];
      if (d?.intensity === undefined) found.pain = t("log.painIntensityMissing");
      return { region, moment: "treino", intensity: d?.intensity, type: d?.type, ...d?.flags };
    });
    const cardioFlags = only(cardio);
    const heatFlags = only(heat);
    if (cardioFlags || heatFlags) {
      reports.push({ region: "geral", moment: "treino", intensity: 0, ...(cardioFlags ? { cardio: cardioFlags } : {}), ...(heatFlags ? { heat: heatFlags } : {}) });
    }
    // Só o que vale: false vira "não informado".
    const cleaned = reports.map((r) =>
      Object.fromEntries(Object.entries(r as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== false)),
    );

    const payload =
      completed === true
        ? {
            completed: true,
            durationMinutes: isRun ? toNumber(duration) : session.minutes,
            distanceKm: isRun ? toNumber(distance) : undefined,
            srpe,
            notes: toText(notes),
            pain: cleaned,
          }
        : { completed: false, notes: toText(notes), pain: cleaned };

    if (completed !== undefined) {
      // Confere o resto mesmo com a dor incompleta: a pessoa vê tudo o que falta de uma vez.
      const parsed = workoutLogSchema.safeParse(JSON.parse(JSON.stringify(found.pain ? { ...payload, pain: [] } : payload)));
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          if (key === "durationMinutes") found.duration = t("interview.errors.required");
          else if (key === "srpe") found.srpe = t("interview.errors.required");
          else if (key === "distanceKm") found.distance = t("interview.errors.invalid");
          else found.pain = t("log.invalid");
        }
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // O aviso fica junto do botão, mas o campo pode estar lá em cima: leva a pessoa até ele.
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]');
        first?.scrollIntoView({ block: "center" });
        first?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
        if (first?.matches("input")) first.focus({ preventScroll: true });
      });
      return;
    }
    save.mutate(JSON.parse(JSON.stringify(payload)));
  };

  if (result) return <Done result={result} />;

  // O que falta, em texto, junto do botão Salvar.
  const missing = [
    errors.completed && t("log.didIt"),
    errors.duration && t("log.duration"),
    errors.distance && t("log.distanceInvalid"),
    errors.srpe && t("log.srpe"),
    errors.pain,
  ].filter((x): x is string => !!x);

  return (
    <FlowLayout>
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t("log.kicker")}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">{name}</h1>
        <p className="mt-1 mb-5 text-sm text-gray-600">
          {t("panel.minutes", { count: session.minutes })} · {zoneUpTo(t, session.maxZone)}
        </p>

        <form
          ref={formRef}
          noValidate
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <ChoiceGroup
            name="completed"
            legend={t("log.didIt")}
            value={completed}
            onChange={(v) => {
              setCompleted(v);
              clear("completed");
            }}
            error={errors.completed}
            options={[
              { value: true, label: t("interview.yes") },
              { value: false, label: t("interview.no") },
            ]}
          />

          {completed === true && (
            <>
              {isRun ? (
                <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
                  <TextField
                    label={t("log.duration")}
                    inputMode="numeric"
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                      clear("duration");
                    }}
                    error={errors.duration}
                  />
                  <TextField
                    label={t("log.distance")}
                    inputMode="decimal"
                    value={distance}
                    onChange={(e) => {
                      setDistance(e.target.value);
                      clear("distance");
                    }}
                    error={errors.distance}
                  />
                  <p className="text-xs text-gray-500 min-[480px]:col-span-2">{t("log.durationHint")}</p>
                  {pace !== null && (
                    <p className="text-sm font-semibold text-[#0F172A] min-[480px]:col-span-2">
                      {t("log.paceLive", { pace: paceText(pace) })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">{t("log.plannedTime", { count: session.minutes })}</p>
              )}
              <ChoiceGroup
                name="srpe"
                legend={t("log.srpe")}
                hint={t("log.srpeScale")}
                value={srpe}
                onChange={(v) => {
                  setSrpe(v);
                  clear("srpe");
                }}
                error={errors.srpe}
                columns="grid-cols-5 min-[480px]:grid-cols-10"
                options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
            </>
          )}

          {completed !== undefined && (
            <>
              <fieldset data-error={errors.pain ? true : undefined} className="space-y-3 rounded-xl bg-[#F5F6F8] p-4">
                <legend className="px-1 text-sm font-semibold text-[#111827]">{t("log.painTitle")}</legend>
                <p className="text-xs text-gray-600">{t("log.painHelp")}</p>
                <BodyMap selected={regions} onToggle={toggleRegion} label={regionLabel} />
                {regions.length === 0 && <p className="text-center text-xs text-gray-500">{t("log.noPain")}</p>}
                {errors.pain && (
                  <p role="alert" className="text-xs text-red-600">
                    {errors.pain}
                  </p>
                )}
              </fieldset>

              {regions.map((region) => (
                <RegionCard
                  key={region}
                  title={regionLabel(region)}
                  detail={pain[region] ?? { flags: {} }}
                  onIntensity={(v) => patchPain(region, { intensity: v })}
                  onType={(v) => patchPain(region, { type: v })}
                  onFlag={(flag, on) => setFlag(region, flag, on)}
                  onRemove={() => toggleRegion(region)}
                />
              ))}

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-[#111827]">{t("log.symptomsTitle")}</legend>
                <p className="text-xs text-gray-500">{t("log.symptomsHelp")}</p>
                {CARDIO.map((k) => (
                  <CheckField key={k} label={t(`log.cardio.${k}`)} checked={!!cardio[k]} onChange={(e) => setCardio((p) => ({ ...p, [k]: e.target.checked }))} />
                ))}
                {HEAT.map((k) => (
                  <CheckField key={k} label={t(`log.heat.${k}`)} checked={!!heat[k]} onChange={(e) => setHeat((p) => ({ ...p, [k]: e.target.checked }))} />
                ))}
              </fieldset>

              <div className="space-y-1">
                <label htmlFor="notes" className="text-xs font-semibold text-[#111827]">
                  {t("log.notes")}
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#FF5A1F] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/20"
                />
              </div>
            </>
          )}

          {missing.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">{t("log.notSaved")}</p>
              <ul className="mt-1 list-disc pl-5">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {save.isError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorText(save.error)}
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-1/3">
              <Link
                to="/painel"
                className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-bold text-[#0F172A] transition-colors hover:bg-gray-50"
              >
                {t("log.cancel")}
              </Link>
            </div>
            <div className="flex-1">
              <PrimaryButton type="submit" disabled={save.isPending}>
                {save.isPending ? t("log.saving") : t("log.submit")}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </section>
      <p className="mt-2 text-center text-xs text-gray-500">{t("log.disclaimer")}</p>
    </FlowLayout>
  );
}

function RegionCard({
  title,
  detail,
  onIntensity,
  onType,
  onFlag,
  onRemove,
}: {
  title: string;
  detail: PainDetail;
  onIntensity: (v: number) => void;
  onType: (v: PainType) => void;
  onFlag: (flag: string, on: boolean) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4 rounded-xl border border-orange-200 p-4" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
        <button type="button" onClick={onRemove} className="text-xs font-semibold text-gray-500 hover:text-[#C2410C]">
          {t("log.removeRegion")}
        </button>
      </div>
      <ChoiceGroup
        name={`intensity-${title}`}
        legend={t("log.intensity")}
        hint={t("log.intensityScale")}
        value={detail.intensity}
        onChange={onIntensity}
        columns="grid-cols-5 min-[480px]:grid-cols-10"
        options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
      />
      <ChoiceGroup
        name={`type-${title}`}
        legend={t("log.type")}
        value={detail.type}
        onChange={onType}
        columns="grid-cols-3"
        options={(["pontada", "difusa", "outra"] as const).map((v) => ({ value: v, label: t(`log.types.${v}`) }))}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[#111827]">{t("log.flagsTitle")}</legend>
        {REGION_FLAGS.map((flag) => (
          <CheckField
            key={flag}
            label={t(`log.flags.${flag}`)}
            checked={!!detail.flags[flag]}
            onChange={(e) => onFlag(flag, e.target.checked)}
          />
        ))}
      </fieldset>
    </section>
  );
}

function Done({ result }: { result: Result }) {
  const { t, i18n } = useTranslation();
  const urgent = result.day.decision.urgent || result.nextDay.decision.urgent;
  const refer = result.day.decision.refer || result.nextDay.decision.refer;
  return (
    <FlowLayout>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("log.doneTitle")}</h1>
        {urgent && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {t("panel.urgent")}
          </p>
        )}
        {refer && !urgent && (
          <p role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-gray-800">
            {t("log.referNote")}
          </p>
        )}
        <div className="rounded-xl bg-[#F5F6F8] p-4 text-sm leading-relaxed text-gray-700">
          <p className="mb-1 font-semibold text-[#111827]">{t("log.nextDayTitle")}</p>
          {/* Texto do motor de regras, já no idioma da tela. */}
          <p lang={i18n.language} className="whitespace-pre-line">
            {result.nextDay.decision.message}
          </p>
        </div>
        <Link
          to="/painel"
          className="flex w-full items-center justify-center rounded-xl bg-[#C2410C] px-4 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#9A3412]"
        >
          {t("log.backToPanel")}
        </Link>
      </section>
    </FlowLayout>
  );
}
