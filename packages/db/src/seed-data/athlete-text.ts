// Texto do catálogo para o atleta (docs/textos-para-o-atleta.md, aprovado em 2026-10-11).
//
// O catálogo técnico (`structure`) guarda códigos de regra, `[P]`, siglas e nomes de treino entre
// crases: serve ao motor e à auditoria. O atleta lê só o bloco `structure.atleta`, gerado aqui:
//  - `REWRITE` traz, texto por texto, a redação aprovada (mesmos fatos e mesmos números);
//  - `plain()` aplica só trocas mecânicas seguras (zonas com nome, "Autor (ano)", "<=" etc.);
//  - os testes da API falham se sobrar código de regra, `[P]`, crase, sigla ou "Autor 2007" sem
//    parênteses em qualquer texto do atleta, então um texto novo no catálogo sem redação aprovada
//    é pego antes de chegar à tela.
// Nada aqui cria treino, limite ou número: só reescreve o que o catálogo já tem.

export type Fact = { label: string; value: string };
export type AthleteStep = { minutes: string | null; text: string | null; facts: Fact[] };
export type AthleteGroup = { title: string | null; zone: string | null; facts: Fact[]; watch: Fact[] };
export type AthleteLevel = "iniciante" | "intermediario" | "avancado";
export type AthleteText = {
  summary: string | null;
  intensity: { groups: AthleteGroup[]; notes: string[]; studies: string[] } | null;
  how: { warmup: AthleteStep | null; main: AthleteStep | null; cooldown: AthleteStep | null };
  levels: Partial<Record<AthleteLevel, Fact[]>>;
  frequency: Fact[];
  limits: string[];
  progression: string[];
  regression: string[];
  evidence: { direct: string[]; initial: string[]; insufficient: string[] };
};

const INITIAL = "Valor inicial do app, ainda sem estudo direto";

/** Redação aprovada, por texto atual do catálogo. */
export const REWRITE: Record<string, string> = {
  // --- Intensidade (T07 a T18)
  "Se os sinais divergirem (fala, esforço, frequência cardíaca), vale a zona mais alta (R-INT-02).":
    "Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: então diminua o ritmo.",
  'Mesmo critério do GRONORUN: "conversa sem falta de ar". Se os sinais divergirem (fala, esforço, frequência cardíaca), vale a zona mais alta (R-INT-02).':
    "O ritmo certo é o de conversa, sem falta de ar, como no programa para iniciantes estudado por Buist (2007). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo.",
  "Em esforços curtos de Z3 o controle é o esforço percebido (CR-10 >= 6) mais o tempo prescrito, não a frequência cardíaca nem o teste da fala (R-INT-07).":
    "Nos esforços curtos e fortes, guie-se pelo esforço (6 ou mais, de 0 a 10) e pelo tempo indicado. O relógio de frequência cardíaca e o teste da fala não funcionam bem nesses esforços.",
  "Até Z3 (CR-10 6-10), controle por esforço percebido e tempo.":
    "Pode chegar ao esforço forte (6 a 10, de 0 a 10). Guie-se pelo esforço e pelo tempo.",
  "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3":
    "Nos estudos, os esforços fortes ficaram entre 90% e 95% da frequência cardíaca máxima medida (Helgerud, 2007).",
  "90-95% da FCmáx medida (Helgerud 2007), dentro de Z3 (>= 88%)":
    "Nos estudos, os esforços fortes ficaram entre 90% e 95% da frequência cardíaca máxima medida (Helgerud, 2007).",
  "~85% da FCmáx medida (Helgerud 2007) ou até 82% da estimada":
    "Nos estudos, o trabalho de limiar ficou perto de 85% da frequência cardíaca máxima medida, ou até 82% da estimada (Helgerud, 2007).",
  "~70% da FCmáx medida (braço de base de Helgerud 2007)":
    "Nos estudos, o treino de base ficou perto de 70% da frequência cardíaca máxima medida (Helgerud, 2007).",
  "Nunca Z3: CR-10 <= 5 e FC < 88% da medida.":
    "Nunca chegue ao esforço forte: fique em 5 ou menos (de 0 a 10) e abaixo de 88% da frequência cardíaca máxima medida.",
  "Se o atleta só conseguir falar frases curtas, a sessão vira Z2 pela regra do mais conservador e o app orienta reduzir o ritmo (R-SES-30).":
    "Se você só consegue falar frases curtas, o ritmo está forte demais para um longão: diminua até conseguir conversar.",
  "Parte baixa de Z1 (subfaixa CR-10 1-2 é [P]); fala fluente. Se os sinais divergirem (fala, esforço, frequência cardíaca), vale a zona mais alta (R-INT-02).":
    "Na parte mais leve do esforço leve: de 1 a 2 (de 0 a 10), conversando sem esforço (faixa inicial do app, sem estudo direto). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo.",
  "Iniciante: não (Z3 = 0%).":
    "Iniciantes não fazem este treino: para eles, o tempo em esforço forte é 0%.",
  "Abaixo de Z1; não conta na distribuição de zonas [P].":
    "Esforço abaixo do leve. Não entra na conta das zonas da semana (critério inicial do app).",
  "7-8 [P]": "7 a 8 (valor inicial do app, ainda sem estudo direto)",
  "Parte alta de Z2": "Parte alta do esforço moderado (Z2)",
  "Não se aplica zona de corrida (Z1/Z2/Z3).": "Não se aplica zona de esforço (leve, moderado ou forte).",

  // --- Limites (T19 a T34)
  "Isenta do teto semanal de 110% e do teto de sessão de 110% (progressão por tolerância); respeita o teto semanal absoluto de 120% (DEC-14).":
    "Na escada, você avança de etapa pelas 3 sessões feitas sem dor e com esforço leve, e não pelo limite de 110%. Mesmo assim, o volume da semana nunca passa de 120% da última semana de construção.",
  "O maior bloco contínuo de corrida acima de 8 min não cresce mais de 50% de uma etapa para a seguinte (R-SES-13) [P].":
    "O maior bloco contínuo de corrida (acima de 8 min) não cresce mais de 50% de uma etapa para a seguinte; se preciso, entra um degrau intermediário (como o 10b). É um limite inicial do app, sem estudo direto.",
  "IMC >= 30: começa na etapa 1, mesmo declarando-se corredor sem histórico confirmável (R-SES-06).":
    "Com IMC de 30 ou mais, você começa sempre na etapa 1 (a de menor volume), mesmo que já corra, porque o histórico não pode ser confirmado.",
  "O tempo em Z2 e em Z3 do fartlek entra nos tetos semanais de R-DIS-02/03.":
    "O tempo do fartlek em esforço moderado e forte conta nos limites da semana.",
  "Conta como sessão de qualidade (bloco em Z2 ou Z3): nunca em dias consecutivos, com pelo menos 1 sessão Z1 ou descanso entre elas; se estourar o teto semanal de Z2/Z3, o motor encurta o bloco ou troca por Z1 (R-SES-03).":
    "É um treino forte (tem trecho em esforço moderado ou forte): nunca em dias seguidos, sempre com pelo menos 1 treino leve ou descanso entre eles. Se a semana passar do limite de esforço, o app encurta o trecho ou troca por treino leve.",
  "Nenhuma sessão passa de 110% da maior sessão de corrida dos últimos 30 dias; acima disso o motor reduz a sessão ao teto (R-SES-05).":
    "Nenhuma corrida passa de 110% da sua maior corrida dos últimos 30 dias; se o plano pedir mais, o app reduz. Um estudo observacional com corredores associou aumentos de uma única corrida acima de 10% a mais lesões (Frandsen, 2025).",
  "O app não prescreve cargas máximas (1RM) para quem não tem treino de força prévio nem supervisão: a progressão pára no nível B com carga moderada (R-SES-71).":
    "O app não indica cargas máximas (1 repetição máxima) para quem não tem treino de força anterior nem supervisão: a progressão para no nível B, com carga moderada. Cargas altas exigem orientação profissional.",
  "O tempo total em Z3 da semana respeita R-DIS-02 (<= 12% do tempo semanal no intermediário, <= 15% no avançado).":
    "O tempo total em esforço forte (Z3) na semana não passa de 12% do tempo semanal no nível intermediário e de 15% no avançado.",
  "Dentro do limite de 2 sessões de qualidade por semana e do teto semanal de Z3 (R-DIS-02).":
    "No máximo 2 treinos fortes por semana, e o tempo em esforço forte respeita o limite da semana (12% no intermediário, 15% no avançado).",
  "O tempo total em Z2 da semana não passa de 15% do tempo semanal (R-DIS-03); o motor reduz o bloco ou troca por `fartlek` se o teto for ultrapassado.":
    "O tempo total em esforço moderado (Z2) na semana não passa de 15% do tempo semanal. Se passar, o app reduz o bloco ou troca por Fartlek.",
  "Não ultrapassa 110% da maior corrida dos últimos 30 dias (R-SES-31).":
    "Não passa de 110% da sua maior corrida dos últimos 30 dias.",
  "Recomenda-se no máximo ~40% do tempo semanal de corrida [P].":
    "Recomendamos que o longão não passe de cerca de 40% do tempo semanal de corrida (valor inicial do app, sem estudo direto).",
  "Nos planos, vale o menor valor entre este teto e o do plano (R-PLN-11).":
    "Nos planos de prova, vale o menor valor entre o limite do longão e o limite do plano.",
  "Se a região a ser alongada é a mesma da dor relatada, o exercício é removido da sessão e o app orienta procurar um profissional (R-SES-81) [P].":
    "Se um exercício alonga a mesma região em que você relatou dor, ele sai da sessão e o app orienta procurar um profissional (critério inicial do app).",
  "Alongamento estático não é prescrito como parte obrigatória (R-SES-02).":
    "Alongamento parado não é obrigatório: os estudos não mostraram que ele reduza lesões nem melhore a economia de corrida (Lauersen, 2014; Warneke, 2025).",
  "Entra no teto semanal de Z3 (R-DIS-02).": "O tempo forte das subidas conta no limite semanal de esforço forte (Z3).",

  // --- Progressão e regressão (T35 a T54)
  "Avançar para a etapa seguinte após as 3 sessões da etapa concluídas sem dor >= 3/10 (limite_dor_progressao) e com intensidade registrada em Z1 (CR-10 <= 3 e fala em frases completas).":
    "Você avança para a próxima etapa quando as 3 sessões da etapa foram feitas sem dor de 3 ou mais (de 0 a 10) e com esforço leve (até 3, falando frases completas).",
  "Passa para `rodagem-leve`.": "Ao concluir a etapa 12, você passa para a Rodagem leve.",
  "`limiar-continuo`, `intervalado-curto` ou `subidas` [P].":
    "Depois, podem entrar Limiar contínuo, Intervalado curto ou Subidas (ordem inicial do app, sem estudo direto).",
  "Nível seguinte após >= 4 semanas sem dor e com execução correta.":
    "Você passa para o nível seguinte depois de 4 semanas ou mais sem dor e com a execução correta.",
  "`intervalado-longo`.": "O próximo passo é o Intervalado longo.",
  "+1 repetição a cada 2 semanas até o teto do nível [P].":
    "Acrescente 1 repetição a cada 2 semanas, até o máximo do seu nível (critério inicial do app).",
  "Aumentar o tempo de bloco em até 5 min, ou passar de 2 para 1 bloco contínuo [P].":
    "Aumente o bloco em até 5 minutos, ou troque 2 blocos por 1 bloco contínuo (critério inicial do app).",
  "`rodagem-leve`.": "O próximo passo é a Rodagem leve.",
  "Aumentar a duração até 110% da maior sessão dos últimos 30 dias, ou passar para `fartlek` quando o atleta cumprir os critérios de entrada na intensidade (R-SES-40).":
    "Aumente a duração, sem passar de 110% da sua maior corrida dos últimos 30 dias, ou passe para o Fartlek quando cumprir os critérios para começar a treinar em esforço moderado.",
  "Pausa de 29 dias ou mais: o iniciante recomeça na etapa anterior à última concluída (R-SES-08).":
    "Depois de uma pausa de 29 dias ou mais, você recomeça uma etapa antes da última que concluiu.",
  "Repete a etapa anterior com 75% das repetições, sem avançar (DEC-16).":
    "Na semana de recuperação, você repete a etapa anterior com 75% das repetições e não avança.",
  "`rodagem-leve` [P].": "Rodagem leve.",
  "Nível anterior ou `mobilidade`.": "Volte ao nível anterior ou faça Mobilidade.",
  "`fartlek`.": "Fartlek.",
  "`intervalado-curto` [P].": "Intervalado curto.",
  "`fartlek` (blocos Z2), depois `rodagem-leve` [P].":
    "Fartlek com blocos em esforço moderado e, depois, Rodagem leve.",
  "`rodagem-leve` com a mesma duração reduzida (mínimo 70% do longão planejado).":
    "Rodagem leve, com a duração um pouco menor (no mínimo 70% do longão planejado).",
  "`mobilidade` ou descanso.": "Mobilidade ou descanso.",
  "`regenerativo`, depois `mobilidade` ou descanso.": "Regenerativo e, depois, Mobilidade ou descanso.",
  "`fartlek` ou `intervalado-curto` no plano [P].":
    "Fartlek ou Intervalado curto, conforme o plano (critério inicial do app).",

  // --- Escada e recuperação ativa (T55 a T60)
  "Degrau 10b inserido entre as etapas 10 e 11 para respeitar R-SES-13 (bloco contínuo cresce no máximo 50% por etapa).":
    "Entre as etapas 10 e 11 há um degrau a mais (10b), para o bloco contínuo não crescer mais de 50% de uma vez.",
  "Buist 2007, Tabela 2 (programa de 13 semanas), conferida no texto completo.":
    "Buist (2007), Tabela 2 (programa de 13 semanas).",
  "Recuperação ativa de igual duração (~70% da FCmáx medida) ou, para quem precisar, 2 vezes a duração do esforço.":
    "Recuperação ativa, em esforço leve (Z1), com a mesma duração do esforço (cerca de 70% da frequência cardíaca máxima medida) ou, se você precisar, com o dobro da duração.",
  "Recuperação ativa (~70% da FCmáx medida); 3 min no protocolo original.":
    "Recuperação ativa, em esforço leve (Z1), de 2 a 3 min (no estudo original eram 3 min; cerca de 70% da frequência cardíaca máxima medida).",

  // --- Níveis, pré-requisitos e frequência (T61 a T71)
  "Só após a etapa 12 da escada e >= 8 semanas de corrida regular (R-SES-40; o prazo de 8 semanas é [P]).":
    "Só depois de concluir a etapa 12 da escada e de 8 semanas ou mais de corrida regular (o prazo de 8 semanas é critério inicial do app).",
  "Só após a etapa 12 da escada, ou após uma corrida contínua de 40 min sem dor >= 3/10 para quem entra direto num plano.":
    "Só depois da etapa 12 da escada, ou depois de uma corrida contínua de 40 min sem dor de 3 ou mais (de 0 a 10), para quem entra direto num plano.",
  "Força pesada, >= 80% de 1RM, 3-5 repetições":
    "Força pesada: 80% ou mais da carga máxima de 1 repetição, em 3 a 5 repetições.",
  "Progride para 3 séries ao longo de >= 8 semanas.": "Passa para 3 séries ao longo de 8 semanas ou mais.",
  "~70-85% de 1RM, 4-8 repetições, com técnica aprendida":
    "Cerca de 70% a 85% da carga máxima de 1 repetição, em 4 a 8 repetições, com a técnica já aprendida.",
  "Sem treino de força prévio nem supervisão (R-SES-71): carga moderada de 8-12 repetições sem falha, em vez de 70-85% de 1RM. O app explica que cargas altas exigem orientação profissional.":
    "Sem treino de força anterior nem supervisão: use carga moderada, de 8 a 12 repetições sem chegar à falha, em vez de 70% a 85% da carga máxima. Cargas altas exigem orientação profissional.",
  "4 x 4 min (16 min de Z3) exige tempo semanal de corrida >= ~107 min (R-DIS-02).":
    "4 x 4 min são 16 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 107 minutos de corrida.",
  "3 x 3 min (9 min de Z3) exige tempo semanal de corrida >= ~75 min (R-DIS-02).":
    "3 x 3 min são 9 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 75 minutos de corrida.",
  "Em dia diferente das sessões duras de corrida, ou separada por >= 5 h quando for no mesmo dia.":
    "Faça em um dia diferente das corridas fortes ou, se for no mesmo dia, com pelo menos 5 horas de intervalo.",
  "Máximo 1 sessão por semana [P].": "No máximo 1 sessão por semana (limite inicial do app, sem estudo direto).",
  "ACSM recomenda flexibilidade em >= 2 dias por semana (Garber 2011); o catálogo prevê 1-2 sessões por semana.":
    "O Colégio Americano de Medicina do Esporte (ACSM) recomenda exercícios de flexibilidade em pelo menos 2 dias por semana (Garber, 2011); o app propõe 1 a 2 sessões por semana.",
  "Máximo de 1 sessão por semana": "No máximo 1 sessão por semana",

  // --- Base científica (T72 a T84)
  "Avanço por tolerância (dor e RPE) em vez de apenas por calendário.":
    "Avançar de etapa pela tolerância (dor e esforço), e não só pelo calendário.",
  "Intervalos curtos (<= 30 s) são eficazes para o VO2max: Wen 2019 (extrapolação indireta).":
    "Intervalos curtos (até 30 segundos) melhoram a capacidade aeróbica máxima (VO2max): Wen (2019). É evidência indireta: o estudo não é sobre fartlek.",
  "Carga alta e métodos combinados melhoraram a economia; cargas submáximas (40-79% de 1RM) e isometria não foram eficazes: Llanos-Lagos 2024.":
    "Cargas altas e métodos combinados melhoraram a economia de corrida; cargas submáximas (40% a 79% da carga máxima) e exercícios isométricos não foram eficazes: Llanos-Lagos (2024).",
  "Dose prática (1-2 séries até 3-6, >= 48 h entre sessões, 2 sessões por semana): Blagrove 2018.":
    "Dose prática: de 1-2 séries até 3-6 séries, com pelo menos 48 horas entre as sessões e 2 sessões por semana: Blagrove (2018).",
  "Pliometria <= ~100 saltos do nível B": "Pliometria de até cerca de 100 saltos no nível B.",
  "Protocolo 15/15 (15 s a 90-95% da FCmáx + 15 s de recuperação ativa a 70%): Helgerud 2007.":
    "Protocolo 15/15: 15 segundos entre 90% e 95% da frequência cardíaca máxima e 15 segundos de recuperação ativa a 70%: Helgerud (2007).",
  "Intervalos curtos (<= 30 s), baixo volume (<= 5 min) e curto prazo (<= 4 semanas) já são eficazes: Wen 2019.":
    "Intervalos curtos (até 30 s), baixo volume (até 5 min) e curto prazo (até 4 semanas) já são eficazes: Wen (2019).",
  "Alvo de projeto CR-10 7-8": "Esforço alvo de 7 a 8 (de 0 a 10).",
  "Protocolo 4 x 4 min a 90-95% da FCmáx com 3 min de recuperação a 70%: Helgerud 2007.":
    "Protocolo 4 x 4: 4 minutos entre 90% e 95% da frequência cardíaca máxima, com 3 minutos de recuperação a 70%: Helgerud (2007).",
  "Intervalos longos (>= 2 min) e volume >= 15 min dão efeitos maiores: Wen 2019; +0,8-0,9 L/min de VO2max em 6-13 semanas: Bacon 2013.":
    "Intervalos longos (2 min ou mais) e volume de 15 min ou mais dão efeitos maiores: Wen (2019). Em 6 a 13 semanas, o VO2max subiu de 0,8 a 0,9 L/min: Bacon (2013).",
  "Recomendação geral do ACSM de flexibilidade >= 2 dias por semana (60 s por exercício): Garber 2011.":
    "O ACSM recomenda flexibilidade em pelo menos 2 dias por semana (60 segundos por exercício): Garber (2011).",
  "Subfaixa CR-10 1-2": "Esforço de 1 a 2 (de 0 a 10).",
  "Z1 como base: abaixo do limiar ventilatório (Esteve-Lanao 2007) e ~70% FCmáx (Helgerud 2007).":
    "O esforço leve como base: abaixo do limiar ventilatório (o ponto em que a respiração passa a acelerar, Esteve-Lanao, 2007) e perto de 70% da frequência cardíaca máxima (Helgerud, 2007).",

  // --- Termos estatísticos da base científica, em palavras (mesmos números)
  "Picos de uma única sessão acima de 10% da maior corrida de 30 dias: mais lesão (HRR 1,64 a 2,28), enquanto razões semanais de carga não se associaram: Frandsen 2025 (observacional; distância autorrelatada; idade média 45,8 anos).":
    "Aumentos de uma única corrida acima de 10% sobre a maior corrida dos últimos 30 dias se associaram a mais lesões (taxa de lesão de 1,64 a 2,28 vezes maior), enquanto as variações semanais de carga não se associaram: Frandsen (2025). É um estudo observacional, com distância relatada pelos próprios corredores e idade média de 45,8 anos.",
  "Força melhora a economia de corrida em corredores (SMD -1,42): Balsalobre-Fernández 2016; revisão sistemática com 24 estudos: Blagrove 2018.":
    "O treino de força melhorou a economia de corrida em corredores, com efeito grande: Balsalobre-Fernández (2016); revisão sistemática com 24 estudos: Blagrove (2018).",
  "Força reduz lesões esportivas em geral (RR 0,338): Lauersen 2018 (extrapolação indireta para corrida).":
    "O treino de força reduziu lesões esportivas em geral (o risco ficou em cerca de um terço): Lauersen (2018). É evidência indireta para corrida.",
  "Intervalado em subida melhorou o 5 km em 2,0% (±0,6%); a intensidade mais alta foi a melhor para a economia de corrida: Barnes 2013 (n = 20, bem treinados).":
    "O treino intervalado em subida melhorou o tempo de 5 km em 2,0% (±0,6%); a intensidade mais alta foi a melhor para a economia de corrida: Barnes (2013), com 20 corredores bem treinados.",
  "Modelo polarizado teve melhor desempenho que o de limiar em atletas treinados (3 ensaios): Rosenblat 2019.":
    "O modelo polarizado (que evita o esforço moderado e concentra o treino no leve e no forte) teve melhor desempenho que o modelo de limiar em atletas treinados (3 estudos): Rosenblat (2019).",
  "Escada de etapas 1 a 12 (exceto os ajustes P): Buist 2007, Tabela 2.":
    "Escada de etapas 1 a 12 (exceto os ajustes de volume e o degrau 10b, que são valores iniciais do app): Buist (2007), Tabela 2.",
  "Apoio indireto: recuperação ativa reduziu a dor muscular tardia em meta-análise (Dupuy 2018), que não define corrida regenerativa e aponta a massagem como a técnica mais eficaz.":
    "Apoio indireto: em uma revisão com vários estudos (meta-análise), a recuperação ativa reduziu a dor muscular tardia (Dupuy, 2018). Ela não define corrida regenerativa e aponta a massagem como a técnica mais eficaz.",

  // --- Aquecimento e volta à calma sem duração definida (T86)
  "Obrigatório antes de qualquer corrida; duração não definida na pesquisa para este treino.":
    "Faça sempre um aquecimento antes de correr. A pesquisa não define uma duração para este treino.",
  "Obrigatório após qualquer corrida; duração não definida na pesquisa para este treino.":
    "Faça sempre a volta à calma depois de correr. A pesquisa não define uma duração para este treino.",
  "Obrigatório; a duração para este treino não é definida na pesquisa (5 min de caminhada rápida para iniciante).":
    "Faça sempre a volta à calma. A pesquisa não define uma duração para este treino (para iniciante, 5 min de caminhada rápida).",
};

const LABELS: Record<string, string> = {
  alvo: "Faixa",
  base: "Base",
  blocos: "Blocos",
  carga: "Carga",
  descanso: "Descanso",
  duracaoDoBlocoSemanas: "Duração do bloco (semanas)",
  duracaoMaxPlanos21e42kmMin: "Duração máxima nos planos de 21 e 42 km (min)",
  duracaoMin: "Duração (min)",
  emPeriodoDeProva: "Sessões em período de prova",
  evidencia: "Base",
  exemplo: "Exemplo",
  exercicios: "Exercícios",
  formato: "Formato",
  frequenciaSemanal: "Frequência semanal",
  grupos: "Grupos trabalhados",
  intervaloMinimoEntreSessoesHoras: "Intervalo mínimo entre sessões (h)",
  manutencao: "Manutenção",
  minutos: "Minutos",
  minutosPorBloco: "Minutos por bloco",
  nivelDeForca: "Nível de força",
  nota: "Observação",
  numeroDeBlocos: "Número de blocos",
  opcoes: "Opções",
  pliometria: "Pliometria",
  posicaoNaSemana: "Posição na semana",
  prerequisito: "Pré-requisito",
  progressao: "Progressão",
  protocolo: "Protocolo",
  recuperacao: "Recuperação",
  repeticaoMinutos: "Duração de cada repetição (min)",
  repeticaoSegundos: "Duração de cada repetição (s)",
  repeticoes: "Repetições",
  semTreinoPrevioOuSupervisao: "Sem treino prévio ou supervisão",
  segundosPorExercicio: "Segundos por exercício",
  series: "Séries",
  sessoes: "Sessões por semana",
  sessoesDeQualidadePorSemanaMax: "Treinos fortes por semana (máx.)",
  sessoesHiitPorSemanaMax: "Treinos intensos por semana (máx.)",
  sessoesPorEtapa: "Sessões por etapa",
  sessoesPorSemana: "Sessões por semana",
  sprintsCurtos: "Sprints curtos",
  tempoSemanalDeCorridaMinimoMin: "Tempo semanal de corrida mínimo (min)",
  trabalhoTotalMin: "Trabalho total em esforço forte (min)",
  volumeZ3Min: "Volume em esforço forte (min)",
  volumeZ3MinAte: "Volume em esforço forte, até (min)",
  zona: "Zona",
  fonte: "Fonte",
  ate: "Até",
  de: "De",
};

const ZONE_NAME: Record<string, string> = { Z1: "leve", Z2: "moderado", Z3: "forte" };
export const zoneLabel = (z: string) => (ZONE_NAME[z] ? `Esforço ${ZONE_NAME[z]} (${z})` : z);
const zoneWord = (z: string) => (ZONE_NAME[z] ? `esforço ${ZONE_NAME[z]} (${z})` : z);

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Tira códigos de regra e troca símbolos e siglas por palavras. Só para texto sem redação aprovada. */
function mechanical(text: string, names: Map<string, string>): string {
  return text
    .replace(/\s*\((?:R-[A-Z]{3}-\d+(?:[/,]\s*\d+)*|DEC-\d+)\)/g, "")
    .replace(/`([a-z0-9-]+)`/g, (_, slug: string) => names.get(slug) ?? slug)
    .replace(/<=/g, "até")
    .replace(/>=/g, "pelo menos")
    .replace(/~/g, "cerca de ")
    .replace(/FCmáx/g, "frequência cardíaca máxima")
    .replace(/extrapolação indireta/g, "evidência indireta")
    .replace(/\bHIIT\b/g, "treino intervalado intenso")
    .replace(/\bensaios\b/g, "estudos")
    .replace(/\bensaio\b/g, "estudo")
    .replace(/\bTetos\b/g, "Limites")
    .replace(/\bTeto\b/g, "Limite")
    .replace(/\btetos\b/g, "limites")
    .replace(/\bteto\b/g, "limite")
    .replace(/\(([A-ZÀ-Ú][\p{L}-]+) (\d{4}[a-c]?)\)/gu, "($1, $2)")
    .replace(/(?<!\()\b([A-ZÀ-Ú][\p{L}-]+) (\d{4}[a-c]?)\b/gu, "$1 ($2)")
    .replace(/(?<!\()\bZ([123])\b(?!\))/g, (_, n: string) => zoneWord(`Z${n}`));
}

export function makePlain(names: Map<string, string>) {
  return (text: string): string => REWRITE[text] ?? mechanical(text, names);
}

type Plain = (t: string) => string;

const num = (n: number) => String(n).replace(".", ",");

/** Valor de um campo do catálogo, em texto corrido. */
function value(key: string, v: unknown, plain: Plain): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return num(v);
  if (typeof v === "string") {
    if (key === "evidencia") return v === "P" ? INITIAL : cap(plain(`Base: ${v}`).replace(/^Base: /, ""));
    if (key === "zona") return cap(v.replace(/\bZ([123])\b/g, (_, n: string) => zoneWord(`Z${n}`)));
    return cap(plain(v));
  }
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "number")) return v.length === 2 ? `${num(v[0] as number)} a ${num(v[1] as number)}` : v.map((x) => num(x as number)).join(", ");
    if (v.every((x) => typeof x === "string")) {
      const items = v.map((x) => plain(x as string));
      return items.every((x) => x.length < 30) ? items.join(", ") : items.join("; ");
    }
    return v.map((x) => value(key, x, plain)).filter(Boolean).join(" ou ");
  }
  if (isObj(v)) {
    // {minutos, repeticoes}: "4 repetições de 4 min"
    if (key !== "recuperacao" && typeof v.minutos === "number" && typeof v.repeticoes === "number" && Object.keys(v).length === 2) {
      return `${v.repeticoes} repetições de ${num(v.minutos)} min`;
    }
    // opção de bloco do limiar
    if ("blocos" in v && "minutosPorBloco" in v) {
      const blocks = v.blocos as number;
      const each = value("minutosPorBloco", v.minutosPorBloco, plain);
      const jog = typeof v.trotePorEntreBlocosMin === "number" ? `, com ${num(v.trotePorEntreBlocosMin)} min de trote entre os blocos` : "";
      return `${blocks} ${blocks === 1 ? "bloco" : "blocos"} de ${each} min${jog}`;
    }
    return facts(v, plain)
      .map((f) => `${f.label}: ${f.value}`)
      .join("; ");
  }
  return null;
}

const HIDDEN = new Set(["etapas", "ajustesP", "etapasUsadas", "unidade", "borg6a20"]);

/** Campos do catálogo como "rótulo: valor". */
function facts(o: Record<string, unknown>, plain: Plain, exclude: string[] = []): Fact[] {
  const out: Fact[] = [];
  for (const [key, v] of Object.entries(o)) {
    if (HIDDEN.has(key) || exclude.includes(key)) continue;
    const text = value(key, v, plain);
    if (text === null || text === "") continue;
    const label = LABELS[key];
    if (!label) throw new Error(`athlete-text: campo "${key}" do catálogo sem rótulo aprovado`);
    out.push({ label, value: text });
  }
  return out;
}

function minutesOf(v: unknown): string | null {
  if (typeof v === "number") return num(v);
  if (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === "number")) return `${num(v[0] as number)} a ${num(v[1] as number)}`;
  return null;
}

function zoneGroup(title: string | null, z: Record<string, unknown>, plain: Plain): AthleteGroup {
  const zone = str(z.zona);
  const f: Fact[] = [];
  const talk = str(z.testeDaFala);
  if (talk) f.push({ label: "Teste da fala", value: cap(plain(talk)) });
  const cr = str(z.cr10);
  if (cr) f.push({ label: "Esforço percebido (0 a 10)", value: cr.replace("-", " a ") });
  const target = str(z.cr10AlvoDeProjeto);
  if (target) f.push({ label: "Esforço alvo", value: cap(plain(target)) });
  const range = str(z.alvo);
  if (range) f.push({ label: "Faixa", value: cap(plain(range)) });
  const watch: Fact[] = [];
  const hrM = str(z.fcMaxMedida);
  if (hrM) watch.push({ label: "Com a frequência cardíaca máxima medida", value: percent(hrM) });
  const hrE = str(z.fcMaxEstimada);
  if (hrE) watch.push({ label: "Com a frequência cardíaca máxima estimada", value: percent(hrE) });
  return { title, zone: zone ? zoneLabel(zone) : null, facts: f, watch };
}

/** "<= 75%" → "Até 75%"; "76-87%" → "De 76% a 87%"; ">= 88%" → "88% ou mais". */
function percent(s: string): string {
  const le = s.match(/^<=\s*(\d+)%$/);
  if (le) return `Até ${le[1]}%`;
  const ge = s.match(/^>=\s*(\d+)%$/);
  if (ge) return `${ge[1]}% ou mais`;
  const range = s.match(/^(\d+)-(\d+)%$/);
  if (range) return `De ${range[1]}% a ${range[2]}%`;
  return s;
}

function stepOf(raw: unknown, plain: Plain, extra: Fact[] = []): AthleteStep | null {
  if (!isObj(raw)) return null;
  const description = str(raw.descricao);
  const minutes = minutesOf(raw.minutos);
  const text = description ? cap(plain(description)) : null;
  if (!text && !minutes && extra.length === 0) return null;
  return { minutes, text, facts: extra };
}

/**
 * "Como fazer" em linguagem simples, por treino (docs/textos-para-o-atleta.md, seção 6, aprovada em
 * 2026-10-11). Vale no lugar do texto técnico do catálogo; o tempo vai dentro da frase. Na caminhada e
 * corrida o bloco principal é montado por sessão (`ladder-text.ts`), então aqui ele fica vazio.
 */
const say = (text: string): AthleteStep => ({ minutes: null, text, facts: [] });
const WARM = "Faça sempre um aquecimento antes de correr.";
const COOL = "Termine sempre com uma volta à calma.";
export const HOW_BY_SLUG: Record<string, AthleteText["how"]> = {
  "caminhada-corrida": {
    warmup: say("Caminhe 5 minutos em passo rápido, para o corpo esquentar."),
    main: null,
    cooldown: say("Caminhe 5 minutos devagar, para o corpo desacelerar."),
  },
  "rodagem-leve": {
    warmup: say("Caminhe rápido por 5 minutos (quem está começando) ou comece correndo bem devagar."),
    main: say("Corra sem parar, em ritmo leve: você deve conseguir conversar."),
    cooldown: say("Termine com uma volta à calma. Quem está começando: 5 minutos de caminhada rápida."),
  },
  longao: {
    warmup: say(WARM),
    main: say("Corra sem parar, em ritmo leve. É o treino mais longo da semana."),
    cooldown: say(COOL),
  },
  regenerativo: {
    warmup: say(WARM),
    main: say("Corra pouco e bem devagar, no ritmo mais leve (quem está começando pode só caminhar rápido)."),
    cooldown: say(COOL),
  },
  fartlek: {
    warmup: say("10 minutos em ritmo leve."),
    main: say(
      "Alterne trechos de 1 a 3 minutos em ritmo moderado com 2 a 3 minutos leves para recuperar. Avançados podem chegar ao ritmo forte.",
    ),
    cooldown: say("5 a 10 minutos em ritmo leve."),
  },
  "intervalado-curto": {
    warmup: say("10 a 15 minutos em ritmo leve, mais 2 a 4 acelerações curtas."),
    main: say(
      "Repita tiros de 15 a 30 segundos em ritmo forte, com recuperação leve entre eles (do mesmo tempo do tiro, ou o dobro se precisar).",
    ),
    cooldown: say("10 minutos em ritmo leve."),
  },
  "intervalado-longo": {
    warmup: say("10 a 15 minutos em ritmo leve."),
    main: say("Repita tiros de 3 a 4 minutos em ritmo forte, com 2 a 3 minutos de recuperação leve entre eles."),
    cooldown: say("10 minutos em ritmo leve."),
  },
  "limiar-continuo": {
    warmup: say("10 a 15 minutos em ritmo leve."),
    main: say("Corra em blocos no ritmo moderado mais forte, com 2 minutos de trote leve entre os blocos."),
    cooldown: say("10 minutos em ritmo leve."),
  },
  subidas: {
    warmup: say("10 a 15 minutos em ritmo leve."),
    main: say(
      "Repita subidas de 30 a 60 segundos numa subida moderada, mantendo a postura. Desça caminhando ou em trote leve até a base.",
    ),
    cooldown: say("10 minutos em ritmo leve."),
  },
  "forca-corredor": { warmup: null, main: say("Faça de 2 a 4 exercícios para as pernas e o tronco."), cooldown: null },
  mobilidade: {
    warmup: null,
    main: say(
      "Faça exercícios para quadril, parte de trás da coxa, panturrilha, tornozelo, parte da frente da coxa e parte de cima das costas: cerca de 1 minuto em cada, sem alongar até doer.",
    ),
    cooldown: null,
  },
};

export function buildAthleteText(structure: Record<string, unknown>, names: Map<string, string>, slug?: string): AthleteText {
  const plain = makePlain(names);
  const st = structure;

  // Intensidade
  const inten = isObj(st.intensidade) ? st.intensidade : null;
  let intensity: AthleteText["intensity"] = null;
  if (inten) {
    const groups: AthleteGroup[] = [];
    const notes: string[] = [];
    const studies: string[] = [];
    if (isObj(inten.base) || isObj(inten.blocos)) {
      if (isObj(inten.base)) groups.push(zoneGroup("Trechos de base", inten.base, plain));
      if (isObj(inten.blocos)) groups.push(zoneGroup("Blocos", inten.blocos, plain));
    } else if (inten.zona || inten.cr10 || inten.testeDaFala || inten.alvo) {
      groups.push(zoneGroup(null, inten, plain));
    }
    for (const key of ["nota", "controle", "limiteSuperior", "blocosAvancado"]) {
      const t = str(inten[key]);
      if (t) notes.push(cap(plain(t)));
    }
    const anchor = str(inten.ancoraDeEnsaio);
    if (anchor) studies.push(cap(plain(anchor)));
    intensity = { groups, notes, studies };
  }

  // Como fazer
  const main = isObj(st.principal) ? st.principal : null;
  let mainStep: AthleteStep | null = null;
  if (main) {
    const extra: Fact[] = [];
    if (isObj(main.recuperacao)) {
      const r = main.recuperacao;
      const desc = str(r.descricao);
      const parts: string[] = [];
      if (str(r.zona)) parts.push(zoneLabel(str(r.zona)!));
      const min = minutesOf(r.minutos);
      if (min) parts.push(`${min} min`);
      if (desc) parts.push(cap(plain(desc)));
      if (parts.length) extra.push({ label: LABELS.recuperacao!, value: parts.join(". ") });
    }
    extra.push(...facts(main, plain, ["formato", "recuperacao", "escada"]));
    if (isObj(main.escada)) {
      const e = main.escada;
      if (typeof e.sessoesPorEtapa === "number") extra.push({ label: LABELS.sessoesPorEtapa!, value: num(e.sessoesPorEtapa) });
      extra.push({
        label: "Etapas",
        value: "A escada tem 12 etapas, mais um degrau extra (10b) entre as etapas 10 e 11, para o bloco contínuo não crescer mais de 50% de uma vez.",
      });
      const source = str(e.fonte);
      if (source) extra.push({ label: LABELS.fonte!, value: plain(source) });
    }
    const format = str(main.formato);
    mainStep = { minutes: null, text: format ? cap(plain(format)) : null, facts: extra };
    if (!mainStep.text && extra.length === 0) mainStep = null;
  }

  // Parâmetros por nível
  const levels: AthleteText["levels"] = {};
  if (isObj(st.niveis)) {
    for (const lv of ["iniciante", "intermediario", "avancado"] as const) {
      const raw = st.niveis[lv];
      if (isObj(raw)) {
        const f = facts(raw, plain);
        if (f.length) levels[lv] = f;
      }
    }
  }

  // Frequência na semana (e duração do treino, quando o catálogo traz)
  const frequency: Fact[] = [];
  if (isObj(st.frequenciaSemanal)) frequency.push(...facts(st.frequenciaSemanal, plain));
  if (st.duracaoMin !== undefined) {
    const d = value("duracaoMin", st.duracaoMin, plain);
    if (d) frequency.unshift({ label: LABELS.duracaoMin!, value: d });
  }

  // Progressão e regressão
  const prog = isObj(st.progressao) ? st.progressao : {};
  const reg = isObj(st.regressao) ? st.regressao : {};
  const progression = [str(prog.regra), str(prog.aoConcluirEtapa12)].filter((x): x is string => !!x).map((t) => cap(plain(t)));
  const regression = [str(reg.regra), str(reg.semanaDeRecuperacao), str(reg.retornoDePausa)]
    .filter((x): x is string => !!x)
    .map((t) => cap(plain(t)));

  const ev = isObj(st.evidencia) ? st.evidencia : {};

  return {
    summary: str(st.razao) ? plain(str(st.razao)!) : null,
    intensity,
    how: (slug && HOW_BY_SLUG[slug]) || {
      warmup: stepOf(st.aquecimento, plain),
      main: mainStep,
      cooldown: stepOf(st.desaquecimento, plain),
    },
    levels,
    frequency,
    limits: strs(st.limites).map((t) => cap(plain(t))),
    progression,
    regression,
    evidence: {
      direct: strs(ev.fonteDireta).map((t) => cap(plain(t))),
      initial: strs(ev.provisoriosP).map((t) => cap(plain(t))),
      insufficient: strs(ev.semEvidenciaSuficiente).map((t) => cap(plain(t))),
    },
  };
}

/** Todos os textos de um bloco do atleta, para conferência. */
export function athleteStrings(a: AthleteText): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (isObj(v)) Object.values(v).forEach(walk);
  };
  walk(a);
  return out;
}

/** O que não pode aparecer num texto do atleta. */
export const TECHNICAL_MARKERS =
  /R-[A-Z]{3}-?\d*|DEC-\d+|\[P\]|`|<=|>=|~|CR-10|FCm[aá]x|\bPSE\b|\bRPE\b|\bBorg\b|1RM|\bslug\b|[A-Za-zÀ-ú] \d{4}[a-c]?\b(?!\))/;
