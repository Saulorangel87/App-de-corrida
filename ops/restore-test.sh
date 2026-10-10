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
until docker exec passo-restore-test pg_isready -U postgres -q; do sleep 1; done

rclone cat "${REMOTE}${LATEST}" | docker exec -i passo-restore-test pg_restore -U postgres -d restore --no-owner
docker exec passo-restore-test psql -U postgres -d restore -tAc \
  "select 'tabelas: ' || count(*) from information_schema.tables where table_schema = 'public'"
echo "Restauração OK: ${LATEST}"
