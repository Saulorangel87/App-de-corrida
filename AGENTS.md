# Let's Go Run — treino de corrida personalizado

Especificação completa: `docs/especificacao.md`. Leia antes de iniciar ou revisar qualquer fase.
Pesquisa científica: `docs/pesquisa/`. É a fonte da verdade para treinos, limites e classificação.
Design no Figma (só referência de estilo; não precisa mais ser atualizado): https://www.figma.com/design/5MXW1UlDcv8avuf144pVd0

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
- Nome do app: **Let's Go Run** (decisão do dono, 2026-10-10; antes "App de corrida"; é o mesmo nome do link `letsgorun`). "Passo" ficou só em nomes internos (`@passo/*`, cookie `passo_session`, banco `passo`, papéis `passo_api`/`passo_migrator`, timer `passo-backup`), que o atleta não vê.
- Fontes pagas: vale usar quando título, autores, ano, DOI e resumo foram confirmados; marcar "verificado pelo resumo". Preferir texto completo.
- Nível de evidência: hierarquia Oxford CEBM simplificada (meta-análise/revisão sistemática > ensaio clínico > coorte > consenso/posicionamento > opinião de especialista).
- Triagem: PAR-Q+ com o texto oficial em português e atribuição.
- Catálogo: o dono do projeto aprova na Fase 0; os seeds entram como `publicado`.
- Idade mínima: 18 anos.
- Telas novas: direto em código, na mesma linha visual das telas de acesso (decisão do dono, 2026-10-10: o Figma foi só um norte). O dono revisa rodando o app.
- Mobile: layout definido pelo agente, na mesma identidade visual.
- Textos do atleta (decisão do dono, 2026-10-11): linguagem simples, sem código de regra, sem `[P]`, sem sigla solta e sem inventar nada. O catálogo técnico (`workouts.structure`) fica para o motor e a auditoria; o atleta lê só `structure.atleta`, gerado no seed por `packages/db/src/seed-data/athlete-text.ts` (redação aprovada em `docs/textos-para-o-atleta.md`). Texto novo no catálogo sem redação aprovada falha nos testes da API. A mensagem do dia (`decision.message`) não leva colchetes; as fontes vão em `decision.sources`. **Inglês (2026-10-11):** o seed também grava `structure.atletaEn`, gerado de `athlete-text.en.ts` (uma tradução por frase final em português; frase nova sem tradução falha o seed e os testes); o motor devolve `message` e `messageEn`; a API entrega o idioma de `Accept-Language`, que o app manda com o idioma da tela (sem o cabeçalho, o da conta). PAR-Q+ fica em português (texto oficial).
- Figma: arquivo sem variáveis; tokens vêm da seção 9 da especificação. Frames: Painel `2:2`, Login `6:2`.
- Painel e menu lateral seguem o frame `2:2` (pedido do dono, 2026-10-11: "adapte ao nosso app"): menu lateral no desktop (cabeçalho no celular), cartões de resumo, treino de hoje escuro, volume semanal, plano da semana, objetivo e treinos recentes. Só entra o que o app tem de verdade; ficaram de fora busca, notificações, Comunidade, Pro, kcal, elevação, sequência/recorde, prova nomeada, locais das atividades, "Reagendar" e "Iniciar treino". A entrevista usa só o cabeçalho (`FlowLayout chrome="focus"`). No celular e no tablet (<1024 px) o cabeçalho tem um botão de menu (hambúrguer) que abre as mesmas áreas, o idioma e Sair. As páginas de Privacidade e Termos têm botão Voltar; a raiz `/` leva ao painel de quem entrou e ao login de quem não entrou.

- Repositório: https://github.com/Saulorangel87/App-de-corrida (remote `origin`, branch `main`). Push para `main` liberado após cada commit.
- Domínios: front `letsgorun.devsaulo.com.br`; API `letsgorun-api.devsaulo.com.br` (um nível só, coberto pelo SSL gratuito do Cloudflare; mesmo site do front para cookie `SameSite=Lax`).
- VPS (acesso: `ssh vps`): Ubuntu 24.04 **aarch64** (imagens Docker precisam ser arm64). Cada app tem seu próprio Postgres em container.
- Banco do Let's Go Run: container próprio chamado `app-de-corrida` (`postgres:17-alpine`), numa rede Docker `internal` (`app-de-corrida_data`), sem porta publicada. Segurança extra: Row-Level Security (RLS) habilitado nas tabelas do atleta.
- Backups: diários, rclone crypt (remote `corrida-run:` sobre `cadencia-oos:cadencia-backups/corrida-run`), timer do systemd; retenção de 30 dias por regra de ciclo de vida do bucket (a VPS não pode apagar objetos).
- Exposição da API: rota nova no túnel existente (container `cloudflared-tunnel`, ligado à rede `app-de-corrida_edge`). Nenhuma porta pública nova.

## Stack
pnpm monorepo · React + Vite + TypeScript · Hono (Node) em Docker na VPS · PostgreSQL da VPS + Drizzle · Resend (e-mails de auth) · Vitest + Playwright · Front no Cloudflare Pages

## Comandos
- Instalar: `pnpm install` (pnpm 9.15; instala o hook de pre-commit com gitleaks)
- Tudo antes de entregar: `pnpm verify` (lint, typecheck, testes, build)
- Conferir o projeto inteiro, por funcionalidade, em português: `pnpm check` (liga o banco de teste, roda lint, tipos, motor, API, telas e build, e escreve `reports/relatorio-testes.md`; `--rapido` pula telas e build; `--so=api,motor` escolhe partes). Funcionalidade ou tela nova: acrescentar o rótulo do arquivo de teste em `scripts/check.mjs` (sem rótulo ela aparece mesmo assim, marcada)
- Testes da API precisam de um Postgres só de teste: `docker run -d --name passo-test-db -p 127.0.0.1:54329:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=passo_test postgres:17-alpine` e `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/passo_test`
- Testes de interface: `pnpm --filter @passo/web e2e` (build + preview + Chromium; 1ª vez: `pnpm --filter @passo/web exec playwright install chromium`)
- API em desenvolvimento: `cp apps/api/.env.example apps/api/.env` e `pnpm --filter @passo/api dev`. Sem `RESEND_API_KEY`, os e-mails (confirmação, senha) não são enviados: o link aparece no console da API e em `apps/api/dev-emails.log` (fora do Git). Abra o front em `localhost:5173` ou `127.0.0.1:5173`: a API aceita os dois em desenvolvimento
- Nova migração: editar `packages/db/src/schema.ts` e `pnpm --filter @passo/db db:generate` (SQL manual: `db:generate --custom`)
- Aplicar migrações / seed: `pnpm --filter @passo/db db:migrate` / `db:seed` (com `MIGRATION_DATABASE_URL` do `passo_migrator`)
- Texto do PAR-Q+: editar `docs/parq/parq-plus-pt-br.txt` e rodar `pnpm --filter @passo/shared parq:build` (o PDF oficial fica só local em `docs/parq/`, fora do Git)
- VPS (banco, papéis, backup): ver `ops/README.md`

## Estado atual
Fase atual: 6 (telas), em andamento: telas de acesso prontas (`entrar`, `esqueci-a-senha`, `redefinir-senha`, `verificar-email` em `apps/web/src/routes/`; i18n pt/en, CSP, testes Playwright), entrevista em 8 etapas (`entrevista`, lógica em `apps/web/src/features/interview/`) resultado do perfil (`resultado`, com a autodeclaração de avaliação), painel (`painel`: treino de hoje, semana, objetivo) check-in diário (`checkin`) registro pós-treino com mapa do corpo (`registro.$id`) perfil/configurações (`configuracoes`: aparelhos, pausa e liberação, exportar e excluir dados) histórico (`historico`: aderência e carga por semana, sono, dor) detalhe do treino (`treino.$id`: razão, estrutura, intensidade, nível, limites, evidência e fontes) e plano completo (`plano`: semana a semana, com a atual aberta, as passadas recolhidas e as futuras só com o contorno). Fases 0 a 5 aprovadas pelo dono em 2026-10-10. Para continuar: ler `docs/fase-6-passagem.md` (ordem das telas, contrato da API, regras, deploy pendente).
- API nova (ADR 0006): `GET /day/:date` (decisão e sessões do dia), `GET /plan/week/:date`, `PUT /checkins/:date`, `POST /pain/:date`, `PUT /workouts/:id/log` (devolve a decisão do dia seguinte), `PUT /profile/pause`, `POST /profile/professional-clearance`, `GET /history`, `GET /workouts/:id` (detalhe do treino agendado), `POST /profile/screening/health-change` (R-TRI-11: "mudou algo na sua saúde?"; sim expira a triagem, não adia a pergunta em 7 dias; o perfil traz `screening.healthCheckDue`), `GET /plan/overview/:date` (plano completo: semanas criadas com sessões e o contorno do modelo para as que faltam, marcadas como previsão), `GET /account/export`.
- Semana do plano = janela de 7 dias desde `start_date` (`athlete_plan_weeks`); criada na primeira consulta; a anterior fecha (escada avança ou repete). `buildAthleteWeek` já nasce dentro dos tetos.
- Front: TanStack Router/Query, React Hook Form + Zod de `@passo/shared`, i18next, Tailwind (ADR 0007). Documentos legais: `/privacidade` e `/termos` (texto em `apps/web/src/lib/legal.ts` e tradução em `legal.en.ts`, aprovado em 2026-10-11; a versão em português é a que vale e a tradução avisa isso; `LEGAL_VERSION` tem que ser igual a `termsVersion` da API, um teste confere; quem mudar o tratamento de dados atualiza texto e versão no mesmo commit). Não faltam telas de atleta; resta a revisão final da Fase 6. A pergunta de saúde semanal (R-TRI-11) aparece no painel quando o servidor manda e fica sempre em Configurações (`components/health-change.tsx`). Cada uma: código na linha visual existente, teste Playwright, aprovação do dono.
- Testes: 364 no motor (inclui "seguir o plano à risca não gera ajuste" nos 13 modelos e o posicionamento na escada), 120 na API, 80 de interface (Playwright). "Como fazer" do detalhe do treino em linguagem simples (aprovado 2026-10-11): texto fixo por treino em `HOW_BY_SLUG`, e o da caminhada e corrida montado por sessão em `ladder-text.ts` com os números da escada.
- Posicionamento na escada (R-PLN-21, DEC-49, decisão do dono 2026-10-11): o plano com escada (5 km iniciante e saúde iniciante) não começa sempre na etapa 1; a entrada vem de "por quantos minutos você corre sem parar" (menos de 10 min: etapa 1; senão a etapa que cabe menos 1 de folga), limitada a 120% do volume semanal declarado; IMC ≥ 30, cautela de lesão e início do zero ficam na etapa 1. `athlete_plans.start_template_week` guarda a semana do modelo de entrada; `durationWeeks` (perfil e plano completo) é o que falta a partir dela; a tela de resultado mostra "Onde você começa". Código em `packages/engine/src/plan/placement.ts`.
- Avaliação a cada 2 semanas (R-PLN-22, DEC-50, decisão do dono 2026-10-11): `GET/PUT /plan/review/:date`; nos 3 últimos dias das semanas 2, 4, 6... o painel pergunta "como foi?" (fácil, no ponto, puxado, não consegui). "Puxado" e "não consegui" repetem a etapa na escada; "fácil" não muda o plano (o plano nunca passa do molde, R-PLN-18) e só mostra a sugestão de refazer a avaliação. Plano concluído: `profile.completedPlan` e cartão com o próximo objetivo. Tabela `plan_reviews` (RLS), componente `components/plan-review.tsx`. O texto de Privacidade ganhou a avaliação do bloco na lista de dados (a versão `2026-10-11` não mudou porque ninguém aceitou ainda; o dono relê antes de abrir).
- Banco: migrações 0008, 0009, 0010, 0011 (`start_template_week`) e 0012 (`plan_reviews`) (semanas do plano, sessões agendadas com estrutura, check-in com dor ao caminhar, dor com data e momento, `for_date` na auditoria; `health_confirmed_on` na triagem, para a pergunta semanal de saúde).
- Fase 3: texto do PAR-Q+ transcrito e conferido; falta o dono ler uma vez contra o PDF.
- Pendente (dono): ler os textos legais antes de abrir o app para outras pessoas e, idealmente, uma leitura rápida de um advogado (`docs/textos-legais.md`); confirmar a região da VPS e do bucket da Oracle (hoje o texto diz que provedores "podem tratar dados fora do Brasil").
- Pendente (dono): confirmar os itens dos ADRs 0004, 0005 e 0006 (ou manter os padrões); avisar a PAR-Q+ Collaboration (R-TRI-14, não bloqueia); revisar os textos `razao` do seed; conferir a tradução em inglês dos textos legais (cláusula "vale a versão em português").
- Pendente (deploy): Dockerfile da API e rota no túnel; aplicar migrações 0008 a 0012 na VPS.
- Próxima: Fase 6 — telas (direto em código, na linha visual das telas de acesso), na ordem de `docs/fase-6-passagem.md`.
