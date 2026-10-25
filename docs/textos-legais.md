# Política de Privacidade e Termos de Uso: proposta para aprovação

**Estado: aprovado pelo dono em 2026-10-11 e implementado** (`apps/web/src/lib/legal.ts`, rotas `/privacidade` e `/termos`). Decisões: D1 e-mail mantido; D2 texto mantido ("podem tratar dados fora do Brasil"); D3 frase do cadastro trocada; D4 "Termos de Uso" padronizado; D7 português e inglês (tradução em `legal.en.ts`, com o aviso de que vale a versão em português: cláusula nova, para você conferir). O dono vai ler tudo antes de abrir o app para outras pessoas.

**Acréscimo de 2026-10-25 (publicado em 2026-10-25 com o OK do dono ao deploy):** em "Quais dados coletamos", o item Treinos passou a citar a troca de dia de um treino, os dias com pedido de treino mais leve e as pausas planejadas (só as datas, sem motivo). Versão `2026-10-25` em `legal.ts` e `termsVersion`.

**Acréscimo de 2026-10-24 (publicado em 2026-10-24 com o OK do dono ao deploy):** lembrete do treino por notificação. Em "Quais dados coletamos": endereço de notificação do aparelho, chaves de cifra, horário, fuso e último envio (opcional; apagado ao desligar ou sair da conta no aparelho). Em "Com quem compartilhamos": o serviço de notificações do navegador (Google, Apple, Mozilla ou Microsoft) recebe o aviso cifrado, com texto genérico e sem dado de saúde; a frase de transferência para fora do Brasil passou a citá-lo. Versão `2026-10-24` em `legal.ts` e `termsVersion`. O texto completo está em `apps/web/src/lib/legal.ts` e `legal.en.ts` (a seção 3 abaixo é a proposta original e não foi reescrita).

**Acréscimos de 2026-10-11 (para o dono reler):** na lista "Quais dados coletamos", a **foto de perfil** (opcional; reduzida no aparelho; só o dono vê; apagada ao remover ou excluir a conta) e a **avaliação de cada bloco de 2 semanas** (fácil, no ponto, puxado, não consegui), em português e inglês. A versão do texto continua `2026-10-11` porque nenhum atleta aceitou ainda; se alguém tiver aceitado antes de você reler, suba a versão em `legal.ts` e em `apps/api/src/config.ts` no mesmo commit.

**Base:** os textos do Cadência (`App de treino/frontend/lib/legal.ts`), adaptados ao que o Let's Go Run faz de verdade. Cada frase foi conferida no código ou na infraestrutura (tabela da seção 2). O que o Cadência tinha e este app **não** faz foi removido (importar arquivos de GPS, explicação por IA, planilha, FTP e potência, ciclismo).

> Isto descreve o que o app faz, no formato do Cadência.

---

## 1. O que preciso que você decida

| # | Decisão | Minha sugestão |
|---|---|---|
| D1 | **E-mail de contato** que aparece nos textos. No Cadência é `sauloleonardo1987@gmail.com` (o mesmo que já está no rodapé). | Manter. |
| D2 | **Onde ficam os servidores** (VPS e bucket da Oracle): não sei a região. O texto diz que Cloudflare, Resend e Oracle "podem tratar dados fora do Brasil". Se a VPS e o bucket forem no Brasil, vale dizer; se forem fora, o texto já cobre. | **Resolvido em 2026-10-12:** VPS e bucket em Vinhedo (SP), conferido na VPS (`sa-vinhedo-1`); o texto agora diz que banco e cópias ficam no Brasil e deixa a Oracle fora da frase de transferência (versão 2026-10-12). |
| D3 | **Frase da tela de cadastro:** hoje diz "Seus dados de treino e saúde são criptografados e nunca são vendidos." Conferi: há criptografia na conexão (HTTPS) e nas cópias de segurança, mas **não** confirmei criptografia do disco do banco. Para não prometer o que não conferi, proponho trocar por: "Seus dados de treino e saúde trafegam criptografados, ficam em cópias de segurança criptografadas e nunca são vendidos." | Trocar. |
| D4 | **Nome do documento:** o cadastro diz "Termos de Serviço", o rodapé diz "Termos de uso". | Padronizar em **Termos de Uso**. |
| D5 | **Gratuito para sempre?** O texto diz que o app é gratuito e que o PAR-Q+ é usado sob licença gratuita e não comercial. Se um dia cobrar, os termos mudam e a PAR-Q+ Collaboration precisa autorizar (R-TRI-14). | Manter como está. |
| D6 | **Retenção das cópias de segurança:** 30 dias (regra do bucket). O texto diz "até 30 dias". | Manter. |
| D7 | **Inglês:** a tradução ficou para depois. Proponho publicar o texto em português e, com o app em inglês, mostrar um aviso de que os documentos legais estão em português (como já é com o PAR-Q+). | Fazer assim agora; traduzir na etapa de tradução. |

---

## 2. O que conferi (afirmação → onde)

| Afirmação do texto | Onde conferi |
|---|---|
| Senha guardada só como hash (argon2id) | `apps/api/src/lib/password.ts` |
| Só mês e ano de nascimento (não o dia) | `interview.ts` (`birthMonth`, `birthYear`); `ageRange` em `athlete-service.ts` |
| PAR-Q+: só respostas Sim/Não; texto livre (condições, medicamentos) não é guardado; sem documentos médicos | `docs/pesquisa/02-triagem.md`, R-TRI-15; tabela `health_screenings` |
| Sessões guardam o navegador/sistema (user agent), não o IP | tabela `sessions` (`user_agent`; sem coluna de IP) |
| O servidor não registra e-mail, nome nem dado de saúde nos logs | `apps/api/src/lib/logger.ts` (só ids e códigos) |
| O IP é usado só para limitar tentativas (na memória) | `middleware/security.ts` (`clientIp`, limite por IP) |
| Cookie de sessão HttpOnly, Secure (`__Host-`), SameSite Lax | `middleware/session.ts` |
| Idioma fica no armazenamento local do navegador | `apps/web/src/i18n/index.ts` (`localStorage`) |
| Nenhum script, fonte ou imagem de terceiros; sem analytics | CSP em `apps/web/public/_headers`; fonte Inter incluída no app (`@fontsource`) |
| Sessão expira por inatividade (12 h; 30 dias com "manter conectado") e no máximo em 90 dias | `apps/api/src/config.ts` |
| Bloqueio temporário após 5 tentativas erradas | `apps/api/src/config.ts` |
| Excluir a conta pede a senha e apaga tudo na hora | `DELETE /auth/account` (`auth-service.ts`); teste da LGPD em `training.test.ts` |
| Exportar tudo em JSON, inclusive saúde | `GET /account/export` (`athlete-service.ts`) |
| Cópias de segurança criptografadas, direto da VPS para a Oracle, sem cópia no servidor, apagadas em 30 dias | `ops/backup.sh`, `ops/README.md` |
| Resend recebe e-mail, nome e o texto das mensagens | `apps/api/src/lib/email-templates.ts` |
| Nenhuma IA gera ou altera treino; o motor só reduz carga | `AGENTS.md` (regras inegociáveis); `packages/engine` |
| Aceites registrados com versão e data: termos, dados de saúde, 18 anos | tabela `consents`; `registerSchema` |
| Menor de 18 é recusado e pode excluir a conta | `athlete-service.ts` (`UNDERAGE`) |

---

## 3. Política de Privacidade (texto proposto)

**Versão:** 2026-10-12 (a de 2026-10-11 foi a aprovação inicial). **Última atualização:** 12 de outubro de 2026.

> Esta política explica quais dados o Let's Go Run guarda sobre você, para que usa cada um, com quem compartilha e como você os controla. Ela segue a Lei Geral de Proteção de Dados (Lei 13.709/2018).

### Quem é o responsável pelos seus dados
O Let's Go Run é desenvolvido e operado por Saulo Rangel, que decide como os dados são tratados (controlador, na LGPD).

Para qualquer pedido ou dúvida sobre seus dados, escreva para sauloleonardo1987@gmail.com.

### Quais dados coletamos
Coletamos apenas o que você informa ou gera ao usar o app:

- **Conta:** nome, e-mail, senha (guardada somente como hash irreversível, nunca em texto), idioma escolhido e as datas de criação da conta e de confirmação do e-mail.
- **Perfil:** mês e ano de nascimento (não guardamos o dia), sexo, altura e peso.
- **Histórico de corrida e rotina:** tempo de prática, treinos e volume por semana, maior corrida recente, tempos de 5 km e 10 km quando você informa, objetivo (distância e data de prova), disponibilidade na semana, sono e estresse habituais, tipo de trabalho, outros esportes, treino de força e recursos (relógio de frequência cardíaca, pista, esteira, tipo de terreno).
- **Saúde, que são dados pessoais sensíveis:** as respostas Sim ou Não do questionário PAR-Q+, gravidez, lesões e dor atual, o resultado da triagem, a avaliação profissional que você declarar (resultado, data e quem avaliou; não pedimos documentos), pausas por dor, lesão ou doença, e o aviso de mudança de saúde. Não guardamos o texto livre do PAR-Q+ (condições e medicamentos).
- **Acompanhamento diário:** check-ins (horas e qualidade do sono, energia, humor, estresse, dor muscular, frequência cardíaca de repouso, doença aguda, dor ao caminhar) e dores registradas (local do corpo, intensidade, tipo e sintomas associados).
- **Treinos:** plano, sessões, se foram feitas, duração, distância, esforço percebido e comentário.
- **Decisões do app:** para cada ajuste de treino, guardamos a regra aplicada e a versão dela, para que você possa ver por que o treino foi mantido, reduzido ou trocado por descanso.
- **Registro do aceite:** a data e a versão dos Termos de Uso e da Política de Privacidade que você aceitou, o consentimento para tratar dados de saúde e a declaração de que tem 18 anos ou mais.
- **Dados técnicos:** um cookie de sessão; o navegador e o sistema de cada sessão aberta (para você reconhecer seus aparelhos); o idioma, no armazenamento do navegador; e o endereço IP, usado para limitar tentativas de acesso indevido. A rede e o servidor podem registrar IP e horário por segurança.

### Para que usamos e em que base legal
- Montar e ajustar seus treinos, registrar sua evolução e mostrar os resultados: execução do serviço que você pediu (LGPD, art. 7º, V).
- Tratar seus dados de saúde para tornar os treinos mais seguros (por exemplo, reduzir ou suspender a carga diante de dor ou sono ruim): seu consentimento específico, dado ao criar a conta e ao informar esses dados (art. 11, I). Você pode retirá-lo a qualquer momento encerrando a conta, já que os treinos dependem desses dados.
- Manter o serviço seguro, limitar tentativas de acesso indevido e investigar abusos: interesse legítimo (art. 7º, IX).
- Cumprir obrigações legais, quando houver.

Não usamos seus dados para publicidade, não os vendemos e não montamos perfil comercial.

Os treinos são montados por regras de planejamento do app, baseadas em estudos científicos citados em cada treino. **Nenhuma inteligência artificial gera ou altera seus treinos.** As regras só podem manter ou reduzir a carga; você decide se faz, pula ou registra cada sessão. Se quiser a revisão de uma decisão automatizada, peça pelo contato acima.

O Let's Go Run não faz diagnóstico nem tratamento médico.

### Com quem compartilhamos
Usamos prestadores de serviço (operadores) que tratam dados em nosso nome e só para o serviço combinado:

- **Hospedagem:** servidor virtual em nuvem, onde ficam o aplicativo e o banco de dados, e a Cloudflare, que hospeda a interface do app e transporta o tráfego entre o seu aparelho e o servidor.
- **E-mail transacional (Resend):** recebe seu e-mail, seu nome e o texto das mensagens de confirmação de e-mail, de redefinição de senha e de aviso de segurança.
- **Cópia de segurança:** cópias do banco de dados, criptografadas antes de sair do servidor, em armazenamento externo da Oracle. A Oracle guarda apenas o conteúdo já criptografado.

O banco de dados e as cópias de segurança ficam no Brasil. A Cloudflare e o Resend podem tratar dados fora do Brasil. Nesses casos, a transferência é necessária para prestar o serviço (LGPD, art. 33, IX).

Não compartilhamos seus dados com anunciantes nem com outros usuários. Só os divulgamos a autoridades quando a lei exigir.

### Por quanto tempo guardamos
- Seus dados ficam guardados enquanto a conta existir.
- Ao excluir a conta em Configurações, apagamos todos os seus dados do banco de dados na hora, sem intervenção de ninguém.
- As cópias de segurança anteriores à exclusão permanecem criptografadas por até 30 dias e depois são descartadas automaticamente. Depois desse prazo, seus dados não existem mais em nenhuma cópia.
- Registros técnicos de acesso ficam pelo tempo necessário para segurança.

### Seus direitos
Você pode, a qualquer momento e sem custo (LGPD, art. 18):

- **Confirmar e acessar seus dados:** em Configurações, "Baixar meus dados" entrega um arquivo com tudo que guardamos sobre você, inclusive os dados de saúde.
- **Corrigir dados:** refazendo a entrevista, e reenviando o check-in ou o registro de um treino (o novo substitui o anterior).
- **Levar seus dados a outro serviço:** o arquivo baixado é JSON, um formato aberto.
- **Apagar seus dados:** em Configurações, "Excluir minha conta".
- **Saber com quem compartilhamos dados:** na seção acima.
- **Retirar o consentimento e pedir a revisão de decisões automatizadas:** pelo contato abaixo.

Para o que não puder fazer sozinho, escreva para sauloleonardo1987@gmail.com. Respondemos em até 15 dias.

Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.

### Como protegemos seus dados
- Conexão criptografada (HTTPS) entre o seu aparelho e o servidor.
- Senhas guardadas com hash argon2id; o cookie de sessão é HttpOnly, seguro e protegido contra envio entre sites.
- Cada conta só acessa os próprios dados, com isolamento também no banco de dados; o banco não é acessível pela internet.
- A sessão expira por inatividade e tem prazo máximo; você pode encerrar as sessões abertas em outros aparelhos.
- Limite de tentativas em login, cadastro e redefinição de senha, com bloqueio temporário após várias senhas erradas.
- Cópias de segurança criptografadas.

Nenhum sistema é totalmente seguro. Se ocorrer um incidente que possa causar risco ou dano relevante a você, avisaremos você e a ANPD, como a lei determina (art. 48).

### Cookies e armazenamento no aparelho
Usamos um cookie essencial, que mantém você conectado. Guardamos no armazenamento do navegador apenas o idioma escolhido (português ou inglês), que não contém dados pessoais. Não usamos cookies de publicidade, ferramentas de análise de terceiros, nem carregamos scripts, fontes ou imagens de outros sites.

### Crianças e adolescentes
O Let's Go Run é destinado a pessoas com 18 anos ou mais. Se identificarmos uma conta de menor, apagaremos os dados.

### Mudanças nesta política
Quando mudarmos algo que afete seus dados, como um novo provedor ou um novo tipo de dado, atualizamos esta página e a data no topo, e avisamos no app antes de a mudança valer. Um novo uso que exija novos dados só começa com o seu consentimento.

---

## 4. Termos de Uso (texto proposto)

**Versão:** 2026-10-12. **Última atualização:** 12 de outubro de 2026.

> Estes termos valem para o uso do Let's Go Run, um aplicativo de planejamento de treino de corrida. Ao criar uma conta, você declara que leu e concorda com eles e com a Política de Privacidade.

### Quem pode usar
O Let's Go Run é destinado a pessoas com 18 anos ou mais. A conta é pessoal e você deve informar dados verdadeiros.

### O que o Let's Go Run é, e o que não é
O Let's Go Run sugere treinos de corrida a partir do seu perfil, da sua rotina, da sua triagem de saúde e dos seus registros. Ele não é serviço médico, de fisioterapia ou de nutrição, não faz diagnóstico e não substitui a orientação de profissionais de saúde ou de educação física.

Antes de começar ou de aumentar a carga de treino, principalmente se você tem doença, lesão, restrição médica ou cirurgia recente, consulte um profissional. Interrompa o treino diante de dor que não passa, tontura, falta de ar fora do normal ou qualquer mal-estar. Em emergência (dor no peito que não passa, desmaio ou falta de ar intensa), ligue 192 (SAMU). Você decide se faz cada treino e como o faz, e responde por essa decisão.

### Triagem de saúde
O app só monta treinos depois da triagem de saúde (questionário PAR-Q+). Dependendo das respostas, ele pede que você procure um profissional antes de treinar, e nenhum treino é gerado até lá.

- Se você declarar uma avaliação profissional, o app registra a sua declaração, sem pedir documentos, e você responde pela veracidade do que declarou.
- Se a sua saúde mudar (novo diagnóstico, medicação, lesão, gravidez ou internação), informe quando o app perguntar ou em Configurações. A liberação deixa de valer e você refaz a triagem.
- A triagem tem prazo de validade e precisa ser refeita quando vencer.

O PAR-Q+ é de autoria da PAR-Q+ Collaboration (© PAR-Q+ Collaboration; tradução de Bianca Bold e Juliano Schwartz), e aparece sem alteração, com uso gratuito e não comercial.

### Sua conta
- Guarde sua senha e não a compartilhe. Você é responsável pelo que acontece na sua conta.
- Avise se suspeitar de acesso indevido. Em Configurações, você pode encerrar as sessões abertas em outros aparelhos; para trocar a senha, use "Esqueci minha senha" na tela de entrada.
- Você pode excluir a conta a qualquer momento, em Configurações, e seus dados são apagados.

### Uso adequado
Não é permitido:

- tentar acessar dados de outras contas ou contornar a segurança do app;
- sobrecarregar o serviço ou usar meios automatizados que prejudiquem outros usuários;
- enviar textos ilegais, ofensivos ou que não sejam seus.

Podemos suspender contas que violem estas regras.

### Seus dados e conteúdo
Os dados que você envia continuam sendo seus. Você nos autoriza a tratá-los só para operar o Let's Go Run para você, como descrito na Política de Privacidade.

### Treinos, regras e base científica
Os treinos vêm de regras de planejamento do app, baseadas em estudos citados em cada treino. Nenhuma inteligência artificial gera ou altera os treinos.

Os estudos dão base geral a princípios de treinamento. Quando um valor é uma escolha inicial do app, sem estudo direto, o app informa. Estudos de grupos populacionais não garantem o mesmo resultado para você.

### Gratuidade
O Let's Go Run é gratuito. Se isso mudar um dia, atualizaremos estes termos e avisaremos antes.

### Disponibilidade e mudanças
O Let's Go Run está em evolução e é oferecido como está. Pode ficar indisponível para manutenção ou por falha, e recursos podem mudar ou sair. Faremos o possível para avisar antes de mudanças que afetem seus dados.

### Responsabilidade
Dentro do que a lei permite, o Let's Go Run não garante resultados de desempenho ou de saúde, e não responde por lesões, danos ou perdas decorrentes do treino que você decidiu fazer. Nada aqui afasta direitos que a lei assegura a você, inclusive os do Código de Defesa do Consumidor.

### Lei aplicável
Valem as leis do Brasil. Se você for consumidor, o foro é o do seu domicílio.

### Mudanças e contato
Podemos atualizar estes termos; a data no topo mostra a versão em vigor, e avisamos no app quando a mudança for relevante. Dúvidas: sauloleonardo1987@gmail.com.

---

## 5. Como ficou no app

- Páginas públicas `/privacidade` e `/termos` (os links do rodapé já existem), legíveis sem entrar na conta, com a data da versão e um link para a outra página.
- Texto em um arquivo só (`apps/web/src/lib/legal.ts`, como no Cadência), com `LEGAL_VERSION` igual à `termsVersion` do cadastro (hoje `2026-10-10`, passa para a data aprovada).
- Cadastro: os aceites passam a ter link para os dois documentos, abrindo em outra aba.
- Teste Playwright: as duas páginas abrem sem login, mostram a versão e não têm código de regra nem `[P]`.
- Regra de manutenção (como no Cadência): quem mudar o tratamento de dados atualiza o texto e a versão no mesmo commit.
