import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../lib/dates";
import { useNews, type NewsItem } from "../lib/news";

type NewsUser = { id: string; createdOn?: string };

const lang = (language: string): "pt-BR" | "en" => (language === "en" ? "en" : "pt-BR");

/** Um item, com o tipo (correção, limitação, novidade) em texto e não só em cor. */
export function NewsEntry({ item, showDate = false }: { item: NewsItem; showDate?: boolean }) {
  const { t, i18n } = useTranslation();
  const l = lang(i18n.language);
  return (
    <article className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#C2410C]">
        {t(`news.kind.${item.kind}`)}
        {showDate && <span className="font-normal normal-case text-gray-500"> · {formatDate(item.date, i18n.language)}</span>}
      </p>
      <h3 className="text-[15px] font-bold text-[#0F172A]">{item.title[l]}</h3>
      <p className="text-[15px] leading-relaxed text-gray-700">{item.text[l]}</p>
    </article>
  );
}

/** Aviso no topo do painel com o que ainda não foi lido. Some com "Entendi" (guardado só neste navegador). */
export function NewsBanner({ user }: { user: NewsUser }) {
  const { t } = useTranslation();
  const { unread, markAllRead } = useNews(user);
  if (unread.length === 0) return null;
  return (
    <section
      aria-labelledby="news-banner-title"
      className="mb-5 rounded-2xl border border-orange-200 bg-white p-5 sm:p-6"
    >
      <h2 id="news-banner-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0F172A]">
        <Megaphone size={20} className="text-[#C2410C]" aria-hidden="true" />
        {t("news.bannerTitle")}
      </h2>
      <div className="mt-3 space-y-4">
        {unread.map((item) => (
          <NewsEntry key={item.id} item={item} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#C2410C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412]"
        >
          {t("news.understood")}
        </button>
        <Link to="/novidades" className="text-sm font-semibold text-[#C2410C] hover:underline">
          {t("news.seeAll")}
        </Link>
      </div>
    </section>
  );
}
