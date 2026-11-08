import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Token aleatório de 256 bits para cookie de sessão e links de e-mail. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O banco guarda só o HMAC do token, com o SESSION_SECRET como chave. */
export function hashToken(secret: string, token: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

const nudgeSignature = (secret: string, userId: string) =>
  createHmac("sha256", secret).update(`nudge-opt-out:${userId}`).digest("base64url");

/**
 * Link de "não quero receber" do e-mail de incentivo. Sem tabela de tokens: é o id da conta
 * assinado com o SESSION_SECRET (só quem recebeu o e-mail tem o link, e ele só serve para isso).
 */
export function signNudgeToken(secret: string, userId: string): string {
  return `${userId}.${nudgeSignature(secret, userId)}`;
}

/** Devolve o id da conta se a assinatura confere; null se o token foi alterado ou é de outra chave. */
export function verifyNudgeToken(secret: string, token: string): string | null {
  const [userId, signature, ...rest] = token.split(".");
  if (!userId || !signature || rest.length > 0) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) return null;
  const expected = Buffer.from(nudgeSignature(secret, userId));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}
