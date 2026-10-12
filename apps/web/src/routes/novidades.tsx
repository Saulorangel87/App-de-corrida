import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FlowLayout } from "../components/flow-layout";
import { NewsEntry } from "../components/news";
import { useNews } from "../lib/news";
import { useRequireUser } from "../lib/queries";

export const Route = createFileRoute("/novidades")({
  component: NewsPage,
});

function NewsPage() {
  const { t } = useTranslation();
  const { user, loading } = useRequireUser();
  return (
    <FlowLayout width="max-w-[720px]">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("news.pageTitle")}</h1>
      <p className="mb-5 text-[15px] text-gray-600">{t("news.pageIntro")}</p>
      {loading || !user ? (
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      ) : (
        <NewsList user={user} />
      )}
    </FlowLayout>
  );
}

function NewsList({ user }: { user: { id: string; createdOn?: string } }) {
  const { t } = useTranslation();
  const { all } = useNews(user);
  if (all.length === 0) {
    return <p className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-700">{t("news.empty")}</p>;
  }
  return (
    <div className="space-y-4">
      {all.map((item) => (
        <section key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <NewsEntry item={item} showDate />
        </section>
      ))}
    </div>
  );
}
