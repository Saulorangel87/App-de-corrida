import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { emailOnlySchema } from "@passo/shared";
import { AuthLayout } from "../components/auth-layout";
import { AuthHead, BackToLogin, InfoBox, PrimaryButton, SecondaryButton, StatusBadge } from "../components/auth-ui";
import { TextField } from "../components/field";
import { fetchApi } from "../lib/api";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/esqueci-a-senha")({
  component: ForgotPassword,
});

type Form = z.input<typeof emailOnlySchema>;

function ForgotPassword() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof emailOnlySchema>>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  const send = useMutation({
    mutationFn: (data: { email: string }) => fetchApi("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
  });

  if (send.isSuccess) {
    return (
      <AuthLayout>
        <StatusBadge kind="mail" />
        <AuthHead title={t("auth.sentTitle")} text={t("auth.sentText")} />
        <div role="status">
          <InfoBox>{t("auth.sentSpam")}</InfoBox>
        </div>
        <div className="mt-4">
          <SecondaryButton onClick={() => send.reset()}>{t("auth.sentOther")}</SecondaryButton>
        </div>
        <BackToLogin />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthHead title={t("auth.forgotTitle")} text={t("auth.forgotText")} />
      {send.isError && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorText(send.error)}
        </div>
      )}
      <form className="space-y-4" noValidate onSubmit={handleSubmit((d) => send.mutate(d))}>
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          error={errors.email ? t("validation.email") : undefined}
          {...register("email")}
        />
        <PrimaryButton disabled={send.isPending}>{send.isPending ? t("auth.forgotSending") : t("auth.forgotSubmit")}</PrimaryButton>
      </form>
      <BackToLogin />
      <InfoBox>{t("auth.forgotNote")}</InfoBox>
    </AuthLayout>
  );
}
