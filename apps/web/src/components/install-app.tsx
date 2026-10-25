import { useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isIos, isStandalone, useInstallPrompt, useOnline } from "../lib/pwa";

/** Configurações: instalar o app na tela inicial do aparelho. */
export function InstallAppCard() {
  const { t } = useTranslation();
  const { available, install } = useInstallPrompt();
  const [installed] = useState(isStandalone);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">{t("install.title")}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">
        {installed ? (
          <p>{t("install.installed")}</p>
        ) : (
          <>
            <p>{t("install.text")}</p>
            {available ? (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412]"
              >
                <Download size={18} aria-hidden="true" />
                {t("install.button")}
              </button>
            ) : (
              <p className="text-sm text-gray-600">{isIos() ? t("install.ios") : t("install.other")}</p>
            )}
            <p className="text-sm text-gray-500">{t("install.offline")}</p>
          </>
        )}
      </div>
    </section>
  );
}

/** Aviso fixo quando o aparelho fica sem internet: o app abre, mas nada é salvo nem atualizado. */
export function OfflineNotice() {
  const { t } = useTranslation();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-[#111827] px-4 py-3 text-center text-sm font-semibold text-white">
      <WifiOff size={16} aria-hidden="true" className="shrink-0" />
      {t("install.offlineNotice")}
    </div>
  );
}
