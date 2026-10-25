import { Hono, type MiddlewareHandler } from "hono";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@passo/shared";
import { validate } from "../lib/validate";
import type { PushService } from "../services/push-service";
import type { AppEnv } from "../types";

// Lembrete do treino por notificação. O dono vem da sessão; o aparelho é identificado pelo
// endereço que o serviço de push deu a ele, sempre no corpo (nunca na URL, que vai para logs).
export function pushRoutes(opts: { push: PushService; session: MiddlewareHandler<AppEnv> }) {
  const { push, session } = opts;
  const r = new Hono<AppEnv>();
  const me = (c: { var: AppEnv["Variables"] }) => c.var.auth.user;

  r.get("/push/config", session, (c) => c.json(push.config()));
  r.get("/push/subscriptions", session, async (c) => c.json({ subscriptions: await push.list(me(c).id) }));
  r.put("/push/subscription", session, validate("json", pushSubscriptionSchema), async (c) =>
    c.json(await push.subscribe(me(c).id, c.req.valid("json"))),
  );
  r.delete("/push/subscription", session, validate("json", pushUnsubscribeSchema), async (c) => {
    await push.unsubscribe(me(c).id, c.req.valid("json").endpoint);
    return c.body(null, 204);
  });
  return r;
}
