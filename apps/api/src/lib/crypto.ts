import { createHmac, randomBytes } from "node:crypto";

/** Token aleatório de 256 bits para cookie de sessão e links de e-mail. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O banco guarda só o HMAC do token, com o SESSION_SECRET como chave. */
export function hashToken(secret: string, token: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
