import { randomBytes, createHash } from "node:crypto";
import { db, sessions, users, authTokens } from "@passo/db";
import { eq } from "drizzle-orm";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";

const SESSION_COOKIE_NAME = "passo_session";
const SESSION_EXPIRES_IN_DAYS = 30;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_IN_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function validateSessionToken(token: string) {
  const tokenHash = hashToken(token);
  
  const result = await db.select({
    user: users,
    session: sessions
  })
  .from(sessions)
  .innerJoin(users, eq(sessions.userId, users.id))
  .where(eq(sessions.tokenHash, tokenHash));

  if (result.length === 0) {
    return { session: null, user: null };
  }
  
  const { user, session } = result[0];
  
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { session: null, user: null };
  }
  
  // Extend session if less than 15 days left
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_EXPIRES_IN_DAYS);
    await db.update(sessions)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessions.id, session.id));
  }
  
  return { session, user };
}

export async function invalidateSession(token: string) {
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_EXPIRES_IN_DAYS,
  });
}

export function deleteSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
  });
}

export function getSessionCookie(c: Context) {
  return getCookie(c, SESSION_COOKIE_NAME) ?? null;
}

export async function createAuthToken(userId: string, type: 'email_verification' | 'password_reset'): Promise<string> {
    const token = generateToken();
    const tokenHash = hashToken(token);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiration

    await db.insert(authTokens).values({
        userId,
        tokenHash,
        type,
        expiresAt,
    });
    return token;
}
