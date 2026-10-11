import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { availabilityStep, goalStep, injuriesStep, recoveryStep, resourcesStep } from "@passo/shared";
import { ChoiceField, MultiChoiceField, SelectField, YesNoField, useFieldError } from "../../components/choice";
import { TextField } from "../../components/field";
import { toNumber, toText } from "../../lib/step-form";
import { StepActions, StepFields, savedObject, useStepForm, type StepProps } from "./common";

const RACE_GOALS = ["primeira_prova", "melhorar_tempo"];

// ---------- Lesões ----------

type InjuriesForm = {
  injury12m?: boolean;
  runningInjuryLast3m?: boolean;
  injuryOrPersistentPainLast6w?: boolean;
  painIntensity?: number;
  painPart?: string;
};

export function InjuriesStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t } = useTranslation();
  const fieldError = useFieldError();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<InjuriesForm>({
    schema: injuriesStep,
    toPayload: (v) => ({
      injury12m: v.injury12m,
      runningInjuryLast3m: v.runningInjuryLast3m,
      injuryOrPersistentPainLast6w: v.injuryOrPersistentPainLast6w,
      currentPain: {
        intensity: v.painIntensity,
        bodyPart: v.painIntensity ? toText(v.painPart) : undefined,
      },
    }),
    fieldOf: (path) => (path === "currentPain.intensity" || path === "currentPain" ? "painIntensity" : path === "currentPain.bodyPart" ? "painPart" : path),
    defaults: {
      injury12m: s.injury12m,
      runningInjuryLast3m: s.runningInjuryLast3m,
      injuryOrPersistentPainLast6w: s.injuryOrPersistentPainLast6w,
      painIntensity: s.currentPain?.intensity,
      painPart: s.currentPain?.bodyPart ?? "",
    },
    onSubmit,
  });
  const { register, control, formState } = form;
  const intensity = useWatch({ control, name: "painIntensity" });
  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <YesNoField control={control} name="injury12m" legend={t("interview.lesoes.injury12m")} />
        <YesNoField control={control} name="runningInjuryLast3m" legend={t("interview.lesoes.runningInjury3m")} />
        <YesNoField control={control} name="injuryOrPersistentPainLast6w" legend={t("interview.lesoes.persistent6w")} />
        <ChoiceField
          control={control}
          name="painIntensity"
          legend={t("interview.lesoes.painNow")}
          hint={t("interview.lesoes.painScale")}
          columns="grid-cols-6 min-[480px]:grid-cols-11"
          options={Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) }))}
        />
        {typeof intensity === "number" && intensity > 0 && (
          <TextField
            label={t("interview.lesoes.painPart")}
            hint={t("interview.lesoes.painPartHint")}
            maxLength={50}
            error={fieldError(formState.errors.painPart?.message)}
            {...register("painPart")}
          />
        )}
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}

// ---------- Objetivo ----------

type GoalForm = { goal?: string; raceDistance?: string; raceDate?: string };

export function GoalStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t } = useTranslation();
  const fieldError = useFieldError();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<GoalForm>({
    schema: goalStep,
    toPayload: (v) => {
      const race = RACE_GOALS.includes(v.goal ?? "");
      return { goal: v.goal, raceDistance: race ? v.raceDistance : undefined, raceDate: race ? toText(v.raceDate) : undefined };
    },
    defaults: { goal: s.goal, raceDistance: s.raceDistance, raceDate: s.raceDate ?? "" },
    onSubmit,
  });
  const { register, control, formState } = form;
  const goal = useWatch({ control, name: "goal" });
  const today = new Date().toLocaleDateString("sv-SE");
  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <ChoiceField
          control={control}
          name="goal"
          legend={t("interview.objetivo.goal")}
          columns="grid-cols-1 min-[480px]:grid-cols-2"
          options={(["saude", "emagrecimento", "primeira_prova", "melhorar_tempo"] as const).map((g) => ({
            value: g,
            label: t(`interview.objetivo.goals.${g}`),
          }))}
        />
        {RACE_GOALS.includes(goal ?? "") && (
          <>
            <ChoiceField
              control={control}
              name="raceDistance"
              legend={t(goal === "melhorar_tempo" ? "interview.objetivo.timeDistance" : "interview.objetivo.raceDistance")}
              columns="grid-cols-4"
              options={(["5k", "10k", "21k", "42k"] as const).map((d) => ({ value: d, label: d.replace("k", " km") }))}
            />
            <TextField
              label={t(goal === "melhorar_tempo" ? "interview.objetivo.timeDate" : "interview.objetivo.raceDate")}
              hint={t(goal === "melhorar_tempo" ? "interview.objetivo.timeDateHint" : "interview.objetivo.raceDateHint")}
              type="date"
              min={today}
              error={fieldError(formState.errors.raceDate?.message)}
              {...register("raceDate")}
            />
          </>
        )}
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}

// ---------- Disponibilidade ----------

type AvailabilityForm = { daysPerWeek?: number; minutesPerSession?: number; longRunDay?: number };

export function AvailabilityStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t, i18n } = useTranslation();
  const fieldError = useFieldError();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<AvailabilityForm>({
    schema: availabilityStep,
    toPayload: (v) => ({ daysPerWeek: v.daysPerWeek, minutesPerSession: v.minutesPerSession, longRunDay: v.longRunDay }),
    defaults: { daysPerWeek: s.daysPerWeek, minutesPerSession: s.minutesPerSession, longRunDay: s.longRunDay },
    onSubmit,
  });
  const { register, control, formState } = form;
  // 1 = segunda ... 7 = domingo (1º de janeiro de 2024 foi uma segunda-feira).
  const weekdays = Array.from({ length: 7 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, i + 1))),
  }));
  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <ChoiceField
          control={control}
          name="daysPerWeek"
          legend={t("interview.disponibilidade.daysPerWeek")}
          columns="grid-cols-7"
          options={Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        />
        <TextField
          label={t("interview.disponibilidade.minutesPerSession")}
          hint={t("interview.disponibilidade.minutesHint")}
          inputMode="numeric"
          placeholder="45"
          error={fieldError(formState.errors.minutesPerSession?.message)}
          {...register("minutesPerSession", { setValueAs: toNumber })}
        />
        <SelectField
          label={t("interview.disponibilidade.longRunDay")}
          placeholder={t("interview.disponibilidade.longRunPlaceholder")}
          options={weekdays}
          error={fieldError(formState.errors.longRunDay?.message)}
          {...register("longRunDay", { setValueAs: toNumber })}
        />
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}

// ---------- Recuperação ----------

type RecoveryForm = {
  sleepHours?: number;
  stress?: number;
  workType?: string;
  otherSportsMinutesPerWeek?: number;
  strengthTraining?: boolean;
};

export function RecoveryStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t } = useTranslation();
  const fieldError = useFieldError();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<RecoveryForm>({
    schema: recoveryStep,
    toPayload: (v) => ({
      sleepHours: v.sleepHours,
      stress: v.stress,
      workType: v.workType,
      otherSportsMinutesPerWeek: v.otherSportsMinutesPerWeek,
      strengthTraining: v.strengthTraining,
    }),
    defaults: {
      sleepHours: s.sleepHours,
      stress: s.stress,
      workType: s.workType,
      otherSportsMinutesPerWeek: s.otherSportsMinutesPerWeek,
      strengthTraining: s.strengthTraining,
    },
    onSubmit,
  });
  const { register, control, formState } = form;
  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <TextField
          label={t("interview.recuperacao.sleepHours")}
          hint={t("interview.recuperacao.sleepHint")}
          inputMode="decimal"
          placeholder="7,5"
          error={fieldError(formState.errors.sleepHours?.message)}
          {...register("sleepHours", { setValueAs: toNumber })}
        />
        <ChoiceField
          control={control}
          name="stress"
          legend={t("interview.recuperacao.stress")}
          columns="grid-cols-1 min-[480px]:grid-cols-5"
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: t(`interview.recuperacao.stressLevels.${n}`) }))}
        />
        <ChoiceField
          control={control}
          name="workType"
          legend={t("interview.recuperacao.workType")}
          columns="grid-cols-1"
          options={(["sedentario", "misto", "fisico"] as const).map((w) => ({ value: w, label: t(`interview.recuperacao.work.${w}`) }))}
        />
        <TextField
          label={t("interview.recuperacao.otherSports")}
          hint={t("interview.recuperacao.otherSportsHint")}
          inputMode="numeric"
          error={fieldError(formState.errors.otherSportsMinutesPerWeek?.message)}
          {...register("otherSportsMinutesPerWeek", { setValueAs: toNumber })}
        />
        <YesNoField control={control} name="strengthTraining" legend={t("interview.recuperacao.strength")} />
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}

// ---------- Recursos ----------

type ResourcesForm = { hrDevice?: string; track?: boolean; treadmill?: boolean; terrain: string[] };

export function ResourcesStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t } = useTranslation();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<ResourcesForm>({
    schema: resourcesStep,
    toPayload: (v) => ({ hrDevice: v.hrDevice, track: v.track, treadmill: v.treadmill, terrain: v.terrain ?? [] }),
    defaults: { hrDevice: s.hrDevice, track: s.track, treadmill: s.treadmill, terrain: s.terrain ?? [] },
    onSubmit,
  });
  const { control } = form;
  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <ChoiceField
          control={control}
          name="hrDevice"
          legend={t("interview.recursos.hrDevice")}
          columns="grid-cols-3"
          options={(["nenhum", "relogio", "cinta"] as const).map((h) => ({ value: h, label: t(`interview.recursos.hr.${h}`) }))}
        />
        <YesNoField control={control} name="track" legend={t("interview.recursos.track")} />
        <YesNoField control={control} name="treadmill" legend={t("interview.recursos.treadmill")} />
        <MultiChoiceField
          control={control}
          name="terrain"
          legend={t("interview.recursos.terrain")}
          hint={t("interview.recursos.terrainHint")}
          options={(["plano", "subidas", "trilha"] as const).map((x) => ({ value: x, label: t(`interview.recursos.terrains.${x}`) }))}
        />
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}
