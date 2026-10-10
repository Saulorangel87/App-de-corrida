import { z } from "zod";

// Esquemas de entrada da autenticação, usados pela API e pelo front.

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((e) => e.toLowerCase());

// Tamanho checado aqui; senha comum/fraca é checada só na API.
export const newPasswordSchema = z.string().min(10).max(128);

export const languageSchema = z.enum(["pt-BR", "en"]);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: newPasswordSchema,
  language: languageSchema.default("pt-BR"),
  // Aceites separados e explícitos (LGPD): precisam ser true.
  acceptTerms: z.literal(true),
  acceptHealthData: z.literal(true),
  // Idade mínima de 18 anos (AGENTS.md); conferida de novo na entrevista.
  confirmAdult: z.literal(true),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const tokenSchema = z.object({ token: z.string().min(20).max(100) });

/** Exclusão da conta: pede a senha atual (LGPD, seção 10.1). */
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(100),
  password: newPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
