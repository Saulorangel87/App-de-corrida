import { set, type FieldValues, type Resolver } from "react-hook-form";
import type { z } from "zod";

/** Texto digitado para número: vazio ou inválido vira `undefined` (a validação diz "responda"). */
export function toNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export const toText = (value: unknown): string | undefined => {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? undefined : s;
};

/**
 * Resolver de uma etapa da entrevista: monta o que a API recebe (`toPayload`), valida com o
 * esquema compartilhado (o mesmo que a API usa) e mapeia cada problema para o campo do formulário.
 * A mensagem de erro é só um código ("required" ou "invalid"); o texto vem do i18n.
 */
export function stepResolver<TForm extends FieldValues>(
  schema: z.ZodTypeAny,
  toPayload: (values: TForm) => unknown,
  fieldOf: (path: string) => string = (path) => path,
): Resolver<TForm> {
  return async (values) => {
    const parsed = schema.safeParse(toPayload(values));
    if (parsed.success) return { values, errors: {} };
    const errors: Record<string, unknown> = {};
    for (const issue of parsed.error.issues) {
      const name = fieldOf(issue.path.join("."));
      const required = issue.code === "invalid_type" && issue.received === "undefined";
      set(errors, name, { type: issue.code, message: required ? "required" : "invalid" });
    }
    return { values: {}, errors: errors as never };
  };
}
