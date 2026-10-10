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
- Testes de interface: `pnpm --filter @passo/web e2e` (build + preview + Chromium; 1ª vez: `pnpm --filter @passo/web exec playwright install chromium`)
- API em desenvolvimento: `cp apps/api/.env.example apps/api/.env` e `pnpm --filter @passo/api dev`
- Nova migração: editar `packages/db/src/schema.ts` e `pnpm --filter @passo/db db:generate` (SQL manual: `db:generate --custom`)
- Aplicar migrações / seed: `pnpm --filter @passo/db db:migrate` / `db:seed` (com `MIGRATION_DATABASE_URL` do `passo_migrator`)
- Texto do PAR-Q+: editar `docs/parq/parq-plus-pt-br.txt` e rodar `pnpm --filter @passo/shared parq:build` (o PDF oficial fica só local em `docs/parq/`, fora do Git)
- VPS (banco, papéis, backup): ver `ops/README.md`

## Estado atual
Fase atual: 6 (telas), em andamento: login e cadastro prontos (`apps/web/src/routes/login.tsx`, i18n pt/en, CSP, testes Playwright); painel é só um esqueleto. Fases 0 a 5 aprovadas pelo dono em 2026-10-10. Para continuar: ler `docs/fase-6-passagem.md` (ordem das telas, contrato da API, regras, deploy pendente).
- API nova (ADR 0006): `GET /day/:date` (decisão e sessões do dia), `GET /plan/week/:date`, `PUT /checkins/:date`, `POST /pain/:date`, `PUT /workouts/:id/log` (devolve a decisão do dia seguinte), `PUT /profile/pause`, `POST /profile/professional-clearance`, `GET /history`, `GET /account/export`.
- Semana do plano = janela de 7 dias desde `start_date` (`athlete_plan_weeks`); criada na primeira consulta; a anterior fecha (escada avança ou repete). `buildAthleteWeek` já nasce dentro dos tetos.
- Front: TanStack Router/Query, React Hook Form + Zod de `@passo/shared`, i18next, Tailwind (ADR 0007). Telas que faltam: verificação de e-mail, esqueci/redefinir senha, entrevista, resultado, painel, plano, treino, check-in, pós-treino, histórico, perfil. Cada uma: Figma, aprovação, código, teste Playwright.
- Testes: 345 no motor (inclui "seguir o plano à risca não gera ajuste" nos 13 modelos), 87 na API.
- Banco: migrações 0008 e 0009 (semanas do plano, sessões agendadas com estrutura, check-in com dor ao caminhar, dor com data e momento, `for_date` na auditoria).
- Fase 3: texto do PAR-Q+ transcrito e conferido; falta o dono ler uma vez contra o PDF.
- Pendente (dono): confirmar os itens dos ADRs 0004, 0005 e 0006 (ou manter os padrões); avisar a PAR-Q+ Collaboration (R-TRI-14, não bloqueia); revisar os textos `razao` do seed.
- Pendente (deploy): Dockerfile da API e rota no túnel; aplicar migrações 0008/0009 na VPS.
- Próxima: Fase 6 — telas (Figma primeiro, aprovar, implementar), na ordem de `docs/fase-6-passagem.md`.
