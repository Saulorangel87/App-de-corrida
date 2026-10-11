import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LEGAL_UPDATED_LABEL, LEGAL_VERSION, type LegalDocument } from "../lib/legal";
import { AppFooter } from "./app-footer";
import { LanguageSwitch } from "./language-switch";

/**
 * Página pública (sem login) de um documento legal. O texto está só em português (a tradução entra
 * na etapa de tradução); com o app em inglês, um aviso diz isso.
 */
export function LegalPage({ document, other }: { document: LegalDocument; other: { to: "/privacidade" | "/termos"; label: string } }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F6F8] text-[#111827]">
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-2 text-sm">
          <Link to="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight">
            {t("common.appName")}
          </Link>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-6 sm:py-8">
        {i18n.language === "en" && (
          <p role="note" className="mb-5 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
            {t("legal.enNotice")}
          </p>
        )}

        <article lang="pt-BR">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF5A1F]">{document.kicker}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#0F172A]">{document.title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("legal.updated", { date: LEGAL_UPDATED_LABEL })} · {t("legal.version", { version: LEGAL_VERSION })}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-700">{document.intro}</p>

          <nav aria-label={t("legal.toc")} className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="mb-2 text-sm font-bold text-[#0F172A]">{t("legal.toc")}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {document.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-gray-700 underline-offset-2 hover:text-[#FF5A1F] hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-6 space-y-4">
            {document.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-4 rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-lg font-bold tracking-tight text-[#0F172A]">{s.title}</h2>
                <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">
                  {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                  {s.items && (
                    <ul className="list-disc space-y-2 pl-5">
                      {s.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  )}
                  {s.after?.map((p) => <p key={p}>{p}</p>)}
                </div>
              </section>
            ))}
          </div>
        </article>

        <p className="mt-6 text-sm">
          <Link to={other.to} className="font-semibold text-[#FF5A1F] hover:underline">
            {other.label}
          </Link>
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
