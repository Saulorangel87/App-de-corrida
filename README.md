# Let's Go Run

**Treino de corrida personalizado, seguro e explicável.** Uma entrevista com triagem de saúde (PAR-Q+) leva a um plano montado por **regras baseadas em pesquisa científica**, ajustado dia a dia pelo sono, pela dor e pelo cansaço de cada pessoa. **Nenhuma IA gera treino.**

[![CI](https://github.com/Saulorangel87/App-de-corrida/actions/workflows/ci.yml/badge.svg)](https://github.com/Saulorangel87/App-de-corrida/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/c%C3%B3digo-MIT-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Testes](https://img.shields.io/badge/testes-626%20passando-brightgreen)

**App no ar:** <https://letsgorun.devsaulo.com.br> · **Português e inglês**

> **Projeto pessoal, gratuito e sem fins lucrativos.** Não é dispositivo médico e não substitui a orientação de um profissional de saúde ou de educação física. O app não faz diagnóstico.

---

## Por que existe

Aplicativos de corrida costumam prometer um plano "inteligente" sem mostrar de onde vêm os números. Este projeto parte do contrário: **cada treino, limite e critério tem origem rastreável em uma fonte científica** (`docs/pesquisa/`), e o motor que decide o treino do dia é um conjunto de regras determinísticas, testáveis e auditáveis. Quando a evidência é fraca, o texto diz "sem evidência suficiente" e o valor adotado é conservador.

## Princípios

- **Sem IA gerando treino.** Só o motor de regras (`packages/engine`) escolhe sessões, usando o catálogo do banco.
- **Segurança antes de desempenho.** Dor e sono ruim reduzem ou bloqueiam a carga; o plano nunca passa do que o modelo permite. O app orienta procurar um profissional.
- **Nada inventado.** Todo número vem de `docs/pesquisa/` com referência aberta e conferida: 156 regras rastreáveis (`R-XXX-NN`) e 50 decisões registradas.
- **Dados de saúde são sensíveis (LGPD).** Consentimento explícito, exportação completa e exclusão real da conta.
- **Cada pessoa só vê os próprios dados.** Garantido na aplicação *e* no banco (Row-Level Security).

## Funcionalidades

| Área | O que faz |
|---|---|
| **Entrevista** | 8 etapas, salva a cada passo e retoma de onde parou; triagem **PAR-Q+** oficial (português do Brasil ou original em inglês) e regra do ACSM |
| **Nível** | Classifica iniciante, intermediário ou avançado com explicação em linguagem simples e fontes |
| **Plano** | 13 modelos (5 km, 10 km, 21 km, 42 km e saúde). Quem já corre não começa do zero: a entrada na escada de caminhada e corrida vem do que a pessoa declara, nunca pulando etapas |
| **Dia a dia** | Check-in de sono, cansaço e dor; o motor decide manter, reduzir, fazer regenerativo, descansar ou interromper e encaminhar a um profissional, e mostra o porquê com as fontes |
| **Treino** | Detalhe de cada sessão, como fazer, zonas de esforço e glossário, sem termos técnicos soltos |
| **Acompanhamento** | Registro do treino (duração, esforço, dor com mapa do corpo), histórico e plano completo |
| **Avaliação do bloco** | A cada 2 semanas pergunta "como foi?"; o plano repete a etapa se foi puxado e só *sugere* reavaliar se foi fácil |
| **Conta** | Perfil com foto, troca de e-mail com confirmação, dispositivos, pausa, exportar e excluir dados |
| **Acessibilidade** | Lighthouse 100; português e inglês; layout de celular e de computador |

## Como funciona

```mermaid
flowchart LR
  U[Navegador<br/>React + Vite] -->|HTTPS| P[Cloudflare Pages<br/>front estático + CSP]
  U -->|API JSON<br/>cookie de sessão| T[Cloudflare Tunnel]
  T --> A[API Hono<br/>Node, container arm64]
  A --> E[(packages/engine<br/>regras puras)]
  A --> D[(PostgreSQL 17<br/>Row-Level Security)]
  A -->|e-mails de conta| R[Resend]
  D -.->|dump criptografado<br/>diário| B[(Backup externo)]
```

O **motor** (`packages/engine`) é TypeScript puro, sem I/O: recebe perfil, plano e check-in e devolve uma decisão com a regra aplicada e as fontes. Por isso é testado com 365 casos, incluindo uma verificação de coerência: seguir o plano à risca nunca gera ajuste em nenhum dos 13 modelos.

## Stack

| Camada | Tecnologia |
|---|---|
| Front | React 19, Vite, TypeScript, TanStack Router e Query, React Hook Form + Zod, i18next, Tailwind CSS 4 |
| API | Hono (Node), Zod, argon2id, Resend |
| Banco | PostgreSQL 17, Drizzle ORM, migrações versionadas, RLS em 13 tabelas |
| Motor | TypeScript puro (pacote `@passo/engine`) |
| Testes | Vitest (motor e API) e Playwright (telas) |
| Entrega | pnpm monorepo, GitHub Actions, Docker (arm64), Cloudflare Pages e Tunnel |

## Segurança e privacidade

Há uma auditoria documentada em [`docs/auditoria-seguranca.md`](docs/auditoria-seguranca.md). Em resumo:

- **Autorização:** o dono do recurso vem sempre da sessão no servidor; recurso de outra pessoa devolve 404, com teste "A tenta acessar B" em toda rota. O papel do banco usado pela API não é superusuário nem ignora RLS.
- **Autenticação:** senha com argon2id; login e cadastro não revelam se um e-mail existe; sessões expiram por inatividade e de forma absoluta; bloqueio temporário após falhas; token de e-mail com 256 bits, guardado só como HMAC e de uso único.
- **Navegador:** CSP restritiva (sem script nem estilo inline), HSTS, `nosniff`, `frame-ancestors 'none'`; cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Cadeia de suprimentos:** gitleaks no pre-commit e no CI, `pnpm audit` e Dependabot, ações do GitHub fixadas por SHA.
- **Logs sem dados pessoais:** erros do banco entram só com tipo e código.
- **Infraestrutura:** banco sem porta pública, container da API sem root, sistema de arquivos somente leitura e sem capacidades, backups criptografados com retenção de 30 dias.

## Qualidade

| Verificação | Resultado |
|---|---|
| Motor (Vitest) | 365 testes |
| API (Vitest, banco real) | 163 testes |
| Telas (Playwright) | 98 testes |
| Lighthouse (celular) | desempenho 96, acessibilidade 100, SEO 100, práticas recomendadas 92 |
| Conferência por funcionalidade | `pnpm check` gera `reports/relatorio-testes.md` em português |

## Estrutura

```
apps/
  web/            front (React) e testes de tela
  api/            API Hono, serviços, repositórios e testes
packages/
  engine/         motor de regras (classificação, triagem, plano, decisão do dia)
  db/             esquema Drizzle, migrações e catálogo (seed)
  shared/         esquemas Zod, estrutura e texto do PAR-Q+
docs/
  especificacao.md      o que construir, fase a fase
  pesquisa/             fonte da verdade científica (regras R-XXX-NN, decisões DEC-NN)
  adr/                  decisões de arquitetura
  auditoria-seguranca.md
ops/              backup, restauração e papéis do banco
```

## Rodando localmente

Requisitos: Node 22 ou superior, pnpm 9.15 e Docker (para o Postgres de teste).

```bash
pnpm install              # também instala o hook de pre-commit com gitleaks
pnpm verify               # lint, tipos, testes e build
pnpm check                # tudo por funcionalidade, com relatório em português
```

Os testes da API precisam de um Postgres só de teste:

```bash
docker run -d --name passo-test-db -p 127.0.0.1:54329:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=passo_test postgres:17-alpine
export TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/passo_test
```

Testes de tela: `pnpm --filter @passo/web e2e` (na primeira vez, `pnpm --filter @passo/web exec playwright install chromium`). Para rodar a API e o front em desenvolvimento, veja `apps/api/.env.example` e a seção "Comandos" do [`AGENTS.md`](AGENTS.md). Sem chave do Resend, os e-mails aparecem no console da API.

## Documentação

- [`docs/especificacao.md`](docs/especificacao.md): especificação completa e fases
- [`docs/pesquisa/`](docs/pesquisa/): a pesquisa científica, com o índice em `README.md`
- [`docs/adr/`](docs/adr/): decisões de arquitetura (sessões, RLS, entrevista, decisão do dia, stack, perfil, posicionamento)
- [`docs/auditoria-seguranca.md`](docs/auditoria-seguranca.md): achados corrigidos e lista de verificação do deploy
- [`ops/README.md`](ops/README.md): operação, backup e restauração

## Estado e próximos passos

As fases 0 a 6 (pesquisa, banco, autenticação, entrevista, motor, acompanhamento e telas) estão implementadas e em produção. Ficaram de fora do MVP, por decisão: integração com Strava, Garmin e arquivos FIT/GPX, notificações e lembretes, PWA offline, painel administrativo do catálogo, plano pago e calendário de provas.

## In English

Let's Go Run is a personal, free web app that builds running plans from a health screening (PAR-Q+) and a **rules engine grounded in published research**, then adjusts each day from sleep, pain and fatigue check-ins. No AI generates workouts. Every limit and rule traces back to a source in `docs/pesquisa/`. The stack is a TypeScript pnpm monorepo: React + Vite, Hono, PostgreSQL with Row-Level Security, a pure-TypeScript engine, and 626 automated tests. The interface is available in Portuguese and English; the PAR-Q+ appears in its original English text on the English screens, unaltered. This is not a medical device and does not replace professional advice.

## Licença e créditos

- **Código:** [MIT](LICENSE). O que **não** é coberto (texto do PAR-Q+, documentação, textos do app e imagens) está em [`NOTICE.md`](NOTICE.md).
- **PAR-Q+:** © PAR-Q+ Collaboration. Português do Brasil: tradução de Bianca Bold e Juliano Schwartz (Schwartz et al., 2021). Texto sem alteração, com atribuição, usado em aplicativo gratuito e sem fins lucrativos. Mais em <https://eparmedx.com>.
- **Autor:** Saulo Rangel.
