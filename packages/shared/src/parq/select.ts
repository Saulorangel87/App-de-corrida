import type { ParqLang } from "./structure";
import { PARQ_TEXT_EN } from "./text.en";
import { PARQ_TEXT_PT_BR } from "./text.pt-BR";

/** Idioma do texto do PAR-Q+ para o idioma da tela (qualquer variante de "en"; o resto é português). */
export const toParqLang = (language: string | undefined): ParqLang =>
  language?.toLowerCase().startsWith("en") ? "en" : "pt-BR";

/** Texto oficial do PAR-Q+: o brasileiro na tela em português, o original em inglês na tela em inglês. */
export const parqTextFor = (lang: ParqLang): Record<string, string> => (lang === "en" ? PARQ_TEXT_EN : PARQ_TEXT_PT_BR);
