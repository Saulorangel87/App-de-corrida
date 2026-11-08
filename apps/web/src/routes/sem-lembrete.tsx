import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "../components/auth-layout";
import { AuthHead, BackToLogin, InfoBox, PrimaryLink, StatusBadge } from "../components/auth-ui";
import { ApiError, fetchApi } from "../lib/api";
import { useFragmentToken } from "../lib/fragment-token";

export const Route = createFileRoute("/sem-lembrete")({
  component: NudgeOptOut,
});

/** Link do rodapé do e-mail de incentivo: desliga o envio, sem pedir login (o link assinado é a prova). */
function NudgeOptOut() {
  const { t } = useTranslation();
  const { token, arrival } = useFragmentToken();
  const started = useRef(-1);

  const optOut = useMutation({
    mutationFn: (value: string) => fetchApi("/auth/nudge-opt-out", { method: "POST", body: JSON.stringify({ token: value }) }),
  });

  // Pedir de novo não muda nada, mas o link é lido uma vez por chegada (como em /verificar-email).
  useEffect(() => {
    if (token && started.current !== arrival) {
      started.current = arrival;
      optOut.mutate(token);
    }
  }, [token, arrival, optOut]);

  if (optOut.isSuccess) {
    return (
      <AuthLayout>
        <StatusBadge kind="ok" />
        <AuthHead title={t("nudgeOptOut.doneTitle")} text={t("nudgeOptOut.doneText")} />
        <PrimaryLink to="/entrar">{t("auth.signIn")}</PrimaryLink>
      </AuthLayout>
    );
  }

  if (!token || optOut.isError) {
    return (
      <AuthLayout>
        <StatusBadge kind="error" />
        <AuthHead title={t("nudgeOptOut.failTitle")} text={t("nudgeOptOut.failText")} />
        {optOut.error instanceof ApiError && optOut.error.code === "NETWORK" && <InfoBox tone="error">{t("errors.network")}</InfoBox>}
        <BackToLogin />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div role="status">
        <AuthHead title={t("nudgeOptOut.workingTitle")} text="" />
      </div>
    </AuthLayout>
  );
}
