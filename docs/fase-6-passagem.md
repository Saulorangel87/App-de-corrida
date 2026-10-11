# Fase 6 — Telas: passagem de contexto

Estado em 2026-10-11: Fases 0 a 5 aprovadas pelo dono; as telas da Fase 6 estão todas em código e passaram por auditoria de segurança (`docs/auditoria-seguranca.md`); faltam a revisão final do dono e o deploy. Quem continuar (Claude, agy ou outro agente) deve ler, nesta ordem: `AGENTS.md`, `docs/especificacao.md` (seções 9 e 10), `docs/adr/0006-acompanhamento-diario.md` e este arquivo.

## Regras que valem para toda tela
1. **Figma é só referência de estilo (decisão do dono, 2026-10-10).** Não é mais necessário desenhar nem manter o Figma em dia: as telas novas são feitas direto em código, na mesma linha visual das telas de acesso já implementadas (`apps/web/src/components/auth-*.tsx`, tokens da seção 9 da especificação). Arquivo de referência: https://www.figma.com/design/5MXW1UlDcv8avuf144pVd0 (frames: Painel `2:2`, Login `6:2`). O dono revisa o resultado rodando o app; ajustes pedidos por ele valem mais que o desenho.
2. **Mobile:** o layout mobile é definido pelo agente, na mesma identidade visual.
3. **Idiomas:** pt-BR e en. As mensagens do motor vêm em português com códigos de motivo estáveis (`decision.reasons[].code`); o front traduz pelos códigos.
4. **Requisitos:** responsiva (mobile first), WCAG AA, teclado, labels, estados de carregamento/vazio/erro. Fonte Inter; ícones `lucide-react`; sem imagens do Figma por link (salvar em `apps/web/src/assets/`).
5. **Segurança do front:** sessão por cookie (`__Host-passo_session` em produção), sem token em `localStorage`; requisições com `credentials: "include"` para `/api/v1`; CSP restritiva; nada de segredo no bundle. E-mail e senha nunca em URL. Token de e-mail vem no fragmento `#token=`.
6. **Nunca** o front calcula treino, limite ou classificação: só exibe o que a API devolve.

## Ordem sugerida das telas (fluxo do atleta)
1. Cadastro (com "tenho 18 anos ou mais" e consentimento de dados de saúde), verificação de e-mail, login (já desenhado), esqueci/redefinir senha.
2. Entrevista em 8 etapas (salva e continua depois; a etapa de triagem usa o texto oficial do PAR-Q+ de `@passo/shared`, com atribuição).
3. Resultado do perfil: nível, explicação, triagem (liberado, avaliação necessária etc.) e plano escolhido.
4. Painel (já desenhado): treino de hoje, semana, volume, próxima prova.
5. Plano completo (calendário) e detalhe do treino (estrutura, intensidade, motivo, fontes).
6. Check-in diário (< 30 s) e registro pós-treino com mapa de dor clicável.
7. Histórico e estatísticas (sono, carga semanal, dor, aderência).
8. Perfil e configurações (exportar e excluir meus dados, declarar pausa e liberação profissional, reavaliação).

## Telas de autenticação desenhadas no Figma (aguardam aprovação do dono)
Página "Telas", à direita do login. **Aprovadas pelo dono em 2026-10-10 e implementadas** (rotas `/esqueci-a-senha`, `/redefinir-senha`, `/verificar-email`, as mesmas que os e-mails da API já usam; o login passou a `/entrar` e o painel a `/painel`).

| Tela | Estado | Nó |
|---|---|---|
| Esqueci a senha | formulário | `24:26` |
| Esqueci a senha | e-mail enviado (mesma mensagem exista ou não a conta) | `24:176` |
| Redefinir senha | formulário (nova senha + confirmação) | `24:325` |
| Redefinir senha | link inválido ou expirado | `24:477` |
| Redefinir senha | senha alterada | `24:623` |
| Confirmar e-mail | confirmado | `24:767` |
| Confirmar e-mail | link inválido, com reenvio por e-mail | `24:911` |

Pendências do arquivo do Figma: **encerradas por decisão do dono** (o Figma serviu de norte; não será mais editado). O código já está sem o cartão "4,8 ★", sem "Pro" e sem números inventados (painel visual mostra só "5k → 42k"). Os cinco estados com ícone (e-mail enviado, link inválido, senha alterada, e-mail confirmado, falha de confirmação) foram conferidos em captura do código, em desktop e mobile.

## Telas já implementadas (`apps/web/src/routes/`)
| Rota | O que faz | Testes |
|---|---|---|
| `/entrar`, `/esqueci-a-senha`, `/redefinir-senha`, `/verificar-email` | acesso e recuperação de conta | `e2e/acesso.spec.ts`, `e2e/recuperar-conta.spec.ts` |
| `/entrevista` | 8 etapas, salva cada uma (`PUT /interview/:step`), retoma de onde parou, envia (`POST /interview/submit`); triagem PAR-Q+ com o texto oficial inteiro; menor de 18 mostra aviso e exclusão da conta | `e2e/entrevista.spec.ts` |
| `/resultado` | nível e explicação, triagem (texto oficial do PAR-Q+ conforme o estado), autodeclaração de avaliação (R-TRI-05), plano atribuído | `e2e/entrevista.spec.ts` |
| `/painel` | segue o frame `2:2` do Figma, adaptado: menu lateral (desktop) ou cabeçalho (celular); saudação com semana e objetivo; cartões de resumo da semana (distância, tempo em treino, ritmo médio e sono médio, só do que o atleta registrou); treino de hoje (decisão do motor, motivo e fontes, etapa da escada); volume semanal por dia (feito x planejado); plano da semana; objetivo e progresso do plano; treinos recentes; pergunta de saúde e check-in; sem perfil (404) leva à entrevista; sem plano mostra o motivo, ou o cartão "plano concluído" com o próximo objetivo; avaliação "Como foi?" a cada 2 semanas e a sugestão de reavaliar quando foi fácil (R-PLN-22) | `e2e/painel.spec.ts` |
| `/checkin` | check-in do dia (< 30 s, tudo opcional); pergunta a dor ao caminhar só quando o motor pede (`questions`); grava com `PUT /checkins/:date` e volta ao painel com o dia recalculado | `e2e/painel.spec.ts` |
| `/registro/$id` | pós-treino: fez ou não, duração, distância, esforço CR-10 (1 a 10; rótulos de R-CRG-01), mapa do corpo clicável (frente/costas, lado direito/esquerdo), por local: intensidade, tipo e perguntas de R-DOR-15, sintomas cardiopulmonares e de calor, comentário; grava com `PUT /workouts/:id/log` e mostra a decisão do dia seguinte | `e2e/registro.spec.ts` |
| `/configuracoes` | perfil (foto reduzida no aparelho e enviada como JPEG, nome editável, troca de e-mail com senha e link no endereço novo), idioma, aparelhos conectados (encerrar sessão), triagem e reavaliação, pausa por dor/lesão/doença e registro da liberação profissional (R-PRG-09), refazer a entrevista, baixar meus dados (JSON) e excluir a conta com senha | `e2e/configuracoes.spec.ts` |
| `/historico` | resumo do período (treinos feitos, minutos, sono médio), colunas de treinos feitos e de carga semanal (sRPE × minutos), sono por dia, dor registrada (sem o registro "geral"); período de 4, 8 ou 12 semanas; leitura por coluna e tabela equivalente | `e2e/historico.spec.ts` |
| `/treino/$id` | detalhe do treino agendado: escada da sessão, razão, aquecimento/principal/volta à calma, intensidade, parâmetros do nível do atleta, frequência, limites, progressão/regressão, evidência (com valores provisórios [P] à parte) e fontes com link do DOI; decisão do dia só para hoje | `e2e/treino.spec.ts` |
| `/painel` e `/configuracoes` (pergunta de saúde) | "Mudou algo na sua saúde?" (R-TRI-11): aparece no painel só quando o servidor manda (`screening.healthCheckDue`, a cada 7 dias) e fica sempre em Configurações enquanto houver liberação; "não" grava a data e adia 7 dias, "sim" pede confirmação, expira a triagem e leva ao resultado para refazer o PAR-Q+ | `e2e/saude.spec.ts` |
| `/confirmar-novo-email` | abre o link enviado ao endereço novo (`#token=`), confirma uma vez (`POST /auth/email-change/confirm`), mostra o resultado e leva ao login; link inválido ou expirado mostra o aviso | `e2e/configuracoes.spec.ts` |
| `/privacidade`, `/termos` | Política de Privacidade e Termos de Uso, públicos (sem login e sem chamar a API): índice, data e versão, link para o outro documento; no idioma da tela (português ou inglês), com aviso de que vale o português; os aceites do cadastro ligam aos dois (outra aba) | `e2e/legal.spec.ts` |
| `/plano` | plano completo: resumo (semana atual, treinos feitos até hoje, término), semana a semana; semana atual aberta, passadas recolhidas com o que foi feito, futuras só com o contorno do modelo (fase, recuperação, polimento, prova, etapa da escada) marcadas como previsão e sem treinos inventados; cada treino leva a `/treino/$id`; atalho no painel e no cabeçalho | `e2e/plano.spec.ts` |

O mapa do corpo usa os ids de `BODY_REGIONS` (`packages/shared/src/body-map.ts`); o servidor marca `highRiskBoneSite` pela região (R-DOR-03), não confia no cliente. Datas: o cliente sempre manda a data local do atleta (`localToday()`); pausa e liberação usam esse calendário, o servidor aceita hoje ±1 dia (fuso). Padrões para as próximas telas: moldura `FlowLayout` (cabeçalho com idioma e sair); campos de escolha em `components/choice.tsx`; formulário por etapa com `stepResolver` (valida com o esquema compartilhado e mapeia o erro para o campo; o texto vem do i18n); `useRequireUser()` redireciona sem sessão; nada de `style=""` inline (a CSP bloqueia).

Pendências conhecidas desta parte: o texto do PAR-Q+ fica só em português (é a tradução oficial; no app em inglês há um aviso). A mensagem do motor, o treino e os documentos legais saem no idioma da tela (cabeçalho `Accept-Language`).

## Contrato da API (prefixo `/api/v1`, tudo com sessão; erros `{error:{code,message,details?}}`)
| Rota | Uso |
|---|---|
| `POST /auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`, `DELETE /auth/account` | conta (ver `packages/shared/src/auth.ts`) |
| `GET /interview`, `PUT /interview/:step`, `POST /interview/submit` | entrevista (`packages/shared/src/interview.ts`; `GET` inclui `parq` com o texto) |
| `GET /profile`, `POST /profile/screening/evaluation`, `POST /profile/screening/professional-consulted` | perfil e triagem |
| `GET /day/:date` | sessões do dia, `decision`, `checkin` e `questions` |
| `GET /plan/week/:date` | semana do plano que contém a data |
| `PUT /checkins/:date` | check-in (substitui); devolve o dia recalculado |
| `POST /pain/:date` | dor ou sintoma avulso |
| `PUT /workouts/:id/log` | pós-treino; devolve `day` e `nextDay` (decisão do dia seguinte) |
| `PUT /profile/pause`, `POST /profile/professional-clearance` | pausa e liberação profissional |
| `GET /history?days=7..180` | sono, dor, carga semanal, aderência |
| `POST /profile/screening/health-change` | corpo `{ changed, date }`; sim → triagem `EXPIRADO` (`saude_mudou`), o dia do motor trava e o atleta refaz a entrevista; não → só registra a resposta |
| `GET /plan/overview/:date` | plano inteiro: `plan` (modelo, objetivo, nível, datas), `currentWeek` e `weeks[]` (`state` past/current/upcoming, `projected`, `sessions`); semanas futuras vêm sem sessões porque dependem do que o atleta fizer; na escada, etapa repetida desloca a previsão |
| `GET /workouts/:id` | detalhe do treino agendado do próprio atleta: sessão, registro, recorte do catálogo (razão, intensidade, blocos, nível, limites, evidência) e referências; de outro atleta: 404 |
| `GET /account/export` | exportação LGPD (JSON, inclui a foto em base64) |
| `PATCH /auth/profile` | nome do perfil |
| `POST /auth/email-change` | pede a troca de e-mail (senha atual; link no endereço novo; resposta igual exista ou não conta) |
| `POST /auth/email-change/confirm` | confirma pelo link (sem sessão); troca o e-mail e encerra as sessões |
| `PUT /profile/photo`, `GET /profile/photo`, `DELETE /profile/photo` | foto de perfil: corpo `image/jpeg` de até 60 KB, só do dono |
| `GET /plan/review/:date`, `PUT /plan/review/:date` | avaliação do bloco de 2 semanas: `{ due, calendarWeek, felt, advanceSuggested }`; corpo `{ felt: facil|no_ponto|puxado|nao_consegui }` |

`:date` é a data **local** do atleta (`AAAA-MM-DD`); o servidor só aceita hoje ±1 dia. Esquemas de entrada: `packages/shared/src/{auth,interview,training}.ts` (Zod, reutilizáveis no front).
Erros a tratar com tela própria: `409 INTERVIEW_REQUIRED`, `400 UNDERAGE` (`details.canDeleteAccount`), `429 RATE_LIMITED`, `401`.

## Estado do front
`apps/web` está completo para o atleta: React 19, Vite 6, TanStack Router (rotas por arquivo) e Query, React Hook Form com os esquemas Zod de `@passo/shared`, i18next (pt-BR e en), Tailwind 4 (ADR 0007). Moldura das telas logadas em `components/flow-layout.tsx` (menu lateral no desktop, menu hambúrguer no celular). Testes de interface: `pnpm --filter @passo/web e2e`; conferência geral: `pnpm check`.

## Deploy pendente (fora da Fase 6, mas bloqueia o uso real)
- Dockerfile da API (multi-stage, usuário não root, arm64) e serviço no `docker-compose.yml` da VPS.
- Rota nova no túnel Cloudflare (`letsgorun-api.devsaulo.com.br` → container da API; nenhuma porta pública nova).
- Aplicar na VPS as migrações 0008 a 0013 (ver `ops/README.md`; procedimento: `git archive` para a VPS e `tsx src/migrate-cli.ts` dentro de `node:22-alpine` na rede `app-de-corrida_data`). **Pedir OK do dono antes de mexer no banco de produção.**
- Front no Cloudflare Pages (`letsgorun.devsaulo.com.br`).
- Chave do Resend e verificação do domínio de envio (SPF e DKIM): a API recusa iniciar em produção sem `RESEND_API_KEY`. Lista de verificação completa do deploy em `docs/auditoria-seguranca.md`, seção 4.

## Pendências do dono
- Confirmar (ou manter os padrões) dos itens dos ADRs 0004, 0005 e 0006.
- Ler uma vez a transcrição do PAR-Q+ contra o PDF (números e pontuação).
- Avisar a PAR-Q+ Collaboration (R-TRI-14, não bloqueia).
- Revisar os textos `razao` do catálogo no seed.

## Dicas de ambiente (Windows)
- Testes da API: subir o Postgres de teste do `AGENTS.md` e exportar `TEST_DATABASE_URL`; `pnpm verify` roda lint, tipos, testes e build.
- No terminal do Windows, heredocs com muitas aspas quebram: crie arquivos com a ferramenta de escrita e use `python -I` para edições em lote.
- Migração nova: editar `packages/db/src/schema.ts` e `pnpm --filter @passo/db db:generate`; SQL manual com `--custom` (RLS e permissões de tabela nova vão numa migração própria, como a 0009).
