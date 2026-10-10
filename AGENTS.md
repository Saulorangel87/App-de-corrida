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

## Pendências
- Link do repositório no GitHub (para remote, CI e Dependabot).
- Domínios do front e da API (CSP, CORS, remetente do Resend).
- Postgres da VPS: versão, se roda em Docker, e Cloudflare Tunnel ou proxy.

## Stack
pnpm monorepo · React + Vite + TypeScript · Hono (Node) em Docker na VPS · PostgreSQL da VPS + Drizzle · Resend (e-mails de auth) · Vitest + Playwright · Front no Cloudflare Pages

## Comandos
(preencher quando o projeto estiver configurado)

## Estado atual
Fase atual: 0 — Pesquisa científica (ainda não iniciada)
