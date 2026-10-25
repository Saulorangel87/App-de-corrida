import { Hono, type MiddlewareHandler } from "hono";
import {
  checkinSchema,
  clearanceSchema,
  historyQuerySchema,
  isoDate,
  lighterDaySchema,
  painReportSchema,
  pauseSchema,
  planReviewSchema,
  plannedPauseCancelSchema,
  plannedPauseSchema,
  workoutLogSchema,
  workoutMoveSchema,
} from "@passo/shared";
import { z } from "zod";
import { errors } from "../lib/errors";
import { requestLang } from "../lib/lang";
import { validate } from "../lib/validate";
import type { TrainingService } from "../services/training-service";
import type { AppEnv } from "../types";

// Acompanhamento diário. O dono vem sempre da sessão no servidor; as datas são do calendário
// do atleta (AAAA-MM-DD) e o servidor só aceita hoje e os dias vizinhos.

export function trainingRoutes(opts: { training: TrainingService; session: MiddlewareHandler<AppEnv> }) {
  const { training, session } = opts;
  const r = new Hono<AppEnv>();
  const me = (c: { var: AppEnv["Variables"] }) => c.var.auth.user.id;

  const dateParam = (c: { req: { param: (k: string) => string } }) => {
    const parsed = isoDate.safeParse(c.req.param("date"));
    if (!parsed.success) throw errors.validation([{ path: "date", code: "invalid_date" }]);
    return parsed.data;
  };
  const idParam = (c: { req: { param: (k: string) => string } }) => {
    const parsed = z.string().uuid().safeParse(c.req.param("id"));
    if (!parsed.success) throw errors.notFound();
    return parsed.data;
  };

  // Decisão e sessões do dia
  r.get("/day/:date", session, async (c) => c.json(await training.day(me(c), dateParam(c), requestLang(c))));

  // "Não estou 100%": pedido de dia mais leve (R-PRG-13)
  r.put("/day/:date/lighter", session, validate("json", lighterDaySchema), async (c) =>
    c.json(await training.setLighter(me(c), dateParam(c), c.req.valid("json").on, requestLang(c))),
  );

  // Pausa planejada (R-PRG-14): consultar, marcar ou mudar, cancelar
  r.get("/plan/pause", session, async (c) => {
    const parsed = isoDate.safeParse(c.req.query("today"));
    if (!parsed.success) throw errors.validation([{ path: "today", code: "invalid_date" }]);
    return c.json(await training.plannedPause(me(c), parsed.data));
  });
  r.put("/plan/pause", session, validate("json", plannedPauseSchema), async (c) =>
    c.json(await training.savePlannedPause(me(c), c.req.valid("json"))),
  );
  r.delete("/plan/pause", session, validate("json", plannedPauseCancelSchema), async (c) =>
    c.json(await training.cancelPlannedPause(me(c), c.req.valid("json").today)),
  );

  // Semana do plano que contém a data
  r.get("/plan/week/:date", session, async (c) => c.json(await training.week(me(c), dateParam(c))));

  // Plano inteiro: semanas criadas com as sessões e o contorno das que faltam
  r.get("/plan/overview/:date", session, async (c) => c.json(await training.overview(me(c), dateParam(c))));

  // Avaliação do bloco de 2 semanas ("como foi?"): estado e resposta (reenviar substitui)
  r.get("/plan/review/:date", session, async (c) => c.json(await training.review(me(c), dateParam(c))));
  r.put("/plan/review/:date", session, validate("json", planReviewSchema), async (c) =>
    c.json(await training.saveReview(me(c), dateParam(c), c.req.valid("json"))),
  );

  // Detalhe de um treino agendado (catálogo, referências, registro): só do próprio atleta
  // `?today=` é a data local do atleta: define os dias para onde o treino ainda pode ir.
  r.get("/workouts/:id", session, async (c) => {
    const today = c.req.query("today");
    if (today !== undefined && !isoDate.safeParse(today).success) throw errors.validation([{ path: "today", code: "invalid_date" }]);
    return c.json(await training.workout(me(c), idParam(c), requestLang(c), today));
  });

  // Trocar o dia do treino (mesma semana, de hoje em diante, dentro das regras do agendador)
  r.put("/workouts/:id/date", session, validate("json", workoutMoveSchema), async (c) =>
    c.json(await training.moveWorkout(me(c), idParam(c), c.req.valid("json").date, c.req.valid("json").today, requestLang(c))),
  );

  // Check-in diário (um por dia; reenviar substitui)
  r.put("/checkins/:date", session, validate("json", checkinSchema), async (c) =>
    c.json(await training.saveCheckin(me(c), dateParam(c), c.req.valid("json"), requestLang(c))),
  );

  // Dor ou sintoma fora do registro de treino
  r.post("/pain/:date", session, validate("json", painReportSchema), async (c) =>
    c.json(await training.savePain(me(c), dateParam(c), c.req.valid("json"), requestLang(c)), 201),
  );

  // Registro pós-treino (reenviar substitui) e decisão do dia seguinte
  r.put("/workouts/:id/log", session, validate("json", workoutLogSchema), async (c) =>
    c.json(await training.logWorkout(me(c), idParam(c), c.req.valid("json"), requestLang(c))),
  );

  // Pausa e liberação profissional
  r.put("/profile/pause", session, validate("json", pauseSchema), async (c) =>
    c.json(await training.declarePause(me(c), c.req.valid("json").cause, c.req.valid("json").date)),
  );
  r.post("/profile/professional-clearance", session, validate("json", clearanceSchema), async (c) =>
    c.json(await training.declareClearance(me(c), c.req.valid("json").date)),
  );

  // Histórico: sono, carga semanal, dor, aderência
  r.get("/history", session, async (c) => {
    const parsed = historyQuerySchema.safeParse({ days: c.req.query("days") });
    if (!parsed.success) throw errors.validation(parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })));
    return c.json(await training.history(me(c), parsed.data.days));
  });

  return r;
}
