-- RLS e permissões das semanas do plano do atleta (mesmo padrão de 0001_rls.sql).
ALTER TABLE athlete_plan_weeks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY athlete_plan_weeks_owner ON athlete_plan_weeks FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON athlete_plan_weeks TO passo_api;
  END IF;
END $$;
