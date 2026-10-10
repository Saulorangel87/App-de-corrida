#!/usr/bin/env bash
# Cria/atualiza os papéis do banco a partir do .env (rodar na VPS, uma vez e
# a cada troca de senha):
#   passo_migrator  dono do schema; usado só por migrações e seed
#   passo_api       só SELECT/INSERT/UPDATE/DELETE (concedidos pela migração 0001)
# Nenhum dos dois é superusuário nem ignora RLS.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
: "${MIGRATOR_DB_PASSWORD:?defina no .env}" "${PASSO_API_DB_PASSWORD:?defina no .env}"

docker exec -i app-de-corrida psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v POSTGRES_DB="$POSTGRES_DB" -v migrator_pw="$MIGRATOR_DB_PASSWORD" -v api_pw="$PASSO_API_DB_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE passo_migrator LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_migrator') \gexec
SELECT 'CREATE ROLE passo_api LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passo_api') \gexec
ALTER ROLE passo_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'migrator_pw';
ALTER ROLE passo_api WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'api_pw';
REVOKE ALL ON DATABASE :"POSTGRES_DB" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"POSTGRES_DB" TO passo_migrator, passo_api;
GRANT CREATE ON DATABASE :"POSTGRES_DB" TO passo_migrator;  -- schema "drizzle" das migrações
ALTER SCHEMA public OWNER TO passo_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL
echo "Papéis atualizados."
