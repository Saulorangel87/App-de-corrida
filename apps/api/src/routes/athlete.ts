import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { INTERVIEW_STEPS, PARQ_INSTRUMENT, PARQ_TEXT_COMPLETE, evaluationSchema, healthChangeSchema, isoDate, type InterviewStep } from "@passo/shared";
import { errors } from "../lib/errors";
import { requestLang } from "../lib/lang";
import { validate } from "../lib/validate";
import type { AthleteService } from "../services/athlete-service";
import type { AppEnv } from "../types";

// Rotas do atleta. O dono vem sempre de c.var.auth (sessão no servidor);
// nenhuma rota recebe user_id do cliente.

export function athleteRoutes(opts: { athlete: AthleteService; session: MiddlewareHandler<AppEnv> }) {
  const { athlete, session } = opts;
  const r = new Hono<AppEnv>();
  const me = (c: { var: AppEnv["Variables"] }) => c.var.auth.user;

  // ----- entrevista -----

  r.get("/interview", session, async (c) => {
    const data = await athlete.getInterview(me(c).id);
    return c.json({ ...data, parq: { ...PARQ_INSTRUMENT, textAvailable: PARQ_TEXT_COMPLETE } });
  });

  r.put("/interview/:step", session, async (c) => {
    const step = c.req.param("step");
    if (!(INTERVIEW_STEPS as string[]).includes(step)) throw errors.notFound();
    const body = await c.req.json().catch(() => {
      throw errors.validation([{ path: "", code: "invalid_json" }]);
    });
    await athlete.saveStep(me(c).id, step as InterviewStep, body);
    return c.body(null, 204);
  });

  r.post("/interview/submit", session, async (c) => {
    const user = me(c);
    const result = await athlete.submit(user.id);
    const profile = await athlete.getProfile(user.id, requestLang(c));
    return c.json({ profile, planSelection: result.selection }, 201);
  });

  // ----- perfil e triagem -----

  r.get("/profile", session, async (c) => {
    const user = me(c);
    return c.json({ profile: await athlete.getProfile(user.id, requestLang(c)) });
  });

  r.post("/profile/screening/evaluation", session, validate("json", evaluationSchema), async (c) => {
    const result = await athlete.declareEvaluation(me(c).id, c.req.valid("json"));
    return c.json(result);
  });

  // R-TRI-11: "algo mudou na sua saúde?" (sim invalida a liberação até refazer o PAR-Q+)
  r.post("/profile/screening/health-change", session, validate("json", healthChangeSchema), async (c) =>
    c.json(await athlete.declareHealthChange(me(c).id, c.req.valid("json"))),
  );

  r.post("/profile/screening/professional-consulted", session,
    validate("json", z.object({ date: isoDate })),
    async (c) => c.json(await athlete.declareProfessionalConsulted(me(c).id, c.req.valid("json").date)),
  );

  // ----- foto de perfil: JPEG reduzido no aparelho (≤ 60 KB), só do dono -----

  r.put("/profile/photo", session, async (c) => {
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    return c.json(await athlete.savePhoto(me(c).id, bytes));
  });

  r.get("/profile/photo", session, async (c) => {
    const photo = await athlete.getPhoto(me(c).id);
    return new Response(new Uint8Array(photo.data), {
      status: 200,
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  r.delete("/profile/photo", session, async (c) => {
    await athlete.deletePhoto(me(c).id);
    return c.body(null, 204);
  });

  // ----- LGPD: exportar todos os meus dados -----

  r.get("/account/export", session, async (c) => {
    const data = await athlete.exportData(me(c).id);
    c.header("Content-Disposition", 'attachment; filename="meus-dados-app-de-corrida.json"');
    return c.json(data);
  });

  return r;
}
