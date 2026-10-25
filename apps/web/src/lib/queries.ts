import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ApiError, fetchApi } from "./api";
import { disableReminder } from "./reminder";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  language: "pt-BR" | "en";
  photoVersion: number | null;
  /** Dia em que a conta foi criada (AAAA-MM-DD). */
  createdOn?: string;
};

export const AUTH_KEY = ["auth", "me"] as const;

/** Usuário da sessão; `null` quando não há sessão (401). */
export function useAuth() {
  return useQuery({
    queryKey: AUTH_KEY,
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const data = await fetchApi<{ user: AuthUser }>("/auth/me");
        return data.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

/** Sai da conta: encerra a sessão no servidor, limpa o cache do atleta e volta ao login. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    // O lembrete deste aparelho sai junto: quem entrar depois nele não recebe o lembrete de outra pessoa.
    mutationFn: async () => {
      await disableReminder();
      await fetchApi("/auth/logout", { method: "POST" });
    },
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_KEY, null);
      void navigate({ to: "/entrar" });
    },
  });
}

/** Garante sessão: sem usuário, vai para o login. Devolve o usuário (ou `undefined` enquanto carrega). */
export function useRequireUser() {
  const auth = useAuth();
  const navigate = useNavigate();
  const missing = !auth.isLoading && !auth.data;
  useEffect(() => {
    if (missing) void navigate({ to: "/entrar" });
  }, [missing, navigate]);
  return { user: auth.data ?? undefined, loading: auth.isLoading || missing };
}
