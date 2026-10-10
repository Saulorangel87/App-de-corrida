-- init.sql
-- Runs on initialization of the postgres container

-- 1. Create a restricted user for the API
CREATE USER passo_api WITH PASSWORD 'api_password_to_be_replaced';

-- 2. Create the application schema (public is default, but we can restrict it)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO passo_api;

-- 3. The API user will be granted SELECT, INSERT, UPDATE, DELETE on tables 
-- via Drizzle migrations or here as default privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO passo_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO passo_api;

-- Note: Drizzle migrations should be run using a more privileged user or the owner.
