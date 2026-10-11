# Auditoria de segurança — 2026-10-11

Escopo: repositório inteiro (código da API, do front e dos pacotes), banco, infraestrutura descrita em `ops/`, CI, dependências, segredos e documentação. Feita antes do primeiro deploy para produção.

**Resultado:** nenhum problema crítico ou alto. Foram encontrados e **corrigidos** 5 problemas de severidade baixa a média (tabela 1). Os pontos aceitos por desenho estão na tabela 2 e o que só pode ser conferido no deploy está na seção 4. Nada abaixo foi descoberto por um teste de invasão (seção 5 diz o que não foi feito).

## 1. Achados corrigidos

| # | Severidade | Onde | Problema | Correção | Verificação |
|---|---|---|---|---|---|
| S1 | Média | API, log de erros | `error.message` do driver do banco traz a consulta e os valores (e-mail, hash de token, dados de saúde). Ia para o log numa falha interna ou de tarefa em segundo plano, contra a regra "logs sem dados pessoais". | `describeError` (`apps/api/src/lib/logger.ts`) registra só o tipo e o código (ex.: `Error:23505`). | `apps/api/test/hardening.test.ts` |
| S2 | Baixa | Front, `public/_headers` | A CSP de produção listava `http://localhost:3000` em `connect-src` e `img-src`. | Origem de desenvolvimento só no preview dos testes (`vite.config.ts`); o arquivo de produção ficou só com a API. | `pnpm check` (telas) e leitura do arquivo |
| S3 | Baixa | Front, detalhe do treino | `href` da fonte vinha do catálogo sem checar o esquema (`javascript:` renderizaria). | Só `https://` vira link. | leitura do código; teste de telas do treino |
| S4 | Baixa a média | API, e-mails | Sem limite por destinatário: cadastro, reenvio e "esqueci a senha" não exigem login e escrevem para qualquer endereço; o limite por IP não impede encher a caixa de alguém com vários IPs. | `throttledMailer`: no máximo 6 e-mails por hora por endereço; o excedente é descartado e registrado. | `apps/api/test/hardening.test.ts` |
| S6 | Operacional (impedia o deploy) | API, empacotamento | `postgres` estava em `devDependencies`, mas o pacote da API o usa em tempo de execução; numa imagem só com dependências de produção o container não subiria. | Movido para `dependencies`. `apps/api/Dockerfile` criado e a imagem testada: sobe sem root, com sistema de arquivos somente leitura e sem capacidades, saudável, com os cabeçalhos de segurança e rejeitando origem errada. | `docker build` e `docker run` locais |
| S5 | Baixa (só ferramentas de desenvolvimento) | Dependências | `pnpm audit` apontava 8 avisos (2 críticos em `tinypool`, via `vitest` 3.x; `esbuild`). Nenhum em dependência de produção. | `vitest` 5.0.3 na API e no motor; `esbuild >= 0.28.1` por override; alvo de build `es2022`. `pnpm audit` agora: nenhum aviso. O CI passou a auditar todas as dependências (nível moderado), não só as de produção. | `pnpm audit`; `pnpm check` |

## 2. Pontos aceitos, por desenho ou por custo

| Ponto | Por que é aceitável | Onde está documentado |
|---|---|---|
| `sessions` e `auth_tokens` sem RLS (e `users`) | O login e a validação de sessão acontecem antes de existir dono conhecido. Só o repositório de auth as acessa e filtra pelo dono. As outras 13 tabelas do atleta têm RLS. | ADR 0002 |
| Limites de taxa em memória | Há uma instância da API. Reiniciar zera os contadores, o que é aceitável nessa escala. Com mais de uma instância seria preciso um repositório compartilhado. | este documento |
| Bloqueio de conta por falhas permite que alguém trave a conta de outra pessoa por até 15 min (dobra nos bloqueios seguintes) | É o trade-off do bloqueio temporário exigido pela especificação; o dono da conta recebe e-mail e destrava com "esqueci a senha". | `apps/api/src/config.ts` |
| Foto de perfil no próprio banco | Miniatura de até 60 KB, só o dono vê (RLS), entra na exportação e na exclusão, e nas cópias de segurança criptografadas. | ADR 0008 |
| `GET /profile/photo` com cache privado de 1 h | A URL tem a versão da foto; outro usuário no mesmo navegador tem outra URL. | ADR 0008 |
| Troca de e-mail sem verificar se o atual ainda é do dono | Pede a senha atual e avisa o endereço antigo; o novo só vale com o link. | ADR 0008 |

## 3. O que foi conferido e está certo

**Segredos e repositório**
- gitleaks no histórico inteiro (81 commits): nenhum segredo. `.env`, `*.pem`, `*.key`, dumps e `dev-emails.log` no `.gitignore`; só `.env.example` (sem valores) é versionado.
- Segredos só por variável de ambiente; a API recusa iniciar sem `SESSION_SECRET` de 32+ caracteres e, em produção, sem `RESEND_API_KEY` e com `FRONTEND_URL` que não seja https.
- Nenhum IP, identificador de nuvem ou chave em arquivo versionado.

**Autenticação e sessão**
- Senha com argon2id (19 MiB, t=2, p=1), lista de senhas comuns, bloqueio de senha que contém o e-mail.
- Login e cadastro não revelam se o e-mail existe (mesma resposta e mesmo custo de tempo); "e-mail não confirmado" só aparece para quem acertou a senha; a troca de e-mail responde igual exista ou não o endereço novo.
- Token de sessão e de e-mail: 256 bits aleatórios, guardados só como HMAC-SHA256; uso único; expiram. Rotação da sessão no login; sessões encerradas ao trocar senha ou e-mail.
- Cookie `__Host-passo_session` em produção: `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain`. Expiração por inatividade (12 h, ou 30 dias com "manter conectado") e absoluta (90 dias).
- Tokens de e-mail no fragmento da URL (não vão ao servidor nem ao `Referer`) e apagados da barra de endereço.

**Autorização e dados**
- Todas as rotas de atleta exigem sessão; o dono vem sempre da sessão, nunca do cliente; recurso de outro usuário devolve 404, com teste A-tenta-acessar-B nas rotas com id.
- RLS ligado e sem `FORCE` (o papel da API não é dono das tabelas): 13 tabelas; `passo_api` sem superusuário, sem `BYPASSRLS`, sem criar objetos; catálogo só leitura; `engine_decisions` só leitura e inserção.
- Toda consulta usa o Drizzle; os únicos `sql` cru são fixos (`set_config`, `select 1`, mesclagem de JSON com parâmetro).
- Entradas validadas com Zod em toda rota, com limites de tamanho; corpo da requisição limitado a 64 KB; datas só em hoje ±1 dia (impede criar semanas distantes).
- Foto: só JPEG conferido pelos bytes (não pelo cabeçalho), até 60 KB, servida com `nosniff` e CSP `default-src 'none'`; reduzida e regravada no aparelho (sem metadados).

**Rede, cabeçalhos e front**
- API: `default-src 'none'`, HSTS (produção), `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`; CORS restrito à origem exata do front, com credenciais; verificação de `Origin` em toda requisição que muda estado (cobre também subdomínios irmãos, que são do mesmo "site").
- Front: CSP sem script nem estilo inline, sem `eval`; HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `document.write`; `localStorage` só guarda o idioma; links externos com `noopener noreferrer`.
- IP de quem chama: em produção só `cf-connecting-ip`; `X-Forwarded-For` nunca é usado.

**Dependências e CI**
- `pnpm audit` (todas as dependências): nenhum aviso. Lockfile versionado e `--frozen-lockfile` no CI; ações do GitHub fixadas por SHA; Dependabot (npm, ações e docker); gitleaks no CI e no pre-commit.

**LGPD**
- Consentimento explícito e separado, 18 anos declarados, exportação completa (inclui a foto) e exclusão real com cascata (testada), cópias de segurança criptografadas e descartadas em até 30 dias, como diz a Política de Privacidade.

## 4. O que só se confere no deploy (lista de verificação)

| Item | Como conferir |
|---|---|
| A API **não** publica porta na VPS; só o túnel da Cloudflare a alcança (o limite por IP e o `cf-connecting-ip` dependem disso) | `docker ps` sem `0.0.0.0:3000`; `ss -ltnp` |
| O Postgres continua sem porta publicada e só na rede interna | `docker port app-de-corrida` vazio |
| Container da API sem root, sistema de arquivos somente leitura, `no-new-privileges` | `docker inspect` |
| `.env` da VPS com `chmod 600`, fora do Git | `ls -l` |
| `NODE_ENV=production`, `FRONTEND_URL` com https exato do front, `RESEND_API_KEY` definido | a API não inicia se faltar |
| Domínio do Resend verificado (SPF e DKIM) | painel do Resend; e-mail de teste não cai no spam |
| `VITE_API_URL` definida no Cloudflare Pages (sem ela o app aponta para `localhost`) | abrir o app e olhar a aba de rede |
| Cabeçalhos servidos de verdade (CSP, HSTS) no front e na API | `curl -I` nas duas origens |
| Migrações 0008 a 0013 aplicadas com `passo_migrator`; `db-roles.sh` já executado | `\dt` e `\dp` no banco |
| Primeiro backup criptografado e teste de restauração depois das novas tabelas | `ops/backup.sh` e `ops/restore-test.sh`; anotar a data em `ops/README.md` |
| Rota do túnel `letsgorun-api.devsaulo.com.br` | `curl https://letsgorun-api.devsaulo.com.br/health` |

### Resultado da verificação no deploy (2026-10-11)

| Item | Resultado |
|---|---|
| API sem porta publicada; banco sem porta publicada | ok (a porta 3000 do host é de outro app da VPS) |
| Container da API: sem root, somente leitura, `no-new-privileges`, sem capacidades, 512 MB | ok |
| `.env` com permissão 600, fora do Git | ok |
| `/health` pela internet; origem estranha 403; rota de atleta sem sessão 401; login de conta inexistente com resposta genérica | ok |
| CORS: só a origem `https://letsgorun.devsaulo.com.br` | ok (a de `pages.dev` não recebe `allow-origin`) |
| Cabeçalhos da API e do front no domínio final | ok **depois** de excluir os dois hosts da regra "Cabeçalho de segurança" da zona, que sobrescrevia CSP, Referrer-Policy e Permissions-Policy |
| Recarga de rotas do front (SPA) | ok |
| `VITE_API_URL` no build; nenhum `localhost` no JavaScript publicado | ok |
| Envio real de e-mail (chave do Resend) | **pendente**: exercitar com um cadastro de teste |
| Teste de restauração do backup com as 23 tabelas | **pendente** |

Observação: o HSTS sai com 6 meses (`max-age=15552000`) porque a zona tem HSTS próprio na Cloudflare, que prevalece sobre o valor do código.

## 5. O que esta auditoria **não** fez

- Teste de invasão dinâmico (varredura com ZAP ou Burp, fuzzing de rotas). Recomendado depois do deploy, contra o ambiente real.
- Revisão da configuração da Cloudflare (regras, WAF, acesso ao túnel) e da VPS (firewall, SSH, atualizações do sistema): não estão no repositório.
- Revisão por especialista em segurança ou advogado (os textos legais seguem pendentes de leitura do dono, `docs/textos-legais.md`).
- Análise de acessibilidade com ferramenta (axe) e de desempenho: ficam para depois do deploy.
