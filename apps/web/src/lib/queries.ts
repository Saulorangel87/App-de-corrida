import { useQuery } from "@tanstack/react-query";
import { ApiError, fetchApi } from "./api";

export type AuthUser = { id: string; name: string; email: string; language: "pt-BR" | "en" };

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
