# ADR 0001 — Sessões e autenticação

Data: 2026-10-10 · Status: aceito

## Contexto
A seção 5 e a 10 da especificação exigem sessão em cookie, expiração por inatividade e absoluta, bloqueio após falhas e respostas que não revelam se um e-mail existe (nem pelo tempo de resposta).

## Decisão
- **Sessão opaca no banco**, não JWT: token aleatório de 256 bits no cookie; o banco guarda só o HMAC-SHA256 do token com `SESSION_SECRET`. Logout e "encerrar sessão" valem na hora.
- Cookie `__Host-passo_session` em produção: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Sem "manter conectado" é cookie de sessão do navegador.
- Expiração (em `apps/api/src/config.ts`): 12 h de inatividade, 30 dias com "manter conectado", 90 dias absolutos. Validada a cada requisição; `last_seen_at` gravado no máximo 1x por minuto.
- Rotação no login: a sessão que chegou no cookie é apagada.
- Bloqueio por conta: 5 falhas em 15 min bloqueiam por 15 min, dobrando a cada novo bloqueio (máx. 24 h); e-mail avisa o dono; a resposta é a mesma de senha errada. Contagem com `SELECT ... FOR UPDATE`.
- Limite por IP (memória do processo): login 10/15 min; cadastro, reenvio e esqueci a senha 5/h; global 300/15 min. IP de `cf-connecting-ip` em produção; `X-Forwarded-For` nunca.
- **Anti-enumeração por tempo:** cadastro, reenvio e esqueci a senha só esperam o hash da senha (cadastro) ou nada, e fazem consulta, gravação e e-mail em segundo plano. O login com e-mail inexistente ou conta bloqueada verifica um hash descartável com os mesmos parâmetros.
- Argon2id com 19 MiB, t=2, p=1 (mínimo da OWASP). Senha de 10 a 128 caracteres, recusada se estiver entre as 2.311 senhas comuns com 10+ caracteres do top 100 mil do SecLists, contiver o e-mail ou tiver menos de 4 caracteres distintos.
- Tokens de e-mail: uso único (consumo num único `UPDATE ... RETURNING`), novo token invalida os anteriores do mesmo tipo; verificação 24 h, redefinição 60 min. O token vai no fragmento da URL (`#token=`), que não chega a servidores nem ao `Referer`.
- CSRF: `SameSite=Lax` + CORS restrito + checagem de `Origin` em métodos que alteram estado.

## Alternativas
- JWT sem estado: descartado (não dá para encerrar sessão na hora).
- Checagem de senha vazada pela API do HIBP: adiada; dependência externa no cadastro. Pode entrar depois com k-anonimato.
- Rate limit em Redis: desnecessário com uma instância só; rever se a API escalar horizontalmente.

## Consequências
- Uma consulta ao banco por requisição autenticada.
- O limite por IP zera quando o processo reinicia (o bloqueio por conta, não).
