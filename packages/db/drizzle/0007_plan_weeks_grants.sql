-- Catálogo de planos (semanas e sessões dos modelos): só leitura para a API (como o resto do catálogo).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT ON plan_template_weeks, plan_template_sessions TO passo_api;
  END IF;
END $$;
