import { useTranslation } from "react-i18next";
import { setLanguage, type Language } from "../i18n";

/** Troca PT/EN. Usado nas telas de acesso e nas telas do atleta. */
export function LanguageSwitch({ onDark = false }: { onDark?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  return (
    <div role="group" aria-label={t("common.language")} className="flex items-center gap-3 font-medium">
      {(["pt-BR", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-3">
          {i > 0 && (
            <span aria-hidden="true" className={onDark ? "text-[#475569]" : "text-gray-300"}>
              |
            </span>
          )}
          <button
            type="button"
            lang={l}
            aria-pressed={lang === l}
            onClick={() => setLanguage(l)}
            className={
              onDark
                ? lang === l
                  ? "text-white"
                  : "text-[#94a3b8] hover:text-white"
                : lang === l
                  ? "text-[#111827]"
                  : "text-gray-500 hover:text-[#111827]"
            }
          >
            {l === "pt-BR" ? "PT" : "EN"}
          </button>
        </span>
      ))}
    </div>
  );
}
