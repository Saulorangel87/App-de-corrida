import { zValidator } from "@hono/zod-validator";
import type { ZodSchema } from "zod";
import { errors } from "./errors";

/** Validação com Zod no formato de erro padrão da API (sem ecoar valores). */
export const validate = <T extends ZodSchema>(target: "json", schema: T) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw errors.validation(result.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })));
    }
  });
