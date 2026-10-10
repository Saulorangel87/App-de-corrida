CREATE TABLE "athlete_plan_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"athlete_plan_id" uuid NOT NULL,
	"calendar_week" integer NOT NULL,
	"template_week" integer NOT NULL,
	"start_date" date NOT NULL,
	"ladder_repeated_once" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"ladder_action" varchar(20),
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "daily_checkins_user_date_idx";--> statement-breakpoint
DROP INDEX "engine_decisions_user_id_idx";--> statement-breakpoint
DROP INDEX "pain_reports_user_id_idx";--> statement-breakpoint
ALTER TABLE "daily_checkins" ALTER COLUMN "date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ALTER COLUMN "scheduled_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD COLUMN "pause_cause" varchar(20);--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD COLUMN "pause_declared_on" date;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD COLUMN "cleared_by_professional_on" date;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD COLUMN "daily_pain_walking" integer;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "engine_decisions" ADD COLUMN "for_date" date;--> statement-breakpoint
ALTER TABLE "pain_reports" ADD COLUMN "reported_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "pain_reports" ADD COLUMN "moment" varchar(20) DEFAULT 'treino' NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "athlete_plan_week_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "slot" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "kind" varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "planned_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "max_zone" varchar(2) NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "target_rpe" integer;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "optional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "ladder" jsonb;--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "athlete_plan_weeks" ADD CONSTRAINT "athlete_plan_weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_plan_weeks" ADD CONSTRAINT "athlete_plan_weeks_athlete_plan_id_athlete_plans_id_fk" FOREIGN KEY ("athlete_plan_id") REFERENCES "public"."athlete_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_plan_weeks_plan_week_idx" ON "athlete_plan_weeks" USING btree ("athlete_plan_id","calendar_week");--> statement-breakpoint
CREATE INDEX "athlete_plan_weeks_user_id_idx" ON "athlete_plan_weeks" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "scheduled_workouts" ADD CONSTRAINT "scheduled_workouts_athlete_plan_week_id_athlete_plan_weeks_id_fk" FOREIGN KEY ("athlete_plan_week_id") REFERENCES "public"."athlete_plan_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_workouts_week_slot_idx" ON "scheduled_workouts" USING btree ("athlete_plan_week_id","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkins_user_date_idx" ON "daily_checkins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "engine_decisions_user_id_idx" ON "engine_decisions" USING btree ("user_id","for_date");--> statement-breakpoint
CREATE INDEX "pain_reports_user_id_idx" ON "pain_reports" USING btree ("user_id","reported_on");--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_scheduled_workout_id_unique" UNIQUE("scheduled_workout_id");