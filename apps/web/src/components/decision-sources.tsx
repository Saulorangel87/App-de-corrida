import { useTranslation } from "react-i18next";

/** "Garber 2011" -> "Garber (2011)". */
const withYear = (s: string) => s.replace(/^(.+?)\s+(\d{4}[a-c]?)$/, "$1 ($2)");

/**
 * Fontes do conselho do dia. Ficam fora do texto da mensagem (que não leva colchetes nem
 * códigos) e abrem só quando a pessoa quer ver a base científica.
 */
export function DecisionSources({ sources, dark = false }: { sources: string[]; dark?: boolean }) {
  const { t } = useTranslation();
  const list = [...new Set(sources)].filter((s) => s.trim());
  if (list.length === 0) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-[#FF5A1F] hover:underline">{t("workout.sourcesTitle")}</summary>
      <ul className={`mt-2 list-disc space-y-1 pl-5 ${dark ? "text-[#cbd5e1]" : "text-gray-700"}`}>
        {list.map((s) => (
          <li key={s}>{withYear(s)}</li>
        ))}
      </ul>
    </details>
  );
}
