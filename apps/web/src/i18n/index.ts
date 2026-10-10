import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ptBR } from "./pt-BR";

export type Language = "pt-BR" | "en";
const STORAGE_KEY = "app-de-corrida:lang";

/** Preferência do aparelho (só conveniência por visitante; pode falhar em janela privada). */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt-BR" || saved === "en") return saved;
  } catch {
    // sem armazenamento: segue o idioma do navegador
  }
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "pt-BR";
}

void i18n.use(initReactI18next).init({
  resources: { "pt-BR": { translation: ptBR }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: "pt-BR",
  interpolation: { escapeValue: false }, // o React já escapa
});

document.documentElement.lang = i18n.language;
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export function setLanguage(lng: Language) {
  void i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignorado: só deixa de lembrar a escolha
  }
}

export default i18n;
