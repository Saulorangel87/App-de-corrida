import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { historyStep } from "@passo/shared";
import { ChoiceField, YesNoField, useFieldError } from "../../components/choice";
import { TextField } from "../../components/field";
import { toNumber, toText } from "../../lib/step-form";
import { StepActions, StepFields, savedObject, useStepForm, type StepProps } from "./common";

// Os tempos de prova são digitados em minutos e segundos; a API recebe segundos totais e a data.
type Form = {
  monthsRegular?: number;
  weeklySessions?: number;
  volumeUnit?: "km" | "min";
  volumeValue?: number;
  longestRecentKm?: number;
  canRunContinuousMinutes?: number;
  daysSinceLastRun?: number;
  halfMarathonLast3m?: boolean;
  regularExercise3m?: boolean;
  t5kMin?: number;
  t5kSec?: number;
  t5kDate?: string;
  t10kMin?: number;
  t10kSec?: number;
  t10kDate?: string;
};

function race(min?: number, sec?: number, date?: string) {
  if (min === undefined && sec === undefined && !toText(date)) return undefined;
  return { seconds: min === undefined ? undefined : min * 60 + (sec ?? 0), date: toText(date) };
}

const toPayload = (v: Form) => ({
  monthsRegular: v.monthsRegular,
  weeklySessions: v.weeklySessions,
  weeklyVolume: { unit: v.volumeUnit, value: v.volumeValue },
  longestRecentKm: v.longestRecentKm,
  canRunContinuousMinutes: v.canRunContinuousMinutes,
  t5k: race(v.t5kMin, v.t5kSec, v.t5kDate),
  t10k: race(v.t10kMin, v.t10kSec, v.t10kDate),
  daysSinceLastRun: v.daysSinceLastRun,
  halfMarathonLast3m: v.halfMarathonLast3m,
  regularExercise3m: v.regularExercise3m,
});

const FIELD: Record<string, string> = {
  "weeklyVolume.unit": "volumeUnit",
  "weeklyVolume.value": "volumeValue",
  "weeklyVolume": "volumeUnit",
  "t5k.seconds": "t5kMin",
  "t5k.date": "t5kDate",
  "t10k.seconds": "t10kMin",
  "t10k.date": "t10kDate",
};
const fieldOf = (path: string) => FIELD[path] ?? path;

function defaultsFrom(saved: unknown): Form {
  const s = savedObject(saved);
  const split = (r?: { seconds: number; date: string }) =>
    r ? { min: Math.floor(r.seconds / 60), sec: r.seconds % 60, date: r.date } : {};
  const a = split(s.t5k);
  const b = split(s.t10k);
  return {
    monthsRegular: s.monthsRegular,
    weeklySessions: s.weeklySessions,
    volumeUnit: s.weeklyVolume?.unit ?? "km",
    volumeValue: s.weeklyVolume?.value,
    longestRecentKm: s.longestRecentKm,
    canRunContinuousMinutes: s.canRunContinuousMinutes,
    daysSinceLastRun: s.daysSinceLastRun,
    halfMarathonLast3m: s.halfMarathonLast3m,
    regularExercise3m: s.regularExercise3m,
    t5kMin: a.min,
    t5kSec: a.sec,
    t5kDate: a.date,
    t10kMin: b.min,
    t10kSec: b.sec,
    t10kDate: b.date,
  };
}

export function HistoryStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t } = useTranslation();
  const fieldError = useFieldError();
  const { form, submit } = useStepForm<Form>({
    schema: historyStep,
    toPayload,
    fieldOf,
    defaults: defaultsFrom(saved),
    onSubmit,
  });
  const { register, control, formState } = form;
  const unit = useWatch({ control, name: "volumeUnit" });
  const err = (name: keyof Form) => fieldError(formState.errors[name]?.message as string | undefined);
  const num = (name: keyof Form) => register(name as never, { setValueAs: toNumber });

  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <TextField
          label={t("interview.historico.monthsRegular")}
          hint={t("interview.historico.monthsRegularHint")}
          inputMode="numeric"
          error={err("monthsRegular")}
          {...num("monthsRegular")}
        />
        <TextField
          label={t("interview.historico.weeklySessions")}
          hint={t("interview.historico.weeklySessionsHint")}
          inputMode="decimal"
          error={err("weeklySessions")}
          {...num("weeklySessions")}
        />
        <ChoiceField
          control={control}
          name="volumeUnit"
          legend={t("interview.historico.volumeUnit")}
          options={[
            { value: "km", label: t("interview.historico.unitKm") },
            { value: "min", label: t("interview.historico.unitMin") },
          ]}
        />
        <TextField
          label={t(unit === "min" ? "interview.historico.volumeMin" : "interview.historico.volumeKm")}
          inputMode="decimal"
          error={err("volumeValue")}
          {...num("volumeValue")}
        />
        <TextField
          label={t("interview.historico.longestRecentKm")}
          hint={t("interview.historico.longestRecentKmHint")}
          inputMode="decimal"
          error={err("longestRecentKm")}
          {...num("longestRecentKm")}
        />
        <TextField
          label={t("interview.historico.canRunMinutes")}
          hint={t("interview.historico.canRunMinutesHint")}
          inputMode="numeric"
          error={err("canRunContinuousMinutes")}
          {...num("canRunContinuousMinutes")}
        />
        <TextField
          label={t("interview.historico.daysSinceLastRun")}
          hint={t("interview.historico.daysSinceLastRunHint")}
          inputMode="numeric"
          error={err("daysSinceLastRun")}
          {...num("daysSinceLastRun")}
        />
        <YesNoField control={control} name="halfMarathonLast3m" legend={t("interview.historico.half")} />
        <YesNoField control={control} name="regularExercise3m" legend={t("interview.historico.regular")} />

        <fieldset className="space-y-4 rounded-xl bg-[#F5F6F8] p-4">
          <legend className="px-1 text-sm font-semibold text-[#111827]">{t("interview.historico.timesTitle")}</legend>
          <p className="text-xs text-gray-600">{t("interview.historico.timesHint")}</p>
          {(["t5k", "t10k"] as const).map((k) => (
            <div key={k} className="space-y-2">
              <div className="text-xs font-semibold text-[#111827]">{t(`interview.historico.${k}`)}</div>
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label={t("interview.historico.minutes")}
                  inputMode="numeric"
                  error={err(`${k}Min`)}
                  {...num(`${k}Min`)}
                />
                <TextField label={t("interview.historico.seconds")} inputMode="numeric" error={err(`${k}Sec`)} {...num(`${k}Sec`)} />
                <TextField
                  label={t("interview.historico.date")}
                  type="date"
                  error={err(`${k}Date`)}
                  {...register(`${k}Date`)}
                />
              </div>
            </div>
          ))}
        </fieldset>
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}
