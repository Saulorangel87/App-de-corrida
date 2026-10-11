import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { checkinSchema } from "@passo/shared";
import { PrimaryButton } from "../components/auth-ui";
import { ChoiceField, YesNoField, useFieldError } from "../components/choice";
import { TextField } from "../components/field";
import { FlowLayout } from "../components/flow-layout";
import { fetchApi } from "../lib/api";
import { localToday } from "../lib/dates";
import { useRequireUser } from "../lib/queries";
import { stepResolver, toNumber } from "../lib/step-form";
import { dayKey, useDay, weekKey, type DayResponse } from "../lib/training";
import { useErrorText } from "../lib/use-error-text";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
});

type Form = {
  sleepHours?: number;
  sleepQuality?: number;
  energy?: number;
  mood?: number;
  stress?: number;
  muscleSoreness?: number;
  restingHr?: number;
  acuteIllness?: boolean;
  dailyPainWalking?: number;
};

const RATINGS = ["sleepQuality", "energy", "mood", "stress", "muscleSoreness"] as const;
const RATING_KEY: Record<(typeof RATINGS)[number], string> = {
  sleepQuality: "sleepQuality",
  energy: "energy",
  mood: "mood",
  stress: "stress",
  muscleSoreness: "soreness",
};

/** Só o que foi respondido vai para a API (o check-in é todo opcional). */
const toPayload = (v: Form) =>
  Object.fromEntries(Object.entries({ ...v, acuteIllness: v.acuteIllness ?? false }).filter(([, value]) => value !== undefined));

function CheckinPage() {
  const { loading } = useRequireUser();
  const today = localToday();
  const day = useDay(today, !loading);
  const { t } = useTranslation();

  if (loading || day.isLoading || !day.data) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {day.isError ? t("panel.loadError") : t("common.loading")}
        </p>
      </FlowLayout>
    );
  }
  return <CheckinForm today={today} day={day.data} />;
}

function CheckinForm({ today, day }: { today: string; day: DayResponse }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const fieldError = useFieldError();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saved = day.checkin;
  const asksPain = day.questions.includes("daily_pain_walking");

  const { register, control, handleSubmit, formState } = useForm<Form>({
    resolver: stepResolver<Form>(checkinSchema, toPayload),
    defaultValues: {
      sleepHours: saved?.sleepHours ?? undefined,
      sleepQuality: saved?.sleepQuality ?? undefined,
      energy: saved?.energy ?? undefined,
      mood: saved?.mood ?? undefined,
      stress: saved?.stress ?? undefined,
      muscleSoreness: saved?.muscleSoreness ?? undefined,
      restingHr: saved?.restingHr ?? undefined,
      acuteIllness: saved?.acuteIllness ?? false,
      dailyPainWalking: saved?.dailyPainWalking ?? undefined,
    },
  });

  const save = useMutation({
    mutationFn: (values: Form) =>
      fetchApi<DayResponse>(`/checkins/${today}`, { method: "PUT", body: JSON.stringify(toPayload(values)) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(dayKey(today), updated);
      void queryClient.invalidateQueries({ queryKey: weekKey(today) });
      void navigate({ to: "/painel" });
    },
  });

  return (
    <FlowLayout>
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("checkin.title")}</h1>
        <p className="mt-1 mb-4 text-[15px] leading-snug text-gray-600">{t("checkin.text")}</p>
        <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
          <TextField
            label={t("checkin.sleepHours")}
            hint={t("checkin.sleepHint")}
            inputMode="decimal"
            placeholder="7,5"
            error={fieldError(formState.errors.sleepHours?.message)}
            {...register("sleepHours", { setValueAs: toNumber })}
          />
          {RATINGS.map((name) => {
            const k = RATING_KEY[name];
            return (
              <ChoiceField
                key={name}
                control={control}
                name={name}
                legend={t(`checkin.${k}`)}
                hint={t("checkin.scale", { low: t(`checkin.low.${k}`), high: t(`checkin.high.${k}`) })}
                columns="grid-cols-5"
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
              />
            );
          })}
          <YesNoField control={control} name="acuteIllness" legend={t("checkin.illness")} />
          {asksPain && (
            <ChoiceField
              control={control}
              name="dailyPainWalking"
              legend={t("checkin.painWalking")}
              hint={t("checkin.painWalkingHint")}
              columns="grid-cols-6 min-[480px]:grid-cols-11"
              options={Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) }))}
            />
          )}
          <TextField
            label={t("checkin.restingHr")}
            hint={t("checkin.restingHrHint")}
            inputMode="numeric"
            error={fieldError(formState.errors.restingHr?.message)}
            {...register("restingHr", { setValueAs: toNumber })}
          />

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
                {t("checkin.back")}
              </Link>
            </div>
            <div className="flex-1">
              <PrimaryButton type="submit" disabled={save.isPending}>
                {save.isPending ? t("checkin.saving") : t("checkin.submit")}
              </PrimaryButton>
            </div>
          </div>
        </form>
      </section>
    </FlowLayout>
  );
}
