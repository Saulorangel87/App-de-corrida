#!/usr/bin/env bash
# Teste de restauração: baixa o backup mais recente e restaura num Postgres
# descartável, sem tocar no banco real. Rodar ao menos 1x por mês.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
REMOTE="${BACKUP_RCLONE_REMOTE:?defina no .env}"
LATEST=$(rclone lsf "$REMOTE" --files-only | sort | tail -1)
[ -n "$LATEST" ] || { echo "Nenhum backup encontrado"; exit 1; }

docker run -d --rm --name passo-restore-test --network none \
  -e POSTGRES_PASSWORD=restore -e POSTGRES_DB=restore postgres:17-alpine >/dev/null
trap 'docker stop passo-restore-test >/dev/null' EXIT
# Por TCP: o servidor temporário da inicialização só escuta no socket.
until docker exec passo-restore-test pg_isready -h 127.0.0.1 -U postgres -q; do sleep 1; done

# Papéis sem login, só para o restore manter donos e permissões como na produção.
docker exec passo-restore-test psql -q -U postgres -d restore \
  -c "create role passo_migrator nologin" -c "create role passo_api nologin"
rclone cat "${REMOTE}${LATEST}" | docker exec -i passo-restore-test pg_restore -U postgres -d restore --exit-on-error
docker exec passo-restore-test psql -U postgres -d restore -tA \
  -c "select 'tabelas: ' || count(*) || ', com RLS: ' || count(*) filter (where rowsecurity) from pg_tables where schemaname = 'public'" \
  -c "select 'treinos: ' || count(*) from workouts" \
  -c "select 'usuarios: ' || count(*) from users"
echo "Restauração OK: ${LATEST}"
