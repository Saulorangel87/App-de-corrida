import type { Context } from "hono";
import type { AppEnv } from "../types";

export type Lang = "pt-BR" | "en";

/**
 * Idioma dos textos calculados pelo servidor. O app manda o idioma da tela em `Accept-Language`
 * (a escolha de idioma é do aparelho); sem o cabeçalho, vale o idioma da conta.
 */
export function requestLang(c: Context<AppEnv>): Lang {
  const first = (c.req.header("accept-language") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("en")) return "en";
  if (first.startsWith("pt")) return "pt-BR";
  return c.var.auth.user.language === "en" ? "en" : "pt-BR";
}
