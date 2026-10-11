CREATE TABLE "plan_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"athlete_plan_id" uuid NOT NULL,
	"calendar_week" integer NOT NULL,
	"felt" varchar(20) NOT NULL,
	"answered_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_reviews_felt" CHECK ("plan_reviews"."felt" in ('facil', 'no_ponto', 'puxado', 'nao_consegui'))
);
--> statement-breakpoint
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_athlete_plan_id_athlete_plans_id_fk" FOREIGN KEY ("athlete_plan_id") REFERENCES "public"."athlete_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_reviews_plan_week_idx" ON "plan_reviews" USING btree ("athlete_plan_id","calendar_week");--> statement-breakpoint
CREATE INDEX "plan_reviews_user_id_idx" ON "plan_reviews" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE plan_reviews ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY plan_reviews_owner ON plan_reviews FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON plan_reviews TO passo_api;
  END IF;
END $$;
