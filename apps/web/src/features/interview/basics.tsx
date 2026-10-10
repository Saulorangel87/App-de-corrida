import { useTranslation } from "react-i18next";
import { basicsStep } from "@passo/shared";
import { ChoiceField, SelectField, useFieldError } from "../../components/choice";
import { TextField } from "../../components/field";
import { toNumber } from "../../lib/step-form";
import { Row, StepActions, StepFields, savedObject, useStepForm, type StepProps } from "./common";

type Form = {
  birthMonth?: number;
  birthYear?: number;
  sex?: "M" | "F" | "nao_informado";
  heightCm?: number;
  weightKg?: number;
};

const toPayload = (v: Form) => ({
  birthMonth: v.birthMonth,
  birthYear: v.birthYear,
  sex: v.sex,
  heightCm: v.heightCm,
  weightKg: v.weightKg,
});

export function BasicsStep({ saved, onSubmit, ...actions }: StepProps) {
  const { t, i18n } = useTranslation();
  const fieldError = useFieldError();
  const s = savedObject(saved);
  const { form, submit } = useStepForm<Form>({
    schema: basicsStep,
    toPayload,
    defaults: { birthMonth: s.birthMonth, birthYear: s.birthYear, sex: s.sex, heightCm: s.heightCm, weightKg: s.weightKg },
    onSubmit,
  });
  const { register, control, formState } = form;
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(i18n.language, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, i, 1))),
  }));

  return (
    <form noValidate onSubmit={submit}>
      <StepFields>
        <Row>
          <SelectField
            label={t("interview.basicos.birthMonth")}
            placeholder={t("interview.basicos.birthMonthPlaceholder")}
            options={months}
            error={fieldError(formState.errors.birthMonth?.message)}
            {...register("birthMonth", { setValueAs: toNumber })}
          />
          <TextField
            label={t("interview.basicos.birthYear")}
            inputMode="numeric"
            autoComplete="bday-year"
            placeholder="1990"
            hint={t("interview.basicos.birthYearHint")}
            error={fieldError(formState.errors.birthYear?.message)}
            {...register("birthYear", { setValueAs: toNumber })}
          />
        </Row>
        <ChoiceField
          control={control}
          name="sex"
          legend={t("interview.basicos.sex")}
          columns="grid-cols-1 min-[420px]:grid-cols-3"
          options={[
            { value: "M", label: t("interview.basicos.sexM") },
            { value: "F", label: t("interview.basicos.sexF") },
            { value: "nao_informado", label: t("interview.basicos.sexNone") },
          ]}
        />
        <Row>
          <TextField
            label={t("interview.basicos.heightCm")}
            inputMode="numeric"
            placeholder="170"
            error={fieldError(formState.errors.heightCm?.message)}
            {...register("heightCm", { setValueAs: toNumber })}
          />
          <TextField
            label={t("interview.basicos.weightKg")}
            inputMode="decimal"
            placeholder="68"
            error={fieldError(formState.errors.weightKg?.message)}
            {...register("weightKg", { setValueAs: toNumber })}
          />
        </Row>
      </StepFields>
      <StepActions {...actions} />
    </form>
  );
}
