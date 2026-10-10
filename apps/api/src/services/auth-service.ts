import { eq } from "drizzle-orm";
import { sessions, users } from "@passo/db";
import { authConfig } from "../config";
import { hashToken, newToken } from "../lib/crypto";
import { templates, type Lang } from "../lib/email-templates";
import { errors } from "../lib/errors";
import type { Logger } from "../lib/logger";
import type { Mailer } from "../lib/mailer";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../lib/password";
import type { AuthRepository, Session, User } from "../repositories/auth-repository";

export type BackgroundRunner = (name: string, task: () => Promise<void>) => void;

export type AuthDeps = {
  repo: AuthRepository;
  mailer: Mailer;
  logger: Logger;
  sessionSecret: string;
  frontendUrl: string;
  now: () => Date;
  background: BackgroundRunner;
};

export type PublicUser = { id: string; name: string; email: string; language: string; emailVerified: boolean };

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  language: u.language,
  emailVerified: u.emailVerifiedAt !== null,
});

const lang = (u: Pick<User, "language">): Lang => (u.language === "en" ? "en" : "pt-BR");

export function authService(d: AuthDeps) {
  const { repo, mailer, logger, now } = d;
  const hash = (token: string) => hashToken(d.sessionSecret, token);
  const link = (path: string, token?: string) =>
    `${d.frontendUrl}${path}${token ? `#token=${encodeURIComponent(token)}` : ""}`;

  async function sendVerification(user: User) {
    const token = newToken();
    const t = now();
    await repo.issueToken({
      userId: user.id,
      type: "email_verification",
      tokenHash: hash(token),
      expiresAt: new Date(t.getTime() + authConfig.tokens.emailVerificationMs),
      now: t,
    });
    await mailer.send(templates.verifyEmail(lang(user), user.email, user.name, link("/verificar-email", token)));
  }

  async function sendReset(user: User) {
    const token = newToken();
    const t = now();
    await repo.issueToken({
      userId: user.id,
      type: "password_reset",
      tokenHash: hash(token),
      expiresAt: new Date(t.getTime() + authConfig.tokens.passwordResetMs),
      now: t,
    });
    await mailer.send(templates.resetPassword(lang(user), user.email, user.name, link("/redefinir-senha", token)));
  }

  return {
    /**
     * Cadastro. A resposta é sempre a mesma e só espera o hash da senha (o
     * custo dominante); consulta, gravação e e-mail rodam em segundo plano.
     */
    async register(input: { name: string; email: string; password: string; language: Lang }) {
      const passwordHash = await hashPassword(input.password);
      d.background("register", async () => {
        const created = await repo.createUser({
          name: input.name,
          email: input.email,
          passwordHash,
          language: input.language,
          termsVersion: authConfig.termsVersion,
        });
        if (created) {
          logger.info("user_registered", { userId: created.id });
          await sendVerification(created);
          return;
        }
        const existing = await repo.findUserByEmail(input.email);
        if (!existing) return;
        logger.info("register_existing_email", { userId: existing.id });
        await mailer.send(
          templates.alreadyRegistered(lang(existing), existing.email, existing.name, link("/entrar"), link("/esqueci-a-senha")),
        );
      });
    },

    async login(input: {
      email: string;
      password: string;
      rememberMe: boolean;
      userAgent: string | null;
      previousToken: string | null;
    }): Promise<{ token: string; session: Session; user: User }> {
      const user = await repo.findUserByEmail(input.email);
      const t = now();

      if (!user) {
        await burnPasswordCheck(input.password);
        logger.warn("login_failed", { reason: "unknown_email" });
        throw errors.invalidCredentials();
      }

      if (user.lockedUntil && user.lockedUntil > t) {
        // Conta bloqueada: mesma resposta e mesmo custo de uma senha errada.
        await burnPasswordCheck(input.password);
        logger.warn("login_failed", { reason: "locked", userId: user.id });
        throw errors.invalidCredentials();
      }

      if (!(await verifyPassword(user.passwordHash, input.password))) {
        const lock = await repo.recordLoginFailure(user.id, t, authConfig.lockout);
        logger.warn("login_failed", { reason: "wrong_password", userId: user.id });
        if (lock) {
          const minutes = Math.round(lock.lockedForMs / 60000);
          logger.warn("account_locked", { userId: user.id, minutes });
          d.background("lock_email", () =>
            mailer.send(templates.accountLocked(lang(user), user.email, user.name, minutes, link("/esqueci-a-senha"))),
          );
        }
        throw errors.invalidCredentials();
      }

      // Só quem sabe a senha descobre que falta verificar o e-mail.
      if (!user.emailVerifiedAt) throw errors.emailNotVerified();

      await repo.resetLoginFailures(user.id);
      // Rotação: a sessão que veio no cookie (se houver) deixa de valer.
      if (input.previousToken) await repo.deleteSessionByTokenHash(hash(input.previousToken));

      const token = newToken();
      const session = await repo.createSession({
        userId: user.id,
        tokenHash: hash(token),
        rememberMe: input.rememberMe,
        userAgent: input.userAgent?.slice(0, 200) ?? null,
        now: t,
        absoluteExpiresAt: new Date(t.getTime() + authConfig.session.absoluteMs),
      });
      logger.info("login_succeeded", { userId: user.id, sessionId: session.id });
      return { token, session, user };
    },

    /** Valida a sessão a cada requisição: inatividade e prazo absoluto. */
    async validateSession(token: string): Promise<{ session: Session; user: User } | null> {
      const found = await repo.findSessionByTokenHash(hash(token));
      if (!found) return null;
      const { session, user } = found;
      const t = now().getTime();
      const idleMs = session.rememberMe ? authConfig.session.idleRememberMs : authConfig.session.idleMs;
      if (t >= session.absoluteExpiresAt.getTime() || t - session.lastSeenAt.getTime() >= idleMs) {
        await repo.deleteSessionById(session.id);
        logger.info("session_expired", { userId: user.id, sessionId: session.id });
        return null;
      }
      if (t - session.lastSeenAt.getTime() >= authConfig.session.touchEveryMs) {
        session.lastSeenAt = new Date(t);
        await repo.touchSession(session.id, session.lastSeenAt);
      }
      return { session, user };
    },

    async logout(token: string) {
      await repo.deleteSessionByTokenHash(hash(token));
    },

    async verifyEmail(token: string) {
      const t = now();
      const userId = await repo.db.transaction(async (tx) => {
        const id = await repo.consumeToken(tx, hash(token), "email_verification", t);
        if (id) await tx.update(users).set({ emailVerifiedAt: t, updatedAt: t }).where(eq(users.id, id));
        return id;
      });
      if (!userId) throw errors.invalidToken();
      logger.info("email_verified", { userId });
    },

    /** Reenvio de verificação: resposta sempre igual; trabalho em segundo plano. */
    resendVerification(email: string) {
      d.background("resend_verification", async () => {
        const user = await repo.findUserByEmail(email);
        if (user && !user.emailVerifiedAt) await sendVerification(user);
      });
    },

    /** Esqueci a senha: resposta sempre igual; trabalho em segundo plano. */
    forgotPassword(email: string) {
      d.background("forgot_password", async () => {
        const user = await repo.findUserByEmail(email);
        if (!user) return;
        logger.info("password_reset_requested", { userId: user.id });
        await sendReset(user);
      });
    },

    /** Troca a senha, encerra todas as sessões e avisa por e-mail. */
    async resetPassword(token: string, password: string, checkPassword: (email: string) => void) {
      const t = now();
      const passwordHash = await hashPassword(password);
      const user = await repo.db.transaction(async (tx) => {
        const id = await repo.consumeToken(tx, hash(token), "password_reset", t);
        if (!id) return null;
        const [u] = await tx.select().from(users).where(eq(users.id, id)).for("update");
        if (!u) return null;
        checkPassword(u.email); // lança erro de validação e desfaz o consumo do token
        await tx
          .update(users)
          .set({
            passwordHash,
            passwordChangedAt: t,
            // O link chegou no e-mail: ele também fica verificado.
            emailVerifiedAt: u.emailVerifiedAt ?? t,
            failedLoginCount: 0,
            failedLoginWindowStart: null,
            lockedUntil: null,
            lockoutLevel: 0,
            updatedAt: t,
          })
          .where(eq(users.id, id));
        await tx.delete(sessions).where(eq(sessions.userId, id));
        return u;
      });
      if (!user) throw errors.invalidToken();
      logger.info("password_reset", { userId: user.id });
      d.background("password_changed_email", () =>
        mailer.send(templates.passwordChanged(lang(user), user.email, user.name, link("/esqueci-a-senha"))),
      );
    },

    listSessions: (userId: string) => repo.listSessions(userId),

    async deleteSession(userId: string, sessionId: string) {
      if (!(await repo.deleteOwnSession(userId, sessionId))) throw errors.notFound();
      logger.info("session_revoked", { userId, sessionId });
    },
  };
}

export type AuthService = ReturnType<typeof authService>;
