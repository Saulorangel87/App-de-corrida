import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { sql } from "drizzle-orm";
import type { Database } from "@passo/db";
import { rateLimitConfig } from "./config";
import { AppError, errors } from "./lib/errors";
import { describeError, type Logger } from "./lib/logger";
import type { Mailer } from "./lib/mailer";
import { requireSession, sessionCookie } from "./middleware/session";
import { apiSecureHeaders, limit, originCheck } from "./middleware/security";
import { authRepository } from "./repositories/auth-repository";
import { athleteRoutes } from "./routes/athlete";
import { authRoutes } from "./routes/auth";
import { trainingRoutes } from "./routes/training";
import { athleteService } from "./services/athlete-service";
import { authService, type BackgroundRunner } from "./services/auth-service";
import { trainingService } from "./services/training-service";
import type { AppEnv } from "./types";

export type AppDeps = {
  db: Database;
  mailer: Mailer;
  logger: Logger;
  production: boolean;
  frontendUrl: string;
  sessionSecret: string;
  now?: () => Date;
  background?: BackgroundRunner;
  rateLimits?: typeof rateLimitConfig;
};

/** `http://localhost:5173` também vale como `http://127.0.0.1:5173` (e o inverso). */
function withLoopbackAlias(origin: string): string[] {
  const url = new URL(origin);
  const alias = url.hostname === "localhost" ? "127.0.0.1" : url.hostname === "127.0.0.1" ? "localhost" : null;
  if (!alias) return [origin];
  url.hostname = alias;
  return [origin, url.origin];
}

export function createApp(deps: AppDeps) {
  const { logger, production } = deps;
  const frontendOrigin = new URL(deps.frontendUrl).origin;
  // Só em desenvolvimento: localhost e 127.0.0.1 são o mesmo computador; aceita os dois para o mesmo
  // porto (quem abre o front por um deles não fica bloqueado pelo CORS). Em produção, só a origem exata.
  const allowedOrigins = production ? [frontendOrigin] : withLoopbackAlias(frontendOrigin);

  const background: BackgroundRunner =
    deps.background ??
    ((name, task) => {
      task().catch((error: unknown) =>
        logger.error("background_task_failed", {
          task: name,
          error: describeError(error),
        }),
      );
    });

  const auth = authService({
    repo: authRepository(deps.db),
    mailer: deps.mailer,
    logger,
    sessionSecret: deps.sessionSecret,
    frontendUrl: frontendOrigin,
    now: deps.now ?? (() => new Date()),
    background,
  });
  const cookie = sessionCookie(production);
  const session = requireSession(auth, cookie);
  const athlete = athleteService({ db: deps.db, logger, now: deps.now ?? (() => new Date()) });
  const training = trainingService({ db: deps.db, logger, now: deps.now ?? (() => new Date()) });
  const rateLimits = deps.rateLimits ?? rateLimitConfig;

  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    const requestId = randomUUID();
    c.set("requestId", requestId);
    c.set("logger", logger);
    c.header("X-Request-Id", requestId);
    const start = Date.now();
    await next();
    // Só método, rota e status: sem query string (pode ter dados).
    logger.info("request", {
      requestId,
      method: c.req.method,
      path: c.req.routePath,
      status: c.res.status,
      ms: Date.now() - start,
    });
  });
  app.use("*", apiSecureHeaders(production));
  app.use(
    "*",
    cors({
      origin: allowedOrigins,
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );
  app.use("*", originCheck(allowedOrigins));
  app.use(
    "*",
    bodyLimit({
      maxSize: 64 * 1024,
      onError: () => {
        throw new AppError(413, "PAYLOAD_TOO_LARGE", "Requisição grande demais.");
      },
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/ready", async (c) => {
    try {
      await deps.db.execute(sql`select 1`);
      return c.json({ status: "ready" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  const v1 = new Hono<AppEnv>();
  v1.use("*", limit("global", rateLimits.global, production));
  v1.route("/auth", authRoutes({ auth, cookie, session, production, rateLimits }));
  v1.route("/", athleteRoutes({ athlete, session }));
  v1.route("/", trainingRoutes({ training, session }));
  app.route("/api/v1", v1);

  app.notFound(() => {
    throw errors.notFound();
  });

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
        err.status,
      );
    }
    if (err instanceof HTTPException && err.status < 500) {
      return c.json({ error: { code: "BAD_REQUEST", message: "Requisição inválida." } }, err.status);
    }
    logger.error("unhandled_error", {
      requestId: c.var.requestId,
      error: describeError(err),
      stack: !production && err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente de novo." } }, 500);
  });

  return app;
}
