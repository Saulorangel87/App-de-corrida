#!/usr/bin/env bash
# Segue os logs da API e os grava em arquivo, para sobreviverem à recriação do container
# (cada deploy recria o container e o Docker apaga o log dele).
# systemd: ops/systemd/passo-api-logs.service. Rotação: ops/logrotate-passo-api (30 dias).
#
# Os logs da API são JSON, uma linha por evento, sem dados pessoais (teste na API garante).
# Ao reiniciar (deploy, queda), retoma do último "ts" gravado: no máximo uma linha repete.
set -euo pipefail

CONTAINER="${API_CONTAINER:-app-de-corrida-api}"
LOG="${API_LOG_FILE:-/var/log/passo-api/api.log}"

# Durante o deploy o container some por alguns segundos; espera ele voltar.
until docker inspect "$CONTAINER" >/dev/null 2>&1; do sleep 2; done

since=""
if [ -s "$LOG" ]; then
  since=$(grep -a '"ts":"' "$LOG" | tail -n 1 | sed -n 's/.*"ts":"\([^"]*\)".*/\1/p' || true)
fi

exec docker logs --follow --since "${since:-0s}" "$CONTAINER" >> "$LOG" 2>&1
