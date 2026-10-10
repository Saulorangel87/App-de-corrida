CREATE TABLE "health_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instrument_version" varchar(50) NOT NULL,
	"answers" jsonb NOT NULL,
	"pregnant" boolean NOT NULL,
	"regular_exercise_3m" boolean NOT NULL,
	"completed_on" date NOT NULL,
	"evaluation" jsonb,
	"consulted_professional_on" date,
	"health_changed_on" date,
	"state" varchar(30) NOT NULL,
	"max_intensity" varchar(20) NOT NULL,
	"valid_until" date,
	"rule_version" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_plans" ALTER COLUMN "start_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "athlete_plans" ALTER COLUMN "end_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "athlete_plans" ALTER COLUMN "end_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "athlete_plans" ADD COLUMN "goal_tag" varchar(30);--> statement-breakpoint
ALTER TABLE "athlete_plans" ADD COLUMN "base_weeks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "athlete_plans" ADD COLUMN "selection" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD COLUMN "flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD COLUMN "limiting_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_responses" ADD COLUMN "status" varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_responses" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interview_responses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD COLUMN "slug" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD COLUMN "duration_weeks" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD COLUMN "rule_version" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_screenings_user_id_idx" ON "health_screenings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_responses_one_draft" ON "interview_responses" USING btree ("user_id") WHERE "interview_responses"."status" = 'draft';--> statement-breakpoint
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "interview_responses" ADD CONSTRAINT "interview_responses_status" CHECK ("interview_responses"."status" in ('draft', 'submitted'));