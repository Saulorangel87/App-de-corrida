#!/usr/bin/env bash
# Backup diário do banco do Let's Go Run (systemd: ops/systemd/passo-backup.timer).
# O dump é enviado para o Oracle Object Storage por um remote "crypt" do
# rclone: o conteúdo e os nomes saem da VPS já criptografados.
# Retenção de 30 dias: regra de ciclo de vida do bucket no Oracle (prefixo
# corrida-run/). A VPS não tem permissão de apagar objetos, de propósito:
# quem invadir a VPS não consegue destruir os backups. Nada fica em disco local.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
REMOTE="${BACKUP_RCLONE_REMOTE:?defina no .env (ex.: corrida-run:)}"
NAME="passo_$(date -u +%Y%m%dT%H%M%SZ).dump"

# Formato custom (-Fc): compactado e restaurável com pg_restore.
docker exec app-de-corrida pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  | rclone rcat "${REMOTE}${NAME}"

echo "Backup enviado: ${NAME}"
