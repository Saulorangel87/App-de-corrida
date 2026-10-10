import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    FRONTEND_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32, "use pelo menos 32 caracteres aleatórios"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Passo <no-reply@letsgorun.devsaulo.com.br>"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.RESEND_API_KEY) {
        ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "obrigatória em produção" });
      }
      if (!env.FRONTEND_URL.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["FRONTEND_URL"], message: "precisa ser https em produção" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

/** Valida as variáveis na inicialização e para o processo se faltar algo. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Só nomes e motivos; nunca os valores.
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    console.error(JSON.stringify({ level: "fatal", event: "invalid_env", problems }));
    process.exit(1);
  }
  return result.data;
}
