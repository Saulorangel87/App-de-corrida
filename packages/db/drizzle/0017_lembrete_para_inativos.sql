ALTER TABLE "users" ADD COLUMN "nudge_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nudge_opt_out_at" timestamp with time zone;
--> statement-breakpoint
-- Quem ainda não montou o plano: as tabelas de plano e de registro têm RLS por atleta, então a
-- busca roda fora da transação de um atleta. Esta função devolve só ids (nada do plano nem do
-- treino) e roda como o dono das tabelas; o nome, o e-mail e o idioma vêm de `users`, sem RLS.
-- Conta elegível: e-mail confirmado até `cutoff`, sem plano (de qualquer status), sem nenhum
-- registro de treino, sem envio anterior e sem pedido de não receber.
CREATE FUNCTION inactive_nudge_candidates(cutoff timestamptz, max_rows integer) RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT u.id
    FROM users u
    WHERE u.role = 'athlete'
      AND u.email_verified_at IS NOT NULL
      AND u.email_verified_at <= cutoff
      AND u.nudge_sent_at IS NULL
      AND u.nudge_opt_out_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM athlete_plans p WHERE p.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM workout_logs w WHERE w.user_id = u.id)
    ORDER BY u.email_verified_at
    LIMIT max_rows
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inactive_nudge_candidates(timestamptz, integer) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT EXECUTE ON FUNCTION inactive_nudge_candidates(timestamptz, integer) TO passo_api;
  END IF;
END $$;
