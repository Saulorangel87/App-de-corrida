import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchApi } from "../lib/api";
import { useErrorText } from "../lib/use-error-text";

/**
 * Pede um novo e-mail de confirmação direto da tela em que o atleta está (login recusado por
 * "e-mail não confirmado" ou logo depois do cadastro). O endereço vem do campo do formulário e vai
 * só no corpo da requisição, nunca na URL. A resposta da API é a mesma exista ou não a conta.
 */
export function ResendConfirmation({ getEmail }: { getEmail: () => string }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const resend = useMutation({
    mutationFn: (email: string) => fetchApi("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
  });

  if (resend.isSuccess) {
    return (
      <div role="status" data-testid="resend-done" className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <p>{t("auth.resendDone")}</p>
        <p className="mt-1">{t("auth.spamNote")}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {resend.isError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {errorText(resend.error)}
        </p>
      )}
      <button
        type="button"
        disabled={resend.isPending}
        onClick={() => resend.mutate(getEmail().trim())}
        className="text-sm font-semibold text-[#C2410C] underline-offset-2 hover:underline disabled:opacity-70"
      >
        {resend.isPending ? t("auth.resending") : t("auth.resend")}
      </button>
    </div>
  );
}
