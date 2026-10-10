-- RLS e permissões da triagem de saúde (mesmo padrão de 0001_rls.sql).
ALTER TABLE health_screenings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY health_screenings_owner ON health_screenings FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON health_screenings TO passo_api;
  END IF;
END $$;
