import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@passo/shared";
import { AppFooter } from "../components/app-footer";
import { CheckField, TextField } from "../components/field";
import { ApiError, fetchApi } from "../lib/api";
import { AUTH_KEY, type AuthUser } from "../lib/queries";
import { setLanguage, type Language } from "../i18n";
import avif464 from "../assets/login/login-464.avif";
import avif928 from "../assets/login/login-928.avif";
import webp464 from "../assets/login/login-464.webp";
import webp928 from "../assets/login/login-928.webp";
import jpg928 from "../assets/login/login-928.jpg";
import jpg464 from "../assets/login/login-464.jpg";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type LoginForm = z.input<typeof loginSchema>;
type RegisterForm = z.input<typeof registerSchema>;

/** Texto do erro do servidor pelo código estável; o texto da API (pt) não é exibido. */
function useErrorText() {
  const { t } = useTranslation();
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === "NETWORK") return t("errors.network");
      const key = `errors.${error.code}`;
      return t(key, { defaultValue: t("errors.generic") });
    }
    return t("errors.generic");
  };
}

const field = (message: string | undefined, text: string) => (message ? text : undefined);

function AuthPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const lang = i18n.language as Language;

  const tabClass = (active: boolean) =>
    `pb-2 sm:pb-3 text-base font-semibold transition-colors relative ${active ? "text-[#111827]" : "text-gray-500 hover:text-gray-900"}`;

  return (
    // h-dvh: no celular acompanha a barra de endereço que aparece e some.
    <div className="h-dvh w-full flex bg-white text-[#111827] overflow-hidden">
      {/* Lado esquerdo: foto e texto (some em telas menores; a foto nem é baixada no celular) */}
      <div className="hidden lg:flex w-[54%] relative flex-col justify-between overflow-hidden bg-[#111827] text-white">
        <div className="absolute inset-0 z-0">
          <picture>
            <source media="(min-width: 1024px)" type="image/avif" srcSet={`${avif464} 464w, ${avif928} 928w`} sizes="54vw" />
            <source media="(min-width: 1024px)" type="image/webp" srcSet={`${webp464} 464w, ${webp928} 928w`} sizes="54vw" />
            <source media="(min-width: 1024px)" srcSet={`${jpg464} 464w, ${jpg928} 928w`} sizes="54vw" />
            {/* GIF transparente: abaixo de 1024 px nenhuma foto é baixada. */}
            <img
              src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
              alt={t("auth.photoAlt")}
              width={928}
              height={1152}
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/55 via-[#111827]/0 via-40% to-[#111827]/97" />
        </div>

        <div className="relative z-10 px-14 pt-8">
          <div className="text-2xl font-bold tracking-tight">{t("common.appName")}</div>
        </div>

        <div className="relative z-10 px-14 pb-14 flex flex-col gap-8">
          <div className="space-y-4 max-w-lg">
            <h1 className="text-[2.5rem] leading-[1.1] font-bold">
              {t("auth.heroTitle1")}
              <br />
              {t("auth.heroTitle2")}
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">{t("auth.heroText")}</p>
          </div>

          {/* Distâncias dos planos: especificação, seção 2, item 10 (5, 10, 21 e 42 km). */}
          <div className="max-w-[16rem] bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-2xl font-bold mb-1">
              5k <span aria-hidden="true" className="text-white/50 text-sm">→</span> 42k
            </div>
            <div className="text-sm text-white/70">{t("auth.plansLabel")}</div>
          </div>
        </div>
      </div>

      {/* Lado direito: formulário e rodapé */}
      <main className="w-full lg:w-[46%] flex flex-col min-h-0 bg-white">
        {/* Rola só se não couber (celular, cadastro em tela baixa). */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-5 sm:px-14 py-2">
          <div className="flex justify-between lg:justify-end items-center gap-4 sm:gap-6 mb-2 text-sm">
            <div className="lg:hidden text-lg font-bold tracking-tight">{t("common.appName")}</div>
            <div className="flex items-center gap-4 sm:gap-6">
              <a
                href="mailto:sauloleonardo1987@gmail.com"
                className="hidden min-[400px]:inline text-gray-500 hover:text-gray-900 transition-colors font-medium"
              >
                {t("common.help")}
              </a>
              <div role="group" aria-label={t("common.language")} className="flex items-center gap-3 font-medium">
                {(["pt-BR", "en"] as const).map((l, i) => (
                  <span key={l} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden="true" className="text-gray-300">|</span>}
                    <button
                      type="button"
                      lang={l}
                      aria-pressed={lang === l}
                      onClick={() => setLanguage(l)}
                      className={lang === l ? "text-[#111827]" : "text-gray-500 hover:text-[#111827]"}
                    >
                      {l === "pt-BR" ? "PT" : "EN"}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto">
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
              <p className="mt-4 text-center text-xs text-gray-500 max-w-[320px] mx-auto leading-relaxed">
                {t("auth.privacyNote")}
              </p>
            )}
          </div>
        </div>

        <AppFooter />
      </main>
    </div>
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
    formState: { errors },
  } = useForm<LoginForm, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const login = useMutation({
    mutationFn: (data: LoginInput) => fetchApi<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res) => {
      queryClient.setQueryData(AUTH_KEY, res.user);
      void navigate({ to: "/panel" });
    },
  });

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">{t("auth.welcome")}</h2>
        <p className="text-sm text-gray-500">{t("auth.welcomeText")}</p>
      </div>

      {login.isError && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorText(login.error)}
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
    formState: { errors },
  } = useForm<RegisterForm, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUp = useMutation({
    mutationFn: (data: RegisterInput) => fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  });

  const required = (message: string | undefined) => field(message, t("validation.required"));

  return (
    <div>
      <div className="mb-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t("auth.registerTitle")}</h2>
      </div>

      {signUp.isError && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorText(signUp.error)}
        </div>
      )}
      {signUp.isSuccess && (
        <div role="status" className="mb-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {t("auth.registerDone")}
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
          error={field(errors.password?.message, t("validation.password"))}
          {...register("password")}
        />

        <div className="space-y-1.5 pt-1 pb-1">
          <CheckField label={t("auth.adult")} error={required(errors.confirmAdult?.message)} {...register("confirmAdult")} />
          <CheckField label={t("auth.acceptTerms")} error={required(errors.acceptTerms?.message)} {...register("acceptTerms")} />
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
