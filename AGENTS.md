# Passo — app de treino de corrida

Especificação completa: `docs/especificacao.md`. Leia antes de iniciar ou revisar qualquer fase.
Pesquisa científica: `docs/pesquisa/`. É a fonte da verdade para treinos, limites e classificação.
Design no Figma: https://www.figma.com/design/5MXW1UlDcv8avuf144pVd0

## Regras inegociáveis
- Nunca inventar treino, limite ou critério: tudo vem de `docs/pesquisa/` com referência verificada (abrir a fonte, nunca citar de memória).
- Nenhuma IA gera treino em produção: só o motor de regras (`packages/engine`) usando o catálogo do banco.
- Dor e sono ruim reduzem ou bloqueiam carga; o app não faz diagnóstico e orienta procurar um profissional.
- Dados de saúde são sensíveis (LGPD): consentimento explícito, exportação e exclusão de dados.
- Segurança não é opcional (detalhes na seção 10 da especificação):
  - Cada atleta só acessa os próprios dados: dono sempre vindo da sessão no servidor, recurso de outro usuário retorna 404, com teste A-tenta-acessar-B em toda rota.
  - Login e cadastro nunca revelam se um e-mail existe; sessões expiram por inatividade e de forma absoluta; bloqueio temporário após falhas de login.
  - Postgres com usuário restrito para a API, sem exposição pública, backups criptografados.
  - CSP restritiva e headers de segurança no front e na API.
- Segredos só em variáveis de ambiente; nunca no código. `.env` no `.gitignore`; gitleaks, `pnpm audit` e Dependabot no CI.
- Parar e pedir aprovação ao fim de cada fase.

## Decisões tomadas
- Fontes pagas: vale usar quando título, autores, ano, DOI e resumo foram confirmados; marcar "verificado pelo resumo". Preferir texto completo.
- Nível de evidência: hierarquia Oxford CEBM simplificada (meta-análise/revisão sistemática > ensaio clínico > coorte > consenso/posicionamento > opinião de especialista).
- Triagem: PAR-Q+ com o texto oficial em português e atribuição.
- Catálogo: o dono do projeto aprova na Fase 0; os seeds entram como `publicado`.
- Idade mínima: 18 anos.
- Telas novas: desenhar primeiro no Figma (via MCP), aprovar, depois implementar.
- Mobile: layout definido pelo agente, na mesma identidade visual (o Figma só tem desktop).
- Figma: arquivo sem variáveis; tokens vêm da seção 9 da especificação. Frames: Painel `2:2`, Login `6:2`.

- Repositório: https://github.com/Saulorangel87/App-de-corrida (remote `origin`, branch `main`). Push para `main` liberado após cada commit.
- Domínios: front `letsgorun.devsaulo.com.br`; API `letsgorun-api.devsaulo.com.br` (um nível só, coberto pelo SSL gratuito do Cloudflare; mesmo site do front para cookie `SameSite=Lax`).
- VPS (acesso: `ssh vps`): Ubuntu 24.04 **aarch64** (imagens Docker precisam ser arm64). Cada app tem seu próprio Postgres em container.
- Banco do Passo: container próprio chamado `app-de-corrida` (`postgres:17-alpine`), numa rede Docker interna (`app-de-corrida_data`), sem porta publicada. Segurança extra: Row-Level Security (RLS) habilitado nas tabelas do atleta.
- Backups: retenção de 30 dias, enviados para o Oracle Object Storage usando rclone crypt, gerenciados por timer do systemd.
- Exposição da API: rota nova no túnel existente (container `cloudflared-tunnel`, ligado à rede `app-de-corrida_edge`). Nenhuma porta pública nova.

## Stack
pnpm monorepo · React + Vite + TypeScript · Hono (Node) em Docker na VPS · PostgreSQL da VPS + Drizzle · Resend (e-mails de auth) · Vitest + Playwright · Front no Cloudflare Pages

## Comandos
- Instalar dependências: `pnpm install` (versão 9 requerida)
- Gerar migrações Drizzle: `pnpm --filter @passo/db db:generate`
- Subir banco na VPS (interno): `cd ~/apps/app-de-corrida && docker compose up -d`

## Estado atual
Fase atual: Fase 1 CONCLUÍDA.
- Monorepo `pnpm` criado (apps web e api; pacotes db, engine e shared).
- Configurações base de TypeScript, Vite e ESLint aplicadas.
- Drizzle ORM modelado em `packages/db/src/schema.ts` refletindo fielmente a Fase 0 (incluindo segurança com RLS, campos de dor avançados e UUIDs para usuários).
- Migrations geradas e aplicadas no container PostgreSQL recém-criado na VPS, dentro de `~/apps/app-de-corrida/`.
- Regras de Row-Level Security (RLS) devidamente aplicadas no banco da VPS.
- Script de seeds base populado e pronto (`packages/db/src/seed.ts`).
- Backup draft salvo em `ops/backup.sh`.

Próximo passo (aguardando liberação): Iniciar a **Fase 2 — Autenticação (e-mail e senha + Resend)**, que focará na API (Hono) para lidar com registro e login seguros.
