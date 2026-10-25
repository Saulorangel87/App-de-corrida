import path from "node:path";
import { serve } from "@hono/node-server";
import { createDb } from "@passo/db";
import { createApp } from "./app";
import { loadEnv } from "./env";
import { createLogger } from "./lib/logger";
import { consoleMailer, resendMailer, throttledMailer } from "./lib/mailer";

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
  vapid:
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT }
      : null,
  mailer: throttledMailer(
    env.RESEND_API_KEY ? resendMailer(env.RESEND_API_KEY, env.EMAIL_FROM) : consoleMailer(logger, path.resolve(process.cwd(), "dev-emails.log")),
    logger,
  ),
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info("server_started", { port: info.port, env: env.NODE_ENV }),
);

// Lembretes do treino: confere a cada 5 minutos o que venceu no fuso de cada aparelho.
const REMINDER_EVERY_MS = 5 * 60 * 1000;
const reminders = app.push.config().enabled
  ? setInterval(() => void app.push.sendDue(new Date()).catch((error: unknown) => logger.error("push_reminders_failed", { error: String(error) })), REMINDER_EVERY_MS)
  : null;

const shutdown = () => {
  logger.info("server_stopping");
  if (reminders) clearInterval(reminders);
  server.close(() => void close().then(() => process.exit(0)));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
