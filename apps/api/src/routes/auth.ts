import { Hono } from "hono";
import { db, users, authTokens, sessions } from "@passo/db";
import { eq } from "drizzle-orm";
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

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: "Invalid input" }, 400);
  }

  // Check if user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  
  if (existingUsers.length > 0) {
    // SECURITY: Return generic response to prevent email enumeration
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

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: "Invalid credentials" }, 401); // Generic
  }

  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (!user) {
    // Hash dummy password to prevent timing attacks
    await hashPassword("dummy_password_to_prevent_timing_attacks");
    // SECURITY: Return generic response
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

auth.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return c.json({ error: "Invalid input" }, 400);
  }

  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (user) {
    const token = await createAuthToken(user.id, 'password_reset');
    await sendPasswordResetEmail(user.email, token);
  }

  // SECURITY: Return generic response
  return c.json({ message: "If that email is in our system, we've sent a password reset link." });
});

auth.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { token, password } = body;

  if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
    return c.json({ error: "Invalid input" }, 400);
  }

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

auth.get("/verify-email", async (c) => {
    const token = c.req.query("token");
    if (!token) {
        return c.json({ error: "Missing token" }, 400);
    }
    
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
