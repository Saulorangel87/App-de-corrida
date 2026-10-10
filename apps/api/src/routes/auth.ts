import { Hono } from "hono";
import { db, users, authTokens, sessions } from "@passo/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createSession,
  setSessionCookie,
  deleteSessionCookie,
  getSessionCookie,
  validateSessionToken,
  invalidateSession,
  createAuthToken,
  hashToken
} from "../lib/session";
import { hashPassword, verifyPassword } from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";

// Valid argon2 hash of the string "dummy" to prevent timing attacks
const DUMMY_HASH = "$argon2id$v=19$m=65536,p=4,t=3$TxPaOjdogYZjDSqkl+sbrQ$FE6UbkmSM2uJp+73iywZwK2f9UiSXKk0hIcKqVgu2fM";

const auth = new Hono<{
  Variables: {
    user: any;
    session: any;
  }
}>();

export const authMiddleware = async (c: any, next: any) => {
  const token = getSessionCookie(c);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const { user, session } = await validateSessionToken(token);
  if (!user || !session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  c.set("session", session);
  await next();
};

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  
  if (existingUsers.length > 0) {
    return c.json({ message: "Registration successful. Please check your email to verify your account." });
  }

  const passwordHash = await hashPassword(password);
  
  const [newUser] = await db.insert(users).values({
    email,
    passwordHash,
  }).returning();

  const token = await createAuthToken(newUser.id, 'email_verification');
  await sendVerificationEmail(newUser.email, token);

  return c.json({ message: "Registration successful. Please check your email to verify your account." });
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().max(100), // Max 100 to prevent DoS via massive strings
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (!user) {
    // Math-identical timing attack prevention
    await verifyPassword(DUMMY_HASH, password);
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    return c.json({ error: "Invalid credentials" }, 401);
  }
  
  if (!user.emailVerified) {
      return c.json({ error: "Email not verified" }, 403);
  }

  const sessionToken = await createSession(user.id);
  setSessionCookie(c, sessionToken);

  return c.json({ message: "Logged in successfully" });
});

auth.post("/logout", async (c) => {
  const token = getSessionCookie(c);
  if (token) {
    await invalidateSession(token);
    deleteSessionCookie(c);
  }
  return c.json({ message: "Logged out successfully" });
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

auth.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid("json");

  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (user) {
    const token = await createAuthToken(user.id, 'password_reset');
    await sendPasswordResetEmail(user.email, token);
  }

  return c.json({ message: "If that email is in our system, we've sent a password reset link." });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255),
  password: z.string().min(8).max(100),
});

auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid("json");

  const hashedToken = hashToken(token);
  const result = await db.select().from(authTokens).where(eq(authTokens.tokenHash, hashedToken));
  const authToken = result[0];

  if (!authToken || authToken.type !== 'password_reset' || authToken.used || Date.now() >= authToken.expiresAt.getTime()) {
    return c.json({ error: "Invalid or expired token" }, 400);
  }

  const passwordHash = await hashPassword(password);

  await db.update(users).set({ passwordHash }).where(eq(users.id, authToken.userId));
  await db.update(authTokens).set({ used: true }).where(eq(authTokens.id, authToken.id));
  
  // Invalidate all existing sessions for this user
  await db.delete(sessions).where(eq(sessions.userId, authToken.userId));

  return c.json({ message: "Password reset successfully" });
});

const verifyEmailSchema = z.object({
  token: z.string().min(1).max(255),
});

// Changed from GET to POST
auth.post("/verify-email", zValidator("json", verifyEmailSchema), async (c) => {
    const { token } = c.req.valid("json");
    
    const hashedToken = hashToken(token);
    const result = await db.select().from(authTokens).where(eq(authTokens.tokenHash, hashedToken));
    const authToken = result[0];

    if (!authToken || authToken.type !== 'email_verification' || authToken.used || Date.now() >= authToken.expiresAt.getTime()) {
        return c.json({ error: "Invalid or expired token" }, 400);
    }
    
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, authToken.userId));
    await db.update(authTokens).set({ used: true }).where(eq(authTokens.id, authToken.id));
    
    return c.json({ message: "Email verified successfully" });
});

auth.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ id: user.id, email: user.email, emailVerified: user.emailVerified });
});

export default auth;
