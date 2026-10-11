import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import type { z } from "zod";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@passo/shared";
import { AuthLayout } from "../components/auth-layout";
import { CheckField, TextField } from "../components/field";
import { ResendConfirmation } from "../components/resend-confirmation";
import { ApiError, fetchApi } from "../lib/api";
import { passwordProblem } from "../lib/password-problem";
import { useErrorText } from "../lib/use-error-text";
import { AUTH_KEY, type AuthUser } from "../lib/queries";

export const Route = createFileRoute("/entrar")({
  component: AuthPage,
});

type LoginForm = z.input<typeof loginSchema>;
type RegisterForm = z.input<typeof registerSchema>;

const field = (message: string | undefined, text: string) => (message ? text : undefined);

function AuthPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"login" | "register">("login");

  const tabClass = (active: boolean) =>
    `pb-2 sm:pb-3 text-base font-semibold transition-colors relative ${active ? "text-[#111827]" : "text-gray-500 hover:text-gray-900"}`;

  return (
    <AuthLayout>
      <div role="tablist" aria-label={t("auth.tabs")} className="flex gap-8 border-b border-gray-200 mb-2">
        {(["login", "register"] as const).map((id) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={tabClass(tab === id)}
          >
            {id === "login" ? t("auth.tabLogin") : t("auth.tabRegister")}
            {tab === id && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#FF5A1F]" />}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "login" ? <LoginForm onGoToRegister={() => setTab("register")} /> : <RegisterFormView />}
      </div>

      {tab === "login" && (
        <p className="mt-4 text-center text-xs text-gray-500 max-w-[320px] mx-auto leading-relaxed">{t("auth.privacyNote")}</p>
      )}
    </AuthLayout>
  );
}

function LoginForm({ onGoToRegister }: { onGoToRegister: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const login = useMutation({
    mutationFn: (data: LoginInput) => fetchApi<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.setQueryData(AUTH_KEY, res.user);
      void navigate({ to: "/painel" });
    },
  });

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">{t("auth.welcome")}</h1>
        <p className="text-sm text-gray-500">{t("auth.welcomeText")}</p>
      </div>

      {login.isError && (
        <div className="mb-3">
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {errorText(login.error)}
          </div>
          {login.error instanceof ApiError && login.error.code === "EMAIL_NOT_VERIFIED" && (
            <ResendConfirmation getEmail={() => getValues("email")} />
          )}
        </div>
      )}
      <form className="space-y-2.5" noValidate onSubmit={handleSubmit((d) => login.mutate(d))}>
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="username"
          placeholder={t("auth.emailPlaceholder")}
          error={field(errors.email?.message, t("validation.email"))}
          {...register("email")}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.passwordPlaceholder")}
          error={field(errors.password?.message, t("validation.passwordRequired"))}
          aside={
            <Link to="/esqueci-a-senha" className="text-xs font-semibold text-[#FF5A1F] hover:underline">
              {t("auth.forgot")}
            </Link>
          }
          {...register("password")}
        />
        <div className="pt-1 pb-1">
          <CheckField label={t("auth.rememberMe")} {...register("rememberMe")} />
        </div>
        <button
          disabled={login.isPending}
          className="w-full bg-[#FF5A1F] hover:bg-[#e6511a] disabled:opacity-70 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex justify-center items-center"
        >
          {login.isPending ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button type="button" onClick={onGoToRegister} className="text-sm font-semibold text-[#111827] hover:text-[#FF5A1F] transition-colors">
          {t("auth.noAccount")} <span className="text-[#FF5A1F]">{t("auth.createFree")}</span>
        </button>
      </div>
    </div>
  );
}

function RegisterFormView() {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<RegisterForm, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUp = useMutation({
    mutationFn: (data: RegisterInput) => fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  });

  const required = (message: string | undefined) => field(message, t("validation.required"));
  // Senha recusada só pelo servidor (comum, parte do e-mail...): o motivo aparece no próprio campo.
  const problem = passwordProblem(signUp.error);
  const passwordError = errors.password
    ? t("validation.password")
    : problem
      ? t(`validation.pw.${problem}`, { defaultValue: t("errors.VALIDATION_ERROR") })
      : undefined;

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("auth.registerTitle")}</h1>
      </div>

      {signUp.isError && !problem && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorText(signUp.error)}
        </div>
      )}
      {signUp.isSuccess && (
        <div className="mb-3">
          <div role="status" className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
            <p>{t("auth.registerDone")}</p>
            <p className="mt-1">{t("auth.spamNote")}</p>
          </div>
          <ResendConfirmation getEmail={() => getValues("email")} />
        </div>
      )}
      <form
        className="space-y-2.5"
        noValidate
        onSubmit={handleSubmit((d) => signUp.mutate({ ...d, language: i18n.language === "en" ? "en" : "pt-BR" }))}
      >
        <TextField
          label={t("auth.name")}
          autoComplete="name"
          placeholder={t("auth.namePlaceholder")}
          error={field(errors.name?.message, t("validation.name"))}
          {...register("name")}
        />
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          error={field(errors.email?.message, t("validation.email"))}
          {...register("email")}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.newPasswordPlaceholder")}
          hint={t("auth.passwordHint")}
          error={passwordError}
          {...register("password")}
        />

        <div className="space-y-1.5 pt-1 pb-1">
          <CheckField label={t("auth.adult")} error={required(errors.confirmAdult?.message)} {...register("confirmAdult")} />
          <CheckField
            label={
              <Trans
                i18nKey="auth.acceptTerms"
                components={{
                  terms: <a href="/termos" target="_blank" rel="noreferrer" className="font-semibold underline" />,
                  privacy: <a href="/privacidade" target="_blank" rel="noreferrer" className="font-semibold underline" />,
                }}
              />
            }
            error={required(errors.acceptTerms?.message)}
            {...register("acceptTerms")}
          />
          <CheckField
            label={t("auth.acceptHealthData")}
            error={required(errors.acceptHealthData?.message)}
            {...register("acceptHealthData")}
          />
        </div>

        <button
          disabled={signUp.isPending}
          className="w-full bg-[#111827] hover:bg-black disabled:opacity-70 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex justify-center items-center"
        >
          {signUp.isPending ? t("auth.creating") : t("auth.createAccount")}
        </button>
      </form>
    </div>
  );
}
