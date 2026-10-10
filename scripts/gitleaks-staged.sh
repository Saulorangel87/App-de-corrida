#!/usr/bin/env bash
# Pre-commit: barra segredos nos arquivos em stage. Usa o gitleaks instalado
# ou, sem ele, a imagem Docker oficial (mesma versão do CI).
set -euo pipefail
if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks protect --staged --redact --no-banner
fi
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  root=$(git rev-parse --show-toplevel)
  command -v cygpath >/dev/null 2>&1 && root=$(cygpath -w "$root")
  MSYS_NO_PATHCONV=1 exec docker run --rm -v "$root:/repo" -w /repo zricethezav/gitleaks:v8.24.3 \
    protect --staged --redact --no-banner
fi
echo "gitleaks indisponível: instale o gitleaks ou abra o Docker para commitar." >&2
exit 1
