CREATE TABLE "lighter_day_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_pauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_pauses_dates" CHECK ("planned_pauses"."end_date" >= "planned_pauses"."start_date")
);
--> statement-breakpoint
ALTER TABLE "lighter_day_requests" ADD CONSTRAINT "lighter_day_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_pauses" ADD CONSTRAINT "planned_pauses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lighter_day_requests_user_date_idx" ON "lighter_day_requests" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "planned_pauses_user_id_idx" ON "planned_pauses" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE lighter_day_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY lighter_day_requests_owner ON lighter_day_requests FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE planned_pauses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY planned_pauses_owner ON planned_pauses FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON lighter_day_requests TO passo_api;
    GRANT SELECT, INSERT, UPDATE, DELETE ON planned_pauses TO passo_api;
  END IF;
END $$;
