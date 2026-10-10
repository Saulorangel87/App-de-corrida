CREATE TABLE "plan_template_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"workout_id" uuid NOT NULL,
	"share_pct" integer NOT NULL,
	"fixed_minutes" integer,
	"optional" boolean DEFAULT false NOT NULL,
	"ladder_session" integer,
	CONSTRAINT "plan_template_sessions_share" CHECK ("plan_template_sessions"."share_pct" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "plan_template_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_template_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"volume_index" integer NOT NULL,
	"is_recovery" boolean DEFAULT false NOT NULL,
	"is_taper" boolean DEFAULT false NOT NULL,
	"is_race_week" boolean DEFAULT false NOT NULL,
	"ladder_stage" varchar(5),
	"ladder_recovery_pct" integer,
	CONSTRAINT "plan_template_weeks_phase" CHECK ("plan_template_weeks"."phase" in ('base', 'construcao', 'especifica', 'polimento', 'prova')),
	CONSTRAINT "plan_template_weeks_index" CHECK ("plan_template_weeks"."volume_index" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "plan_template_sessions" ADD CONSTRAINT "plan_template_sessions_week_id_plan_template_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."plan_template_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_template_sessions" ADD CONSTRAINT "plan_template_sessions_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_template_weeks" ADD CONSTRAINT "plan_template_weeks_plan_template_id_plan_templates_id_fk" FOREIGN KEY ("plan_template_id") REFERENCES "public"."plan_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_template_sessions_unique" ON "plan_template_sessions" USING btree ("week_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_template_weeks_unique" ON "plan_template_weeks" USING btree ("plan_template_id","week_number");