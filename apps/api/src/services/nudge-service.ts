import { authConfig } from "../config";
import { signNudgeToken, verifyNudgeToken } from "../lib/crypto";
import { templates, type Lang } from "../lib/email-templates";
import { errors } from "../lib/errors";
import { describeError, type Logger } from "../lib/logger";
import type { Mailer } from "../lib/mailer";
import type { AuthRepository } from "../repositories/auth-repository";
import { localNow } from "./push-service";

/**
 * E-mail único de incentivo: quem confirmou o e-mail há 3 dias ou mais e ainda não montou o plano
 * (nem registrou treino) recebe um aviso curto, uma vez só, com um link para não receber. O texto
 * não leva dado de saúde. A conta que pediu para não receber nunca recebe.
 */
export function nudgeService(d: {
  repo: AuthRepository;
  mailer: Mailer;
  logger: Logger;
  sessionSecret: string;
  frontendUrl: string;
}) {
  const { repo, mailer, logger } = d;
  const cfg = authConfig.nudge;

  const inSendWindow = (now: Date) => {
    const hour = Number(localNow(now, cfg.timeZone).time.slice(0, 2));
    return hour >= cfg.fromHour && hour < cfg.toHour;
  };

  return {
    /** Envia o que venceu. Chamado a cada poucos minutos pelo processo da API. */
    async sendDue(now: Date): Promise<{ sent: number }> {
      if (!inSendWindow(now)) return { sent: 0 };
      const cutoff = new Date(now.getTime() - cfg.afterMs);
      const ids = await repo.inactiveNudgeCandidates(cutoff, cfg.maxPerRun);
      let sent = 0;
      for (const id of ids) {
        const user = await repo.findUserById(id);
        if (!user || !(await repo.claimNudge(id, now))) continue;
        const lang: Lang = user.language === "en" ? "en" : "pt-BR";
        try {
          await mailer.send(
            templates.inactiveNudge(
              lang,
              user.email,
              user.name,
              `${d.frontendUrl}/entrevista`,
              `${d.frontendUrl}/sem-lembrete#token=${encodeURIComponent(signNudgeToken(d.sessionSecret, id))}`,
            ),
          );
          sent += 1;
          logger.info("nudge_sent", { userId: id });
        } catch (error) {
          await repo.releaseNudge(id);
          logger.error("nudge_failed", { userId: id, error: describeError(error) });
        }
      }
      return { sent };
    },

    /** Link do rodapé do e-mail (sem sessão: abre em qualquer aparelho). */
    async optOut(token: string, now: Date) {
      const userId = verifyNudgeToken(d.sessionSecret, token);
      if (!userId || !(await repo.optOutNudge(userId, now))) throw errors.invalidToken();
      logger.info("nudge_opted_out", { userId });
    },
  };
}

export type NudgeService = ReturnType<typeof nudgeService>;
