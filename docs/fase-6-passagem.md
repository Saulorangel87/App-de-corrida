# Fase 6 — Telas: passagem de contexto

Estado em 2026-10-10: Fases 0 a 5 aprovadas pelo dono. Falta a Fase 6 (telas) e o deploy. Quem continuar (Claude, agy ou outro agente) deve ler, nesta ordem: `AGENTS.md`, `docs/especificacao.md` (seções 9 e 10), `docs/adr/0006-acompanhamento-diario.md` e este arquivo.

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
| `/painel` | esqueleto; sem perfil (404) leva à entrevista | `e2e/acesso.spec.ts` |

Padrões para as próximas telas: moldura `FlowLayout` (cabeçalho com idioma e sair); campos de escolha em `components/choice.tsx`; formulário por etapa com `stepResolver` (valida com o esquema compartilhado e mapeia o erro para o campo; o texto vem do i18n); `useRequireUser()` redireciona sem sessão; nada de `style=""` inline (a CSP bloqueia).

Pendências conhecidas desta parte: `/privacidade` e `/termos` ainda não existem; o texto do PAR-Q+ aparece só em português (é a tradução oficial; no app em inglês há um aviso); o formulário de "mudança de saúde" (R-TRI-11) e o refazer a triagem expirada entram com o perfil/configurações.

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
| `GET /account/export` | exportação LGPD (JSON) |

`:date` é a data **local** do atleta (`AAAA-MM-DD`); o servidor só aceita hoje ±1 dia. Esquemas de entrada: `packages/shared/src/{auth,interview,training}.ts` (Zod, reutilizáveis no front).
Erros a tratar com tela própria: `409 INTERVIEW_REQUIRED`, `400 UNDERAGE` (`details.canDeleteAccount`), `429 RATE_LIMITED`, `401`.

## Estado do front
`apps/web` é só o esqueleto do Vite (React + TypeScript, `src/main.tsx`). Ainda não há roteador, cliente de API, i18n nem componentes. Decisões a tomar e registrar em ADR curto no início da Fase 6: roteador, biblioteca de formulários, i18n, gerência de estado do servidor.

## Deploy pendente (fora da Fase 6, mas bloqueia o uso real)
- Dockerfile da API (multi-stage, usuário não root, arm64) e serviço no `docker-compose.yml` da VPS.
- Rota nova no túnel Cloudflare (`letsgorun-api.devsaulo.com.br` → container da API; nenhuma porta pública nova).
- Aplicar na VPS as migrações 0008 e 0009 (ver `ops/README.md`; procedimento: `git archive` para a VPS e `tsx src/migrate-cli.ts` dentro de `node:22-alpine` na rede `app-de-corrida_data`). **Pedir OK do dono antes de mexer no banco de produção.**
- Front no Cloudflare Pages (`letsgorun.devsaulo.com.br`).
- Secrets do Resend (e-mails de auth) ainda não testados em produção.

## Pendências do dono
- Confirmar (ou manter os padrões) dos itens dos ADRs 0004, 0005 e 0006.
- Ler uma vez a transcrição do PAR-Q+ contra o PDF (números e pontuação).
- Avisar a PAR-Q+ Collaboration (R-TRI-14, não bloqueia).
- Revisar os textos `razao` do catálogo no seed.

## Dicas de ambiente (Windows)
- Testes da API: subir o Postgres de teste do `AGENTS.md` e exportar `TEST_DATABASE_URL`; `pnpm verify` roda lint, tipos, testes e build.
- No terminal do Windows, heredocs com muitas aspas quebram: crie arquivos com a ferramenta de escrita e use `python -I` para edições em lote.
- Migração nova: editar `packages/db/src/schema.ts` e `pnpm --filter @passo/db db:generate`; SQL manual com `--custom` (RLS e permissões de tabela nova vão numa migração própria, como a 0009).
