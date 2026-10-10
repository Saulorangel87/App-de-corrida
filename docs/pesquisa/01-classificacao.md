# Classificação do corredor (iniciante, intermediário, avançado)

## Resumo
Não existe na literatura um padrão único, validado para prescrição de treino, para separar corredores em iniciante, intermediário e avançado. As revisões mostram que os pontos de corte variam muito entre estudos: experiência de 0,5 a 3 anos e 0 a 20 km/semana para "menos experiente", e de 2 a 10 anos e 15 a 50 km/semana para "mais experiente" [Rabello 2025]. A única definição operacional com várias dimensões (experiência, frequência, volume e desempenho) que encontrei é a de um painel Delphi sobre calçados, escrita para homens de 18 a 34 anos [Honert 2020]. Ela é a melhor base disponível, com a ressalva de que o uso original não era prescrição de treino. Proponho um algoritmo versionado (`CLS-v1`) que adota esses limiares sem sobreposição, exige que todos os critérios sejam atendidos (vale o menor nível) e trata lesão prévia como alerta de cautela, e não como critério de nível. A literatura não traz evidência sobre o intervalo de reavaliação: a proposta de 12 semanas mais gatilhos por evento é decisão de projeto.

## Achados

### 1. Não há definição padrão; a heterogeneidade é a regra
- Revisão sistemática de 28 estudos: os cortes para "mais experiente" iam de 2 a 10 anos e/ou 15 a 50 km/semana; os de "menos experiente", de 0,5 a 3 anos e/ou 0 a 20 km/semana. Os autores atribuem os resultados inconsistentes à heterogeneidade dos critérios e propõem uma taxonomia por três facetas: exposição, desempenho e intenção [Rabello 2025]. A faceta de exposição é a distância total já percorrida na vida. Os cortes numéricos que eles sugerem (novato 0 a 1040 km, recreacional 1041 a 7800 km, alto nível ≥ 7801 km) são adaptados de Honert e **não validados** [Rabello 2025].
- Revisões de incidência de lesão avisam que "tipo de corredor" é definido de formas diferentes entre estudos, o que dificulta comparar resultados [Videbæk 2015]. Na revisão de Kluitenberg, as populações foram separadas sobretudo por distância de prova e por "sem corrida regular no ano anterior" (novato), sem usar km/semana ou anos de prática [Kluitenberg 2015a].
- Estrutura geral de classificação de participantes em ciência do esporte: seis níveis (sedentário, recreacionalmente ativo, treinado/em desenvolvimento, altamente treinado/nacional, elite/internacional, classe mundial), baseados em volume de treino e desempenho [McKay 2022]. Li apenas o resumo; ele não dá cortes numéricos para corrida no que consegui verificar. Serve como referência de nomenclatura, não como fonte de limiares.

### 2. Definição de "novato" nas coortes de lesão
- Nas coortes dinamarquesas (DANO-RUN), novato é quem "não correu de forma regular no último ano", com "regular" definido como mais de 10 km de distância total correndo no ano anterior. Na coorte de 930 novatos, os participantes tinham de 18 a 65 anos e nenhuma lesão de membro inferior ou coluna nos 3 meses anteriores [Nielsen 2013].
- Na meta-análise de incidência, novatos são quem tem pouca ou nenhuma experiência ou não correu regularmente nos 12 meses anteriores. Já recreacionais são quem já corria regularmente (exemplos: pelo menos uma vez por semana; mais de 6 meses acumulados de treino regular) [Videbæk 2015].
- Na coorte de 629 novatos e recreacionais que se preparavam para uma prova de 4 milhas, não ter experiência prévia de corrida foi o fator de risco mais forte para lesão em ambos os sexos [Buist 2010].

### 3. A única definição multidimensional encontrada (Delphi de Honert)
Painel Delphi com 142 especialistas convidados e 24 que completaram as 3 rodadas, voltado a recomendar características de calçado. Os níveis partiram de definições iniciais da literatura e foram ajustados pelos especialistas. Os autores dizem que são "diretrizes" e que os níveis se sobrepõem de propósito, para classificar quem treina menos e rende mais. A definição de alto nível ficou limitada a homens de 18 a 34 anos [Honert 2020]. Valores finais:

| Nível (Honert) | Experiência regular* | Sessões/semana | km/semana | Desempenho (homens 18-34) |
|---|---|---|---|---|
| Novato | menos de 1 ano | 0 a 3 | 5 a 20 | 5 km mais lento que 30 min, ou 10 km mais lento que 60 min; sem maratona |
| Recreacional | mais de 1 ano | 1 a 5 | 15 a 50 | 5 km mais lento que 21 min, ou 10 km mais lento que 42 min; maratona 3 h a 4 h30 |
| Alto nível | mais de 3 anos | mais de 4 | mais de 50 | 5 km em 15 a 20 min, ou 10 km em 30 a 42 min; maratona abaixo de 3 h |

*"Regular" = pelo menos uma vez por semana [Honert 2020]. Na primeira rodada a experiência exigida era de 6 meses; subiu para 1 ano após o feedback dos especialistas, e para alto nível a frequência subiu de mais de 3 para mais de 4 sessões e o volume de mais de 30 para mais de 50 km [Honert 2020, respostas aos revisores].

Limitações declaradas: os autores não especificaram quantos critérios o corredor precisa atender para entrar em um nível [Honert 2020]. Essa lacuna é resolvida no algoritmo abaixo por decisão de projeto.

### 4. Evidências que apoiam ou calibram os limiares de Honert
- Bandas de volume semelhantes em estudos independentes: iniciantes com cerca de 18 km/semana e menos de 1 ano de prática; avançados com mais de 7 anos e cerca de 38 km/semana (resumo de congresso, amostra chilena de 821 corredores, análise de agrupamentos) [Besomi 2017]. Coerente com Honert, mas é fonte fraca.
- Recreacionais brasileiros (n = 1.149) se separaram em duas classes: "recreacional" (91% com até 35 km/semana; 16% com mais de 3 sessões/semana) e "amador" (95% com mais de 35 km/semana; 100% com mais de 3 sessões). Os autores não reportaram anos de prática por classe [Thuany 2020].
- Em 1.235 corredores brasileiros autoclassificados, o **pace** foi a variável que melhor discriminou os grupos, depois IMC e volume semanal; o **tempo de prática não discriminou** (p = 0,37 em mulheres e 0,49 em homens). Mesmo assim a classificação correta chegou a só 48 a 70% [Thuany 2021]. Implicação: anos de prática sozinhos são um mau critério de nível; precisam de volume e desempenho.
- Mesmo corredores de maratona "novatos" (3 ou menos maratonas) tinham em média 4,1 anos de corrida regular e 47 km/semana; os "experientes" tinham 9,7 anos e 59 km/semana (homens, Atenas, n = 135, estudo transversal) [Nikolaidis 2021]. Ou seja, "novato" em estudos de maratona não equivale a "iniciante" no app.
- Amostra de referência de corredores recreacionais que treinam para provas (internet, n = 2.303, não aleatória, auto-relato): mediana de 30 milhas (48 km) por semana (IQR 20 a 42 milhas); mediana de 5 km de 20:35 em homens e 26:01 em mulheres; de 10 km, 44:51 e 54:58 [Vickers 2016]. A amostra tende a ser mais comprometida que o corredor médio; serve de ordem de grandeza e de razão entre sexos (5 km: 1,26; 10 km: 1,23), não de norma.
- Corredores de elite mundial fazem 130 a 220 km/semana e 11 a 14 sessões/semana na fase intermediária do preparo [Haugen 2022]. O "avançado" do app (acima de 50 km/semana) está muito abaixo disso; o app não atende elite.

### 5. Histórico de lesões: fator de risco, não critério de nível
- Lesão nos 12 meses anteriores é o fator de risco mais consistente para nova lesão por corrida [Saragiotto 2014]; lesão prévia aumentou o risco de lesão geral e específica em corredores de média e longa distância [Hulme 2017].
- Entre novatos, lesão prévia não relacionada à corrida teve associação limítrofe (P = 0,05), enquanto lesão prévia de corrida, sexo e experiência prévia de corrida não foram significativos; IMC acima de 30 e idade de 45 a 65 anos tiveram tendência de risco maior, sem significância [Nielsen 2013].
- Novatos têm incidência maior por hora de corrida (17,8 vs 7,7 lesões por 1.000 h em recreacionais) [Videbæk 2015], mas as proporções de lesão com afastamento por tempo de seguimento não mostram diferença clara em curto prazo (26,4% vs 28,0% em 6 a 15 semanas) [Kluitenberg 2015a]. Ver seção de conflitos.
- Um programa de 13 semanas "graduado" com a regra dos 10% não reduziu lesões em novatos frente a um programa padrão de 8 semanas (20,8% vs 20,3%) [Buist 2008]. Detalhes de progressão ficam no arquivo de progressão de carga.

### 6. Auto-relato como entrada da classificação
- Em 475 corredores recreacionais, a distância semanal auto-relatada teve boa concordância com o relógio (CCI 0,88) e o pace teve concordância moderada (CCI 0,72) [Bullock 2024]. A distância semanal é, portanto, uma entrada aceitável; o pace/tempo auto-relatado é menos confiável.

### 7. Pausas, destreinamento e atividade regular
- Após mais de 4 semanas de estímulo insuficiente, o VO2máx cai, o limiar de lactato diminui e a capilarização e as enzimas oxidativas regridem; em menos de 4 semanas as perdas existem, mas são mais brandas em quem começou a treinar há pouco tempo [Mujika 2000a; Mujika 2000b]. Não há prescrição numérica de "quanto rebaixar", só a divisão de 4 semanas.
- O modelo de triagem do ACSM define exercício regular como atividade planejada e estruturada de pelo menos 30 min em intensidade moderada, em pelo menos 3 dias por semana, nos últimos 3 meses [Riebe 2015; definição verificada em Whitfield 2017]. Quem não cumpre é tratado como inativo, com cuidados diferentes de quem é ativo. Esse corte de 3 meses é usado aqui como gancho para "volta ao zero".

### 8. Intervalo de reavaliação
- Busca específica não encontrou estudo que compare intervalos de reavaliação do nível ou do estado de treinamento de corredores recreacionais. **Sem evidência suficiente.** Fabricantes de relógios e treinadores sugerem refazer testes a cada 8 a 16 semanas, mas isso não é fonte científica e não está na tabela de evidências. Proposta conservadora na seção de regras.

## Algoritmo proposto: `CLS-v1`

### Entradas (da entrevista, seção 6 da especificação)
| Variável | Definição |
|---|---|
| `idade` | anos; menor que 18 fica fora do app |
| `sexo` | M, F ou não informado (não informado usa os limiares de M, que são mais exigentes) |
| `meses_regular` | meses seguidos correndo pelo menos 1 vez por semana (definição de "regular" de [Honert 2020]) |
| `vol_ref` | média de km por semana nas últimas 4 semanas; se `semanas_sem_correr` ≥ 4, a média das 4 semanas antes da pausa |
| `freq_ref` | média de sessões de corrida por semana, mesmo período de `vol_ref` |
| `t5k`, `t10k` | melhor tempo em prova ou teste de esforço máximo nos últimos 6 meses (opcionais) |
| `semanas_sem_correr` | semanas desde a última corrida regular |
| `ativo_3m` | fez exercício regular (definição ACSM) nos últimos 3 meses |
| `lesao_12m` | lesão por corrida com afastamento nos últimos 12 meses |

### Passos
1. **Experiência**: `nivel_exp` = 1 se `meses_regular` < 12; 2 se 12 a 35; 3 se ≥ 36.
2. **Carga**:
   - `vol_ref` ≥ 20 e ≤ 50 → 2.
   - `vol_ref` > 50 e `freq_ref` ≥ 5 → 3. Se > 50 e `freq_ref` < 5 → 2.
   - `vol_ref` < 15 → 1.
   - `vol_ref` de 15 a < 20 (zona de sobreposição): 2 somente se `meses_regular` ≥ 12 **e** há tempo que exclui o perfil novato (`t5k` ≤ 30:00 ou `t10k` ≤ 60:00 para M; ×1,25 para F). Caso contrário, 1.
3. **Desempenho (só para avançado)**: comprovado se `t5k` ≤ 20:00 ou `t10k` ≤ 42:00 (M); para F, `t5k` ≤ 25:00 ou `t10k` ≤ 52:30. Sem tempo válido, `nivel_desemp` = 2 (teto intermediário); com tempo válido, 3.
4. **Nível base** = mínimo de (`nivel_exp`, `nivel_carga`, `nivel_desemp`).
5. **Pausa** (aplicada ao nível base): `semanas_sem_correr` < 4 → sem mudança; 4 a 12 → reduz 1 nível (mínimo 1) e marca `retorno_de_pausa`; > 12 (cerca de 3 meses) → nível 1 e marca `retorno_de_pausa`.
6. **Sedentário**: se `meses_regular` = 0 e `ativo_3m` = falso → nível 1 e marca `inicio_do_zero` (o plano inicial usa a progressão de iniciante; triagem de saúde no arquivo próprio).
7. **Lesão**: se `lesao_12m` → marca `cautela_lesao` (o motor de progressão usa o limite mais conservador). Não altera o nível.
8. **Saída**: `nivel`, `flags`, `criterios_limitantes` (quais passos seguraram o nível), `versao_regra` = `CLS-v1`, `proxima_reavaliacao` = data + 12 semanas.

### Origem de cada limiar
| Limiar | Valor | Origem |
|---|---|---|
| "Regular" = 1 ou mais vezes por semana | 1/semana | Literatura [Honert 2020] |
| Novato: sem corrida regular no ano anterior | ≤ 10 km no ano | Literatura [Nielsen 2013; Nielsen 2014a] |
| Experiência iniciante → intermediário | 12 meses | Literatura [Honert 2020] |
| Experiência intermediário → avançado | 36 meses | Literatura [Honert 2020] |
| Volume iniciante/intermediário | 20 km/semana (15 a 20 em zona de sobreposição) | Literatura [Honert 2020], com resolução da sobreposição por decisão de projeto |
| Volume intermediário/avançado | > 50 km/semana | Literatura [Honert 2020] |
| Frequência para avançado | ≥ 5 sessões/semana ("mais de 4") | Literatura [Honert 2020] |
| Desempenho avançado, homens | 5 km ≤ 20:00; 10 km ≤ 42:00 | Literatura [Honert 2020], usando o limite superior da faixa "alto nível" |
| Corte de "não novato" | 5 km ≤ 30:00; 10 km ≤ 60:00 | Literatura [Honert 2020] |
| Fator para mulheres | × 1,25 nos tempos | **Decisão de projeto**, derivada da razão de medianas de [Vickers 2016]; não validada |
| Regra do mínimo entre critérios | todos os critérios | **Decisão de projeto** (Honert não diz quantos critérios atender) |
| Sem tempo informado → teto intermediário | — | **Decisão de projeto** (conservadora) |
| Validade do tempo | 6 meses | **Decisão de projeto** |
| Pausa < 4 semanas sem mudança | 4 semanas | Parcialmente literatura (divisão em [Mujika 2000a; Mujika 2000b]); regra de rebaixar 1 nível é decisão de projeto |
| Pausa > 12 semanas → nível 1 | 12 semanas | Parcialmente literatura (inativo = sem exercício regular em 3 meses [Riebe 2015]); a regra é decisão de projeto |
| Lesão em 12 meses → cautela | 12 meses | Literatura [Saragiotto 2014]; o uso como flag é decisão de projeto |
| Reavaliação a cada 12 semanas | 12 semanas | **Decisão de projeto** (sem evidência) |

### Casos de teste sugeridos (para `packages/engine`)
Todos assumem `ativo_3m` verdadeiro, sem pausa e sem lesão, salvo indicação.

| # | Entrada | Nível esperado |
|---|---|---|
| 1 | Nunca correu, `ativo_3m` falso | Iniciante, `inicio_do_zero` |
| 2 | 8 meses regular, 3x/sem, 18 km | Iniciante (experiência) |
| 3 | 12 meses exatos, 3x/sem, 20 km | Intermediário |
| 4 | 24 meses, 3x, 25 km, sem tempo | Intermediário |
| 5 | 24 meses, 3x, 16 km, sem tempo | Iniciante (zona de sobreposição sem tempo) |
| 6 | Caso 5 com `t5k` 28:00, M | Intermediário |
| 7 | 48 meses, 5x, 60 km, `t5k` 19:30, M | Avançado |
| 8 | Caso 7 sem tempo | Intermediário |
| 9 | Caso 7 com 4x/sem | Intermediário |
| 10 | 48 meses, 5x, 60 km, F, `t5k` 24:30 | Avançado |
| 11 | Caso 10 com `t5k` 26:00 | Intermediário |
| 12 | Caso 7 com 6 semanas sem correr | Intermediário, `retorno_de_pausa` |
| 13 | Caso 7 com 14 semanas sem correr | Iniciante, `retorno_de_pausa` |
| 14 | Caso 4 com lesão há 6 meses | Intermediário, `cautela_lesao` |
| 15 | 36 meses, 5x, 50 km exatos, `t5k` 22:00 | Intermediário |
| 16 | Idade 17 | Fora do app |

### Explicação ao atleta (modelo de texto)
"Você foi classificado como **[nível]** porque [critério limitante em linguagem simples, por exemplo: corre regularmente há menos de 12 meses / seu volume médio nas últimas 4 semanas é de X km / você ainda não informou um tempo recente de 5 ou 10 km]. Esta classificação é uma estimativa conservadora e será revista em [data] ou antes, se você ficar sem correr por mais de 4 semanas ou tiver uma lesão."

## Regras propostas para o app

1. **R-CLS-01 (nível = menor dos critérios)**: o nível é o mínimo entre experiência, carga (volume e frequência) e desempenho, de modo que qualquer dúvida ou dado faltante empurre o atleta para baixo, nunca para cima. Fonte do desenho: critérios de [Honert 2020]; a regra do mínimo é decisão de projeto.
2. **R-CLS-02 (definição de corrida regular)**: "regular" = pelo menos 1 corrida por semana [Honert 2020]. A entrevista deve perguntar "há quanto tempo você corre pelo menos uma vez por semana, sem pausas longas", e não apenas "há quanto tempo corre". Pessoas que correram 10 km ou menos no total no último ano contam como começando do zero [Nielsen 2013; Nielsen 2014a].
3. **R-CLS-03 (experiência)**: menos de 12 meses → iniciante; 12 a 35 → até intermediário; 36 ou mais → elegível a avançado [Honert 2020; Rabello 2025 mostra a faixa de cortes usada na literatura, de 0,5 a 3 anos para menos experiente].
4. **R-CLS-04 (volume)**: iniciante abaixo de 20 km/semana; intermediário de 20 a 50; avançado acima de 50 [Honert 2020]. Zona de 15 a 20 km: só vale intermediário com 12 meses ou mais de prática e tempo que descarte perfil novato (decisão de projeto sobre a sobreposição de [Honert 2020]).
5. **R-CLS-05 (frequência para avançado)**: avançado exige média de 5 ou mais sessões por semana [Honert 2020]. Frequência não promove nem rebaixa os demais níveis.
6. **R-CLS-06 (desempenho para avançado)**: avançado exige tempo de 5 km ≤ 20:00 ou 10 km ≤ 42:00 (mulheres: 25:00 e 52:30) nos últimos 6 meses, de prova ou teste. Sem tempo, o teto é intermediário. Fonte: [Honert 2020]; fator feminino e janela de 6 meses são decisão de projeto. Preferir tempo de prova oficial ou do relógio, pois o pace auto-relatado tem concordância só moderada [Bullock 2024], enquanto a distância semanal é confiável [Bullock 2024].
7. **R-CLS-07 (pausa e retorno)**: pausa de menos de 4 semanas não muda o nível; de 4 a 12 semanas rebaixa 1 nível; acima de 12 semanas volta a iniciante. Base: [Mujika 2000a; Mujika 2000b] para o limite de 4 semanas e [Riebe 2015] para o de 3 meses; valores de rebaixamento são decisão de projeto. O volume de referência nessas situações é o das 4 semanas anteriores à pausa.
8. **R-CLS-08 (início do zero)**: sem corrida regular e sem exercício regular nos últimos 3 meses → iniciante com sinalizador `inicio_do_zero` (progressão mais lenta, definida no arquivo de planos; elegibilidade clínica no arquivo de triagem) [Riebe 2015].
9. **R-CLS-09 (lesão prévia é alerta, não nível)**: lesão por corrida com afastamento nos últimos 12 meses ativa `cautela_lesao` (limites de progressão mais conservadores no motor), sem mudar o nível [Saragiotto 2014; Hulme 2017]. Dor ou lesão atual segue as regras do arquivo de dor e bloqueia a liberação do plano, independentemente do nível.
10. **R-CLS-10 (fatores não usados no nível)**: idade, IMC e sexo não entram na classificação (exceto a escala de tempos para mulheres), porque a evidência de risco é inconsistente ou não significativa [Nielsen 2013; Saragiotto 2014]. A "maior distância recente" e os dias disponíveis não entram na classificação; servem ao dimensionamento do plano.
11. **R-CLS-11 (reavaliação)**: recalcular a cada 12 semanas com os dados registrados no app (volume e frequência reais dos `workout_logs`) mais tempos novos. **Rebaixamento por evento é imediato**: pausa de 4 semanas ou mais detectada nos registros, nova lesão ou dor persistente. **Promoção só acontece na reavaliação** e só se os critérios do nível superior forem atendidos nas 4 semanas mais recentes. Sem evidência para o intervalo; decisão conservadora de projeto.
12. **R-CLS-12 (iniciante tratado com mais cautela)**: o nível 1 recebe os limites de progressão mais conservadores do motor, porque a incidência de lesão por hora de corrida é maior em novatos e a falta de experiência prévia foi o principal risco na coorte de 4 milhas [Videbæk 2015; Buist 2010].
13. **R-CLS-13 (escopo)**: o app informa que "avançado" significa acima de 50 km/semana e com tempos de alto nível amador, e não atende treino de elite, cuja rotina típica é de 130 a 220 km/semana e 11 a 14 sessões [Haugen 2022].
14. **R-CLS-14 (versionamento e auditoria)**: gravar em `athlete_profiles` o nível, `versao_regra` (`CLS-v1`), as entradas usadas, os flags e os critérios limitantes, e a data da próxima reavaliação. Mudar qualquer limiar exige nova versão (`CLS-v2`) e novo teste dos casos acima.
15. **R-CLS-15 (explicação)**: toda classificação mostra ao atleta o texto simples do critério limitante e as fontes ([Honert 2020] como base dos limiares), avisando que é uma estimativa conservadora.

## Evidência fraca ou conflitante

1. **Base dos limiares é um Delphi de calçados, em homens de 18 a 34 anos.** Só 24 de 142 especialistas concluíram as rodadas, e o objetivo era recomendar tênis, não treino [Honert 2020]. Decisão conservadora: adotar os limiares como ponto de partida, aplicar a regra do mínimo, exigir tempo comprovado para avançado e deixar o motor tratar todo atleta com a progressão de seu nível. Revisar em `CLS-v2` se surgir fonte melhor.
2. **Tempo de prática discrimina mal os níveis na prática.** Em 1.235 corredores, o tempo de prática não separou os grupos, e o pace separou melhor [Thuany 2021]; ao mesmo tempo, Honert usa experiência como critério. Decisão: experiência é critério necessário, nunca suficiente.
3. **Os limites de Honert se sobrepõem** (por exemplo, volume de 15 a 20 km cabe em novato e recreacional), e os autores não definem quantos critérios bastam [Honert 2020]. Decisão: faixas sem sobreposição, e a regra do mínimo.
4. **Risco de lesão em novatos: duas métricas, dois resultados.** Por hora de corrida, novatos se lesionam mais (17,8 vs 7,7 por 1.000 h) [Videbæk 2015]; por proporção com afastamento em seguimento de 6 a 15 semanas, não há diferença clara, e os autores de [Kluitenberg 2015a] dizem que o resultado não sustenta, por si, a ideia de que novatos têm mais risco. Decisão: tratar iniciantes com cautela (R-CLS-12), sem usar esse conflito como limiar.
5. **Desempenho entre sexos e idades.** Não encontrei limiares validados de tempo para mulheres ou para mais velhos. O fator ×1,25 vem das medianas de uma amostra de conveniência [Vickers 2016]. Decisão: usar o fator apenas como proposta, perguntar ao dono; não ajustar por idade (corredores mais velhos tendem a cair um nível, ou seja, erro para o lado seguro).
6. **Rebaixamento por pausa.** A literatura de destreinamento descreve perdas fisiológicas, mas não dá regra de rebaixamento por semanas de pausa [Mujika 2000a; Mujika 2000b]. Decisão: regra escalonada em 4 e 12 semanas, tratada como decisão de projeto.
7. **Taxonomia por exposição acumulada (km totais na vida).** É uma proposta nova e não validada [Rabello 2025]. Decisão: não usar no `CLS-v1`.
8. **Autoclassificação.** Perguntar "você se considera iniciante, intermediário ou avançado?" não foi validado; na amostra brasileira, a autoclassificação acertou só 48 a 70% [Thuany 2021]. Decisão: não usar autoclassificação como critério; no máximo mostrar ao atleta o resultado e permitir pedir nível menor (nunca maior).

## Perguntas para o dono do projeto

1. **Base de limiares**: aceita adotar os limiares de [Honert 2020] (Delphi de calçados, homens 18 a 34) como ponto de partida do `CLS-v1`, sabendo que a evidência é de consenso de especialistas e não de estudo de treinamento? Sem evidência suficiente para alternativa melhor.
2. **Mulheres e mais velhos**: sem evidência suficiente para tempos de corte por sexo e idade. Aceita o fator ×1,25 para mulheres (derivado de medianas de [Vickers 2016]) e nenhum ajuste por idade? Alternativa mais conservadora: exigir só os critérios de experiência, volume e frequência para avançado em mulheres e mais velhos, sem tempo.
3. **Reavaliação**: sem evidência suficiente para o intervalo. Aceita 12 semanas mais gatilhos por evento (pausa, lesão, tempo novo)?
4. **Rebaixamento por pausa** (1 nível entre 4 e 12 semanas; iniciante acima de 12): aceita como decisão de projeto?
5. **Iniciantes que medem por minutos**: caminhada-corrida costuma ser prescrita por tempo, não por km. Sem evidência suficiente para converter minutos em km/semana. Quer que a entrevista aceite minutos para quem tem menos de 12 meses de prática, mantendo o nível iniciante automaticamente?
6. **Janela de validade do tempo** (6 meses) e uso apenas de 5 e 10 km (o Delphi também traz maratona e a revisão menciona meia): quer incluir meia-maratona e maratona na entrevista?
7. **Divergência com a especificação**: a seção 3 lista "histórico de lesões" como critério de classificação. A literatura o mostra como fator de risco; propus tratá-lo como alerta (`cautela_lesao`), sem mudar o nível. Concorda?

## Tabela de evidências

| Afirmação | Fonte | Nível | Como vira regra no app |
|---|---|---|---|
| Não há padrão único; cortes variam de 0,5 a 3 anos e 0 a 20 km/semana (menos experiente) e de 2 a 10 anos e 15 a 50 km/semana (mais experiente) | [Rabello 2025] | 1 | Justifica adotar uma definição explícita e versionada (R-CLS-01, R-CLS-14) |
| Níveis multidimensionais: novato menos de 1 ano, 5 a 20 km/sem; recreacional mais de 1 ano, 15 a 50 km/sem; alto nível mais de 3 anos, mais de 50 km/sem, mais de 4 sessões/sem, 5 km de 15 a 20 min | [Honert 2020] | 4 | Limiares de R-CLS-03, 04, 05, 06 |
| "Regular" = pelo menos 1 vez por semana | [Honert 2020] | 4 | R-CLS-02 |
| Novato = sem corrida regular no ano anterior (10 km ou menos) | [Nielsen 2013; Nielsen 2014a; Videbæk 2015] | 3 | R-CLS-02 |
| Tempo de prática não discriminou níveis; pace sim | [Thuany 2021] | 3 | Experiência necessária mas não suficiente (R-CLS-01, R-CLS-06) |
| Classes recreacional/amador: 35 km/sem e 3 sessões/sem separam grupos | [Thuany 2020] | 3 | Apoio ao uso de volume e frequência |
| Perfis com iniciantes ~18 km/sem e menos de 1 ano (resumo de congresso) | [Besomi 2017] | 3 | Apoio fraco aos limiares de volume |
| Distância semanal auto-relatada é confiável (CCI 0,88); pace menos (0,72) | [Bullock 2024] | 3 | Volume do auto-relato aceito; tempos preferencialmente de prova (R-CLS-06) |
| Mediana de 5 km: 20:35 (M) e 26:01 (F); 10 km: 44:51 e 54:58 em amostra recreacional | [Vickers 2016] | 3 | Fator feminino ×1,25 (decisão de projeto) |
| "Novato" em maratona tem 4 anos e 47 km/sem em média | [Nikolaidis 2021] | 3 | Alerta de que "novato" muda com o contexto; não usar |
| Elite mundial: 130 a 220 km/sem, 11 a 14 sessões/sem | [Haugen 2022] | 5 | Escopo do app (R-CLS-13) |
| Lesão nos 12 meses anteriores é o principal fator de risco | [Saragiotto 2014] | 1 | `cautela_lesao` (R-CLS-09) |
| Lesão prévia eleva o risco de lesão por corrida | [Hulme 2017] | 1 | `cautela_lesao` (R-CLS-09) |
| Em novatos, lesão prévia não relacionada à corrida teve associação limítrofe; idade, IMC e sexo sem associação significativa | [Nielsen 2013] | 3 | Idade, IMC e sexo fora do nível (R-CLS-10) |
| Novatos: 17,8 lesões/1.000 h vs 7,7 em recreacionais | [Videbæk 2015] | 1 | Iniciante com cautela maior (R-CLS-12) |
| Proporção de lesão com afastamento semelhante em curto prazo (26,4% vs 28,0%) | [Kluitenberg 2015a] | 1 | Registrado como conflito |
| Sem experiência prévia é o maior risco em coorte de 4 milhas | [Buist 2010] | 3 | Iniciante com cautela (R-CLS-12) |
| Programa graduado de 13 semanas (regra dos 10%) não reduziu lesões em novatos | [Buist 2008] | 2 | Remete ao arquivo de progressão |
| Mais de 4 semanas de estímulo insuficiente causam perdas maiores (VO2máx, limiar de lactato) | [Mujika 2000a; Mujika 2000b] | 5 | Limite de 4 semanas na pausa (R-CLS-07) |
| Exercício regular = 30 min moderado, 3 dias/semana, 3 meses | [Riebe 2015; Whitfield 2017] | 4 | `inicio_do_zero` e pausa > 12 semanas (R-CLS-07, R-CLS-08) |
| Framework de seis níveis de participantes | [McKay 2022] | 5 | Só nomenclatura; sem limiares |
| Intervalo de reavaliação | sem evidência suficiente | — | 12 semanas por decisão de projeto (R-CLS-11) |

## Referências

| Chave | Autores | Ano | Título | Periódico | DOI/URL | Tipo de estudo | Nível | Verificação |
|---|---|---|---|---|---|---|---|---|
| Honert 2020 | Honert EC, Mohr M, Lam WK, Nigg S | 2020 | Shoe feature recommendations for different running levels: A Delphi study | PLoS One 15(7):e0236047 | 10.1371/journal.pone.0236047 | Painel Delphi (consenso de especialistas) | 4 | texto completo (PMC7365446; partes) |
| Rabello 2025 | Rabello R, Desai GA, Gruber AH | 2025 | Inconsistent Effects of Experience on Running Biomechanics May be Influenced by Study Heterogeneity and Classification Criteria: a Systematic Review and Proposal of a Revised Taxonomy | Sports Med Open 11(1):69 | 10.1186/s40798-025-00870-5 | Revisão sistemática (28 estudos) | 1 | texto completo (PMC12146231) |
| Nielsen 2013 | Nielsen RO, Buist I, Parner ET, Nohr EA, Sørensen H, Lind M, Rasmussen S | 2013 | Predictors of Running-Related Injuries Among 930 Novice Runners: A 1-Year Prospective Follow-up Study | Orthop J Sports Med 1(1) | 10.1177/2325967113487316 | Coorte prospectiva | 3 | texto completo (PMC4555503) |
| Nielsen 2014a | Nielsen RO, Rønnow L, Rasmussen S, Lind M | 2014 | A Prospective Study on Time to Recovery in 254 Injured Novice Runners | PLoS One 9(6):e99877 | 10.1371/journal.pone.0099877 | Coorte prospectiva | 3 | texto completo (PMC4055729) |
| Videbæk 2015 | Videbæk S, Bueno AM, Nielsen RO, Rasmussen S | 2015 | Incidence of Running-Related Injuries Per 1000 h of running in Different Types of Runners: A Systematic Review and Meta-Analysis | Sports Med 45(7):1017-1026 | 10.1007/s40279-015-0333-8 (PMC4473093) | Revisão sistemática e meta-análise | 1 | texto completo (PMC4473093) |
| Kluitenberg 2015a | Kluitenberg B, van Middelkoop M, Diercks R, van der Worp H | 2015 | What are the Differences in Injury Proportions Between Different Populations of Runners? A Systematic Review and Meta-Analysis | Sports Med 45(8):1143-1161 | 10.1007/s40279-015-0331-x | Revisão sistemática e meta-análise | 1 | texto completo (PMC4513221; primeiras 100.000 caracteres) |
| Saragiotto 2014 | Saragiotto BT, Yamato TP, Hespanhol Junior LC, Rainbow MJ, Davis IS, Lopes AD | 2014 | What are the main risk factors for running-related injuries? | Sports Med 44(8):1153-1163 | 10.1007/s40279-014-0194-6 | Revisão sistemática (sem meta-análise) | 1 | resumo (Europe PMC) |
| Hulme 2017 | Hulme A, Nielsen RO, Timpka T, Verhagen E, Finch C | 2017 | Risk and Protective Factors for Middle- and Long-Distance Running-Related Injury | Sports Med 47(5):869-886 | 10.1007/s40279-016-0636-4 | Revisão sistemática | 1 | resumo (Europe PMC) |
| Buist 2008 | Buist I, Bredeweg SW, van Mechelen W, Lemmink KA, Pepping GJ, Diercks RL | 2008 (online 2007) | No effect of a graded training program on the number of running-related injuries in novice runners: a randomized controlled trial | Am J Sports Med 36(1):33-39 | 10.1177/0363546507307505 (PMID 17940147) | Ensaio clínico randomizado | 2 | resumo (Europe PMC) |
| Buist 2010 | Buist I, Bredeweg SW, Bessem B, van Mechelen W, Lemmink KA, Diercks RL | 2010 | Incidence and risk factors of running-related injuries during preparation for a 4-mile recreational running event | Br J Sports Med 44(8):598-604 | 10.1136/bjsm.2007.044677 | Coorte prospectiva | 3 | resumo (Europe PMC) |
| Thuany 2021 | Thuany M, de Souza RF, Hill L, Mesquita JL, Rosemann T, Knechtle B, Pereira S, Gomes TN | 2021 | Discriminant Analysis of Anthropometric and Training Variables among Runners of Different Competitive Levels | Int J Environ Res Public Health 18(8):4248 | 10.3390/ijerph18084248 | Estudo transversal (questionário online) | 3 | texto completo (PMC8072622) |
| Thuany 2020 | Thuany M, Gomes TN, de Almeida MB | 2020 | Is there any difference between "amateur" and "recreational" runners? A latent class analysis | Motriz: Rev Educ Fis 26(4) | 10.1590/S1980-65742020000400140 | Estudo transversal (análise de classes latentes) | 3 | texto completo (SciELO) |
| Besomi 2017 | Besomi M, Leppe J, Mauri Stecca M, Sizer P | 2017 | Running Profiles And Their Associated Behaviors: A Proposal For Chilean Runners | Med Sci Sports Exerc 49(5S):918 (resumo de congresso) | http://hdl.handle.net/11447/2057 | Estudo transversal (agrupamento); só resumo | 3 | resumo |
| Nikolaidis 2021 | Nikolaidis PT, Clemente-Suárez VJ, Chlíbková D, Knechtle B | 2021 | Training, Anthropometric, and Physiological Characteristics in Men Recreational Marathon Runners: The Role of Sport Experience | Front Physiol 12:666201 | 10.3389/fphys.2021.666201 | Estudo transversal | 3 | texto completo (Frontiers) |
| Vickers 2016 | Vickers AJ, Vertosick EA | 2016 | An empirical study of race times in recreational endurance runners | BMC Sports Sci Med Rehabil 8:26 | 10.1186/s13102-016-0052-y (PMC5000509) | Estudo transversal (pesquisa na internet, amostra de conveniência) | 3 | texto completo (PMC5000509) |
| Bullock 2024 | Bullock G, Stocks J, Feakins B, Alizadeh Z, Arundale A, Kluzek S | 2024 | Comparing Self-Reported Running Distance and Pace With a Commercial Fitness Watch Data: Reliability Study | JMIR Form Res 8:e39211 | 10.2196/39211 | Coorte prospectiva (confiabilidade) | 3 | texto completo (PMC10797502) |
| Haugen 2022 | Haugen T, Sandbakk Ø, Seiler S, Tønnessen E | 2022 | The Training Characteristics of World-Class Distance Runners: An Integration of Scientific Literature and Results-Proven Practice | Sports Med Open 8:46 | 10.1186/s40798-022-00438-7 (PMC8975965) | Revisão narrativa com prática de treinadores | 5 | texto completo (PMC8975965; parcial) |
| McKay 2022 | McKay AKA, Stellingwerff T, Smith ES, Martin DT, Mujika I, Goosey-Tolfrey VL, Sheppard J, Burke LM | 2022 | Defining Training and Performance Caliber: A Participant Classification Framework | Int J Sports Physiol Perform 17(2):317-331 | 10.1123/ijspp.2021-0451 | Proposta de framework (especialistas) | 5 | resumo (Europe PMC); texto completo inacessível (paywall) |
| Mujika 2000a | Mujika I, Padilla S | 2000 | Detraining: loss of training-induced physiological and performance adaptations. Part I: short term insufficient training stimulus | Sports Med 30(2):79-87 | 10.2165/00007256-200030020-00002 (PMID 10966148) | Revisão narrativa | 5 | resumo (Europe PMC) |
| Mujika 2000b | Mujika I, Padilla S | 2000 | Detraining: loss of training-induced physiological and performance adaptations. Part II: long term insufficient training stimulus | Sports Med 30(3):145-154 | 10.2165/00007256-200030030-00001 (PMID 10999420) | Revisão narrativa | 5 | resumo (Europe PMC) |
| Riebe 2015 | Riebe D, Franklin BA, Thompson PD, Garber CE, Whitfield GP, Magal M, Pescatello LS | 2015 | Updating ACSM's recommendations for exercise preparticipation health screening | Med Sci Sports Exerc 47(11):2473-2479 | 10.1249/MSS.0000000000000664 (PMID 26473759) | Recomendação/posicionamento (ACSM) | 4 | resumo (URI Digital Commons); definição numérica confirmada em Whitfield 2017 |
| Whitfield 2017 | Whitfield GP, Riebe D, Magal M, Liguori G | 2017 | Applying the ACSM Preparticipation Screening Algorithm to U.S. Adults: National Health and Nutrition Examination Survey 2001-2004 | Med Sci Sports Exerc 49(10):2056-2063 | 10.1249/MSS.0000000000001331 (PMC7059860) | Estudo transversal (NHANES); usado só para a definição de exercício regular | 3 | texto completo (PMC7059860) |
