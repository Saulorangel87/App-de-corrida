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
      if (error) {
        const failure = new Error(error.name);
        failure.name = "ResendError";
        throw failure;
      }
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

/**
 * Limita quantos e-mails um mesmo endereço recebe por janela. Cadastro, reenvio e "esqueci a senha"
 * não exigem login e escrevem para qualquer endereço; sem este limite alguém poderia encher a caixa
 * de outra pessoa (o limite por IP não cobre IPs diferentes). Acima do limite o envio é descartado.
 */
export function throttledMailer(
  inner: Mailer,
  logger: Logger,
  opts: { limit: number; windowMs: number; now?: () => number } = { limit: 6, windowMs: 60 * 60 * 1000 },
): Mailer {
  const sentAt = new Map<string, number[]>();
  const now = opts.now ?? Date.now;
  return {
    async send(email) {
      const key = email.to.toLowerCase();
      const t = now();
      const recent = (sentAt.get(key) ?? []).filter((x) => t - x < opts.windowMs);
      if (recent.length >= opts.limit) {
        sentAt.set(key, recent);
        logger.warn("email_throttled", { subject: email.subject });
        return;
      }
      recent.push(t);
      sentAt.set(key, recent);
      // Não deixa o mapa crescer sem fim: poda endereços sem envio recente.
      if (sentAt.size > 5000) for (const [k, v] of sentAt) if (v.every((x) => t - x >= opts.windowMs)) sentAt.delete(k);
      await inner.send(email);
    },
  };
}

/** Para testes: guarda os e-mails em memória. */
export function memoryMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return { sent, send: async (email) => void sent.push(email) };
}
