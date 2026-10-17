import { useEffect, useRef, useState } from "react";

/**
 * Mantém um estado de carregamento visível por pelo menos `ms`, para o esqueleto não piscar quando a
 * resposta chega rápido. Dado que já estava em cache não passa por aqui (nunca começou a carregar) e
 * quem pede menos movimento não espera: o esqueleto dessa pessoa é parado e não vale atrasar a tela.
 */
export function useMinDuration(loading: boolean, ms = 300): boolean {
  const [held, setHeld] = useState(loading);
  const since = useRef<number | null>(loading ? Date.now() : null);

  useEffect(() => {
    if (loading) {
      since.current ??= Date.now();
      setHeld(true);
      return;
    }
    const started = since.current;
    since.current = null;
    if (started === null) {
      setHeld(false);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = reduce ? 0 : ms - (Date.now() - started);
    if (left <= 0) {
      setHeld(false);
      return;
    }
    const id = setTimeout(() => setHeld(false), left);
    return () => clearTimeout(id);
  }, [loading, ms]);

  return loading || held;
}
