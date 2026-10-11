import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { authConfig } from "../config";
import { errors } from "../lib/errors";
import type { AuthService } from "../services/auth-service";
import type { AppEnv } from "../types";
import type { Session } from "../repositories/auth-repository";

export function sessionCookie(secure: boolean) {
  // __Host-: só HTTPS, sem Domain, Path=/ (o navegador garante).
  const name = secure ? "__Host-passo_session" : "passo_session";
  return {
    name,
    read: (c: Context) => getCookie(c, name) ?? null,
    write(c: Context, token: string, session: Session) {
      const remaining = Math.floor((session.absoluteExpiresAt.getTime() - Date.now()) / 1000);
      setCookie(c, name, token, {
        httpOnly: true,
        secure,
        sameSite: "Lax",
        path: "/",
        // Sem "manter conectado": cookie de sessão do navegador.
        ...(session.rememberMe
          ? { maxAge: Math.max(0, Math.min(authConfig.session.idleRememberMs / 1000, remaining)) }
          : {}),
      });
    },
    clear: (c: Context) => deleteCookie(c, name, { path: "/", secure }),
  };
}

export type SessionCookie = ReturnType<typeof sessionCookie>;

/** Exige sessão válida; o dono dos dados vem sempre daqui. */
export function requireSession(auth: AuthService, cookie: SessionCookie): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = cookie.read(c);
    const result = token ? await auth.validateSession(token) : null;
    if (!result) {
      if (token) cookie.clear(c);
      throw errors.unauthorized();
    }
    c.set("auth", result);
    // "Manter conectado": o prazo da sessão no servidor corre desde o último uso; o cookie
    // acompanha, senão o navegador o descartaria 30 dias depois do login mesmo com uso diário.
    if (result.session.rememberMe && token) cookie.write(c, token, result.session);
    await next();
  };
}
