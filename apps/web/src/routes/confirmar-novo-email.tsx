import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "../components/auth-layout";
import { AuthHead, BackToLogin, InfoBox, PrimaryLink, StatusBadge } from "../components/auth-ui";
import { ApiError, fetchApi } from "../lib/api";
import { useFragmentToken } from "../lib/fragment-token";
import { AUTH_KEY } from "../lib/queries";

export const Route = createFileRoute("/confirmar-novo-email")({
  component: ConfirmNewEmail,
});

/** Abre o link enviado ao endereço novo: troca o e-mail e encerra as sessões (é preciso entrar de novo). */
function ConfirmNewEmail() {
  const { t } = useTranslation();
  const { token, arrival } = useFragmentToken();
  const queryClient = useQueryClient();
  const started = useRef(-1);

  const confirm = useMutation({
    mutationFn: (value: string) => fetchApi("/auth/email-change/confirm", { method: "POST", body: JSON.stringify({ token: value }) }),
    onSuccess: () => {
      // As sessões foram encerradas no servidor: limpa o que ficou na memória deste navegador.
      queryClient.setQueryData(AUTH_KEY, null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    },
  });

  // O token vale uma vez: confirma uma única vez por link recebido (como em /verificar-email).
  useEffect(() => {
    if (token && started.current !== arrival) {
      started.current = arrival;
      confirm.mutate(token);
    }
  }, [token, arrival, confirm]);

  if (confirm.isSuccess) {
    return (
      <AuthLayout>
        <StatusBadge kind="ok" />
        <AuthHead title={t("emailChange.doneTitle")} text={t("emailChange.doneText")} />
        <PrimaryLink to="/entrar">{t("auth.signIn")}</PrimaryLink>
      </AuthLayout>
    );
  }

  if (!token || confirm.isError) {
    return (
      <AuthLayout>
        <StatusBadge kind="error" />
        <AuthHead title={t("emailChange.failTitle")} text={t("emailChange.failText")} />
        {confirm.error instanceof ApiError && confirm.error.code === "NETWORK" && <InfoBox tone="error">{t("errors.network")}</InfoBox>}
        <BackToLogin />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div role="status">
        <AuthHead title={t("emailChange.confirmingTitle")} text="" />
      </div>
    </AuthLayout>
  );
}
