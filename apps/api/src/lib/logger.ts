// Logs estruturados em JSON. Nunca passar e-mail, nome, senha, token, cookie
// ou dado de saúde nos campos: só ids e códigos.
type Level = "info" | "warn" | "error";
export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

/**
 * Resumo de um erro para o log, SEM a mensagem: os erros do driver do banco trazem a consulta e os
 * valores (e-mail, hash de token, dados de saúde). Fica só o tipo e o código (ex.: "Error:23505").
 * Erros do provedor de e-mail (ResendError) têm mensagem controlada por nós e entram inteiros.
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return "unknown";
  const own = (err as { code?: unknown }).code;
  const cause = (err.cause as { code?: unknown } | undefined)?.code;
  const code = typeof own === "string" ? own : typeof cause === "string" ? cause : null;
  const base = code ? `${err.name}:${code}` : err.name;
  return err.name === "ResendError" ? `${base}:${err.message}` : base;
}

export function createLogger(options: { silent?: boolean } = {}): Logger {
  const write = (level: Level, event: string, fields?: LogFields) => {
    if (options.silent) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
    if (level === "error") console.error(line);
    else console.log(line);
  };
  return {
    info: (e, f) => write("info", e, f),
    warn: (e, f) => write("warn", e, f),
    error: (e, f) => write("error", e, f),
  };
}
