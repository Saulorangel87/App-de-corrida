import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import {
  deleteAccountSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "@passo/shared";
import type { rateLimitConfig } from "../config";
import { errors } from "../lib/errors";
import { passwordProblem } from "../lib/password";
import { validate } from "../lib/validate";
import type { SessionCookie } from "../middleware/session";
import { limit } from "../middleware/security";
import { toPublicUser, type AuthService } from "../services/auth-service";
import type { AppEnv } from "../types";

const GENERIC_EMAIL_SENT = { message: "Se o e-mail puder receber, enviaremos as instruções em instantes." };

export function authRoutes(opts: {
  auth: AuthService;
  cookie: SessionCookie;
  session: MiddlewareHandler<AppEnv>;
  production: boolean;
  rateLimits: typeof rateLimitConfig;
}) {
  const { auth, cookie } = opts;
  const r = new Hono<AppEnv>();
  const emailLimit = limit("email_sending", opts.rateLimits.emailSending, opts.production);
  const loginLimit = limit("login", opts.rateLimits.login, opts.production);
  // Mesmo teto de tentativas do login, mas em balde próprio: errar a senha no login não trava a redefinição.
  const resetLimit = limit("reset_password", opts.rateLimits.login, opts.production);
  const { session } = opts;

  const checkPassword = (password: string, email: string) => {
    const problem = passwordProblem(password, email);
    if (problem) throw errors.validation([{ path: "password", code: problem }]);
  };

  r.post("/register", emailLimit, validate("json", registerSchema), async (c) => {
    const input = c.req.valid("json");
    checkPassword(input.password, input.email);
    await auth.register(input);
    return c.json({ message: "Enviamos um e-mail para confirmar o cadastro." }, 202);
  });

  r.post("/login", loginLimit, validate("json", loginSchema), async (c) => {
    const input = c.req.valid("json");
    const { token, session: created, user } = await auth.login({
      ...input,
      userAgent: c.req.header("user-agent") ?? null,
      previousToken: cookie.read(c),
    });
    cookie.write(c, token, created);
    return c.json({ user: toPublicUser(user) });
  });

  r.post("/logout", async (c) => {
    const token = cookie.read(c);
    if (token) await auth.logout(token);
    cookie.clear(c);
    return c.body(null, 204);
  });

  r.post("/verify-email", validate("json", tokenSchema), async (c) => {
    await auth.verifyEmail(c.req.valid("json").token);
    return c.json({ message: "E-mail confirmado." });
  });

  r.post("/resend-verification", emailLimit, validate("json", emailOnlySchema), (c) => {
    auth.resendVerification(c.req.valid("json").email);
    return c.json(GENERIC_EMAIL_SENT, 202);
  });

  r.post("/forgot-password", emailLimit, validate("json", emailOnlySchema), (c) => {
    auth.forgotPassword(c.req.valid("json").email);
    return c.json(GENERIC_EMAIL_SENT, 202);
  });

  // Não envia e-mail: usa o limite de tentativas (por IP), não o de envios, para que quem erra a
  // senha escolhida algumas vezes não fique travado por uma hora.
  r.post("/reset-password", resetLimit, validate("json", resetPasswordSchema), async (c) => {
    const { token, password } = c.req.valid("json");
    await auth.resetPassword(token, password, (email) => checkPassword(password, email));
    cookie.clear(c);
    return c.json({ message: "Senha alterada. Entre de novo." });
  });

  r.get("/me", session, (c) => c.json({ user: toPublicUser(c.var.auth.user) }));

  // Exclusão da conta (também oferecida a quem a entrevista barrar por idade).
  r.delete("/account", loginLimit, session, validate("json", deleteAccountSchema), async (c) => {
    await auth.deleteAccount(c.var.auth.user, c.req.valid("json").password);
    cookie.clear(c);
    return c.body(null, 204);
  });

  r.get("/sessions", session, async (c) => {
    const current = c.var.auth.session.id;
    const list = await auth.listSessions(c.var.auth.user.id);
    return c.json({ sessions: list.map((s) => ({ ...s, current: s.id === current })) });
  });

  // id inválido também vira 404: não revela nada sobre o recurso.
  r.delete("/sessions/:id", session, async (c) => {
    const id = z.string().uuid().safeParse(c.req.param("id"));
    if (!id.success) throw errors.notFound();
    await auth.deleteSession(c.var.auth.user.id, id.data);
    if (id.data === c.var.auth.session.id) cookie.clear(c);
    return c.body(null, 204);
  });

  return r;
}
