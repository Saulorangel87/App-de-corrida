-- RLS e permissões do usuário da API (passo_api). Ver docs/adr/0002-rls.md.
-- Roda como o dono do schema (usuário de migração). O passo_api não é dono
-- das tabelas, então as políticas valem para ele sem FORCE.
--
-- app.user_id é definido por withAthlete() com set_config(..., true) (vale só
-- na transação). Fora dela vale '' ou NULL: nenhuma linha passa.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'consents', 'athlete_profiles', 'interview_responses', 'athlete_plans',
    'scheduled_workouts', 'workout_logs', 'daily_checkins', 'pain_reports',
    'engine_decisions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL
         USING (user_id = nullif(current_setting(''app.user_id'', true), '''')::uuid)
         WITH CHECK (user_id = nullif(current_setting(''app.user_id'', true), '''')::uuid)',
      t || '_owner', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Permissões mínimas, só se o papel existir (criado por ops/db-roles.sh).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM passo_api;
    GRANT USAGE ON SCHEMA public TO passo_api;
    -- Catálogo: só leitura.
    GRANT SELECT ON "references", workouts, workout_progressions, workout_references,
      plan_templates, plan_template_weeks TO passo_api;
    -- Auth e dados do atleta: leitura e escrita (atleta protegido por RLS).
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, auth_tokens,
      consents, athlete_profiles, interview_responses, athlete_plans,
      scheduled_workouts, workout_logs, daily_checkins, pain_reports TO passo_api;
    -- Auditoria do motor: só acrescenta e lê (exclusão vem em cascata da conta).
    GRANT SELECT, INSERT ON engine_decisions TO passo_api;
  END IF;
END $$;
