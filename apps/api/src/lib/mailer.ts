import { Resend } from "resend";
import type { Logger } from "./logger";

export type Email = { to: string; subject: string; html: string; text: string };

export interface Mailer {
  send(email: Email): Promise<void>;
}

export function resendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey);
  return {
    async send({ to, subject, html, text }) {
      const { error } = await resend.emails.send({ from, to, subject, html, text });
      if (error) throw new Error(`resend: ${error.name}`);
    },
  };
}

/** Só em desenvolvimento: mostra o e-mail no console em vez de enviar. */
export function consoleMailer(logger: Logger): Mailer {
  return {
    async send({ subject, text }) {
      logger.info("dev_email", { subject });
      console.log(`\n----- e-mail (dev) -----\n${subject}\n\n${text}\n------------------------\n`);
    },
  };
}

/** Para testes: guarda os e-mails em memória. */
export function memoryMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return { sent, send: async (email) => void sent.push(email) };
}
