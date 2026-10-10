// Logs estruturados em JSON. Nunca passar e-mail, nome, senha, token, cookie
// ou dado de saúde nos campos: só ids e códigos.
type Level = "info" | "warn" | "error";
export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
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
