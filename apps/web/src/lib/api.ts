export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

/** Erro devolvido pela API no formato `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      // Envia o cookie de sessão (a API fica em outro subdomínio do mesmo site).
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Sem conexão com o servidor.");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? res.statusText, body?.error?.details);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
