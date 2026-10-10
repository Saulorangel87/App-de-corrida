import path from "node:path";
import { serve } from "@hono/node-server";
import { createDb } from "@passo/db";
import { createApp } from "./app";
import { loadEnv } from "./env";
import { createLogger } from "./lib/logger";
import { consoleMailer, resendMailer } from "./lib/mailer";

const env = loadEnv();
const logger = createLogger();
const production = env.NODE_ENV === "production";
const { db, close } = createDb(env.DATABASE_URL);

const app = createApp({
  db,
  logger,
  production,
  frontendUrl: env.FRONTEND_URL,
  sessionSecret: env.SESSION_SECRET,
  mailer: env.RESEND_API_KEY ? resendMailer(env.RESEND_API_KEY, env.EMAIL_FROM) : consoleMailer(logger, path.resolve(process.cwd(), "dev-emails.log")),
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info("server_started", { port: info.port, env: env.NODE_ENV }),
);

const shutdown = () => {
  logger.info("server_stopping");
  server.close(() => void close().then(() => process.exit(0)));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
