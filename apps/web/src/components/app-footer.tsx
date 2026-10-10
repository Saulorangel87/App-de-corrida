import { Code2, ContactRound, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Mesmo modelo do rodapé dos outros projetos (App-de-treino/frontend/components/app-footer.tsx).
// Responde à largura de quem o contém (container query), não à da tela: no login ele fica só
// na coluna do formulário, que no desktop pode ter ~470px.
//   - estreito (celular): duas linhas, crédito em cima e links embaixo, ícones à direita;
//   - a partir de 420px: crédito completo ("DESENVOLVIDO POR");
//   - a partir de 700px: tudo numa linha só.
const iconClass =
  'grid h-8 w-8 place-items-center text-gray-500 transition-colors hover:text-[#111827]'

export function AppFooter() {
  const { t } = useTranslation()
  return (
    <div className="@container w-full shrink-0">
      <footer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-t border-gray-200 bg-white px-4 pt-1 pb-1 text-[10px] text-gray-500 @min-[600px]:px-6 @min-[600px]:text-[11px] @min-[700px]:flex @min-[700px]:justify-between @min-[700px]:gap-3">
        <p className="col-start-1 row-start-1 min-w-0 truncate leading-[1.35] tracking-[0.02em] @min-[700px]:flex-1 @min-[700px]:tracking-[0.04em]">
          © 2026 <span className="hidden @min-[420px]:inline">{t('footer.developedBy')} </span>SAULO RANGEL{' '}
          <span>- V{__APP_VERSION__}</span>
        </p>

        <nav
          aria-label={t('footer.legalNav')}
          className="col-start-1 row-start-2 flex flex-wrap gap-x-3 whitespace-nowrap @min-[700px]:gap-x-3.5"
        >
          <a href="/privacidade" className="py-0.5 underline underline-offset-[3px] hover:text-[#111827]">
            {t('footer.privacy')}
          </a>
          <a href="/termos" className="py-0.5 underline underline-offset-[3px] hover:text-[#111827]">
            {t('footer.terms')}
          </a>
        </nav>

        <div className="col-start-2 row-span-2 row-start-1 flex items-center">
          <a
            className={iconClass}
            href="https://www.linkedin.com/in/saulorangel87"
            target="_blank"
            rel="noreferrer"
            aria-label={t('footer.linkedin')}
          >
            <ContactRound size={15} />
          </a>
          <a
            className={iconClass}
            href="https://github.com/Saulorangel87"
            target="_blank"
            rel="noreferrer"
            aria-label={t('footer.github')}
          >
            <Code2 size={16} />
          </a>
          <a className={iconClass} href="mailto:sauloleonardo1987@gmail.com" aria-label={t('footer.email')}>
            <Mail size={16} />
          </a>
        </div>
      </footer>
    </div>
  )
}
