import { useEffect, useState } from "react";

// O token dos e-mails vai no fragmento da URL (#token=...): o fragmento não vai ao servidor nem ao
// cabeçalho Referer. Lido uma vez e apagado da barra de endereço e do histórico.
let cache: { path: string; token: string | null } | null = null;

function read(force: boolean): string | null {
  const path = window.location.pathname;
  const match = /(?:^#|&)token=([^&]+)/.exec(window.location.hash);
  // Sem fragmento novo, vale o que já foi lido (idempotente: o StrictMode chama duas vezes).
  if (!match && !force && cache && cache.path === path) return cache.token;
  let token: string | null = null;
  if (match?.[1]) {
    try {
      token = decodeURIComponent(match[1]);
    } catch {
      token = null;
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  cache = { path, token };
  return token;
}

/**
 * Token do fragmento da URL. `arrival` aumenta a cada link novo colado na mesma página (mesmo que
 * o token seja igual), para a tela recomeçar o fluxo.
 */
export function useFragmentToken(): { token: string | null; arrival: number } {
  const [state, setState] = useState<{ token: string | null; arrival: number }>(() => ({ token: read(false), arrival: 0 }));
  useEffect(() => {
    const onHash = () => {
      if (!/(?:^#|&)token=/.test(window.location.hash)) return;
      setState((prev) => ({ token: read(false), arrival: prev.arrival + 1 }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return state;
}
