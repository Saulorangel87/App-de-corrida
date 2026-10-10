#!/usr/bin/env bash
# Backup diário do banco do Passo (systemd: ops/systemd/passo-backup.timer).
# O dump é enviado para o Oracle Object Storage por um remote "crypt" do
# rclone: o conteúdo e os nomes saem da VPS já criptografados.
# Retenção: 30 dias no remoto. Nada fica guardado em disco local.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
REMOTE="${BACKUP_RCLONE_REMOTE:?defina no .env (ex.: passo-crypt:)}"
NAME="passo_$(date -u +%Y%m%dT%H%M%SZ).dump"

# Formato custom (-Fc): compactado e restaurável com pg_restore.
docker exec app-de-corrida pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  | rclone rcat "${REMOTE}${NAME}"

rclone delete "$REMOTE" --min-age 30d
echo "Backup enviado: ${NAME}"
