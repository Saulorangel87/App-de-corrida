import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Erro esperado da API. Formato da resposta: { error: { code, message, details? } }. */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Faça login para continuar."),
  invalidCredentials: () => new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."),
  emailNotVerified: () =>
    new AppError(403, "EMAIL_NOT_VERIFIED", "Confirme seu e-mail antes de entrar."),
  invalidToken: () => new AppError(400, "INVALID_TOKEN", "Link inválido ou expirado."),
  notFound: () => new AppError(404, "NOT_FOUND", "Não encontrado."),
  csrf: () => new AppError(403, "CSRF", "Origem da requisição não permitida."),
  rateLimited: () =>
    new AppError(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um pouco e tente de novo."),
  validation: (details: unknown) =>
    new AppError(400, "VALIDATION_ERROR", "Dados inválidos.", details),
};
