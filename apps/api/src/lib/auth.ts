import * as argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (error) {
    return false;
  }
}
