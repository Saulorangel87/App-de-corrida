# Textos do atleta: proposta de reescrita (para aprovação)

**Estado: aprovado pelo dono em 2026-10-11 e aplicado** (seed, API, motor e telas). Cada linha tem um ID (T01, M05...). Observações da aplicação:
- Texto do atleta gerado no seed (`packages/db/src/seed-data/athlete-text.ts`) e guardado em `structure.atleta`; a API serve só esse bloco.
- Rótulos "Para aliviar" e "Para evoluir" vêm da tela; por isso os textos de regressão não repetem o prefixo "Para aliviar:".
- N01 (nota de troca de treino) saiu sem o nome do treino original, porque o motor só conhece o identificador; a nota não aparece na tela hoje.
- Glossário (G01 a G07) aparece no fim da tela de detalhe do treino.
- Textos em inglês: na etapa de tradução.
- **Pendência do dono (2026-10-11):** os textos de "Como fazer" (aquecimento, parte principal e volta à calma; em especial a escada de caminhada e corrida: "N x (corrida / caminhada), minutos de corrida e de caminhada por repetição", as 12 etapas e o degrau 10b, a fonte) ainda estão confusos para quem lê. Reescrever em linguagem de quem corre, sem inventar nada, **depois que o app estiver terminado**. A mesma regra de aprovação desta página vale.

Fonte de tudo: `docs/pesquisa/` (a coluna "Sustentação" aponta o arquivo e a regra). Nenhum número novo foi criado: os números dos textos propostos são os mesmos dos textos atuais.

## 1. O que foi levantado

| Origem | Total | Com problema | Observação |
|---|---|---|---|
| Catálogo de treinos (tela de detalhe) | 323 textos (220 únicos) em 11 treinos | 85 únicos com código de regra, `[P]`, crases (nome técnico do treino), siglas ou unidades sem explicação | Tabelas 4.1 a 4.7 |
| Mensagem do dia (motor) | 16 textos de decisão + 8 motivos de ajuste | O texto já é amigável. Aparecem colchetes com fontes (`[Garber 2011]`) e a mensagem de ajuste não diz qual limite agiu | Tabela 4.8 |
| Notas de sessão | 3 | Têm código de regra. **Não aparecem na tela hoje** | Tabela 4.9 |
| Rótulos fixos do painel | 2 | "Zona até Z2" e "Esforço alvo (PSE)" | Tabela 4.10 |
| Explicação do nível (resultado) | — | Já está em linguagem simples, sem código | Sem mudança |

## 2. Regras de escrita (valem para todos os textos novos)

1. **Sem código de regra** (R-xxx, DEC-xx), sem `[P]` e sem nome técnico de treino entre crases. Treino sempre pelo nome ("Rodagem leve").
2. **Zonas sempre com o nome do esforço**: "esforço leve (Z1)", "moderado (Z2)", "forte (Z3)". A escala é "de 0 a 10". Frequência cardíaca é "% da frequência cardíaca máxima", dizendo se é medida ou estimada.
3. **Mesmos números da pesquisa. Nada novo.** Quando o número é um valor inicial do app (`[P]` na pesquisa), o texto diz com palavras: "valor inicial do app, ainda sem estudo direto".
4. **Não apresentar convenção do projeto como "regra científica".** A pesquisa exige isso para o teto semanal de 110% (R-PRG-03): é cautela do app, não resultado de estudo.
5. **O app não faz diagnóstico e não promete evitar lesão.** Os avisos de segurança (dor, 192/SAMU, procurar profissional) **não mudam**.
6. **A fonte técnica não some**: fica guardada e aparece só em "Base científica" como autor e ano, com link.
7. Frases curtas, sem "o motor", "teto", "catálogo" ou "slug".

## 3. Onde os textos novos ficam (proposta de estrutura)

- Cada treino do catálogo ganha um bloco **`atleta`** com os textos já reescritos (hoje em português; o inglês entra na etapa de tradução).
- Os campos técnicos atuais (`razao`, `limites`, `evidencia`, códigos `R-xxx`, `[P]`) **continuam intactos** para auditoria e para o motor.
- A tela de detalhe passa a ler **só** o bloco `atleta`. O que é só auditoria (ajustes `P` da escada, âncoras de ensaio) deixa de aparecer para o atleta.
- A mensagem do dia passa a vir **limpa** (sem colchetes), e as fontes vêm numa lista separada, mostrada em "Base científica deste conselho".
- Todo texto novo entra com um teste que impede código de regra, `[P]` e crases no texto do atleta.

## 4. Tabelas

Legenda da coluna "Sustentação": **R-xxx** = regra em `docs/pesquisa/` (arquivo e linha ao lado). "Mantido" = texto igual, só sem o marcador técnico.

### 4.1 Zonas e intensidade (textos compartilhados)

| ID | Onde | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T01 | Zona, em todos os treinos de corrida | "Z1" / "leve", "Z2" / "moderado", "Z3" / "forte" | "Esforço leve (Z1)", "Esforço moderado (Z2)", "Esforço forte (Z3)", com as três zonas explicadas uma vez no topo do bloco de intensidade | R-INT-01, `04-controle-intensidade.md` |
| T02 | Esforço (rótulo "Esforço (CR-10)") | "1-3", "4-5", "6-10" | Rótulo "Esforço percebido (0 a 10)"; valores "1 a 3", "4 a 5", "6 a 10" | R-INT-01 |
| T03 | Escala de Borg | "<= 11", "12-14", ">= 15" | **Esconder do atleta** (a escala de 0 a 10 já diz o mesmo; fica só na auditoria) | R-INT-01 |
| T04 | Frequência cardíaca (medida) | "<= 75%", "76-87%", ">= 88%" | Em "Se você usa relógio de frequência cardíaca": "Até 75% da frequência cardíaca máxima medida", "De 76% a 87%...", "88% ou mais..." | R-INT-01 |
| T05 | Frequência cardíaca (estimada) | "<= 70%", "71-82%", ">= 83%" | "Se a máxima foi estimada (não medida): até 70%", "de 71% a 82%", "83% ou mais" | R-INT-01 |
| T06 | Alvo de esforço (3 treinos fortes) | "7-8 [P]" | "Mire em 7 a 8 (valor inicial do app, ainda sem estudo direto)" | R-SES-50 e R-SES-55, `07-tipos-sessao.md` (alvo de projeto 7-8, `[P]`) |
| T07 | Regra do mais conservador (6 treinos) | "Se os sinais divergirem (fala, esforço, frequência cardíaca), vale a zona mais alta (R-INT-02)." | "Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: então diminua o ritmo." | R-INT-02, `04-controle-intensidade.md:73` |
| T08 | Caminhada e corrida (nota) | "Mesmo critério do GRONORUN: "conversa sem falta de ar". Se os sinais divergirem... (R-INT-02)." | "O ritmo certo é o de conversa, sem falta de ar, como no programa para iniciantes estudado por Buist (2007). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo." | R-INT-02; R-SES-02 cita Buist 2007 |
| T09 | Esforços curtos fortes (Intervalado curto, Intervalado longo, Subidas) | "Em esforços curtos de Z3 o controle é o esforço percebido (CR-10 >= 6) mais o tempo prescrito, não a frequência cardíaca nem o teste da fala (R-INT-07)." | "Nos esforços curtos e fortes, guie-se pelo esforço (6 ou mais, de 0 a 10) e pelo tempo indicado. O relógio de frequência cardíaca e o teste da fala não funcionam bem nesses esforços." | R-INT-07, `04-controle-intensidade.md:83` (Reed 2014) |
| T10 | Fartlek, nível avançado | "Até Z3 (CR-10 6-10), controle por esforço percebido e tempo." | "Pode chegar ao esforço forte (6 a 10, de 0 a 10). Guie-se pelo esforço e pelo tempo." | R-INT-07 |
| T11 | Referência dos estudos (rótulo hoje: "Âncora de ensaio"): Intervalado curto | "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3" | "Nos estudos, os esforços fortes ficaram entre 90% e 95% da frequência cardíaca máxima medida (Helgerud, 2007)." | R-SES-50, `07-tipos-sessao.md:151` |
| T12 | Idem: Intervalado longo | "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3 (>= 88%)" | "Nos estudos, os esforços fortes ficaram entre 90% e 95% da frequência cardíaca máxima medida (Helgerud, 2007)." | R-SES-55, `07-tipos-sessao.md:156` |
| T13 | Idem: Limiar contínuo | "~85% da FCmáx medida (Helgerud 2007) ou até 82% da estimada" | "Nos estudos, o trabalho de limiar ficou perto de 85% da frequência cardíaca máxima medida, ou até 82% da estimada (Helgerud, 2007)." | treino `limiar-continuo`, `07-tipos-sessao.md` |
| T14 | Idem: Rodagem leve | "~70% da FCmáx medida (braço de base de Helgerud 2007)" | "Nos estudos, o treino de base ficou perto de 70% da frequência cardíaca máxima medida (Helgerud, 2007)." | R-SES-21/22, `07-tipos-sessao.md` |
| T15 | Limiar contínuo, limite superior | "Nunca Z3: CR-10 <= 5 e FC < 88% da medida." | "Nunca chegue ao esforço forte: fique em 5 ou menos (de 0 a 10) e abaixo de 88% da frequência cardíaca máxima medida." | treino `limiar-continuo`, `07-tipos-sessao.md` |
| T16 | Longão (nota) | "Se o atleta só conseguir falar frases curtas, a sessão vira Z2 pela regra do mais conservador e o app orienta reduzir o ritmo (R-SES-30)." | "Se você só consegue falar frases curtas, o ritmo está forte demais para um longão: diminua até conseguir conversar." | R-SES-30, `07-tipos-sessao.md:139` |
| T17 | Regenerativo (nota) | "Parte baixa de Z1 (subfaixa CR-10 1-2 - [P]); fala fluente. Se os sinais divergirem... (R-INT-02)." | "Na parte mais leve do esforço leve: de 1 a 2 (de 0 a 10), conversando sem esforço (faixa inicial do app, sem estudo direto). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo." | R-INT-02; treino `regenerativo` |
| T18 | Mobilidade (nota) | "Abaixo de Z1; não conta na distribuição de zonas [P]." | "Esforço abaixo do leve. Não entra na conta das zonas da semana (critério inicial do app)." | treino `mobilidade` |

### 4.2 Limites e cuidados

| ID | Treino | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T19 | Caminhada e corrida | "Isenta do teto semanal de 110% e do teto de sessão de 110% (progressão por tolerância); respeita o teto semanal absoluto de 120% (DEC-14)." | "Na escada, você avança de etapa pelas 3 sessões feitas sem dor e com esforço leve, e não pelo limite de 110%. Mesmo assim, o volume da semana nunca passa de 120% da última semana de construção." | R-PRG-02 (exceção da escada) e R-PRG-04, `05-progressao-carga.md:47,49` |
| T20 | Caminhada e corrida | "O maior bloco contínuo de corrida acima de 8 min não cresce mais de 50% de uma etapa para a seguinte (R-SES-13) [P]." | "O maior bloco contínuo de corrida (acima de 8 min) não cresce mais de 50% de uma etapa para a seguinte; se preciso, entra um degrau intermediário (como o 10b). É um limite inicial do app, sem estudo direto." | R-SES-13, `07-tipos-sessao.md:129` |
| T21 | Caminhada e corrida | "IMC >= 30: começa na etapa 1, mesmo declarando-se corredor sem histórico confirmável (R-SES-06)." | "Com IMC de 30 ou mais, você começa sempre na etapa 1 (a de menor volume), mesmo que já corra, porque o histórico não pode ser confirmado." | R-SES-06, `07-tipos-sessao.md:120` |
| T22 | Fartlek | "O tempo em Z2 e em Z3 do fartlek entra nos tetos semanais de R-DIS-02/03." | "O tempo do fartlek em esforço moderado e forte conta nos limites da semana." | R-DIS-02 e R-DIS-03, `03-distribuicao-intensidade.md:49,59` |
| T23 | Fartlek, Intervalados, Limiar, Subidas (5 treinos) | "Conta como sessão de qualidade (bloco em Z2 ou Z3): nunca em dias consecutivos, com pelo menos 1 sessão Z1 ou descanso entre elas; se estourar o teto semanal de Z2/Z3, o motor encurta o bloco ou troca por Z1 (R-SES-03)." | "É um treino forte (tem trecho em esforço moderado ou forte): nunca em dias seguidos, sempre com pelo menos 1 treino leve ou descanso entre eles. Se a semana passar do limite de esforço, o app encurta o trecho ou troca por treino leve." | R-SES-03, `07-tipos-sessao.md:117` |
| T24 | Longão, Rodagem, Intervalados, Limiar (4 treinos) | "Nenhuma sessão passa de 110% da maior sessão de corrida dos últimos 30 dias; acima disso o motor reduz a sessão ao teto (R-SES-05)." | "Nenhuma corrida passa de 110% da sua maior corrida dos últimos 30 dias; se o plano pedir mais, o app reduz. Um estudo observacional com corredores associou aumentos de uma única corrida acima de 10% a mais lesões (Frandsen, 2025)." | R-SES-05, `07-tipos-sessao.md:119`; R-PRG-02 |
| T25 | Força | "O app não prescreve cargas máximas (1RM) para quem não tem treino de força prévio nem supervisão: a progressão pára no nível B com carga moderada (R-SES-71)." | "O app não indica cargas máximas (1 repetição máxima) para quem não tem treino de força anterior nem supervisão: a progressão para no nível B, com carga moderada. Cargas altas exigem orientação profissional." | R-SES-71, `07-tipos-sessao.md:172` |
| T26 | Intervalado curto | "O tempo total em Z3 da semana respeita R-DIS-02 (<= 12% do tempo semanal no intermediário, <= 15% no avançado)." | "O tempo total em esforço forte (Z3) na semana não passa de 12% do tempo semanal no nível intermediário e de 15% no avançado." | R-DIS-02, `03-distribuicao-intensidade.md:49` |
| T27 | Intervalado longo | "Dentro do limite de 2 sessões de qualidade por semana e do teto semanal de Z3 (R-DIS-02)." | "No máximo 2 treinos fortes por semana, e o tempo em esforço forte respeita o limite da semana (12% no intermediário, 15% no avançado)." | R-SES-03, R-DIS-02 |
| T28 | Limiar contínuo | "O tempo total em Z2 da semana não passa de 15% do tempo semanal (R-DIS-03); o motor reduz o bloco ou troca por `fartlek` se o teto for ultrapassado." | "O tempo total em esforço moderado (Z2) na semana não passa de 15% do tempo semanal. Se passar, o app reduz o bloco ou troca por Fartlek." | R-DIS-03, `03-distribuicao-intensidade.md:59` |
| T29 | Longão | "Não ultrapassa 110% da maior corrida dos últimos 30 dias (R-SES-31)." | "Não passa de 110% da sua maior corrida dos últimos 30 dias." | R-SES-31, `07-tipos-sessao.md:140` |
| T30 | Longão | "Recomenda-se no máximo ~40% do tempo semanal de corrida [P]." | "Recomendamos que o longão não passe de cerca de 40% do tempo semanal de corrida (valor inicial do app, sem estudo direto)." | R-SES-31 |
| T31 | Longão | "Nos planos, vale o menor valor entre este teto e o do plano (R-PLN-11)." | "Nos planos de prova, vale o menor valor entre o limite do longão e o limite do plano." | R-SES-30 e R-PLN-11, `10-planos-objetivo.md:116` |
| T32 | Mobilidade | "Se a região a ser alongada é a mesma da dor relatada, o exercício é removido da sessão e o app orienta procurar um profissional (R-SES-81) [P]." | "Se um exercício alonga a mesma região em que você relatou dor, ele sai da sessão e o app orienta procurar um profissional (critério inicial do app)." | R-SES-81, `07-tipos-sessao.md:178` |
| T33 | Rodagem leve | "Alongamento estático não é prescrito como parte obrigatória (R-SES-02)." | "Alongamento parado não é obrigatório: os estudos não mostraram que ele reduza lesões nem melhore a economia de corrida (Lauersen, 2014; Warneke, 2025)." | R-SES-02, `07-tipos-sessao.md:116` |
| T34 | Subidas | "Entra no teto semanal de Z3 (R-DIS-02)." | "O tempo forte das subidas conta no limite semanal de esforço forte (Z3)." | R-DIS-02 |

### 4.3 Progressão e regressão (nomes de treino no lugar de crases)

| ID | Treino | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T35 | Caminhada e corrida, progressão | "Avançar para a etapa seguinte após as 3 sessões da etapa concluídas sem dor >= 3/10 (limite_dor_progressao) e com intensidade registrada em Z1 (CR-10 <= 3 e fala em frases completas)." | "Você avança para a próxima etapa quando as 3 sessões da etapa foram feitas sem dor de 3 ou mais (de 0 a 10) e com esforço leve (até 3, falando frases completas)." | R-SES-10/11 e R-PRG-06, `05-progressao-carga.md:51` |
| T36 | Caminhada e corrida, ao concluir a etapa 12 | "Passa para `rodagem-leve`." | "Ao concluir a etapa 12, você passa para a Rodagem leve." | R-SES-10/11 |
| T37 | Fartlek, progressão | "`limiar-continuo`, `intervalado-curto` ou `subidas` [P]." | "Depois, podem entrar Limiar contínuo, Intervalado curto ou Subidas (ordem inicial do app, sem estudo direto)." | R-SES-40 e catálogo |
| T38 | Força, progressão | "Nível seguinte após >= 4 semanas sem dor e com execução correta." | "Você passa para o nível seguinte depois de 4 semanas ou mais sem dor e com a execução correta." | R-SES-70/71 |
| T39 | Intervalado curto, progressão | "`intervalado-longo`." | "O próximo passo é o Intervalado longo." | R-SES-50 |
| T40 | Intervalado longo e Subidas, progressão | "+1 repetição a cada 2 semanas até o teto do nível [P]." | "Acrescente 1 repetição a cada 2 semanas, até o máximo do seu nível (critério inicial do app)." | R-SES-55 |
| T41 | Limiar contínuo, progressão | "Aumentar o tempo de bloco em até 5 min, ou passar de 2 para 1 bloco contínuo [P]." | "Aumente o bloco em até 5 minutos, ou troque 2 blocos por 1 bloco contínuo (critério inicial do app)." | treino `limiar-continuo` |
| T42 | Regenerativo, progressão | "`rodagem-leve`." | "O próximo passo é a Rodagem leve." | R-SES-20 |
| T43 | Rodagem leve, progressão | "Aumentar a duração até 110% da maior sessão dos últimos 30 dias, ou passar para `fartlek` quando o atleta cumprir os critérios de entrada na intensidade (R-SES-40)." | "Aumente a duração, sem passar de 110% da sua maior corrida dos últimos 30 dias, ou passe para o Fartlek quando cumprir os critérios para começar a treinar em esforço moderado." | R-SES-22 e R-SES-40, `07-tipos-sessao.md:135,145` |
| T44 | Caminhada e corrida, volta de pausa | "Pausa de 29 dias ou mais: o iniciante recomeça na etapa anterior à última concluída (R-SES-08)." | "Depois de uma pausa de 29 dias ou mais, você recomeça uma etapa antes da última que concluiu." | R-SES-08, `07-tipos-sessao.md:122` |
| T45 | Caminhada e corrida, semana de recuperação | "Repete a etapa anterior com 75% das repetições, sem avançar (DEC-16)." | "Na semana de recuperação, você repete a etapa anterior com 75% das repetições e não avança." | R-PRG-07, `05-progressao-carga.md:52`; DEC-16 |
| T46 | Fartlek, regressão | "`rodagem-leve` [P]." | "Para aliviar: Rodagem leve." | catálogo (`[P]`) |
| T47 | Força, regressão | "Nível anterior ou `mobilidade`." | "Volte ao nível anterior ou faça Mobilidade." | R-SES-70 |
| T48 | Intervalado curto, regressão | "`fartlek`." | "Para aliviar: Fartlek." | R-SES-50 |
| T49 | Intervalado longo, regressão | "`intervalado-curto` [P]." | "Para aliviar: Intervalado curto." | catálogo (`[P]`) |
| T50 | Limiar contínuo, regressão | "`fartlek` (blocos Z2), depois `rodagem-leve` [P]." | "Para aliviar: Fartlek com blocos em esforço moderado e, depois, Rodagem leve." | catálogo (`[P]`) |
| T51 | Longão, regressão | "`rodagem-leve` com a mesma duração reduzida (mínimo 70% do longão planejado)." | "Para aliviar: Rodagem leve, com a duração um pouco menor (no mínimo 70% do longão planejado)." | R-SES-30/31 |
| T52 | Regenerativo, regressão | "`mobilidade` ou descanso." | "Para aliviar: Mobilidade ou descanso." | R-SES-20 |
| T53 | Rodagem leve, regressão | "`regenerativo`, depois `mobilidade` ou descanso." | "Para aliviar: Regenerativo e, depois, Mobilidade ou descanso." | R-SES-22 |
| T54 | Subidas, regressão | "`fartlek` ou `intervalado-curto` no plano [P]." | "Para aliviar: Fartlek ou Intervalado curto, conforme o plano (critério inicial do app)." | catálogo (`[P]`) |

### 4.4 Escada de caminhada e corrida e recuperação ativa

| ID | Onde | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T55 | Escada, ajuste da etapa 2 | "Etapa 2, sessão 3: 2/1,5 x 5 em vez de 2/1,5 x 7 (menor volume, DEC-12)." | **Esconder do atleta** (é nota de auditoria da fonte). Se preferir mostrar: "Na etapa 2, a 3ª sessão tem 5 repetições: a publicação original traz 7, mas o total impresso corresponde a 5, e usamos o menor volume." | DEC-12, `decisoes.md:22` |
| T56 | Escada, ajuste da etapa 11 | "Etapa 11, sessão 3: 20/5 x 1 em vez de 20/5 x 2 (menor volume, DEC-12)." | **Esconder** (ou: "Na etapa 11, a 3ª sessão tem 1 repetição de 20/5: o total impresso na publicação corresponde a esse volume.") | DEC-12 |
| T57 | Escada, degrau 10b | "Degrau 10b inserido entre as etapas 10 e 11 para respeitar R-SES-13 (bloco contínuo cresce no máximo 50% por etapa)." | "Entre as etapas 10 e 11 há um degrau a mais (10b), para o bloco contínuo não crescer mais de 50% de uma vez." | R-SES-13 |
| T58 | Escada, etapas usadas | "1 a 12 mais o degrau 10b [P] (13 degraus); a semana 13 da fonte (só a sessão 1) não é usada." | **Esconder** (auditoria). Para o atleta: "A escada tem 12 etapas, mais um degrau extra (10b)." | `07-tipos-sessao.md` (escada) |
| T59 | Intervalado curto, recuperação | "Recuperação ativa de igual duração (~70% da FCmáx medida) ou, para quem precisar, 2 vezes a duração do esforço." | "Recuperação ativa, em esforço leve (Z1), com a mesma duração do esforço (cerca de 70% da frequência cardíaca máxima medida) ou, se você precisar, com o dobro da duração." | R-SES-50, `07-tipos-sessao.md:151` |
| T60 | Intervalado longo, recuperação | "Recuperação ativa (~70% da FCmáx medida); 3 min no protocolo original." | "Recuperação ativa, em esforço leve (Z1), de 2 a 3 min (no estudo original eram 3 min; cerca de 70% da frequência cardíaca máxima medida)." | R-SES-55, `07-tipos-sessao.md:156` |

### 4.5 Níveis e pré-requisitos

| ID | Onde | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T61 | Fartlek, iniciante | "Só após a etapa 12 da escada e >= 8 semanas de corrida regular (R-SES-40; o prazo de 8 semanas é [P])." | "Só depois de concluir a etapa 12 da escada e de 8 semanas ou mais de corrida regular (o prazo de 8 semanas é critério inicial do app)." | R-SES-40, `07-tipos-sessao.md:145` |
| T62 | Longão, iniciante | "Só após a etapa 12 da escada, ou após uma corrida contínua de 40 min sem dor >= 3/10 para quem entra direto num plano." | "Só depois da etapa 12 da escada, ou depois de uma corrida contínua de 40 min sem dor de 3 ou mais (de 0 a 10), para quem entra direto num plano." | R-SES-30, `07-tipos-sessao.md:139` |
| T63 | Força, avançado | "Força pesada, >= 80% de 1RM, 3-5 repetições" | "Força pesada: 80% ou mais da carga máxima de 1 repetição, em 3 a 5 repetições." | treino `forca-corredor`, `07-tipos-sessao.md` |
| T64 | Força, iniciante | "Progride para 3 séries ao longo de >= 8 semanas." | "Passa para 3 séries ao longo de 8 semanas ou mais." | idem |
| T65 | Força, intermediário | "~70-85% de 1RM, 4-8 repetições, com técnica aprendida" | "Cerca de 70% a 85% da carga máxima de 1 repetição, em 4 a 8 repetições, com a técnica já aprendida." | idem |
| T66 | Força, sem treino prévio ou supervisão | "Sem treino de força prévio nem supervisão (R-SES-71): carga moderada de 8-12 repetições sem falha, em vez de 70-85% de 1RM. O app explica que cargas altas exigem orientação profissional." | "Sem treino de força anterior nem supervisão: use carga moderada, de 8 a 12 repetições sem chegar à falha, em vez de 70% a 85% da carga máxima. Cargas altas exigem orientação profissional." | R-SES-71, `07-tipos-sessao.md:172` |
| T67 | Intervalado longo, avançado | "4 x 4 min (16 min de Z3) exige tempo semanal de corrida >= ~107 min (R-DIS-02)." | "4 x 4 min são 16 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 107 minutos de corrida." | R-SES-55, `07-tipos-sessao.md:156` |
| T68 | Intervalado longo, intermediário | "3 x 3 min (9 min de Z3) exige tempo semanal de corrida >= ~75 min (R-DIS-02)." | "3 x 3 min são 9 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 75 minutos de corrida." | R-SES-55 |

### 4.6 Frequência na semana

| ID | Treino | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T69 | Força | "Em dia diferente das sessões duras de corrida, ou separada por >= 5 h quando for no mesmo dia." | "Faça em um dia diferente das corridas fortes ou, se for no mesmo dia, com pelo menos 5 horas de intervalo." | treino `forca-corredor`, `07-tipos-sessao.md` |
| T70 | Limiar contínuo | "Máximo 1 sessão por semana [P]." | "No máximo 1 sessão por semana (limite inicial do app, sem estudo direto)." | R-SES-03; catálogo (`[P]`) |
| T71 | Mobilidade | "ACSM recomenda flexibilidade em >= 2 dias por semana (Garber 2011); o catálogo prevê 1-2 sessões por semana." | "O Colégio Americano de Medicina do Esporte (ACSM) recomenda exercícios de flexibilidade em pelo menos 2 dias por semana (Garber, 2011); o app propõe 1 a 2 sessões por semana." | `07-tipos-sessao.md` (mobilidade), Garber 2011 |

### 4.7 Base científica (evidência) e demais textos de treino

A seção "Base científica" mostra três listas por treino. Os textos abaixo são os que têm marcador técnico; os outros (47 textos "Autor Ano: resultado") mudam só na apresentação: "Autor, ano" com link para a fonte, e "extrapolação indireta" vira "evidência indireta".

| ID | Treino | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| T72 | Caminhada e corrida (valores iniciais) | "Avanço por tolerância (dor e RPE) em vez de apenas por calendário." | "Avançar de etapa pela tolerância (dor e esforço), e não só pelo calendário." | R-SES-10/11, R-PRG-06 |
| T73 | Fartlek (o que a pesquisa sustenta) | "Intervalos curtos (<= 30 s) são eficazes para o VO2max: Wen 2019 (extrapolação indireta)." | "Intervalos curtos (até 30 segundos) melhoram a capacidade aeróbica máxima (VO2max): Wen (2019). É evidência indireta: o estudo não é sobre fartlek." | `07-tipos-sessao.md` (fartlek), Wen 2019 |
| T74 | Força | "Carga alta e métodos combinados melhoraram a economia; cargas submáximas (40-79% de 1RM) e isometria não foram eficazes: Llanos-Lagos 2024." | "Cargas altas e métodos combinados melhoraram a economia de corrida; cargas submáximas (40% a 79% da carga máxima) e exercícios isométricos não foram eficazes: Llanos-Lagos (2024)." | Llanos-Lagos 2024 |
| T75 | Força | "Dose prática (1-2 séries até 3-6, >= 48 h entre sessões, 2 sessões por semana): Blagrove 2018." | "Dose prática: de 1-2 séries até 3-6 séries, com pelo menos 48 horas entre as sessões e 2 sessões por semana: Blagrove (2018)." | Blagrove 2018 |
| T76 | Força (valores iniciais) | "Pliometria <= ~100 saltos do nível B" | "Pliometria de até cerca de 100 saltos no nível B." | R-SES-70 |
| T77 | Intervalado curto | "Protocolo 15/15 (15 s a 90-95% da FCmáx + 15 s de recuperação ativa a 70%): Helgerud 2007." | "Protocolo 15/15: 15 segundos entre 90% e 95% da frequência cardíaca máxima e 15 segundos de recuperação ativa a 70%: Helgerud (2007)." | Helgerud 2007 |
| T78 | Intervalado curto | "Intervalos curtos (<= 30 s), baixo volume (<= 5 min) e curto prazo (<= 4 semanas) já são eficazes: Wen 2019." | "Intervalos curtos (até 30 s), baixo volume (até 5 min) e curto prazo (até 4 semanas) já são eficazes: Wen (2019)." | Wen 2019 |
| T79 | Intervalado curto (valores iniciais) | "Alvo de projeto CR-10 7-8" | "Esforço alvo de 7 a 8 (de 0 a 10)." | R-SES-50 |
| T80 | Intervalado longo | "Protocolo 4 x 4 min a 90-95% da FCmáx com 3 min de recuperação a 70%: Helgerud 2007." | "Protocolo 4 x 4: 4 minutos entre 90% e 95% da frequência cardíaca máxima, com 3 minutos de recuperação a 70%: Helgerud (2007)." | Helgerud 2007 |
| T81 | Intervalado longo | "Intervalos longos (>= 2 min) e volume >= 15 min dão efeitos maiores: Wen 2019; +0,8-0,9 L/min de VO2max em 6-13 semanas: Bacon 2013." | "Intervalos longos (2 min ou mais) e volume de 15 min ou mais dão efeitos maiores: Wen (2019). Em 6 a 13 semanas, o VO2max subiu de 0,8 a 0,9 L/min: Bacon (2013)." | Wen 2019; Bacon 2013 |
| T82 | Mobilidade | "Recomendação geral do ACSM de flexibilidade >= 2 dias por semana (60 s por exercício): Garber 2011." | "O ACSM recomenda flexibilidade em pelo menos 2 dias por semana (60 segundos por exercício): Garber (2011)." | Garber 2011 |
| T83 | Regenerativo (valores iniciais) | "Subfaixa CR-10 1-2" | "Esforço de 1 a 2 (de 0 a 10)." | treino `regenerativo` |
| T84 | Rodagem leve | "Z1 como base: abaixo do limiar ventilatório (Esteve-Lanao 2007) e ~70% FCmáx (Helgerud 2007)." | "O esforço leve como base: abaixo do limiar ventilatório (o ponto em que a respiração passa a acelerar, Esteve-Lanao 2007) e perto de 70% da frequência cardíaca máxima (Helgerud, 2007)." | Esteve-Lanao 2007; Helgerud 2007 |
| T85 | Aquecimento e volta à calma "Em Z1." (9 treinos) | "Em Z1." | "Em esforço leve (Z1)." | R-SES-02 |
| T86 | Aquecimento e volta à calma, treinos sem duração definida | "Obrigatório antes de qualquer corrida; duração não definida na pesquisa para este treino." | "Faça sempre um aquecimento antes de correr. A pesquisa não define uma duração para este treino." (idem para a volta à calma) | R-SES-02 |
| T87 | "Por que este treino" (11 textos) | Sem código. Termos difíceis: VO2max, limiar, economia de corrida, GRONORUN | **Mantidos.** Só troca "Z1/Z2/Z3" pelo nome do esforço e cria um glossário curto na tela (VO2max, limiar, economia de corrida, frequência cardíaca máxima, 1 repetição máxima). **As definições do glossário eu escrevo a partir da pesquisa e você confere.** | `07-tipos-sessao.md` |

### 4.8 Mensagem do dia (texto do motor)

O texto de decisão já é amigável. Três mudanças: (a) tirar os colchetes com fontes do texto e mostrá-las separadas, (b) explicar **qual** limite agiu quando o treino é ajustado, (c) deixar claro de onde vem o número do bem-estar.

| ID | Quando | Texto atual (sem os colchetes) | Texto proposto | Sustentação |
|---|---|---|---|---|
| M01 | Triagem exige avaliação | "Antes de começar, procure mais orientação. Registre aqui quando um profissional avaliar e liberar você." | Mantido | R-TRI-05, `02-triagem.md` |
| M02 | Triagem vencida | "Sua triagem de saúde venceu ou sua saúde mudou. Refaça o questionário PAR-Q+ para voltar a treinar." | Mantido | R-TRI-10 |
| M03 | Início adiado | "Hoje não tem treino: o início fica adiado (doença aguda ou gravidez). Volte quando estiver bem ou com orientação profissional." | Mantido | R-TRI-09 |
| M04 | Triagem não feita | "Para receber treinos, responda primeiro à triagem de saúde (PAR-Q+)." | Mantido | R-TRI-01 |
| M05 | Doença aguda | "Doença aguda hoje (febre, resfriado): sem treino. É melhor esperar até se sentir bem." | Mantido | R-SON-16 |
| M06 | Pausa aguardando liberação | "Sua pausa foi por dor, lesão ou doença. Procure um profissional de saúde; quando ele liberar, registre aqui para retomar o plano com volta gradual." | Mantido | R-PRG-09 |
| M07 | Sinais de alerta (urgente) | "Pare agora. Dor no peito, falta de ar fora do normal, tontura forte, desmaio ou confusão exigem avaliação médica. Procure atendimento imediatamente; em emergência, ligue 192 (SAMU). O Let's Go Run não faz diagnóstico." | **Mantido sem nenhuma alteração** (segurança) | R-DOR-15, `09-dor.md` |
| M08 | Sintomas que pedem avaliação | "Seus sintomas têm características que precisam de avaliação profissional antes de você voltar a correr. Não podemos dizer o que é; só um profissional pode examinar. Treinos de corrida estão pausados." | Mantido | `09-dor.md` |
| M09 | Dor acima do limite | "Sua dor passou do limite de segurança. Hoje não corra: caminhe ou escolha uma atividade sem dor (bicicleta, água). A corrida volta quando a dor ao caminhar ficar em 2/10 ou menos." | Mantido | R-DOR-04 e R-DOR-10 |
| M10 | Dor que limita os treinos | "Essa dor já vem limitando seus treinos; vale uma avaliação de fisioterapeuta ou médico do esporte. Por ora, o treino de hoje ficou mais leve." | Mantido | `09-dor.md` |
| M11 | Dor muscular tardia | "Dor muscular dos dois lados, que apareceu depois de um treino mais forte, costuma ser dor muscular tardia e melhora em até uma semana. Mantenha leve; se for num ponto só, piorar ou passar de 7 dias, procure um profissional." | Mantido | `09-dor.md` |
| M12 | Dor acima do seguro | "Sua dor ficou acima do que consideramos seguro para treinar forte. Por isso o treino de hoje ficou mais leve. Se a dor continuar ou piorar, procure um fisioterapeuta ou médico do esporte." | Mantido | R-DOR-04 |
| M13 | Sono e bem-estar | "Seu bem-estar está N pontos abaixo da sua média dos últimos 14 dias." | "A soma das suas respostas de bem-estar (qualidade do sono, energia, humor, estresse e dor muscular) está N pontos abaixo da sua média dos últimos 14 dias." | R-SON-04/05, `08-sono-recuperacao.md`; composição em `sleep.ts` |
| M14 | Outros textos de sono | "Houve várias noites ruins seguidas ou nesta semana. O cansaço por falta de sono se acumula e muitas vezes não é percebido." e "Duas das últimas três noites foram ruins." | Mantidos | R-SON-06 |
| M15 | Treino ajustado, sem outro motivo | "Seu treino de hoje foi ajustado para respeitar os limites de progressão." | Passa a dizer **qual** limite, juntando as frases M16 a M21 | R-PRG-02 a R-PRG-08 |
| M16 | Limite de uma corrida | (sem texto; só o código) | "Hoje o treino ficou em N min: nenhuma corrida deve passar de 110% da sua maior corrida dos últimos 30 dias." | R-PRG-02, `05-progressao-carga.md:47` |
| M17 | Limite da semana | (sem texto) | "Esta semana o volume está limitado a N min: o app só deixa o volume crescer até 110% da última semana de construção (regra de cautela do app)." | R-PRG-03, `05-progressao-carga.md:48` |
| M18 | Semana de recuperação | (sem texto) | "Esta é uma semana de recuperação: o volume cai para 75% da última semana de construção e o treino forte vira leve." | R-PRG-07, `05-progressao-carga.md:52` |
| M19 | Depois de pausa | (sem texto) | "Nas duas primeiras semanas depois de uma pausa, o app não inclui esforço forte (Z3)." | R-SES-08, `07-tipos-sessao.md:122` |
| M20 | Intensidade limitada | (sem texto) | "Hoje o treino fica só em esforço leve (Z1), por causa da sua triagem de saúde ou da sua dor." | R-SES-07, `07-tipos-sessao.md` |
| M21 | Volta gradual | (sem texto) | "Depois de uma pausa longa, a volta é gradual: começamos por um treino mais leve." | R-SES-08 |
| M22 | Progressão parada (5 motivos) | (sem texto) | "A progressão está parada esta semana porque: você teve dor de 3 ou mais durante ou depois do treino (ou aumento de 2 pontos na manhã seguinte); houve noites de sono ruins; mais de uma sessão não foi concluída; você correu acima do limite de uma corrida; ou o esforço relatado ficou acima do alvo em 2 de 3 sessões." (só os motivos que valem) | R-PRG-06, `05-progressao-carga.md:51` |
| M23 | Fontes ([Garber 2011] etc.) | Aparecem coladas no fim da frase | Saem da frase e vão para "Base científica deste conselho": "Garber (2011)", com link quando houver | `referencias.md` |

### 4.9 Notas de sessão (não aparecem na tela hoje)

| ID | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|
| N01 | "trocada de {slug}: orçamento de intensidade da semana (R-DIS-02/03)" | "Trocado de {nome do treino}: a semana já atingiu o limite de esforço moderado e forte." | R-DIS-02 e R-DIS-03 |
| N02 | "longão limitado pelo teto do modelo, 40% da semana ou 110% da maior corrida (R-SES-30/31)" | "Longão limitado: não passa do limite do plano, de cerca de 40% do tempo da semana nem de 110% da sua maior corrida recente." | R-SES-30 e R-SES-31 |
| N03 | "semana de recuperação: 75% das repetições" | Mantido | R-PRG-07 |

### 4.10 Rótulos fixos do painel

| ID | Onde | Texto atual | Texto proposto | Sustentação |
|---|---|---|---|---|
| U01 | Treino de hoje, zona | "Zona até Z2" | "Até esforço moderado (Z2)" | R-INT-01 |
| U02 | Treino de hoje, esforço | "Esforço alvo (PSE) 4" | "Esforço alvo: 4 de 10" | R-INT-01 (CR-10) |

### 4.11 Glossário (aprovado em 2026-10-11; definições para você conferir)

**Importante:** a pesquisa **usa** estes termos, mas **não os define** em nenhum lugar. As definições abaixo são os significados gerais e simples, e a coluna "Base na pesquisa" mostra o que na pesquisa se apoia neles. Se você preferir outra redação, é só dizer.

| ID | Termo | Definição proposta (texto do atleta) | Base na pesquisa |
|---|---|---|---|
| G01 | VO2max | "A quantidade máxima de oxigênio que o corpo consegue usar por minuto num esforço intenso. É a medida mais usada da capacidade aeróbica." | Termo usado em `07-tipos-sessao.md:43` (Helgerud 2007: aumentos de 5,5% e 7,2%). A definição é geral |
| G02 | Limiar | "O ponto de esforço em que a resposta do corpo muda; por exemplo, o ponto em que a respiração passa a acelerar. O app usa dois limiares para separar as três zonas: leve, moderada e forte. Existem vários conceitos de limiar e eles diferem entre si (Faude, 2009); por isso o app descreve o limiar por faixa de esforço, e não por um ritmo único." | `03-distribuicao-intensidade.md:3` (zonas definidas pelos dois limiares, LT1/VT1 e LT2/VT2); Faude 2009 (25 conceitos de limiar de lactato); texto do treino Limiar contínuo |
| G03 | Economia de corrida | "Quanto de energia (oxigênio) você gasta para correr numa certa velocidade. Quanto melhor a economia, menos esforço o corpo faz para o mesmo ritmo." | Termo usado em `07-tipos-sessao.md:59` (efeito da força sobre a economia). A definição é geral |
| G04 | Frequência cardíaca máxima | "O maior número de batimentos por minuto que o seu coração atinge num esforço máximo. Pode ser medida (em teste de esforço) ou estimada por fórmula. A estimada erra, em média, cerca de 10 batimentos por minuto; por isso, as faixas em % da estimada são só uma aproximação." | `04-controle-intensidade.md:7` (erro padrão de 10,8 bpm no estudo HUNT; zonas por % da estimada "são só aproximadas") |
| G05 | 1RM (uma repetição máxima) | "A maior carga com que você consegue fazer um exercício uma única vez, com boa técnica. As cargas de força são indicadas como porcentagem dela." | Termo usado em `07-tipos-sessao.md:59` e R-SES-71. A definição é geral |
| G06 | Esforço percebido (0 a 10) | "Uma nota que você dá ao esforço do treino, de 0 a 10: 3 é moderado, 5 é difícil e 7 é muito difícil. É a escala CR-10 de Foster." | R-INT-06 e R-CRG-01. **A tradução dos rótulos para o português é própria e não validada** (nota da própria pesquisa) |
| G07 | Teste da fala | "Fale uma frase em voz alta enquanto corre. Se conseguir sem parar para respirar, o esforço é leve (Z1); se só consegue frases curtas, é moderado (Z2); se não consegue, é forte (Z3)." | R-INT-05, `04-controle-intensidade.md:79` (Jeanes 2011; Woltmann 2015) |

*G06 e G07 não estavam na sua lista: acrescentei porque aparecem em quase todo treino e são o centro do controle de esforço. Pode recusar.*

## 5. Como aprovar (explicação simples) e o que já foi decidido

**O que é "aprovar por ID".** Cada linha das tabelas tem um código curto na primeira coluna (T01, T02... M01, M02...). Você me diz quais aprova e quais quer mudar, citando só os códigos. Exemplos de resposta válida:
- "Aprovo tudo." (eu aplico todos)
- "Aprovo tudo, menos T08 e T30." (eu pergunto o que você prefere nesses dois)
- "Aprovo T01 a T34. Em T35 quero que diga 'sem dor forte' em vez de 'sem dor de 3 ou mais'." (eu ajusto e aplico)
- Se for mais fácil: "aprovo a seção 4.2 e 4.3" (seções inteiras).

Você não precisa de mais que isso. Nada é aplicado antes da sua resposta.

**Decisões de apresentação (aprovadas por você em 2026-10-11):**
1. Escala de Borg escondida do atleta (T03).
2. Ajustes da escada escondidos do atleta e mantidos só na auditoria (T55, T56, T58).
3. Frequência cardíaca só no bloco "Se você usa relógio de frequência cardíaca" (T04, T05).
4. Glossário: definições escritas a partir da pesquisa para você conferir (seção 4.11).

**Limites do que eu consigo garantir:** as frases propostas mantêm os mesmos fatos e números dos textos atuais e das regras citadas. Onde a pesquisa marca um valor como `[P]` (ponto de partida aceito por você em 2026-10-10), o texto diz "valor inicial do app, ainda sem estudo direto". Isso é intencional.

Depois da sua aprovação, a sequência é: bloco `atleta` no seed e na API, testes que bloqueiam código e marcador técnico no texto do atleta, mensagem do dia sem colchetes, ajuste dos rótulos do painel, e então a tradução para inglês.
