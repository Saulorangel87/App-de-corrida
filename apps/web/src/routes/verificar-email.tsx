import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { emailOnlySchema } from "@passo/shared";
import { AuthLayout } from "../components/auth-layout";
import { AuthHead, BackToLogin, InfoBox, PrimaryButton, PrimaryLink, StatusBadge } from "../components/auth-ui";
import { TextField } from "../components/field";
import { ApiError, fetchApi } from "../lib/api";
import { useFragmentToken } from "../lib/fragment-token";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/verificar-email")({
  component: VerifyEmail,
});

function VerifyEmail() {
  const { t } = useTranslation();
  const { token, arrival } = useFragmentToken();
  const started = useRef(-1);

  const verify = useMutation({
    mutationFn: (value: string) => fetchApi("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: value }) }),
  });

  // O token vale uma vez: confirma uma única vez por link recebido (o StrictMode do desenvolvimento
  // roda o efeito duas vezes; um link novo na mesma página conta como nova chegada).
  useEffect(() => {
    if (token && started.current !== arrival) {
      started.current = arrival;
      verify.mutate(token);
    }
  }, [token, arrival, verify]);

  if (verify.isSuccess) {
    return (
      <AuthLayout>
        <StatusBadge kind="ok" />
        <AuthHead title={t("auth.verifiedTitle")} text={t("auth.verifiedText")} />
        <PrimaryLink to="/entrar">{t("auth.signIn")}</PrimaryLink>
      </AuthLayout>
    );
  }

  if (!token || verify.isError) {
    return <VerifyFailed networkError={verify.error instanceof ApiError && verify.error.code === "NETWORK"} />;
  }

  return (
    <AuthLayout>
      <div role="status">
        <AuthHead title={t("auth.verifyingTitle")} text="" />
      </div>
    </AuthLayout>
  );
}

function VerifyFailed({ networkError }: { networkError: boolean }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof emailOnlySchema>, unknown, z.output<typeof emailOnlySchema>>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });
  const resend = useMutation({
    mutationFn: (data: { email: string }) => fetchApi("/auth/resend-verification", { method: "POST", body: JSON.stringify(data) }),
  });

  return (
    <AuthLayout>
      <StatusBadge kind="error" />
      <AuthHead title={t("auth.verifyFailTitle")} text={t("auth.verifyFailText")} />
      {networkError && <InfoBox tone="error">{t("errors.network")}</InfoBox>}
      {resend.isError && <InfoBox tone="error">{errorText(resend.error)}</InfoBox>}
      {resend.isSuccess ? (
        <div role="status">
          <InfoBox>
            <p>{t("auth.resendDone")}</p>
            <p className="mt-1">{t("auth.spamNote")}</p>
          </InfoBox>
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={handleSubmit((d) => resend.mutate(d))}>
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            error={errors.email ? t("validation.email") : undefined}
            {...register("email")}
          />
          <PrimaryButton disabled={resend.isPending}>{resend.isPending ? t("auth.resending") : t("auth.resend")}</PrimaryButton>
        </form>
      )}
      <BackToLogin />
    </AuthLayout>
  );
}
