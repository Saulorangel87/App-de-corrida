import { useEffect } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FlowLayout } from "../components/flow-layout";
import { ApiError, fetchApi } from "../lib/api";
import { useRequireUser } from "../lib/queries";

export const Route = createFileRoute("/painel")({
  component: Panel,
});

// Esqueleto: o painel de verdade (treino de hoje, semana, volume) entra numa próxima etapa da Fase 6.
function Panel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useRequireUser();

  // Quem ainda não fez a entrevista não tem perfil (404): vai para ela.
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchApi<{ profile: unknown }>("/profile"),
    enabled: !loading,
    retry: false,
  });
  const noProfile = profile.error instanceof ApiError && profile.error.status === 404;
  useEffect(() => {
    if (noProfile) void navigate({ to: "/entrevista" });
  }, [noProfile, navigate]);

  if (loading || !user || profile.isLoading || noProfile) {
    return (
      <FlowLayout>
        <p role="status" className="text-gray-600">
          {t("common.loading")}
        </p>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-[#0F172A]">{t("panel.title")}</h1>
      <p className="text-gray-700">{t("panel.welcome", { name: user.name })}</p>
      <Link to="/resultado" className="mt-4 inline-block text-sm font-semibold text-[#FF5A1F] hover:underline">
        {t("panel.seeProfile")}
      </Link>
    </FlowLayout>
  );
}
