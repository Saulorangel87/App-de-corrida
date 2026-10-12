#!/usr/bin/env bash
# Rotação diária do log da API (systemd: ops/systemd/passo-api-logs-rotate.timer).
# Compacta o log do dia e apaga o que passou de KEEP_DAYS (30 por padrão).
# Sem logrotate de propósito: ele não está instalado na VPS e esta rotina não precisa de pacote.
#
# O seguidor (api-logs.sh) mantém o arquivo aberto em modo "append"; por isso copia e trunca
# (o mesmo que o copytruncate do logrotate). A última linha fica no arquivo para o seguidor,
# se reiniciar, saber de onde retomar.
set -euo pipefail

LOG="${API_LOG_FILE:-/var/log/passo-api/api.log}"
KEEP_DAYS="${API_LOG_KEEP_DAYS:-30}"
DIR="$(dirname "$LOG")"

if [ -s "$LOG" ]; then
  out="$LOG.$(date -u +%Y%m%dT%H%M%SZ).gz"
  last="$(tail -n 1 "$LOG")"
  gzip -c "$LOG" > "$out.tmp"
  mv "$out.tmp" "$out"
  printf '%s\n' "$last" > "$LOG"
  echo "Log rotacionado: $(basename "$out")"
fi

find "$DIR" -maxdepth 1 -name 'api.log.*.gz' -mtime +"$KEEP_DAYS" -print -delete
