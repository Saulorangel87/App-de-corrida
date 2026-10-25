import { useSyncExternalStore } from "react";

// App instalável (PWA): registro do service worker, pedido de instalação do navegador e estado da conexão.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Chamado uma vez, ao abrir o app: o pedido de instalação pode chegar antes de qualquer tela montar. */
export function setupPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
  // Só no build: em desenvolvimento o cache atrapalharia ver as mudanças.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sem service worker o app funciona igual, só não abre sem internet */
      });
    });
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Já aberto como app instalado (tela cheia, sem barra do navegador). */
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone e iPad não têm botão de instalar: a pessoa usa Compartilhar, Adicionar à Tela de Início. */
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Pedido de instalação do navegador (Chrome, Edge, Android), quando ele oferece. */
export function useInstallPrompt() {
  const available = useSyncExternalStore(subscribe, () => deferred !== null);
  const install = async () => {
    if (!deferred) return;
    const event = deferred;
    await event.prompt();
    await event.userChoice;
    deferred = null;
    notify();
  };
  return { available, install };
}

const subscribeOnline = (l: () => void) => {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
};

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);
