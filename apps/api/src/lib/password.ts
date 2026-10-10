import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { authConfig } from "../config";
import { commonPasswords } from "../data/common-passwords";

// Argon2id com os parâmetros mínimos da OWASP (19 MiB, t=2, p=1).
const options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, options);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Hash descartável, com os mesmos parâmetros, para o login de e-mail
// inexistente gastar o mesmo tempo que o de um e-mail cadastrado.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(await dummyHash, plain);
}

// Senhas comuns com 10+ caracteres, do top 100 mil do SecLists (MIT):
// danielmiessler/SecLists, xato-net-10-million-passwords-100000.txt.
const common = new Set(commonPasswords);

/** Retorna o motivo da recusa, ou null se a senha é aceitável. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < authConfig.password.min) return "TOO_SHORT";
  if (password.length > authConfig.password.max) return "TOO_LONG";
  const lower = password.toLowerCase();
  if (common.has(lower)) return "COMMON";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "CONTAINS_EMAIL";
  if (new Set(lower).size < 4) return "TOO_SIMPLE";
  return null;
}
