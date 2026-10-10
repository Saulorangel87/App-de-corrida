import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { authTokens, consents, sessions, users, type Database } from "@passo/db";

// Única camada que lê e grava users, sessions e auth_tokens.
// Toda consulta de sessão ou de token filtra pelo dono quando há um.

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type TokenType = "email_verification" | "password_reset";

export function authRepository(db: Database) {
  return {
    findUserByEmail: async (email: string) =>
      (await db.select().from(users).where(eq(users.email, email)).limit(1))[0],

    findUserById: async (id: string) =>
      (await db.select().from(users).where(eq(users.id, id)).limit(1))[0],

    /** Cria usuário e consentimento juntos. Retorna null se o e-mail já existir. */
    async createUser(input: {
      name: string;
      email: string;
      passwordHash: string;
      language: string;
      termsVersion: string;
    }): Promise<User | null> {
      return db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ name: input.name, email: input.email, passwordHash: input.passwordHash, language: input.language })
          .onConflictDoNothing({ target: users.email })
          .returning();
        if (!user) return null;
        // consents tem RLS: define o dono para esta transação.
        await tx.execute(sql`select set_config('app.user_id', ${user.id}, true)`);
        await tx.insert(consents).values({ userId: user.id, termsVersion: input.termsVersion, healthDataAccepted: true });
        return user;
      });
    },

    /**
     * Registra uma falha de login com a linha travada (FOR UPDATE), para que
     * tentativas simultâneas não escapem da contagem. Retorna o bloqueio novo, se houver.
     */
    async recordLoginFailure(
      userId: string,
      now: Date,
      cfg: { maxFailures: number; windowMs: number; baseLockMs: number; maxLockMs: number },
    ): Promise<{ lockedForMs: number } | null> {
      return db.transaction(async (tx) => {
        const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
        if (!u) return null;
        const inWindow =
          u.failedLoginWindowStart && now.getTime() - u.failedLoginWindowStart.getTime() < cfg.windowMs;
        const count = inWindow ? u.failedLoginCount + 1 : 1;
        if (count >= cfg.maxFailures) {
          const lockedForMs = Math.min(cfg.baseLockMs * 2 ** u.lockoutLevel, cfg.maxLockMs);
          await tx
            .update(users)
            .set({
              failedLoginCount: 0,
              failedLoginWindowStart: null,
              lockedUntil: new Date(now.getTime() + lockedForMs),
              lockoutLevel: u.lockoutLevel + 1,
            })
            .where(eq(users.id, userId));
          return { lockedForMs };
        }
        await tx
          .update(users)
          .set({ failedLoginCount: count, failedLoginWindowStart: inWindow ? u.failedLoginWindowStart : now })
          .where(eq(users.id, userId));
        return null;
      });
    },

    resetLoginFailures: (userId: string) =>
      db
        .update(users)
        .set({ failedLoginCount: 0, failedLoginWindowStart: null, lockedUntil: null, lockoutLevel: 0 })
        .where(eq(users.id, userId)),

    // ----- sessões -----

    createSession: async (input: {
      userId: string;
      tokenHash: string;
      rememberMe: boolean;
      userAgent: string | null;
      now: Date;
      absoluteExpiresAt: Date;
    }) =>
      (
        await db
          .insert(sessions)
          .values({
            userId: input.userId,
            tokenHash: input.tokenHash,
            rememberMe: input.rememberMe,
            userAgent: input.userAgent,
            lastSeenAt: input.now,
            createdAt: input.now,
            absoluteExpiresAt: input.absoluteExpiresAt,
          })
          .returning()
      )[0]!,

    async findSessionByTokenHash(tokenHash: string) {
      const rows = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.tokenHash, tokenHash))
        .limit(1);
      return rows[0];
    },

    touchSession: (sessionId: string, now: Date) =>
      db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, sessionId)),

    deleteSessionByTokenHash: (tokenHash: string) => db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)),

    deleteSessionById: (sessionId: string) => db.delete(sessions).where(eq(sessions.id, sessionId)),

    listSessions: (userId: string) =>
      db
        .select({
          id: sessions.id,
          createdAt: sessions.createdAt,
          lastSeenAt: sessions.lastSeenAt,
          userAgent: sessions.userAgent,
          rememberMe: sessions.rememberMe,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.lastSeenAt)),

    /** Apaga a sessão só se for do dono. Retorna false se não existir para ele. */
    deleteOwnSession: async (userId: string, sessionId: string) =>
      (
        await db
          .delete(sessions)
          .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
          .returning({ id: sessions.id })
      ).length > 0,

    // ----- tokens de e-mail -----

    /** Cria um token novo e invalida os anteriores do mesmo tipo. */
    issueToken: (input: { userId: string; type: TokenType; tokenHash: string; expiresAt: Date; now: Date }) =>
      db.transaction(async (tx) => {
        await tx
          .update(authTokens)
          .set({ usedAt: input.now })
          .where(and(eq(authTokens.userId, input.userId), eq(authTokens.type, input.type), isNull(authTokens.usedAt)));
        await tx.insert(authTokens).values({
          userId: input.userId,
          type: input.type,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdAt: input.now,
        });
      }),

    /**
     * Consome o token num único UPDATE: só um pedido simultâneo vence.
     * Roda dentro da transação recebida para o uso e o efeito andarem juntos.
     */
    consumeToken: async (tx: Pick<Database, "update">, tokenHash: string, type: TokenType, now: Date) =>
      (
        await tx
          .update(authTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(authTokens.tokenHash, tokenHash),
              eq(authTokens.type, type),
              isNull(authTokens.usedAt),
              gt(authTokens.expiresAt, now),
            ),
          )
          .returning({ userId: authTokens.userId })
      )[0]?.userId ?? null,

    db,
  };
}

export type AuthRepository = ReturnType<typeof authRepository>;
