CREATE TABLE "user_photos" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"content_type" varchar(30) DEFAULT 'image/jpeg' NOT NULL,
	"data" "bytea" NOT NULL,
	"byte_size" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_photos_size" CHECK ("user_photos"."byte_size" between 1 and 204800)
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" DROP CONSTRAINT "auth_tokens_type";--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD COLUMN "new_email" varchar(254);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_type" CHECK ("auth_tokens"."type" in ('email_verification', 'password_reset', 'email_change'));
--> statement-breakpoint
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_photos_owner ON user_photos FOR ALL
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_photos TO passo_api;
  END IF;
END $$;
