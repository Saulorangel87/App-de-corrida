import { useTranslation } from "react-i18next";
import { ApiError } from "./api";

/** Texto do erro do servidor pelo código estável; o texto da API (pt) não é exibido. */
export function useErrorText() {
  const { t } = useTranslation();
  return (error: unknown) => {
    if (error instanceof ApiError) {
      // Com internet, quem não respondeu foi o servidor: não culpar a conexão da pessoa.
      if (error.code === "NETWORK") return navigator.onLine ? t("errors.serverDown") : t("errors.network");
      return t(`errors.${error.code}`, { defaultValue: t("errors.generic") });
    }
    return t("errors.generic");
  };
}
