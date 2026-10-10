-- RLS Policies for app-de-corrida

-- Enable RLS on all tables containing sensitive data
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "athlete_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interview_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "athlete_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_checkins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pain_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "engine_decisions" ENABLE ROW LEVEL SECURITY;

-- Note: The current_user_id must be set by the application before querying, using set_config
-- Example in Hono API: await db.execute(sql`SET LOCAL app.current_user_id = ${userId}`);

-- 1. users
CREATE POLICY "Users can view and edit their own record"
ON "users" FOR ALL
USING (id = current_setting('app.current_user_id', true)::uuid);

-- 2. athlete_profiles
CREATE POLICY "Users can view and edit their own profile"
ON "athlete_profiles" FOR ALL
USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- (similar policies for the rest of the tables where user_id is the foreign key)
CREATE POLICY "Users can view and edit their own data" ON "sessions" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "interview_responses" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "athlete_plans" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "scheduled_workouts" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "workout_logs" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "daily_checkins" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "pain_reports" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY "Users can view and edit their own data" ON "engine_decisions" FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Public tables (read-only for all users, or specific roles if we have admin users)
-- workouts, plan_templates, references do not have RLS enabled as they are catalog data
