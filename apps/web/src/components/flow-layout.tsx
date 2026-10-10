import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppFooter } from "./app-footer";
import { LanguageSwitch } from "./language-switch";
import { useLogout } from "../lib/queries";

/**
 * Moldura das telas do atleta logado (entrevista, resultado, painel...): cabeçalho com idioma e
 * sair, conteúdo centralizado em coluna e rodapé. Só o conteúdo muda de tela para tela.
 */
export function FlowLayout({ children, width = "max-w-[640px]" }: { children: ReactNode; width?: string }) {
  const { t } = useTranslation();
  const logout = useLogout();
  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F6F8] text-[#111827]">
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-3 text-sm">
          <div className="text-lg font-bold tracking-tight">{t("common.appName")}</div>
          <div className="flex items-center gap-4 sm:gap-6">
            <LanguageSwitch />
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="font-medium text-gray-500 hover:text-[#111827] transition-colors"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>
      <main className={`flex-1 w-full ${width} mx-auto px-5 py-6 sm:py-10`}>{children}</main>
      <AppFooter />
    </div>
  );
}
