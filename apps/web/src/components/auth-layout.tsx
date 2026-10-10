import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppFooter } from "./app-footer";
import { setLanguage, type Language } from "../i18n";
import avif464 from "../assets/login/login-464.avif";
import avif928 from "../assets/login/login-928.avif";
import webp464 from "../assets/login/login-464.webp";
import webp928 from "../assets/login/login-928.webp";
import jpg464 from "../assets/login/login-464.jpg";
import jpg928 from "../assets/login/login-928.jpg";

/**
 * Moldura das telas de acesso (entrar, cadastro, esqueci a senha, redefinir, confirmar e-mail):
 * foto e texto à esquerda (só a partir de 1024 px), conteúdo à direita e rodapé.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

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
            <h2 className="text-[2.5rem] leading-[1.1] font-bold">
              {t("auth.heroTitle1")}
              <br />
              {t("auth.heroTitle2")}
            </h2>
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

      {/* Lado direito: conteúdo e rodapé */}
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

          <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto">{children}</div>
        </div>

        <AppFooter />
      </main>
    </div>
  );
}
