# Projeto: Let's Go Run — app web de treino de corrida personalizado

Você é um engenheiro fullstack sênior com conhecimento em ciência do esporte. Vai construir do zero um app web que gera planos de treino de corrida personalizados para corredores iniciantes, intermediários e avançados. Os treinos vêm de um catálogo com base científica e são acompanhados por check-ins de sono, recuperação e dor.

## 1. Regras inegociáveis

1. **Nenhum treino inventado.** Todo treino, regra de progressão, limite de carga e critério de classificação precisa de base científica verificável. Use suas ferramentas de pesquisa (busca e leitura de páginas) para encontrar fontes reais: revisões sistemáticas, meta-análises, ensaios clínicos e posicionamentos oficiais (ACSM, PubMed, British Journal of Sports Medicine, Sports Medicine, IJSPP, MSSE e similares).
2. **Nunca cite referência de memória.** Abra cada fonte e confirme título, autores, ano e DOI ou URL antes de usá-la. Se não encontrar evidência para algo, escreva "sem evidência suficiente" e me pergunte. Não preencha a lacuna por conta própria.
3. **Nenhuma IA gera treino com o app rodando.** A recomendação vem de um **motor de regras determinístico** que escolhe treinos do **catálogo no banco**. Toda recomendação mostra ao atleta o motivo e a fonte.
4. **Segurança acima de desempenho.** Dor, sono ruim e sinais de alerta reduzem ou bloqueiam a carga. O app não faz diagnóstico e orienta procurar um profissional de saúde quando necessário.
5. **Pare nos pontos de revisão.** Ao fim de cada fase, apresente o que fez e espere minha aprovação antes de seguir.

## 2. Stack (definida, não trocar sem me consultar)

- **Monorepo** com pnpm workspaces:
  - `apps/web`: frontend
  - `apps/api`: backend
  - `packages/shared`: schemas Zod e tipos compartilhados
  - `packages/engine`: motor de regras puro, sem dependência de I/O
  - `packages/db`: schema Drizzle, migrations e seeds
  - `docs/`: documentação e pesquisa
- **Frontend:** React + TypeScript + Vite, TanStack Router, TanStack Query, Tailwind CSS + shadcn/ui, React Hook Form + Zod, i18n PT-BR (padrão) e EN. Deploy no Cloudflare Pages.
- **Backend:** Hono em Node.js (TypeScript), rodando em Docker na **minha VPS**, atrás do Cloudflare (proxy ou Cloudflare Tunnel).
- **Banco:** **PostgreSQL que já roda na minha VPS.** Use Drizzle ORM com migrations versionadas. O banco não deve ficar exposto publicamente: a API acessa pela rede interna ou Docker.
- **E-mail:** Resend, já configurado com meu domínio no Cloudflare. A API key fica só em variável de ambiente.
- **Testes:** Vitest para o motor, a API e os schemas. Playwright para os fluxos principais.
- **Qualidade:** ESLint, Prettier, TypeScript em modo strict, CI no GitHub Actions (lint, typecheck, testes, gitleaks e `pnpm audit`). Dependabot ativado para dependências e GitHub Actions.

## 3. Fase 0 — Pesquisa científica (antes de qualquer código)

Pesquise e documente em `docs/pesquisa/`:

1. **Classificação do corredor:** quais critérios a literatura usa para separar iniciante, intermediário e avançado (tempo de prática, frequência, volume semanal, desempenho recente, histórico de lesões).
2. **Triagem pré-participação:** PAR-Q+ ou equivalente validado, e quando encaminhar para avaliação médica.
3. **Distribuição de intensidade:** modelos polarizado, piramidal e limiar, e o que se recomenda para cada nível.
4. **Controle de intensidade:** escala de esforço percebido (RPE/CR-10), zonas de frequência cardíaca (FCmáx e FC de reserva), teste da fala e pace relativo a provas recentes.
5. **Progressão de carga e risco de lesão:** o que a evidência diz sobre aumento de volume semanal, a "regra dos 10%" e a razão de carga aguda/crônica (incluindo as críticas a esse modelo).
6. **Carga interna:** session-RPE (RPE × duração), monotonia e strain.
7. **Tipos de sessão:** rodagem leve, regenerativo, longão, limiar/tempo run, intervalado (curto e longo), fartlek, subidas, caminhada-corrida para iniciantes, força e mobilidade para corredores. Para cada um: objetivo fisiológico, estrutura, intensidade, volume típico por nível e frequência semanal.
8. **Sono e recuperação:** relação entre sono, desempenho e risco de lesão, e quais indicadores subjetivos são válidos (bem-estar, dor muscular, estresse).
9. **Dor durante o treino:** modelos de monitoramento de dor (por exemplo, o *pain monitoring model*), quais níveis de dor permitem continuar, reduzir ou interromper, e sinais de alerta que exigem parar e procurar um profissional.
10. **Planos por objetivo:** estrutura de ciclos para 5 km, 10 km, 21 km, 42 km e "saúde e condicionamento", com duração típica, polimento (*taper*) e semanas de recuperação.

**Entregáveis:**
- Um arquivo por tema.
- `docs/pesquisa/referencias.md` com a lista completa: autores, ano, título, periódico, DOI ou URL e tipo de estudo.
- Uma tabela de evidências: afirmação → fonte → nível de evidência → como vira regra no app.
- Uma lista de pontos em que a evidência é fraca ou conflitante, com a decisão conservadora proposta.

⏸️ **Ponto de revisão:** apresente o resumo e espere minha aprovação.

## 4. Fase 1 — Modelagem do banco

Modele no Postgres, via Drizzle, pelo menos:

- **users:** e-mail único, hash de senha, e-mail verificado, idioma, datas.
- **sessions** e **auth_tokens:** verificação de e-mail e redefinição de senha. Guarde só o hash do token, com expiração e uso único.
- **consents:** versão dos termos, aceite explícito para dados de saúde (LGPD) e data.
- **athlete_profiles:** resultado da entrevista, nível calculado, versão da regra que classificou, data da próxima reavaliação.
- **interview_responses:** respostas brutas da entrevista em JSONB, versionadas.
- **references:** fontes científicas (DOI, URL, citação, tipo de estudo).
- **workouts (catálogo):**
  - identificação: slug, nome PT/EN
  - tipo e objetivo
  - níveis permitidos
  - estrutura em JSONB: aquecimento, blocos, repetições, recuperação, desaquecimento
  - intensidade alvo em RPE, zona de FC e pace relativo
  - duração ou distância e carga estimada
  - contraindicações
  - progressão e regressão (ligações para outros treinos do catálogo)
  - status (rascunho, revisado, publicado) e versão
- **workout_references:** ligação N:N entre treinos e referências.
- **plan_templates** e **plan_template_weeks:** modelos de plano por objetivo e nível, que apontam para treinos do catálogo.
- **athlete_plans** e **scheduled_workouts:** plano atribuído ao atleta e treinos agendados por data.
- **workout_logs:** execução real (concluído ou não, duração, distância, sRPE, observações).
- **daily_checkins:** horas e qualidade do sono, energia, estresse, dor muscular geral, humor e FC de repouso opcional.
- **pain_reports:** local no corpo, intensidade de 0 a 10, tipo (muscular, articular, pontada), momento (antes, durante, depois) e se alterou a passada.
- **engine_decisions:** registro de auditoria de cada recomendação (entradas, regra aplicada, saída, versão do motor).

**Seeds:** popule o catálogo e os modelos de plano **só com o que foi validado na Fase 0**, cada treino ligado a pelo menos uma referência.

## 5. Fase 2 — Autenticação (e-mail e senha + Resend)

- **Cadastro:** nome, e-mail, senha (mínimo de 10 caracteres, checagem contra senhas vazadas comuns) e aceite dos termos e do tratamento de dados de saúde. Envia e-mail de verificação pelo Resend.
- **Cadastro sem revelar contas existentes:** a resposta na tela é sempre a mesma ("enviamos um e-mail para confirmar"), exista ou não uma conta com aquele e-mail. Se o e-mail já estiver cadastrado, o dono recebe um aviso por e-mail com link para entrar ou redefinir a senha. O tempo de resposta também não pode denunciar a diferença.
- **Login e logout:** sessão em cookie `httpOnly`, `Secure`, `SameSite=Lax`, com rotação de sessão no login e proteção contra CSRF. Mensagem de erro genérica ("e-mail ou senha incorretos").
- **Expiração de sessão:** por inatividade e absoluta, com valores em configuração. Ponto de partida: sem "manter conectado", 12 h de inatividade; com "manter conectado", 30 dias de inatividade; em qualquer caso, no máximo 90 dias absolutos. A sessão é validada no servidor a cada requisição, e o atleta pode ver e encerrar suas sessões ativas.
- **Bloqueio após tentativas:** limite de tentativas de login por conta e por IP. Ponto de partida: 5 falhas em 15 minutos bloqueiam a conta por 15 minutos, com espera crescente nas próximas falhas. O dono da conta recebe um e-mail avisando do bloqueio. A mensagem na tela não confirma se a conta existe.
- **Hash de senha:** Argon2id.
- **Esqueci a senha:** resposta sempre genérica, para não revelar se o e-mail existe. O token é único, guardado só como hash, expira em até 60 minutos e vale uma vez. Redefinir a senha encerra todas as sessões.
- **Rate limiting:** em login, cadastro, reenvio de verificação e esqueci a senha.
- **E-mails transacionais em PT e EN:** verificação, redefinição de senha e aviso de senha alterada.
- **Segredos:** `RESEND_API_KEY`, `DATABASE_URL`, `SESSION_SECRET` e demais só por variáveis de ambiente, com um `.env.example` documentado.

## 6. Fase 3 — Entrevista (onboarding) e perfil do atleta

Antes de receber qualquer treino, o atleta responde uma entrevista em etapas, com barra de progresso e opção de salvar e continuar depois:

1. **Dados básicos:** idade, sexo, altura e peso (opcional).
2. **Triagem de saúde:** PAR-Q+ ou o instrumento validado na Fase 0. Qualquer resposta de risco bloqueia treinos intensos e recomenda liberação médica.
3. **Histórico:** há quanto tempo corre, frequência atual, volume semanal das últimas 4 semanas, maior distância recente, tempos recentes em 5 ou 10 km (opcionais) e pausas recentes.
4. **Lesões:** lesões nos últimos 12 meses e dor atual (local e intensidade).
5. **Objetivo:** saúde, emagrecimento, primeira prova ou melhorar o tempo. Inclui a prova alvo e a data.
6. **Disponibilidade:** dias por semana, minutos por sessão e dia preferido para o longão.
7. **Recuperação e rotina:** sono médio, nível de estresse, trabalho físico ou sedentário, outros esportes e treino de força.
8. **Recursos:** relógio ou cinta de FC, acesso a pista ou esteira, terreno disponível.

**Saída:**
- Nível (iniciante, intermediário ou avançado) calculado por regras explícitas e versionadas no `packages/engine`, derivadas da Fase 0.
- Explicação em linguagem simples de por que o atleta foi classificado assim.
- Plano inicial atribuído a partir dos modelos do catálogo.
- Reavaliação sugerida no período definido pela pesquisa.

## 7. Fase 4 — Motor de recomendação (`packages/engine`)

- **Funções puras e testáveis:** recebem perfil, plano, histórico de carga, check-ins e relatos de dor, e devolvem a decisão do dia.
- **Decisões possíveis:** manter o treino, reduzir volume ou intensidade, trocar por regenerativo, trocar por descanso ou mobilidade, ou interromper e orientar procurar um profissional.
- **Só usa o catálogo:** o motor escolhe treinos do catálogo e regressões ligadas a eles. Nunca cria uma estrutura de treino nova.
- **Limites vindos da Fase 0:** os limites de sono, dor, aumento de carga e monotonia vêm da pesquisa. Ficam num arquivo de configuração versionado, cada valor com a referência no comentário.
- **Explicação em toda decisão:** cada saída traz um texto curto e as referências usadas, e é gravada em `engine_decisions`.
- **Testes:** cobertura alta, com casos de borda: dor alta no meio do plano, várias noites ruins seguidas, volta de pausa, semana de prova, triagem de saúde com risco.

## 8. Fase 5 — Acompanhamento de recuperação

- **Check-in diário (menos de 30 segundos):** sono (horas e qualidade de 1 a 5), energia, estresse, dor muscular geral e humor.
- **Pós-treino:** concluiu ou não, duração e distância reais, sRPE (CR-10), dor durante o treino (mapa do corpo clicável, intensidade de 0 a 10, tipo e se alterou a passada) e comentário.
- **Reação do sistema:** o motor recalcula o treino do dia seguinte e avisa o atleta do ajuste e do motivo. Dor acima do limite definido, ou dor que altera a passada, gera alerta claro e recomendação de procurar um profissional.
- **Histórico:** gráficos de sono, carga semanal (sRPE), dor ao longo do tempo e aderência ao plano.

## 9. Fase 6 — Telas

> **Estado (2026-10-11):** todas as telas listadas abaixo existem em código (`apps/web/src/routes/`), além de plano com posicionamento na escada, avaliação a cada 2 semanas, perfil com foto e troca de e-mail, e as páginas de Privacidade e Termos. O que mudou depois desta especificação está em `AGENTS.md` (decisões) e `docs/pesquisa/decisoes.md` (DEC-48 a DEC-50); o mapa de telas e da API, em `docs/fase-6-passagem.md`.

O design já existe no Figma: https://www.figma.com/design/5MXW1UlDcv8avuf144pVd0. Use o Figma MCP para ler as telas e os tokens antes de implementar.

**Telas prontas:**
- **Login:** foto do atleta à esquerda; à direita, abas Entrar/Criar conta, e-mail, senha, "Esqueci minha senha", "Manter conectado", seletor PT/EN e aviso de privacidade.
- **Painel:** treino de hoje, indicadores da semana, volume semanal, próxima prova, plano da semana e atividades recentes.

**Identidade visual:**
- Fonte Inter
- Laranja de destaque `#FF5A1F`
- Azul-marinho `#111827`
- Texto `#0F172A`, `#475569` e `#94A3B8`
- Fundo `#F5F6F8` e bordas `#E5E7EB`
- Cantos de 12 a 16 px

**Telas a criar no mesmo estilo:** cadastro, verificação de e-mail, esqueci e redefinir senha, entrevista em etapas, resultado do perfil, plano completo (calendário), detalhe do treino (estrutura, intensidade, motivo e fontes), check-in diário, registro pós-treino com mapa de dor, histórico e estatísticas, e perfil e configurações (incluindo exportar e excluir meus dados).

**Imagens e ícones:**
- Busque as imagens pelo **Figma MCP** a partir dos frames (login: `node-id=6-2`; painel: `node-id=2-2`) e salve no projeto (por exemplo, `apps/web/src/assets/`). Não use links de imagem do Figma no código, porque eles expiram.
- A foto original do atleta do login também está em `docs/design/foto-atleta-login.png` (928 × 1152 px, PNG) como cópia de segurança.
- **Otimize toda foto:** converta para AVIF e WebP com fallback, gere 2 ou 3 larguras com `srcset`/`sizes` e defina `width` e `height` para não haver salto de layout. A foto do login é o maior elemento da tela: carregue com prioridade alta (`fetchpriority="high"`), sem lazy loading. Esconda a foto no mobile, onde o formulário ocupa a tela toda.
- **Ícones:** use o pacote `lucide-react`, que tem o mesmo estilo do design. Não exporte ícones do Figma.
- **Logo:** exporte do Figma como SVG.
- **Favicon e ícones do PWA:** já estão prontos em `docs/design/icones/` (o frame "Marca e ícones" no Figma mostra o ícone). Copie todos para `apps/web/public/`, sem alterar, e use no `<head>` do `index.html`:
  - `<link rel="icon" href="/favicon.ico" sizes="32x32">`
  - `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<meta name="theme-color" content="#111827">`
  - O `notification-badge-96.png` é o badge do lembrete (símbolo pequeno da barra do Android): só o corredor branco em fundo transparente, porque o Android usa apenas a transparência e um ícone opaco vira um quadrado branco.
  - O `manifest.webmanifest` já lista os ícones `any` (192 e 512) e `maskable` (192 e 512). O PWA completo (service worker e offline) continua fora do MVP; o manifest e os ícones entram desde já.
  - Para mudar o ícone, edite e rode `docs/design/gerar_icones.py` (Python + Pillow) e atualize o frame no Figma.
- Imagens decorativas usam `alt=""`; imagens com significado têm texto alternativo descritivo.

**Requisitos de todas as telas:**
- Responsivas (mobile first)
- Acessíveis (WCAG AA, navegação por teclado, labels)
- Estados de carregamento, vazio e erro

## 10. LGPD e segurança

Boas práticas de segurança não são opcionais. Nenhuma fase é aprovada se descumprir algum item desta seção.

### 10.1 LGPD
- Dados de saúde são **dados sensíveis**: consentimento explícito e separado, finalidade descrita, mínimo de dados necessário.
- O atleta pode exportar todos os seus dados (JSON) e excluir a conta, com exclusão real no banco.
- Aviso visível de que o app não substitui orientação médica ou de um profissional de educação física.

### 10.2 Autorização: cada atleta só acessa os próprios dados
- **Toda** leitura e escrita de dados do atleta (perfil, entrevista, plano, treinos agendados, logs, check-ins, relatos de dor, decisões do motor) é filtrada pelo `user_id` **da sessão no servidor**. Nunca confie em um `user_id` ou dono de recurso enviado pelo cliente.
- O acesso a esses dados passa por uma camada única (repositório ou helper) que sempre aplica o filtro de dono. Nenhuma rota consulta essas tabelas diretamente sem passar por ela.
- Tentar acessar o recurso de outro usuário retorna **404**, não 403, para não revelar que ele existe.
- IDs públicos são UUIDs, nunca sequenciais. Isso é defesa extra, não substitui a checagem de dono.
- Rotas administrativas (por exemplo, revisar o catálogo) exigem papel de admin checado no servidor.
- **Testes obrigatórios:** para cada rota com dados de atleta, um teste em que o usuário A tenta ler, alterar e apagar um recurso do usuário B e falha.
- Avalie Row-Level Security do Postgres como camada adicional e documente a decisão.

### 10.3 Banco de dados na VPS
- **Usuário próprio para a API**, sem superusuário: só `SELECT`, `INSERT`, `UPDATE` e `DELETE` no schema do app. Um segundo usuário, usado só para migrations, tem permissão de alterar a estrutura.
- O Postgres **não fica exposto na internet**: escuta só no localhost ou na rede interna do Docker, com `pg_hba.conf` restrito. Se a conexão sair da máquina, exija TLS.
- **Backups criptografados** (por exemplo, com `age` ou GPG) antes de sair da VPS, guardados fora dela, com retenção definida e um teste de restauração documentado.

### 10.4 Frontend e API
- **Content Security Policy** restritiva: `default-src 'self'`, sem scripts inline nem `eval`, `connect-src` limitado ao domínio da API, `frame-ancestors 'none'`, `object-src 'none'` e `base-uri 'self'`. Configure no Cloudflare Pages (`_headers`) e teste que o app funciona com ela.
- Headers de segurança na API e no front: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- CORS restrito ao domínio do front, com credenciais.
- Validação de toda entrada com Zod no backend e consultas só pelo Drizzle, sem SQL montado com texto do usuário.
- Logs sem dados pessoais ou de saúde, sem senhas, tokens ou cookies. Erros do banco entram no log só com tipo e código (a mensagem do driver traz a consulta e os valores).
- Limite de e-mails por destinatário nos fluxos sem login (cadastro, reenvio, "esqueci a senha"), além do limite por IP.
- Auditoria de segurança de 2026-10-11 e lista de verificação do deploy: `docs/auditoria-seguranca.md`.

### 10.5 Repositório e CI
- `.gitignore` com `.env` e variantes desde o primeiro commit. Só o `.env.example`, sem valores reais, entra no repositório.
- **gitleaks** no CI e como hook de pre-commit, para barrar segredos vazados.
- **`pnpm audit`** no CI, falhando em vulnerabilidades altas ou críticas, e **Dependabot** ativado.

## 11. Deploy

- **API:** `Dockerfile` e `docker-compose.yml` para rodar na VPS, conectando ao Postgres existente pela rede interna com o usuário restrito da seção 10.3. O container roda sem root. Inclua o passo a passo para expor a API pelo Cloudflare (proxy ou Tunnel) com HTTPS.
- **Front:** deploy no Cloudflare Pages, com a URL da API em variável de ambiente.
- **Migrations:** comando separado e seguro para rodar em produção.
- **Backup:** um script documentado de `pg_dump` com criptografia e cópia fora da VPS, como na seção 10.3.

## 12. Fora do MVP (só planejar, não implementar)

Integração com Strava, Garmin e arquivos .FIT/GPX; notificações e lembretes; PWA offline; painel administrativo para revisar o catálogo; plano Pro e pagamentos; calendário de provas.

## 13. Como trabalhar comigo

- Antes de começar, liste as dúvidas e ambiguidades deste pedido e me pergunte.
- Siga as fases na ordem e pare em cada ponto de revisão.
- Commits pequenos e descritivos, e um README atualizado com como rodar localmente.
- Ao fim de cada fase, atualize as seções "Comandos" e "Estado atual" do `AGENTS.md`.
- Se algo neste prompt contradizer a evidência científica que você encontrar, mostre a evidência e proponha a correção. Não siga o prompt cegamente.
