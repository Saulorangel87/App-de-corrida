// Texto do atleta em inglês: uma tradução para cada frase final de `buildAthleteText` (português).
// Não inventa nada: só traduz o texto já aprovado em docs/textos-para-o-atleta.md. Frase nova no
// catálogo sem tradução aqui faz o seed e os testes falharem (como acontece com a redação em português).
import type { AthleteText } from "./athlete-text";

export const EN_BY_PT: Record<string, string> = {
  "Caminhe 5 minutos em passo rápido, para o corpo esquentar.":
    "Walk briskly for 5 minutes to warm up.",
  "Caminhe 5 minutos devagar, para o corpo desacelerar.":
    "Walk slowly for 5 minutes to wind down.",
  "Caminhe rápido por 5 minutos (quem está começando) ou comece correndo bem devagar.":
    "Walk briskly for 5 minutes (if you are just starting) or begin running very slowly.",
  "Corra sem parar, em ritmo leve: você deve conseguir conversar.":
    "Run without stopping, at an easy pace: you should be able to hold a conversation.",
  "Termine com uma volta à calma. Quem está começando: 5 minutos de caminhada rápida.":
    "Finish with a cool-down. If you are just starting: 5 minutes of brisk walking.",
  "Faça sempre um aquecimento antes de correr.":
    "Always warm up before you run.",
  "Corra sem parar, em ritmo leve. É o treino mais longo da semana.":
    "Run without stopping, at an easy pace. It is the longest workout of the week.",
  "Termine sempre com uma volta à calma.":
    "Always finish with a cool-down.",
  "Corra pouco e bem devagar, no ritmo mais leve (quem está começando pode só caminhar rápido).":
    "Run a little and very slowly, at your easiest pace (if you are just starting, you can simply walk briskly).",
  "10 minutos em ritmo leve.":
    "10 minutes at an easy pace.",
  "5 a 10 minutos em ritmo leve.":
    "5 to 10 minutes at an easy pace.",
  "10 a 15 minutos em ritmo leve.":
    "10 to 15 minutes at an easy pace.",
  "Alterne trechos de 1 a 3 minutos em ritmo moderado com 2 a 3 minutos leves para recuperar. Avançados podem chegar ao ritmo forte.":
    "Alternate 1 to 3 minute segments at a moderate pace with 2 to 3 easy minutes to recover. Advanced runners can reach a hard pace.",
  "10 a 15 minutos em ritmo leve, mais 2 a 4 acelerações curtas.":
    "10 to 15 minutes at an easy pace, plus 2 to 4 short accelerations.",
  "Repita tiros de 15 a 30 segundos em ritmo forte, com recuperação leve entre eles (do mesmo tempo do tiro, ou o dobro se precisar).":
    "Repeat 15 to 30 second efforts at a hard pace, with easy recovery between them (the same length as the effort, or double if you need it).",
  "Repita tiros de 3 a 4 minutos em ritmo forte, com 2 a 3 minutos de recuperação leve entre eles.":
    "Repeat 3 to 4 minute efforts at a hard pace, with 2 to 3 minutes of easy recovery between them.",
  "Corra em blocos no ritmo moderado mais forte, com 2 minutos de trote leve entre os blocos.":
    "Run in blocks at the upper end of the moderate pace, with 2 minutes of easy jogging between blocks.",
  "Repita subidas de 30 a 60 segundos numa subida moderada, mantendo a postura. Desça caminhando ou em trote leve até a base.":
    "Repeat 30 to 60 second climbs on a moderate hill, keeping your posture. Walk or jog easily back down to the bottom.",
  "Faça de 2 a 4 exercícios para as pernas e o tronco.":
    "Do 2 to 4 exercises for the legs and core.",
  "Faça exercícios para quadril, parte de trás da coxa, panturrilha, tornozelo, parte da frente da coxa e parte de cima das costas: cerca de 1 minuto em cada, sem alongar até doer.":
    "Do exercises for the hips, hamstrings, calves, ankles, quadriceps and upper back: about 1 minute each, without stretching to the point of pain.",
  "N x (corrida / caminhada), minutos de corrida e de caminhada por repetição":
    "N x (run / walk), minutes of running and of walking per repetition",
  "Sessões por etapa":
    "Sessions per step",
  "3":
    "3",
  "Etapas":
    "Steps",
  "A escada tem 12 etapas, mais um degrau extra (10b) entre as etapas 10 e 11, para o bloco contínuo não crescer mais de 50% de uma vez.":
    "The ladder has 12 steps, plus an extra rung (10b) between steps 10 and 11, so the continuous block does not grow by more than 50% at once.",
  "Fonte":
    "Source",
  "Buist (2007), Tabela 2 (programa de 13 semanas).":
    "Buist (2007), Table 2 (13-week program).",
  "Caminhada rápida.":
    "Brisk walk.",
  "5":
    "5",
  "Na escada, você avança de etapa pelas 3 sessões feitas sem dor e com esforço leve, e não pelo limite de 110%. Mesmo assim, o volume da semana nunca passa de 120% da última semana de construção.":
    "On the ladder, you move up a step after 3 sessions done without pain and at easy effort, not by the 110% limit. Even so, the week's volume never goes past 120% of the last build week.",
  "O maior bloco contínuo de corrida (acima de 8 min) não cresce mais de 50% de uma etapa para a seguinte; se preciso, entra um degrau intermediário (como o 10b). É um limite inicial do app, sem estudo direto.":
    "The longest continuous running block (above 8 min) does not grow by more than 50% from one step to the next; if needed, an intermediate rung is added (like 10b). It is an initial limit of the app, without a direct study.",
  "Com IMC de 30 ou mais, você começa sempre na etapa 1 (a de menor volume), mesmo que já corra, porque o histórico não pode ser confirmado.":
    "With a BMI of 30 or more, you always start at step 1 (the lowest volume), even if you already run, because the history cannot be confirmed.",
  "Não há evidência de que a escada mais lenta proteja mais do que a de 8 semanas (Buist, 2008); o app combina a escada com a regra de dor e com o controle de intensidade.":
    "There is no evidence that the slower ladder protects more than the 8-week one (Buist, 2008); the app combines the ladder with the pain rule and with intensity control.",
  "Alterna trechos de corrida e de caminhada em ritmo de conversa, sem falta de ar, no formato do programa GRONORUN (532 iniciantes). Cada etapa só avança quando as 3 sessões forem concluídas sem dor a partir de 3/10 e com esforço leve. O app não promete evitar lesões: nos dois programas estudados, cerca de 1 em cada 5 iniciantes teve alguma lesão (20,8% e 20,3%).":
    "Alternates running and walking segments at a conversational pace, without shortness of breath, in the format of the GRONORUN program (532 beginners). Each step only advances when the 3 sessions are completed without pain of 3/10 or more and at easy effort. The app does not promise to prevent injuries: in the two programs studied, about 1 in 5 beginners had some injury (20.8% and 20.3%).",
  "Escada de etapas 1 a 12 (exceto os ajustes de volume e o degrau 10b, que são valores iniciais do app): Buist (2007), Tabela 2.":
    "Ladder of steps 1 to 12 (except the volume adjustments and rung 10b, which are the app's initial values): Buist (2007), Table 2.",
  "Aquecimento e desaquecimento de 5 min de caminhada rápida; ritmo de conversa; 3 sessões por semana: Buist (2007).":
    "5 min warm-up and cool-down of brisk walking; conversational pace; 3 sessions per week: Buist (2007).",
  "Taxa de lesão de cerca de 20% nos programas de 8 e 13 semanas: Buist (2008).":
    "Injury rate of about 20% in the 8- and 13-week programs: Buist (2008).",
  "Etapa 2, sessão 3 e etapa 11, sessão 3 (menor volume).":
    "Step 2, session 3 and step 11, session 3 (lowest volume).",
  "Degrau 10b.":
    "Rung 10b.",
  "Limite de 50% de crescimento do bloco contínuo.":
    "50% growth limit for the continuous block.",
  "Avançar de etapa pela tolerância (dor e esforço), e não só pelo calendário.":
    "Advancing by tolerance (pain and effort), not only by the calendar.",
  "Sessões por semana":
    "Sessions per week",
  "Descanso":
    "Rest",
  "Pelo menos 1 dia de descanso entre as sessões.":
    "At least 1 day of rest between sessions.",
  "O ritmo certo é o de conversa, sem falta de ar, como no programa para iniciantes estudado por Buist (2007). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo.":
    "The right pace is conversational, without shortness of breath, as in the beginner program studied by Buist (2007). If talking, effort and watch point to different zones, the hardest one wins: slow down.",
  "Esforço leve (Z1)":
    "Easy effort (Z1)",
  "Teste da fala":
    "Talk test",
  "Frases completas, sem pausa":
    "Full sentences, without pausing",
  "Esforço percebido (0 a 10)":
    "Perceived effort (0 to 10)",
  "1 a 3":
    "1 to 3",
  "Com a frequência cardíaca máxima medida":
    "With measured maximum heart rate",
  "Até 75%":
    "Up to 75%",
  "Com a frequência cardíaca máxima estimada":
    "With estimated maximum heart rate",
  "Até 70%":
    "Up to 70%",
  "Repetir a etapa ou voltar uma etapa.":
    "Repeat the step or go back one step.",
  "Na semana de recuperação, você repete a etapa anterior com 75% das repetições e não avança.":
    "In the recovery week, you repeat the previous step with 75% of the repetitions and do not advance.",
  "Depois de uma pausa de 29 dias ou mais, você recomeça uma etapa antes da última que concluiu.":
    "After a break of 29 days or more, you restart one step before the last one you completed.",
  "Você avança para a próxima etapa quando as 3 sessões da etapa foram feitas sem dor de 3 ou mais (de 0 a 10) e com esforço leve (até 3, falando frases completas).":
    "You move up to the next step when the step's 3 sessions were done without pain of 3 or more (on a 0 to 10 scale) and at easy effort (up to 3, speaking full sentences).",
  "Ao concluir a etapa 12, você passa para a Rodagem leve.":
    "When you complete step 12, you move on to the Easy run.",
  "Blocos de 1-3 min em esforço moderado (Z2) (ou até esforço forte (Z3), só avançado) separados por 2-3 min em esforço leve (Z1)":
    "Blocks of 1-3 min at moderate effort (Z2) (or up to hard effort (Z3), advanced only) separated by 2-3 min at easy effort (Z1)",
  "Recuperação":
    "Recovery",
  "Esforço leve (Z1). 2 a 3 min":
    "Easy effort (Z1). 2 to 3 min",
  "Em esforço leve (Z1).":
    "At easy effort (Z1).",
  "10":
    "10",
  "5 a 10":
    "5 to 10",
  "Minutos por bloco":
    "Minutes per block",
  "Zona":
    "Zone",
  "Esforço moderado (Z2) ou esforço forte (Z3)":
    "Moderate effort (Z2) or hard effort (Z3)",
  "Observação":
    "Note",
  "A pesquisa não define o número de blocos do avançado.":
    "The research does not define the number of blocks for advanced runners.",
  "Base":
    "Basis",
  "Valor inicial do app, ainda sem estudo direto":
    "App's initial value, still without a direct study",
  "Formato":
    "Format",
  "Um único bloco contínuo de 5-8 min em esforço moderado (Z2), dentro de uma rodagem leve; nunca esforço forte (Z3).":
    "A single continuous block of 5-8 min at moderate effort (Z2), inside an easy run; never hard effort (Z3).",
  "Pré-requisito":
    "Prerequisite",
  "Só depois de concluir a etapa 12 da escada e de 8 semanas ou mais de corrida regular (o prazo de 8 semanas é critério inicial do app).":
    "Only after completing step 12 of the ladder and 8 weeks or more of regular running (the 8-week period is an initial criterion of the app).",
  "Treinos fortes por semana (máx.)":
    "Hard workouts per week (max.)",
  "1":
    "1",
  "Blocos":
    "Blocks",
  "6 a 8":
    "6 to 8",
  "2":
    "2",
  "Esforço moderado (Z2)":
    "Moderate effort (Z2)",
  "O tempo do fartlek em esforço moderado e forte conta nos limites da semana.":
    "The fartlek time at moderate and hard effort counts toward the week's limits.",
  "É um treino forte (tem trecho em esforço moderado ou forte): nunca em dias seguidos, sempre com pelo menos 1 treino leve ou descanso entre eles. Se a semana passar do limite de esforço, o app encurta o trecho ou troca por treino leve.":
    "It is a hard workout (it has a segment at moderate or hard effort): never on consecutive days, always with at least 1 easy workout or rest day between them. If the week goes past the effort limit, the app shortens the segment or swaps it for an easy workout.",
  "Nenhuma corrida passa de 110% da sua maior corrida dos últimos 30 dias; se o plano pedir mais, o app reduz. Um estudo observacional com corredores associou aumentos de uma única corrida acima de 10% a mais lesões (Frandsen, 2025).":
    "No run goes past 110% of your longest run in the last 30 days; if the plan asks for more, the app reduces it. An observational study of runners linked single-run increases above 10% to more injuries (Frandsen, 2025).",
  "Uma rodagem leve com blocos de esforço moderado, de duração e zona fixas (não livre), como ponte entre a rodagem leve e o intervalado. Não existe estudo específico sobre fartlek em corredores; a estrutura é extrapolada do treino intervalado.":
    "An easy run with blocks of moderate effort, with fixed duration and zone (not free), as a bridge between the easy run and intervals. There is no specific study on fartlek in runners; the structure is extrapolated from interval training.",
  "Intervalos curtos (até 30 segundos) melhoram a capacidade aeróbica máxima (VO2max): Wen (2019). É evidência indireta: o estudo não é sobre fartlek.":
    "Short intervals (up to 30 seconds) improve maximal aerobic capacity (VO2max): Wen (2019). It is indirect evidence: the study is not about fartlek.",
  "Intervalado aeróbico com repetições curtas a longas: Billat (2001a) (evidência indireta).":
    "Aerobic intervals with short to long repetitions: Billat (2001a) (indirect evidence).",
  "Toda a estrutura (blocos, duração e zonas)":
    "The whole structure (blocks, duration and zones)",
  "Prazo de 8 semanas do iniciante":
    "The beginner's 8-week period",
  "Fartlek em corredores: nenhum estudo ou revisão específica foi localizado.":
    "Fartlek in runners: no specific study or review was found.",
  "Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: então diminua o ritmo.":
    "If talking, effort and watch point to different zones, the hardest one wins: so slow down.",
  "Pode chegar ao esforço forte (6 a 10, de 0 a 10). Guie-se pelo esforço e pelo tempo.":
    "It can reach hard effort (6 to 10, on a scale of 0 to 10). Go by effort and by the time indicated.",
  "Trechos de base":
    "Base segments",
  "Frases curtas, com esforço":
    "Short sentences, with effort",
  "4 a 5":
    "4 to 5",
  "De 76% a 87%":
    "76% to 87%",
  "De 71% a 82%":
    "71% to 82%",
  "Rodagem leve.":
    "Easy run.",
  "Depois, podem entrar Limiar contínuo, Intervalado curto ou Subidas (ordem inicial do app, sem estudo direto).":
    "Afterward, Continuous threshold run, Short intervals or Hill repeats can come in (the app's initial order, without a direct study).",
  "2-4 exercícios de membro inferior e tronco":
    "2-4 lower-body and trunk exercises",
  "Nível de força":
    "Strength level",
  "C":
    "C",
  "Carga":
    "Load",
  "Força pesada: 80% ou mais da carga máxima de 1 repetição, em 3 a 5 repetições.":
    "Heavy strength: 80% or more of the 1-repetition maximum load, in 3 to 5 repetitions.",
  "Pliometria":
    "Plyometrics",
  "Até cerca de 200 saltos":
    "Up to about 200 jumps",
  "Sprints curtos":
    "Short sprints",
  "Duração do bloco (semanas)":
    "Block length (weeks)",
  "8 a 12":
    "8 to 12",
  "Manutenção":
    "Maintenance",
  "Depois, manutenção de 1 sessão por semana.":
    "Afterward, maintenance of 1 session per week.",
  "Protocolos dos estudos":
    "Study protocols",
  "A":
    "A",
  "Peso do corpo ou carga leve":
    "Body weight or light load",
  "Exercícios":
    "Exercises",
  "2-3 exercícios de membro inferior e tronco (ex.: agachamento, avanço, elevação de panturrilha, ponte de glúteo, prancha)":
    "2-3 lower-body and trunk exercises (e.g., squat, lunge, calf raise, glute bridge, plank)",
  "Séries":
    "Sets",
  "1 a 2":
    "1 to 2",
  "Repetições":
    "Repetitions",
  "8 a 15":
    "8 to 15",
  "Não":
    "No",
  "Duração (min)":
    "Duration (min)",
  "20 a 30":
    "20 to 30",
  "Progressão":
    "Progression",
  "Passa para 3 séries ao longo de 8 semanas ou mais.":
    "Moves to 3 sets over 8 weeks or more.",
  "B":
    "B",
  "2-4 exercícios de membro inferior":
    "2-4 lower-body exercises",
  "Cerca de 70% a 85% da carga máxima de 1 repetição, em 4 a 8 repetições, com a técnica já aprendida.":
    "About 70% to 85% of the 1-repetition maximum load, in 4 to 8 repetitions, with the technique already learned.",
  "De baixo impacto, até cerca de 100 saltos":
    "Low impact, up to about 100 jumps",
  "Sem treino prévio ou supervisão":
    "No previous training or supervision",
  "Sem treino de força anterior nem supervisão: use carga moderada, de 8 a 12 repetições sem chegar à falha, em vez de 70% a 85% da carga máxima. Cargas altas exigem orientação profissional.":
    "Without previous strength training or supervision: use a moderate load, 8 to 12 repetitions without reaching failure, instead of 70% to 85% of the maximum load. Heavy loads require professional guidance.",
  "O app não indica cargas máximas (1 repetição máxima) para quem não tem treino de força anterior nem supervisão: a progressão para no nível B, com carga moderada. Cargas altas exigem orientação profissional.":
    "The app does not prescribe maximal loads (1-repetition maximum) for people without previous strength training or supervision: progression stops at level B, with a moderate load. Heavy loads require professional guidance.",
  "Dor ativa em articulação ou tendão: a sessão é bloqueada ou cai para exercícios sem dor.":
    "Active pain in a joint or tendon: the session is blocked or drops to pain-free exercises.",
  "Treino de força de 2 vezes por semana para melhorar a economia de corrida e a tolerância à carga. Para iniciantes o foco é a tolerância e o app não promete menos lesões: os estudos de prevenção são de esportes em geral e as cargas pesadas exigem técnica e orientação profissional.":
    "Strength training twice a week to improve running economy and load tolerance. For beginners the focus is tolerance, and the app does not promise fewer injuries: the prevention studies are about sports in general and heavy loads require technique and professional guidance.",
  "O treino de força melhorou a economia de corrida em corredores, com efeito grande: Balsalobre-Fernández (2016); revisão sistemática com 24 estudos: Blagrove (2018).":
    "Strength training improved running economy in runners, with a large effect: Balsalobre-Fernández (2016); systematic review of 24 studies: Blagrove (2018).",
  "Cargas altas e métodos combinados melhoraram a economia de corrida; cargas submáximas (40% a 79% da carga máxima) e exercícios isométricos não foram eficazes: Llanos-Lagos (2024).":
    "High loads and combined methods improved running economy; submaximal loads (40% to 79% of the maximum load) and isometric exercises were not effective: Llanos-Lagos (2024).",
  "Dose prática: de 1-2 séries até 3-6 séries, com pelo menos 48 horas entre as sessões e 2 sessões por semana: Blagrove (2018).":
    "Practical dose: from 1-2 sets up to 3-6 sets, with at least 48 hours between sessions and 2 sessions per week: Blagrove (2018).",
  "O treino de força reduziu lesões esportivas em geral (o risco ficou em cerca de um terço): Lauersen (2018). É evidência indireta para corrida.":
    "Strength training reduced sports injuries in general (the risk fell to about a third): Lauersen (2018). It is indirect evidence for running.",
  "Todos os números do nível A (iniciante)":
    "All the numbers for level A (beginner)",
  "Pliometria de até cerca de 100 saltos no nível B.":
    "Plyometrics of up to about 100 jumps at level B.",
  "Dose ideal para iniciantes ou sem supervisão.":
    "Ideal dose for beginners or unsupervised people.",
  "20 a 40":
    "20 to 40",
  "Sessões em período de prova":
    "Sessions during the race period",
  "Intervalo mínimo entre sessões (h)":
    "Minimum interval between sessions (h)",
  "48":
    "48",
  "Posição na semana":
    "Position in the week",
  "Faça em um dia diferente das corridas fortes ou, se for no mesmo dia, com pelo menos 5 horas de intervalo.":
    "Do it on a different day from the hard runs or, if on the same day, at least 5 hours apart.",
  "Não se aplica zona de esforço (leve, moderado ou forte).":
    "Effort zone (easy, moderate or hard) does not apply.",
  "Volte ao nível anterior ou faça Mobilidade.":
    "Go back to the previous level or do Mobility.",
  "Você passa para o nível seguinte depois de 4 semanas ou mais sem dor e com a execução correta.":
    "You move on to the next level after 4 weeks or more without pain and with correct execution.",
  "Repetições de 15-30 s em esforço forte (Z3) com recuperação ativa":
    "Repetitions of 15-30 s at hard effort (Z3) with active recovery",
  "Esforço leve (Z1). Recuperação ativa, em esforço leve (Z1), com a mesma duração do esforço (cerca de 70% da frequência cardíaca máxima medida) ou, se você precisar, com o dobro da duração.":
    "Easy effort (Z1). Active recovery, at easy effort (Z1), with the same duration as the effort (about 70% of measured maximum heart rate) or, if you need, with double the duration.",
  "Duração de cada repetição (s)":
    "Duration of each repetition (s)",
  "15 a 30":
    "15 to 30",
  "Em esforço leve (Z1), mais 2 a 4 acelerações curtas.":
    "At easy effort (Z1), plus 2 to 4 short accelerations.",
  "10 a 15":
    "10 to 15",
  "Volume em esforço forte, até (min)":
    "Volume at hard effort, up to (min)",
  "8 a 10":
    "8 to 10",
  "Treinos intensos por semana (máx.)":
    "Intense workouts per week (max.)",
  "Volume em esforço forte (min)":
    "Volume at hard effort (min)",
  "4 a 6":
    "4 to 6",
  "Exemplo":
    "Example",
  "8-12 x 30 s":
    "8-12 x 30 s",
  "O tempo total em esforço forte (Z3) na semana não passa de 12% do tempo semanal no nível intermediário e de 15% no avançado.":
    "The total time at hard effort (Z3) in the week does not go past 12% of the weekly time at the intermediate level and 15% at the advanced level.",
  "Iniciantes não fazem este treino: para eles, o tempo em esforço forte é 0%.":
    "Beginners do not do this workout: for them, time at hard effort is 0%.",
  "Repetições curtas e fortes com recuperação leve, para trabalhar o VO2max. A evidência mostra que intervalos curtos (até 30 s) e baixo volume já são eficazes. Não é prescrito para iniciantes.":
    "Short, hard repetitions with easy recovery, to work on VO2max. The evidence shows that short intervals (up to 30 s) and low volume are already effective. It is not prescribed for beginners.",
  "Protocolo 15/15: 15 segundos entre 90% e 95% da frequência cardíaca máxima e 15 segundos de recuperação ativa a 70%: Helgerud (2007).":
    "15/15 protocol: 15 seconds at 90% to 95% of maximum heart rate and 15 seconds of active recovery at 70%: Helgerud (2007).",
  "Intervalos curtos (até 30 s), baixo volume (até 5 min) e curto prazo (até 4 semanas) já são eficazes: Wen (2019).":
    "Short intervals (up to 30 s), low volume (up to 5 min) and short duration (up to 4 weeks) are already effective: Wen (2019).",
  "Conceitos 10-20-30 e 30-30 melhoraram desempenho de forma semelhante em corredores recreacionais: Faelli (2019).":
    "The 10-20-30 and 30-30 concepts improved performance similarly in recreational runners: Faelli (2019).",
  "Volume de esforço forte (Z3) por nível":
    "Hard effort (Z3) volume by level",
  "Esforço alvo de 7 a 8 (de 0 a 10).":
    "Target effort of 7 to 8 (on a scale of 0 to 10).",
  "Progressão e regressão":
    "Progression and regression",
  "Nos esforços curtos e fortes, guie-se pelo esforço (6 ou mais, de 0 a 10) e pelo tempo indicado. O relógio de frequência cardíaca e o teste da fala não funcionam bem nesses esforços.":
    "In short, hard efforts, go by effort (6 or more, on a scale of 0 to 10) and by the time indicated. The heart rate watch and the talk test do not work well in these efforts.",
  "Esforço forte (Z3)":
    "Hard effort (Z3)",
  "Palavras soltas ou nada":
    "Single words or nothing",
  "6 a 10":
    "6 to 10",
  "Esforço alvo":
    "Target effort",
  "7 a 8 (valor inicial do app, ainda sem estudo direto)":
    "7 to 8 (app's initial value, still without a direct study)",
  "88% ou mais":
    "88% or more",
  "83% ou mais":
    "83% or more",
  "Nos estudos, os esforços fortes ficaram entre 90% e 95% da frequência cardíaca máxima medida (Helgerud, 2007).":
    "In the studies, hard efforts were between 90% and 95% of measured maximum heart rate (Helgerud, 2007).",
  "Fartlek.":
    "Fartlek.",
  "O próximo passo é o Intervalado longo.":
    "The next step is Long intervals.",
  "Repetições de 3-4 min em esforço forte (Z3) com recuperação ativa":
    "Repetitions of 3-4 min at hard effort (Z3) with active recovery",
  "Esforço leve (Z1). 2 a 3 min. Recuperação ativa, em esforço leve (Z1), de 2 a 3 min (no estudo original eram 3 min; cerca de 70% da frequência cardíaca máxima medida).":
    "Easy effort (Z1). 2 to 3 min. Active recovery, at easy effort (Z1), of 2 to 3 min (in the original study it was 3 min; about 70% of measured maximum heart rate).",
  "Duração de cada repetição (min)":
    "Duration of each repetition (min)",
  "3 a 4":
    "3 to 4",
  "Protocolo":
    "Protocol",
  "4 repetições de 4 min":
    "4 repetitions of 4 min",
  "Trabalho total em esforço forte (min)":
    "Total work at hard effort (min)",
  "16":
    "16",
  "Tempo semanal de corrida mínimo (min)":
    "Minimum weekly running time (min)",
  "107":
    "107",
  "4 x 4 min são 16 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 107 minutos de corrida.":
    "4 x 4 min is 16 minutes at hard effort; to respect the weekly limit for hard effort, the week needs to have at least about 107 minutes of running.",
  "De":
    "From",
  "3 repetições de 3 min":
    "3 repetitions of 3 min",
  "Até":
    "Up to",
  "75":
    "75",
  "3 x 3 min são 9 minutos em esforço forte; para respeitar o limite semanal de esforço forte, a semana precisa ter pelo menos cerca de 75 minutos de corrida.":
    "3 x 3 min is 9 minutes at hard effort; to respect the weekly limit for hard effort, the week needs to have at least about 75 minutes of running.",
  "No máximo 2 treinos fortes por semana, e o tempo em esforço forte respeita o limite da semana (12% no intermediário, 15% no avançado).":
    "At most 2 hard workouts per week, and the time at hard effort respects the week's limit (12% for intermediate, 15% for advanced).",
  "3 sessões de treino intervalado intenso por semana não trouxeram benefício adicional claro sobre 2 (Lenk, 2025).":
    "3 high-intensity interval sessions per week did not bring a clear additional benefit over 2 (Lenk, 2025).",
  "Repetições de 3 a 4 minutos em esforço forte com recuperação leve, no formato do protocolo 4 x 4 estudado para VO2max. Intervalos mais longos e maior volume deram efeitos maiores nas meta-análises. Não é prescrito para iniciantes.":
    "Repetitions of 3 to 4 minutes at hard effort with easy recovery, in the format of the 4 x 4 protocol studied for VO2max. Longer intervals and greater volume gave larger effects in meta-analyses. It is not prescribed for beginners.",
  "Protocolo 4 x 4: 4 minutos entre 90% e 95% da frequência cardíaca máxima, com 3 minutos de recuperação a 70%: Helgerud (2007).":
    "4 x 4 protocol: 4 minutes at 90% to 95% of maximum heart rate, with 3 minutes of recovery at 70%: Helgerud (2007).",
  "Intervalos longos (2 min ou mais) e volume de 15 min ou mais dão efeitos maiores: Wen (2019). Em 6 a 13 semanas, o VO2max subiu de 0,8 a 0,9 L/min: Bacon (2013).":
    "Long intervals (2 min or more) and volume of 15 min or more give larger effects: Wen (2019). In 6 to 13 weeks, VO2max rose by 0.8 to 0.9 L/min: Bacon (2013).",
  "Faixa de repetições por nível":
    "Repetition range by level",
  "Intervalado curto.":
    "Short intervals.",
  "Acrescente 1 repetição a cada 2 semanas, até o máximo do seu nível (critério inicial do app).":
    "Add 1 repetition every 2 weeks, up to the maximum for your level (initial criterion of the app).",
  "Bloco(s) na parte alta de esforço moderado (Z2), com 2 min de trote entre blocos":
    "Block(s) at the upper end of moderate effort (Z2), with 2 min of jogging between blocks",
  "Opções":
    "Options",
  "1 bloco de 20 a 30 min ou 3 blocos de 10 min, com 2 min de trote entre os blocos":
    "1 block of 20 to 30 min or 3 blocks of 10 min, with 2 min of jogging between blocks",
  "1 bloco de 15 a 20 min ou 2 blocos de 10 min, com 2 min de trote entre os blocos":
    "1 block of 15 to 20 min or 2 blocks of 10 min, with 2 min of jogging between blocks",
  "Limite de trabalho contínuo de cerca de 20-30 min (a velocidade crítica só é sustentável por cerca de 20-30 min: Jones (2019)).":
    "Continuous work limit of about 20-30 min (critical speed is only sustainable for about 20-30 min: Jones (2019)).",
  "O tempo total em esforço moderado (Z2) na semana não passa de 15% do tempo semanal. Se passar, o app reduz o bloco ou troca por Fartlek.":
    "The total time at moderate effort (Z2) in the week does not go past 15% of the weekly time. If it does, the app reduces the block or swaps it for Fartlek.",
  "Blocos na parte alta de esforço moderado (Z2), em esforço firme mas controlado, para trabalhar perto do limiar. O ritmo de limiar não é um número único: o app descreve por faixa de esforço e mantém o bloco contínuo abaixo de cerca de 20-30 min. Fica limitado a 1 sessão por semana, porque mais tempo em esforço leve (Z1) rendeu melhores resultados que mais tempo em esforço moderado (Z2).":
    "Blocks at the upper end of moderate effort (Z2), at firm but controlled effort, to work near the threshold. Threshold pace is not a single number: the app describes it by effort range and keeps the continuous block under about 20-30 min. It is limited to 1 session per week, because more time at easy effort (Z1) gave better results than more time at moderate effort (Z2).",
  "Treino perto do limiar melhora o limiar em sedentários; condicionados tendem a precisar de intensidade maior: Londeree (1997).":
    "Training near the threshold improves the threshold in sedentary people; conditioned people tend to need higher intensity: Londeree (1997).",
  "Existem 25 conceitos de limiar de lactato, que diferem entre si: Faude (2009).":
    "There are 25 lactate threshold concepts, and they differ from one another: Faude (2009).",
  "O modelo polarizado (que evita o esforço moderado e concentra o treino no leve e no forte) teve melhor desempenho que o modelo de limiar em atletas treinados (3 estudos): Rosenblat (2019).":
    "The polarized model (which avoids moderate effort and concentrates training at easy and hard) performed better than the threshold model in trained athletes (3 studies): Rosenblat (2019).",
  "Durações e número de blocos por nível":
    "Durations and number of blocks by level",
  "No máximo 1 sessão por semana":
    "At most 1 session per week",
  "Limites de bloco sem evidência direta.":
    "Block limits without direct evidence.",
  "0 a 1":
    "0 to 1",
  "No máximo 1 sessão por semana (limite inicial do app, sem estudo direto).":
    "At most 1 session per week (initial limit of the app, without a direct study).",
  "Nunca chegue ao esforço forte: fique em 5 ou menos (de 0 a 10) e abaixo de 88% da frequência cardíaca máxima medida.":
    "Never reach hard effort: stay at 5 or less (on a scale of 0 to 10) and below 88% of measured maximum heart rate.",
  "Faixa":
    "Range",
  "Parte alta do esforço moderado (Z2)":
    "Upper end of moderate effort (Z2)",
  "Nos estudos, o trabalho de limiar ficou perto de 85% da frequência cardíaca máxima medida, ou até 82% da estimada (Helgerud, 2007).":
    "In the studies, threshold work was near 85% of measured maximum heart rate, or up to 82% of estimated (Helgerud, 2007).",
  "Fartlek com blocos em esforço moderado e, depois, Rodagem leve.":
    "Fartlek with blocks at moderate effort and, afterward, Easy run.",
  "Aumente o bloco em até 5 minutos, ou troque 2 blocos por 1 bloco contínuo (critério inicial do app).":
    "Increase the block by up to 5 minutes, or swap 2 blocks for 1 continuous block (initial criterion of the app).",
  "Corrida contínua em esforço leve (Z1); maior sessão da semana":
    "Continuous run at easy effort (Z1); the longest session of the week",
  "Faça sempre um aquecimento antes de correr. A pesquisa não define uma duração para este treino.":
    "Always warm up before running. The research does not define a duration for this workout.",
  "Faça sempre a volta à calma depois de correr. A pesquisa não define uma duração para este treino.":
    "Always cool down after running. The research does not define a duration for this workout.",
  "75 a 150":
    "75 to 150",
  "Duração máxima nos planos de 21 e 42 km (min)":
    "Maximum duration in the 21 and 42 km plans (min)",
  "150":
    "150",
  "45 a 60":
    "45 to 60",
  "Só depois da etapa 12 da escada, ou depois de uma corrida contínua de 40 min sem dor de 3 ou mais (de 0 a 10), para quem entra direto num plano.":
    "Only after step 12 of the ladder, or after a 40-min continuous run without pain of 3 or more (on a 0 to 10 scale), for people who go straight into a plan.",
  "60 a 90":
    "60 to 90",
  "120":
    "120",
  "Não passa de 110% da sua maior corrida dos últimos 30 dias.":
    "Does not go past 110% of your longest run in the last 30 days.",
  "Não é aumentado mais de uma vez por semana, nem em semana de dor/sono ruim ou de recuperação.":
    "It is not increased more than once a week, nor in a week of pain/poor sleep or recovery.",
  "Recomendamos que o longão não passe de cerca de 40% do tempo semanal de corrida (valor inicial do app, sem estudo direto).":
    "We recommend that the long run not go past about 40% of the weekly running time (the app's initial value, without a direct study).",
  "Nos planos de prova, vale o menor valor entre o limite do longão e o limite do plano.":
    "In race plans, the lower of the long run limit and the plan limit applies.",
  "A maior corrida da semana, em ritmo de conversa. Não existe estudo que defina a duração ideal por nível; o que há é evidência de risco: aumentar uma única corrida em mais de 10% sobre a maior dos últimos 30 dias esteve associado a mais lesões. Por isso o app limita o longão a 110% da sua maior corrida recente.":
    "The longest run of the week, at a conversational pace. There is no study that defines the ideal duration by level; what exists is risk evidence: increasing a single run by more than 10% over the longest in the last 30 days was linked to more injuries. That is why the app limits the long run to 110% of your longest recent run.",
  "Aumentos de uma única corrida acima de 10% sobre a maior corrida dos últimos 30 dias se associaram a mais lesões (taxa de lesão de 1,64 a 2,28 vezes maior), enquanto as variações semanais de carga não se associaram: Frandsen (2025). É um estudo observacional, com distância relatada pelos próprios corredores e idade média de 45,8 anos.":
    "Single-run increases above 10% over the longest run in the last 30 days were linked to more injuries (injury rate 1.64 to 2.28 times higher), whereas weekly load changes were not: Frandsen (2025). It is an observational study, with distance reported by the runners themselves and a mean age of 45.8 years.",
  "Limites de duração por nível":
    "Duration limits by level",
  "Limite de cerca de 40% do tempo semanal":
    "Limit of about 40% of the weekly time",
  "Duração ideal do longão por nível.":
    "Ideal long run duration by level.",
  "1 por semana ou a cada 2 semanas.":
    "1 per week or every 2 weeks.",
  "Se você só consegue falar frases curtas, o ritmo está forte demais para um longão: diminua até conseguir conversar.":
    "If you can only speak short sentences, the pace is too hard for a long run: slow down until you can hold a conversation.",
  "Rodagem leve, com a duração um pouco menor (no mínimo 70% do longão planejado).":
    "Easy run, with a slightly shorter duration (at least 70% of the planned long run).",
  "Aumento de até 110% da maior corrida dos últimos 30 dias.":
    "Increase of up to 110% of the longest run in the last 30 days.",
  "Exercícios dos principais grupos, cerca de 60 s no total por exercício, sem alongar até a dor":
    "Exercises for the main muscle groups, about 60 s in total per exercise, without stretching to the point of pain",
  "Grupos trabalhados":
    "Muscle groups worked",
  "quadril, posterior de coxa, panturrilha, tornozelo, quadríceps, torácica":
    "hip, hamstrings, calf, ankle, quadriceps, thoracic spine",
  "Segundos por exercício":
    "Seconds per exercise",
  "60":
    "60",
  "Se um exercício alonga a mesma região em que você relatou dor, ele sai da sessão e o app orienta procurar um profissional (critério inicial do app).":
    "If an exercise stretches the same region where you reported pain, it leaves the session and the app advises seeing a professional (initial criterion of the app).",
  "Sessão leve de mobilidade, alternativa ao descanso nos dias em que o app reduz a carga (sono ruim, dor leve). Não há evidência de que reduza lesões ou melhore o desempenho em corredores, e o app não a vende assim: ela entra pela recomendação geral do ACSM.":
    "A light mobility session, an alternative to rest on days when the app reduces the load (poor sleep, mild pain). There is no evidence that it reduces injuries or improves performance in runners, and the app does not sell it that way: it comes from the general ACSM recommendation.",
  "O ACSM recomenda flexibilidade em pelo menos 2 dias por semana (60 segundos por exercício): Garber (2011).":
    "The ACSM recommends flexibility on at least 2 days per week (60 seconds per exercise): Garber (2011).",
  "Alongamento isolado não reduziu lesões esportivas: Lauersen (2014); não alterou a economia de corrida: Warneke (2025).":
    "Stretching alone did not reduce sports injuries: Lauersen (2014); it did not change running economy: Warneke (2025).",
  "Duração de 10-20 min":
    "Duration of 10-20 min",
  "Posição abaixo de esforço leve (Z1)":
    "Position below easy effort (Z1)",
  "Benefício da mobilidade para desempenho ou prevenção de lesão em corredores.":
    "Benefit of mobility for performance or injury prevention in runners.",
  "10 a 20":
    "10 to 20",
  "O Colégio Americano de Medicina do Esporte (ACSM) recomenda exercícios de flexibilidade em pelo menos 2 dias por semana (Garber, 2011); o app propõe 1 a 2 sessões por semana.":
    "The American College of Sports Medicine (ACSM) recommends flexibility exercises on at least 2 days per week (Garber, 2011); the app suggests 1 to 2 sessions per week.",
  "Esforço abaixo do leve. Não entra na conta das zonas da semana (critério inicial do app).":
    "Effort below easy. It does not count toward the week's zone totals (initial criterion of the app).",
  "Descanso.":
    "Rest.",
  "Nenhuma.":
    "None.",
  "Corrida contínua curta na parte baixa de esforço leve (Z1) (ou caminhada rápida para iniciante)":
    "Short continuous run at the lower end of easy effort (Z1) (or brisk walking for beginners)",
  "Corrida contínua":
    "Continuous run",
  "Caminhada rápida":
    "Brisk walk",
  "A opção de menor carga de corrida: o app a usa para trocar um treino mais forte em dias de dor leve, sono ruim ou depois de um dia duro. Não há evidência de que a corrida regenerativa tenha benefício fisiológico próprio.":
    "The lowest running-load option: the app uses it to replace a harder workout on days of mild pain, poor sleep or after a hard day. There is no evidence that recovery running has its own physiological benefit.",
  "Apoio indireto: em uma revisão com vários estudos (meta-análise), a recuperação ativa reduziu a dor muscular tardia (Dupuy, 2018). Ela não define corrida regenerativa e aponta a massagem como a técnica mais eficaz.":
    "Indirect support: in a review of several studies (meta-analysis), active recovery reduced delayed-onset muscle soreness (Dupuy, 2018). It does not define recovery running and points to massage as the most effective technique.",
  "Durações":
    "Durations",
  "Esforço de 1 a 2 (de 0 a 10).":
    "Effort of 1 to 2 (on a scale of 0 to 10).",
  "Benefício da corrida regenerativa comparada com descanso ou rodagem leve para acelerar a recuperação.":
    "Benefit of recovery running compared with rest or an easy run for speeding up recovery.",
  "0 a 2":
    "0 to 2",
  "Usado como substituição de sessão.":
    "Used as a session replacement.",
  "Na parte mais leve do esforço leve: de 1 a 2 (de 0 a 10), conversando sem esforço (faixa inicial do app, sem estudo direto). Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: diminua o ritmo.":
    "At the lightest part of easy effort: 1 to 2 (on a scale of 0 to 10), talking without effort (initial range of the app, without a direct study). If talking, effort and watch point to different zones, the hardest one wins: slow down.",
  "Mobilidade ou descanso.":
    "Mobility or rest.",
  "O próximo passo é a Rodagem leve.":
    "The next step is the Easy run.",
  "Corrida contínua em esforço leve (Z1)":
    "Continuous run at easy effort (Z1)",
  "Caminhada rápida (iniciante) ou ritmo bem leve.":
    "Brisk walk (beginner) or a very easy pace.",
  "Faça sempre a volta à calma. A pesquisa não define uma duração para este treino (para iniciante, 5 min de caminhada rápida).":
    "Always cool down. The research does not define a duration for this workout (for beginners, 5 min of brisk walking).",
  "40 a 75":
    "40 to 75",
  "Frequência semanal":
    "Weekly frequency",
  "2 a 3":
    "2 to 3",
  "30 a 60":
    "30 to 60",
  "Alongamento parado não é obrigatório: os estudos não mostraram que ele reduza lesões nem melhore a economia de corrida (Lauersen, 2014; Warneke, 2025).":
    "Static stretching is not required: the studies did not show that it reduces injuries or improves running economy (Lauersen, 2014; Warneke, 2025).",
  "Corrida contínua em ritmo de conversa, a base do plano. Nos estudos, mais tempo em baixa intensidade rendeu maior melhora de desempenho do que mais tempo em intensidade moderada (corredores sub-elite). A duração é um ponto de partida e pode ser recalibrada.":
    "Continuous running at a conversational pace, the base of the plan. In the studies, more time at low intensity gave a greater performance improvement than more time at moderate intensity (sub-elite runners). The duration is a starting point and can be recalibrated.",
  "Teste da fala como instrução de intensidade em iniciantes: Buist (2007).":
    "Talk test as an intensity instruction for beginners: Buist (2007).",
  "O esforço leve como base: abaixo do limiar ventilatório (o ponto em que a respiração passa a acelerar, Esteve-Lanao, 2007) e perto de 70% da frequência cardíaca máxima (Helgerud, 2007).":
    "Easy effort as the base: below the ventilatory threshold (the point where breathing starts to speed up, Esteve-Lanao, 2007) and near 70% of maximum heart rate (Helgerud, 2007).",
  "20-30 min por dia cumprem as diretrizes de saúde pública: Garber (2011).":
    "20-30 min a day meets public health guidelines: Garber (2011).",
  "Durações por nível":
    "Durations by level",
  "Frequência por nível":
    "Frequency by level",
  "Nos estudos, o treino de base ficou perto de 70% da frequência cardíaca máxima medida (Helgerud, 2007).":
    "In the studies, base training was near 70% of measured maximum heart rate (Helgerud, 2007).",
  "Regenerativo e, depois, Mobilidade ou descanso.":
    "Recovery run and, afterward, Mobility or rest.",
  "Aumente a duração, sem passar de 110% da sua maior corrida dos últimos 30 dias, ou passe para o Fartlek quando cumprir os critérios para começar a treinar em esforço moderado.":
    "Increase the duration, without going past 110% of your longest run in the last 30 days, or move to Fartlek when you meet the criteria to start training at moderate effort.",
  "Repetições de 30-60 s em subida moderada em que a técnica se mantenha":
    "Repetitions of 30-60 s on a moderate hill where technique holds",
  "O tempo forte das subidas conta no limite semanal de esforço forte (Z3).":
    "The hard time on hills counts toward the weekly hard effort (Z3) limit.",
  "Iniciante: não.":
    "Beginner: no.",
  "Repetições curtas e fortes em subida moderada. Em corredores bem treinados, 6 semanas de intervalado em subida melhoraram o tempo de 5 km em cerca de 2%. A descida é feita caminhando ou em trote leve, porque correr em descida altera o apoio e a carga.":
    "Short, hard repetitions on a moderate hill. In well-trained runners, 6 weeks of hill intervals improved 5 km time by about 2%. The descent is done walking or jogging easily, because running downhill changes foot strike and load.",
  "O treino intervalado em subida melhorou o tempo de 5 km em 2,0% (±0,6%); a intensidade mais alta foi a melhor para a economia de corrida: Barnes (2013), com 20 corredores bem treinados.":
    "Hill interval training improved 5 km time by 2.0% (±0.6%); the highest intensity was best for running economy: Barnes (2013), with 20 well-trained runners.",
  "Subida exige mais atividade muscular e a descida altera o apoio: Vernillo (2017).":
    "Uphill requires more muscle activity and downhill changes foot strike: Vernillo (2017).",
  "Número de repetições":
    "Number of repetitions",
  "Duração das repetições":
    "Duration of repetitions",
  "Inclinação ideal, duração e número de repetições.":
    "Ideal slope, duration and number of repetitions.",
  "Máximo 1 por semana.":
    "Maximum 1 per week.",
  "Fartlek ou Intervalado curto, conforme o plano (critério inicial do app).":
    "Fartlek or Short intervals, depending on the plan (initial criterion of the app).",
};

/** Mesma estrutura do texto em português, com cada frase traduzida. */
export function translateAthleteText(a: AthleteText): AthleteText {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const en = EN_BY_PT[v];
      if (en === undefined) throw new Error(`texto do atleta sem tradução para o inglês: ${JSON.stringify(v)}`);
      return en;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(a) as AthleteText;
}
