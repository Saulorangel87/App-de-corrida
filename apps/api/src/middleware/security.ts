import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { rateLimiter } from "hono-rate-limiter";
import { secureHeaders } from "hono/secure-headers";
import type { RateLimitConfig } from "../config";
import { errors } from "../lib/errors";
import type { AppEnv } from "../types";

/** Headers de segurança da API (só JSON: nada pode ser carregado nem embutido). */
export const apiSecureHeaders = (production: boolean) =>
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
    strictTransportSecurity: production ? "max-age=63072000; includeSubDomains" : false,
    xContentTypeOptions: "nosniff",
    referrerPolicy: "no-referrer",
    xFrameOptions: "DENY",
    crossOriginResourcePolicy: "same-site",
    permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [], usb: [] },
  });

/**
 * CSRF: requisições que mudam estado só com Origin igual ao do front.
 * Navegadores sempre mandam Origin em POST/PUT/PATCH/DELETE; com cookie
 * SameSite=Lax e CORS restrito, isto fecha a terceira camada.
 */
export function originCheck(allowedOrigin: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("origin");
      if (origin !== undefined && origin !== allowedOrigin) throw errors.csrf();
      if (origin === undefined && c.req.header("sec-fetch-site") === "cross-site") throw errors.csrf();
    }
    await next();
  };
}

/**
 * IP do cliente. Em produção a API só é alcançada pelo Cloudflare Tunnel, que
 * define cf-connecting-ip; X-Forwarded-For nunca é usado (pode ser forjado).
 */
export function clientIp(c: Context, production: boolean): string {
  if (production) {
    const ip = c.req.header("cf-connecting-ip");
    if (ip) return ip;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const limit = (name: string, cfg: RateLimitConfig, production: boolean) =>
  rateLimiter<AppEnv>({
    windowMs: cfg.windowMs,
    limit: cfg.limit,
    standardHeaders: "draft-6",
    keyGenerator: (c) => `${name}:${clientIp(c, production)}`,
    handler: (c) => {
      c.var.logger?.warn("rate_limited", { limiter: name, requestId: c.var.requestId });
      throw errors.rateLimited();
    },
  });
