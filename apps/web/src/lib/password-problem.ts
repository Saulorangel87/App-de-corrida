import { ApiError } from "./api";

/**
 * Motivo da senha recusada pela API (regras só do servidor: senha comum, parte do e-mail, simples
 * demais). Vem em `details: [{ path: "password", code }]` de um VALIDATION_ERROR.
 */
export function passwordProblem(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !Array.isArray(error.details)) return null;
  const item = (error.details as { path?: string; code?: string }[]).find((d) => d.path === "password");
  return item?.code ?? null;
}
