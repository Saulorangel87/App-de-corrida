import { useTranslation } from "react-i18next";

const TERMS = ["vo2max", "threshold", "economy", "maxHr", "oneRm", "effort", "talkTest"] as const;

/** Definições curtas dos termos que aparecem nos treinos (docs/textos-para-o-atleta.md, seção 4.11). */
export function Glossary() {
  const { t } = useTranslation();
  return (
    <details className="rounded-2xl border border-gray-200 bg-white p-5">
      <summary className="cursor-pointer text-lg font-bold tracking-tight text-[#0F172A]">{t("glossary.title")}</summary>
      <p className="mt-2 text-sm text-gray-500">{t("glossary.note")}</p>
      <dl className="mt-3 divide-y divide-gray-100">
        {TERMS.map((key) => (
          <div key={key} className="py-3">
            <dt className="text-sm font-bold text-[#0F172A]">{t(`glossary.terms.${key}.term`)}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-gray-700">{t(`glossary.terms.${key}.text`)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
