CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" varchar(200) NOT NULL,
	"auth" varchar(100) NOT NULL,
	"reminder_time" varchar(5) NOT NULL,
	"time_zone" varchar(64) NOT NULL,
	"last_sent_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_time" CHECK ("push_subscriptions"."reminder_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY push_subscriptions_owner ON push_subscriptions FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
-- O envio dos lembretes precisa saber quem tem lembrete ligado, fora da transação de um atleta.
-- Esta função devolve só os ids (nada do aparelho nem do treino); o resto é lido com
-- withAthlete(), dentro do RLS de cada um. Roda como o dono da tabela (usuário de migração).
CREATE FUNCTION push_reminder_users() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT DISTINCT user_id FROM push_subscriptions $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION push_reminder_users() FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO passo_api;
    GRANT EXECUTE ON FUNCTION push_reminder_users() TO passo_api;
  END IF;
END $$;
