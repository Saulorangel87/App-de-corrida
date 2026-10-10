import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { newPasswordSchema } from "@passo/shared";
import { AuthLayout } from "../components/auth-layout";
import { AuthHead, BackToLogin, InfoBox, PrimaryButton, PrimaryLink, StatusBadge } from "../components/auth-ui";
import { TextField } from "../components/field";
import { ApiError, fetchApi } from "../lib/api";
import { useFragmentToken } from "../lib/fragment-token";
import { useErrorText } from "../lib/use-error-text";

export const Route = createFileRoute("/redefinir-senha")({
  component: ResetPassword,
});

const formSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "mismatch" });
type Form = z.infer<typeof formSchema>;

/** Código do problema de senha devolvido pela API (details: [{ path: "password", code }]). */
function passwordProblem(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !Array.isArray(error.details)) return null;
  const item = (error.details as { path?: string; code?: string }[]).find((d) => d.path === "password");
  return item?.code ?? null;
}

function ResetPassword() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { token, arrival } = useFragmentToken();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(formSchema), defaultValues: { password: "", confirm: "" } });

  const save = useMutation({
    mutationFn: (data: Form) =>
      fetchApi("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: data.password }) }),
  });

  // Um link novo na mesma página (troca só do fragmento) recomeça o fluxo.
  const { reset } = save;
  useEffect(() => {
    reset();
  }, [arrival, reset]);

  const invalid = !token || (save.error instanceof ApiError && save.error.code === "INVALID_TOKEN");
  if (invalid) {
    return (
      <AuthLayout>
        <StatusBadge kind="error" />
        <AuthHead title={t("auth.invalidTitle")} text={t("auth.invalidText")} />
        <PrimaryLink to="/esqueci-a-senha">{t("auth.requestNew")}</PrimaryLink>
        <BackToLogin />
      </AuthLayout>
    );
  }

  if (save.isSuccess) {
    return (
      <AuthLayout>
        <StatusBadge kind="ok" />
        <AuthHead title={t("auth.doneTitle")} text={t("auth.doneText")} />
        <PrimaryLink to="/entrar">{t("auth.signIn")}</PrimaryLink>
      </AuthLayout>
    );
  }

  const problem = passwordProblem(save.error);
  const passwordError = errors.password
    ? t("validation.password")
    : problem
      ? t(`validation.pw.${problem}`, { defaultValue: t("errors.VALIDATION_ERROR") })
      : undefined;

  return (
    <AuthLayout>
      <AuthHead title={t("auth.resetTitle")} text={t("auth.resetText")} />
      {save.isError && !problem && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorText(save.error)}
        </div>
      )}
      <form className="space-y-4" noValidate onSubmit={handleSubmit((d) => save.mutate(d))}>
        <TextField
          label={t("auth.newPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.newPasswordPlaceholder")}
          error={passwordError}
          {...register("password")}
        />
        <TextField
          label={t("auth.confirmPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.repeatPlaceholder")}
          error={errors.confirm ? t("validation.mismatch") : undefined}
          {...register("confirm")}
        />
        <PrimaryButton disabled={save.isPending}>{save.isPending ? t("auth.resetSaving") : t("auth.resetSubmit")}</PrimaryButton>
      </form>
      <InfoBox>{t("auth.resetNote")}</InfoBox>
    </AuthLayout>
  );
}
