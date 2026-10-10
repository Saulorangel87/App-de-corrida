# App de corrida — treino de corrida personalizado

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
- Nome do app: **App de corrida** (decisão do dono, 2026-10-10). "Passo" ficou só em nomes internos (`@passo/*`, cookie `passo_session`, banco `passo`, papéis `passo_api`/`passo_migrator`, timer `passo-backup`), que o atleta não vê.
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
- Banco do App de corrida: container próprio chamado `app-de-corrida` (`postgres:17-alpine`), numa rede Docker `internal` (`app-de-corrida_data`), sem porta publicada. Segurança extra: Row-Level Security (RLS) habilitado nas tabelas do atleta.
- Backups: diários, rclone crypt (remote `corrida-run:` sobre `cadencia-oos:cadencia-backups/corrida-run`), timer do systemd; retenção de 30 dias por regra de ciclo de vida do bucket (a VPS não pode apagar objetos).
- Exposição da API: rota nova no túnel existente (container `cloudflared-tunnel`, ligado à rede `app-de-corrida_edge`). Nenhuma porta pública nova.

## Stack
pnpm monorepo · React + Vite + TypeScript · Hono (Node) em Docker na VPS · PostgreSQL da VPS + Drizzle · Resend (e-mails de auth) · Vitest + Playwright · Front no Cloudflare Pages

## Comandos
- Instalar: `pnpm install` (pnpm 9.15; instala o hook de pre-commit com gitleaks)
- Tudo antes de entregar: `pnpm verify` (lint, typecheck, testes, build)
- Testes da API precisam de um Postgres só de teste: `docker run -d --name passo-test-db -p 127.0.0.1:54329:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=passo_test postgres:17-alpine` e `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/passo_test`
- API em desenvolvimento: `cp apps/api/.env.example apps/api/.env` e `pnpm --filter @passo/api dev`
- Nova migração: editar `packages/db/src/schema.ts` e `pnpm --filter @passo/db db:generate` (SQL manual: `db:generate --custom`)
- Aplicar migrações / seed: `pnpm --filter @passo/db db:migrate` / `db:seed` (com `MIGRATION_DATABASE_URL` do `passo_migrator`)
- Texto do PAR-Q+: colar em `docs/parq/parq-plus-pt-br.txt` e rodar `pnpm --filter @passo/shared parq:build`
- VPS (banco, papéis, backup): ver `ops/README.md`

## Estado atual
Fase atual: 3 — Entrevista e perfil do atleta (backend) concluída em 2026-10-10, aguardando aprovação.
- Motor (`packages/engine`): CLS-v1 (classificação), TRI-v1 (triagem PAR-Q+), PLN-v1 (escolha do plano), com 56 testes, incluindo os 21 casos da pesquisa.
- API: `/api/v1/interview` (8 etapas, salvar e continuar, enviar) e `/api/v1/profile` (nível com explicação, triagem, plano, autodeclaração de avaliação). 57 testes de integração, com A-tenta-B.
- Banco: `health_screenings` com RLS; modelos de plano (13) no seed; migrações aplicadas na VPS.
- Decisões em `docs/adr/0003-entrevista-e-perfil.md`.
- Pendente (dono): colar o texto oficial do PAR-Q+ em `docs/parq/parq-plus-pt-br.txt` e rodar `pnpm --filter @passo/shared parq:build`; avisar a PAR-Q+ Collaboration do uso (R-TRI-14, não bloqueia); revisar os textos `razao` do seed.
- Pendente (deploy): Dockerfile da API e rota no túnel.
- Próxima: Fase 4 — motor de recomendação (semanas dos planos, decisão do dia).
