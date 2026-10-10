import { appendFile } from "node:fs/promises";
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

/**
 * Só em desenvolvimento (em produção a chave do Resend é obrigatória): em vez de enviar, mostra o
 * e-mail no console e, se `file` for informado, também o acrescenta nesse arquivo (fora do Git),
 * para quem não vê o console da API conseguir abrir o link de confirmação.
 */
export function consoleMailer(logger: Logger, file?: string): Mailer {
  return {
    async send({ to, subject, text }) {
      logger.info("dev_email", { subject });
      const body = `\n----- e-mail (dev) -----\nPara: ${to}\nAssunto: ${subject}\n\n${text}\n------------------------\n`;
      console.log(body);
      if (file) await appendFile(file, `${new Date().toISOString()}${body}`, "utf8");
    },
  };
}

/** Para testes: guarda os e-mails em memória. */
export function memoryMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return { sent, send: async (email) => void sent.push(email) };
}
