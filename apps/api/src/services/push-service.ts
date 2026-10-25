import { and, eq, sql } from "drizzle-orm";
import webpush from "web-push";
import { athleteProfiles, pushSubscriptions, scheduledWorkouts, users, withAthlete, type Database } from "@passo/db";
import type { PushSubscriptionInput } from "@passo/shared";
import { errors } from "../lib/errors";
import { describeError, type Logger } from "../lib/logger";

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

/** Uma notificação já cifrada saindo para o serviço de push; devolve o status HTTP do serviço. */
export type PushSender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<number>;

/** Lembrete atrasado demais (API fora do ar no horário) não sai: o dia já passou do ponto. */
const LATE_LIMIT_MINUTES = 180;

// Texto genérico de propósito: a notificação passa pelo serviço de push do navegador (Google,
// Apple, Mozilla), fora do Brasil. Nada de treino, dor ou saúde vai nela.
const MESSAGE = {
  "pt-BR": { title: "Let's Go Run", body: "Veja o que o app preparou para o seu treino de hoje." },
  en: { title: "Let's Go Run", body: "See what the app has ready for today's workout." },
} as const;

/** Data e hora locais ("2026-10-24", "07:30") de um instante num fuso IANA. */
export function localNow(now: Date, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

const validTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function webPushSender(vapid: VapidConfig): PushSender {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return async (sub, payload) => {
    try {
      const res = await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: "normal" });
      return res.statusCode;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (typeof status === "number") return status;
      throw error;
    }
  };
}

/**
 * Lembrete do treino (Web Push). O aparelho só é guardado com o horário que a pessoa escolheu;
 * o envio olha cada aparelho no fuso dele e manda no máximo um lembrete por dia, só em dia com
 * treino planejado e sem pausa por dor, lesão ou doença.
 */
export function pushService(d: { db: Database; logger: Logger; vapid: VapidConfig | null; sender?: PushSender }) {
  const { db, logger, vapid } = d;
  const send = d.sender ?? (vapid ? webPushSender(vapid) : null);

  const requireEnabled = () => {
    if (!vapid) throw errors.notFound();
  };

  return {
    config() {
      return { enabled: vapid !== null, publicKey: vapid?.publicKey ?? null };
    },

    async list(userId: string) {
      requireEnabled();
      return withAthlete(db, userId, (tx) =>
        tx
          .select({ endpoint: pushSubscriptions.endpoint, time: pushSubscriptions.reminderTime, timeZone: pushSubscriptions.timeZone })
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId)),
      );
    },

    /** Liga ou atualiza o lembrete deste aparelho (o mesmo endereço substitui o anterior). */
    async subscribe(userId: string, input: PushSubscriptionInput) {
      requireEnabled();
      if (!validTimeZone(input.timeZone)) throw errors.validation([{ path: "timeZone", code: "invalid_time_zone" }]);
      const values = { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, reminderTime: input.time, timeZone: input.timeZone };
      await withAthlete(db, userId, (tx) =>
        tx
          .insert(pushSubscriptions)
          .values({ userId, ...values })
          .onConflictDoUpdate({
            target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
            set: { ...values, lastSentOn: null, updatedAt: sql`now()` },
          }),
      );
      logger.info("push_subscribed", { userId });
      return { time: input.time, timeZone: input.timeZone };
    },

    async unsubscribe(userId: string, endpoint: string) {
      requireEnabled();
      await withAthlete(db, userId, (tx) =>
        tx.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))),
      );
      logger.info("push_unsubscribed", { userId });
    },

    /** Envia os lembretes que venceram. Chamado a cada poucos minutos pelo processo da API. */
    async sendDue(now: Date) {
      if (!send) return { sent: 0, removed: 0 };
      let sent = 0;
      let removed = 0;
      // Só os ids de quem tem lembrete (função do banco); o resto é lido no RLS de cada atleta.
      const ids = (await db.execute<{ id: string }>(sql`select push_reminder_users() as id`)) as unknown as { id: string }[];
      for (const { id: userId } of ids) {
        try {
          const due = await withAthlete(db, userId, async (tx) => {
            const subs = await tx.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
            const [account] = await tx.select({ language: users.language }).from(users).where(eq(users.id, userId));
            const [profile] = await tx
              .select({ pauseCause: athleteProfiles.pauseCause, cleared: athleteProfiles.clearedByProfessionalOn })
              .from(athleteProfiles)
              .where(eq(athleteProfiles.userId, userId));
            const paused = !!profile?.pauseCause && !profile.cleared;
            const out: { sub: (typeof subs)[number]; date: string; notify: boolean }[] = [];
            for (const sub of subs) {
              const local = localNow(now, sub.timeZone);
              if (sub.lastSentOn === local.date) continue;
              const late = minutesOf(local.time) - minutesOf(sub.reminderTime);
              if (late < 0) continue;
              const [planned] = await tx
                .select({ id: scheduledWorkouts.id })
                .from(scheduledWorkouts)
                .where(and(eq(scheduledWorkouts.userId, userId), eq(scheduledWorkouts.scheduledDate, local.date), eq(scheduledWorkouts.optional, false)))
                .limit(1);
              out.push({ sub, date: local.date, notify: !!planned && !paused && late <= LATE_LIMIT_MINUTES });
            }
            return { out, lang: account?.language === "en" ? ("en" as const) : ("pt-BR" as const) };
          });

          for (const { sub, date, notify } of due.out) {
            let gone = false;
            if (notify) {
              const status = await send(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({ ...MESSAGE[due.lang], url: "/painel" }),
              );
              // 404 e 410: o aparelho cancelou a inscrição (desinstalou, limpou dados).
              gone = status === 404 || status === 410;
              if (status >= 200 && status < 300) sent++;
              else if (!gone) logger.warn("push_send_failed", { userId, status });
            }
            await withAthlete(db, userId, (tx) =>
              gone
                ? tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
                : tx.update(pushSubscriptions).set({ lastSentOn: date }).where(eq(pushSubscriptions.id, sub.id)),
            );
            if (gone) removed++;
          }
        } catch (error) {
          logger.error("push_reminders_failed", { userId, error: describeError(error) });
        }
      }
      if (sent || removed) logger.info("push_reminders_sent", { sent, removed });
      return { sent, removed };
    },
  };
}

export type PushService = ReturnType<typeof pushService>;
