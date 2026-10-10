# Tabela de evidências consolidada

Junção das tabelas de evidências dos 10 arquivos, agrupada por tema. Atualizada em 2026-10-10 com as decisões do dono e de projeto registradas em `decisoes.md` (a marcação [P] indica valor sem evidência, aceito como ponto de partida e recalibrável). Mantém só as afirmações que viram regra (a coluna "Regra (ID)" tem ao menos um ID). Linhas cuja coluna "Como vira regra" diz só "contexto", "sem regra", "não adotado", "nenhuma" ou aponta apenas para perguntas ficaram de fora; as lacunas ("sem evidência suficiente") estão em `pontos-fracos.md`. Níveis: ver `README.md`.

## 1. Classificação do corredor (`01-classificacao.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| Não há padrão único; cortes variam de 0,5 a 3 anos e 0 a 20 km/semana (menos experiente) e de 2 a 10 anos e 15 a 50 km/semana (mais experiente) | [Rabello 2025] | 1 | Justifica adotar uma definição explícita e versionada (R-CLS-01, R-CLS-14) | R-CLS-01, R-CLS-14 |
| Níveis multidimensionais: novato menos de 1 ano, 5 a 20 km/sem; recreacional mais de 1 ano, 15 a 50 km/sem; alto nível mais de 3 anos, mais de 50 km/sem, mais de 4 sessões/sem, 5 km de 15 a 20 min | [Honert 2020] | 4 | Limiares de R-CLS-03, 04, 05, 06 | R-CLS-03, R-CLS-04, R-CLS-05, R-CLS-06 |
| "Regular" = pelo menos 1 vez por semana | [Honert 2020] | 4 | R-CLS-02 | R-CLS-02 |
| Novato = sem corrida regular no ano anterior (10 km ou menos) | [Nielsen 2013; Nielsen 2014a; Videbæk 2015] | 3 | R-CLS-02 | R-CLS-02 |
| Tempo de prática não discriminou níveis; pace sim | [Thuany 2021] | 3 | Experiência necessária mas não suficiente (R-CLS-01, R-CLS-06) | R-CLS-01, R-CLS-06 |
| Classes recreacional/amador: 35 km/sem e 3 sessões/sem separam grupos | [Thuany 2020] | 3 | Apoio ao uso de volume e frequência | R-CLS-04, R-CLS-05 |
| Perfis com iniciantes ~18 km/sem e menos de 1 ano (resumo de congresso) | [Besomi 2017] | 3 | Apoio fraco aos limiares de volume | R-CLS-04 |
| Distância semanal auto-relatada é confiável (CCI 0,88); pace menos (0,72) | [Bullock 2024] | 3 | Volume do auto-relato aceito; tempos preferencialmente de prova (R-CLS-06) | R-CLS-06 |
| Mediana de 5 km: 20:35 (M) e 26:01 (F); 10 km: 44:51 e 54:58 em amostra recreacional | [Vickers 2016] | 3 | Só contexto; os cortes femininos (5 km ≤ 22:00, 10 km ≤ 46:00, fator 1,1) são decisão do dono [P], sem fonte | R-CLS-06 |
| Elite mundial: 130 a 220 km/sem, 11 a 14 sessões/sem | [Haugen 2022] | 5 | Escopo do app (R-CLS-13) | R-CLS-13 |
| Lesão nos 12 meses anteriores é o principal fator de risco | [Saragiotto 2014] | 1 | `cautela_lesao`: alerta, não nível; teto semanal 105% (R-CLS-09) | R-CLS-09 |
| Lesão prévia eleva o risco de lesão por corrida | [Hulme 2017] | 1 | `cautela_lesao` (R-CLS-09) | R-CLS-09 |
| Em novatos, lesão prévia não relacionada à corrida teve associação limítrofe; idade, IMC e sexo sem associação significativa | [Nielsen 2013] | 3 | Idade, IMC e sexo fora do nível (R-CLS-10) | R-CLS-10 |
| Novatos: 17,8 lesões/1.000 h vs 7,7 em recreacionais | [Videbæk 2015] | 1 | Iniciante com cautela maior (R-CLS-12) | R-CLS-12 |
| Sem experiência prévia é o maior risco em coorte de 4 milhas | [Buist 2010] | 3 | Iniciante com cautela (R-CLS-12) | R-CLS-12 |
| Mais de 4 semanas de estímulo insuficiente causam perdas maiores (VO2máx, limiar de lactato) | [Mujika 2000a; Mujika 2000b] | 5 | Limite de 28 dias na pausa (R-CLS-07, R-PRG-08) | R-CLS-07 |
| Exercício regular = 30 min moderado, 3 dias/semana, 3 meses | [Riebe 2015; Whitfield 2017] | 4 | `inicio_do_zero` e pausa > 84 dias (R-CLS-07, R-CLS-08) | R-CLS-07, R-CLS-08 |
| Intervalo de reavaliação | sem evidência suficiente | — | 12 semanas ou fim do ciclo, [P] (R-CLS-11) | R-CLS-11 |

## 2. Triagem pré-participação (`02-triagem.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| PAR-Q+ tem 7 perguntas gerais; SIM abre seguimento; SIM no seguimento leva ao ePARmed-X+ e/ou profissional qualificado | [PARQ+ 2025] [Schwartz 2021] | 4 | R-TRI-02, 03, 05 | R-TRI-02, R-TRI-03, R-TRI-05 |
| Existe tradução oficial pt-BR aprovada pela Collaboration | [PARQ+ Idiomas] [Schwartz 2021] | 3/4 | R-TRI-02 | R-TRI-02 |
| Questionário não pode ser alterado; uso comercial exige licença; atribuição obrigatória | [PARQ+ Termos] [PARQ+ 2025] | 4 | R-TRI-02, 14 (app sempre gratuito; licença só se houver cobrança) | R-TRI-02, R-TRI-14 |
| Validade: PAR-Q+ 12 meses; ePARmed-X+ 6 meses; inválido se a saúde mudar | [PARQ+ 2025] [Bredin 2013] [Warburton 2011a] | 4/5 | R-TRI-10, 11 | R-TRI-10, R-TRI-11 |
| ePARmed-X+ pode liberar sem restrição, com restrição ou encaminhar ao médico | [Bredin 2013] | 5 | R-TRI-05 | R-TRI-05 |
| Mais de 45 anos sem hábito de esforço vigoroso: consultar profissional qualificado antes dessa intensidade | [PARQ+ 2025] | 4 | R-TRI-07 | R-TRI-07 |
| Adiar prática em doença aguda e gravidez | [PARQ+ 2025] | 4 | R-TRI-09 | R-TRI-09 |
| Algoritmo ACSM: nível atual de atividade, sintomas/doença conhecida, intensidade desejada | [Riebe 2015] [Whitfield 2017] | 4 | R-TRI-04, 06, 07 | R-TRI-04, R-TRI-06, R-TRI-07 |
| Sintoma exige liberação antes (ou interrupção do) exercício, mesmo sem doença diagnosticada | [Whitfield 2017] [ACSM Roundtable 2015] | 4 | R-TRI-04, 12 | R-TRI-04, R-TRI-12 |
| Definições de exercício regular, intensidade e sintomas | [Whitfield 2017] (reproduz Riebe 2015) | 3/4 | R-TRI-06, 07, 12 | R-TRI-06, R-TRI-07, R-TRI-12 |
| Risco transitório de infarto e morte súbita com esforço, menor com maior atividade habitual | [Dahabreh 2011] | 1 | R-TRI-08 | R-TRI-08 |
| Diretriz brasileira recomenda idealmente avaliação para exercício moderado a alto | [Ghorayeb 2019] | 4 | R-TRI-13 | R-TRI-13 |

## 3. Distribuição de intensidade (`03-distribuicao-intensidade.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| POL não difere de outras distribuições em prova contra-relógio, tempo até exaustão e velocidade no limiar; vantagem pequena no VO2pico só em < 12 semanas e atletas muito treinados | Oliveira 2024 | 1 | R-DIS-05, R-DIS-07: não vender POL como superior; PYR como padrão | R-DIS-05, R-DIS-07 |
| POL foi melhor que THR em contra-relógio, com base de 3 estudos de qualidade baixa | Rosenblat 2019 | 1 | R-DIS-03: bloquear THR (Z2 > 35%) como padrão | R-DIS-03 |
| Mais volume em baixa intensidade (PYR/POL) supera THR em corredores; sugestão de ≥ 70% de baixa intensidade | Campos 2022; Kenneally 2018 | 1 | R-DIS-02: mínimos de Z1; R-DIS-03 | R-DIS-02, R-DIS-03 |
| Corredores de elite: ≥ 80% do volume em baixa intensidade; 1 a 2 sessões de intervalo por semana; padrão predominantemente piramidal | Haugen 2022; Casado 2022; Seiler 2010 | 5 / 1 / 5 | R-DIS-02 (Z1 alvo 80%), R-DIS-04 (iniciante 0 até R-SES-40, depois 1; demais 2) | R-DIS-02, R-DIS-04 |
| Em recreacionais, POL (77/3/20) vs entre-limiares: diferença não significativa no desfecho principal | Muñoz 2014 | 2 | R-DIS-05: sem superioridade; evidência fraca | R-DIS-05 |
| Em recreacionais, ênfase em baixa intensidade teve mais respondedores que alta ou polarizada (bloco de 3 semanas com carga aumentada) | Zinner 2018 | 2 | R-DIS-06: preservar Z1; limitar Z3 | R-DIS-06 |
| PYR→POL deu os maiores ganhos em 16 semanas em corredores bem treinados | Filipas 2022 | 2 | R-DIS-05: bloco POL não oferecido na v1 (só piramidal) | R-DIS-05 |
| Mais tempo em Z1 se associa a melhor tempo de 10 km em sub-elite | Esteve-Lanao 2005 | 3 | R-DIS-08 (monitorar Z1) | R-DIS-08 |
| FC e sRPE dão distribuições semelhantes em esquiadores juniores | Seiler 2006 | 3 | R-DIS-01: usar sRPE/fala quando não há FC | R-DIS-01 |
| Prazer cai no limiar ou acima dele; intensidade autoescolhida em ex-sedentárias ≈ limiar ventilatório | Ekkekakis 2011; Ekkekakis 2008; Lind 2005 | 5 / 3 / 3 | R-DIS-02: iniciante sem Z3 | R-DIS-02 |

## 4. Controle de intensidade (`04-controle-intensidade.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| LT1 de recreacionais: 79 a 84% FCmáx, RPE 12 a 13, ~65% da velocidade de pico; LT2: 90 a 92% FCmáx, RPE ~15, ~81% da velocidade de pico; mulheres têm LT1 relativo maior | Nuuttila 2025 | 3 | R-INT-01 (limites das zonas), R-INT-09 | R-INT-01, R-INT-09 |
| Manter ≤ 70% FCmáx para ficar no domínio moderado (recreacionais) | Nuuttila 2025 | 3 | R-INT-01 (Z1 com FCmáx estimada) | R-INT-01 |
| Escala de elite: Z1 60 a 72% FCmáx e Z2 73 a 82% (baixa intensidade); Z3 83 a 87; Z4 88 a 92; RPE correspondente | Haugen 2022 | 5 | R-INT-01 (Z3 ≥ 88%) | R-INT-01 |
| RPE 6-20: mediana 13 a 2 mmol/L, 15 a 3 mmol/L e no LT2; categorias ≤ 11, 12 a 14, 15 a 17 | Grummt 2024 | 3 | R-INT-01 (RPE 6-20) | R-INT-01 |
| Validade do RPE com FC, lactato, VO2: r ≈ 0,6 | Chen 2002 | 1 | R-INT-02: RPE não é critério único | R-INT-02 |
| CR-10 ≈ 5 ("forte") no limiar ventilatório em ciclo, jovens mulheres | Zamunér 2011 | 3 | R-INT-06: prudência no mapeamento CR-10 (escala única = CR-10 de Foster) | R-INT-06 |
| FCmáx = 208 − 0,7 × idade (meta-análise de 18.712 pessoas) | Tanaka 2001 | 1 | R-INT-03 | R-INT-03 |
| FCmáx = 211 − 0,64 × idade, erro padrão 10,8 bpm | Nes 2013 | 3 | R-INT-01 (−5 pontos para FC estimada), R-INT-03 | R-INT-01, R-INT-03 |
| Equações de FCmáx têm limites de concordância de ±18 a 24 bpm; RMSE de 9 a 10,5 bpm em corredores | Martin 2025; Kasiak 2023 | 3 | R-INT-03: informar erro; margem | R-INT-03 |
| 220 − idade subestima em idosos; equações divergem | Tanaka 2001; Shookster 2020 | 1 / 3 | Conflito registrado; Tanaka como padrão | R-INT-03 |
| %FCR ≈ %VO2R, não %VO2max | Swain 1997 | 3 | R-INT-04: não usar %FCR | R-INT-04 |
| Teste da fala: LP ≈ intensidade de treino apropriada; EQ alta demais para 30 a 40 min contínuos | Jeanes 2011; Woltmann 2015; Foster 2009 | 3 / 2 / 3 | R-INT-05 | R-INT-05 |
| Teste da fala acompanha o VT em grupos, com concordância individual limitada | Persinger 2004; Sørensen 2020; Festino 2026; Foster 2008 | 3 | R-INT-02 (regra do mais conservador) | R-INT-02 |
| Teste da fala é impraticável em HIIT | Reed 2014 | 5 | R-INT-07 | R-INT-07 |
| Intensidade autoescolhida em ex-sedentárias ≈ limiar ventilatório | Lind 2005 | 3 | R-INT-05 (iniciantes) | R-INT-05 |
| Riegel é bom até meia maratona, ruim para maratona | Vickers 2016 | 3 | R-INT-08 | R-INT-08 |
| CS = fronteira heavy/severe; estimar exige ≥ 3 esforços máximos; não usar eventos ≥ 10 km | Anderson 2026; Lipková 2025 | 1 (escopo/sistemática) | R-INT-08: CS fora da v1 | R-INT-08 |
| VDOT/Daniels | (livro; não verificado) | 5 | Não usado | R-INT-08 |

## 5. Progressão de carga e risco de lesão (`05-progressao-carga.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| Programa gradual (~10%/semana) não reduziu lesões frente a programa padrão (~24%/semana) em iniciantes | Buist 2008; Damsted 2018 | 2 e 1 | R-PRG-03: 110% é teto semanal de projeto [P], não prova de segurança | R-PRG-03 |
| Não há evidência para a regra dos 10% nem limiar definido de aumento perigoso | Damsted 2018; Nielsen 2012 | 1 | R-PRG-01/03: não apresentar como regra científica | R-PRG-01, R-PRG-03 |
| Aumento semanal >30% associou-se (não significativamente) a lesões relacionadas à distância em iniciantes | Nielsen 2014b | 3 | R-PRG-04: teto absoluto de 120% | R-PRG-04 |
| Aumento semanal de 20–60% teve mais lesões que <20% aos 21 dias | Damsted 2019 | 3 | R-PRG-04 | R-PRG-04 |
| Corrida >10% maior que a maior dos 30 dias anteriores aumenta a taxa de lesão por sobrecarga (HRR 1,64; 1,52; 2,28) | Frandsen 2025 | 3 | R-PRG-02 | R-PRG-02 |
| Razão semana-a-semana não se relaciona com lesão; a razão aguda:crônica (ACWR) relaciona-se inversamente | Frandsen 2025; Nakaoka 2021 | 3 | R-PRG-01 (ACWR descartado) | R-PRG-01 |
| ACWR não tem evidência causal e tem falhas estatísticas | Impellizzeri 2020a; Wang 2020; Kalkhoven 2021 | 5 | R-PRG-01 (ACWR descartado) | R-PRG-01 |
| Equilíbrio sobrecarga–recuperação é necessário | Meeusen 2013 | 4 | R-PRG-07 (existência de recuperação, não o número 75% [P]) | R-PRG-07 |
| Volume pode ser reduzido mantendo intensidade e frequência moderadamente reduzida, preservando adaptações | Mujika 2000b | 5 | R-PRG-07 | R-PRG-07 |
| Pausa >4 semanas: grandes perdas de VO2máx; ganhos recentes perdidos | Mujika 2000a; Mujika 2000b | 5 | R-PRG-08 (tabela única; corte de 28 dias) | R-PRG-08 |
| Iniciantes têm mais lesões por hora de corrida | Videbæk 2015 | 1 | R-PRG-10 | R-PRG-10 |
| Progressão gradual de volume e intensidade reduz riscos do exercício | Garber 2011 | 4 | Princípio geral das regras | R-PRG-03 |

## 6. Carga interna (sRPE, monotonia, strain) (`06-carga-interna.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| sRPE = nota CR-10 × minutos; nota informada após a sessão sobre toda a sessão | Foster 2001; Haddad 2017 | 3 e 5 | R-CRG-01 (escala única da interface, R-INT-06) | R-CRG-01 |
| sRPE correlaciona com FC em ciclismo e basquete; válido para vários tipos de exercício | Foster 2001 | 3 | R-CRG-01 | R-CRG-01 |
| 36 estudos confirmaram validade e confiabilidade em vários esportes | Haddad 2017 | 5 | R-CRG-01 | R-CRG-01 |
| Em adolescentes corredores, sRPE r = 0,74 a 0,89 vs FC; nota cai ~26% se relatada 30 min depois | Mann 2019 | 3 | R-CRG-01 (registrar logo ao fim) | R-CRG-01 |
| sRPE + duração dá estimativa mais individualizada que duração sozinha em corredores recreativos | Napier 2020 | 3 | R-CRG-03 | R-CRG-03 |
| Monotonia = média/DP diária; strain = carga semanal × monotonia | Foster 1998; Haddad 2017 | 3 e 5 | R-CRG-04, R-CRG-05 | R-CRG-04, R-CRG-05 |
| Monotonia > 2,0 e strain explicaram 77% e 89% das doenças em um estudo (n = 25), com falsos alarmes | Foster 1998 (via Jones 2017) | 3 | R-CRG-06 (alerta fraco) | R-CRG-06 |
| Monotonia e strain não são apoiados como preditores de lesão/doença na literatura | Jones 2017 | 1 | R-CRG-05, R-CRG-06 (sem bloqueio) | R-CRG-05, R-CRG-06 |
| Carga interna distante da causa da lesão | Kalkhoven 2021 | 5 | R-CRG-08 | R-CRG-08 |
| Prescrito e percebido podem divergir | Haddad 2017 | 5 | R-CRG-07 ([P]; congela a progressão, R-PRG-06 e) | R-CRG-07 |

## 7. Tipos de sessão (`07-tipos-sessao.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| ACSM: >= 150 min/semana moderado ou >= 75 min vigoroso; força 2-3 d/semana; flexibilidade >= 2 d/semana; progressão gradual reduz risco | Garber 2011 | 4 | R-SES-04, R-SES-80, volume por nível | R-SES-04, R-SES-80 |
| Correr < 51 min/semana, 1-2 vezes/semana já reduz mortalidade | Lee 2014; Pedisic 2020 | 3; 1 | Mínimo viável de 2 corridas/semana para "saúde" | R-SES-04 |
| Iniciantes têm 17,8 lesões/1000 h; recreacionais 7,7 | Videbæk 2015 | 1 | R-SES-06, R-SES-12 | R-SES-06, R-SES-12 |
| Programas de 8 e 13 semanas de caminhada-corrida (3x/semana) com mesma taxa de lesão (~20%) | Buist 2007; Buist 2008 | 2 | R-SES-10, R-SES-11, tabela de etapas (ajustes [P]: etapas 2 e 11 pelo total impresso; degrau 10b; R-SES-13) | R-SES-10, R-SES-11 |
| Início de corrida > 3 km na semana 1 aumenta lesão em IMC > 30; 3 km/semana tende a lesionar menos que 6 | Nielsen 2014c; Bertelsen 2018 | 3; 2 | R-SES-06 (app usa IMC ≥ 30) | R-SES-06 |
| Pico de distância de sessão > 10% da maior corrida de 30 dias: mais lesão (HRR 1,64 a 2,28) | Frandsen 2025 | 3 | R-SES-05, R-SES-31, R-SES-32 | R-SES-05, R-SES-31, R-SES-32 |
| Treino de base a ~70% FCmáx; limiar a 85%; intervalado a 90-95% | Helgerud 2007 | 2 | Âncoras de %FCmáx de R-SES-20, 41, 50, 55 | R-SES-20, R-SES-41, R-SES-50, R-SES-55 |
| 4 x 4 min (3 min recuperação ativa) e 15/15 aumentam VO2max mais que limiar e base | Helgerud 2007 | 2 | R-SES-50, R-SES-55 | R-SES-50, R-SES-55 |
| HIIT > contínuo para VO2max (+1,2 mL/kg/min); intervalos mais longos dão mais ganho | Milanović 2015 | 1 | R-SES-50, R-SES-55 | R-SES-50, R-SES-55 |
| Curto (<= 30 s), baixo volume (<= 5 min), <= 4 semanas já eficazes; longo (>= 2 min), >= 15 min, 4-12 semanas maiores | Wen 2019 | 1 | Volumes de R-SES-50 e R-SES-55 | R-SES-50, R-SES-55 |
| Intervalos longos geram +0,8-0,9 L/min de VO2max em 6-13 semanas | Bacon 2013 | 1 | R-SES-55 | R-SES-55 |
| 2-3 sessões/semana de 4 x 4 min; 3 não superou 2 | Lenk 2025 | 3 | Máximo de HIIT/semana | R-SES-50, R-SES-55 |
| 10-20-30 e 30-30 melhoram desempenho; RPE menor no 10-20-30 | Faelli 2019 | 2 | R-SES-50 | R-SES-50 |
| Mais tempo em Z1 (80%) rendeu maior melhora que mais Z2 (67% Z1) | Esteve-Lanao 2007 | 2 | R-SES-03, R-SES-41 | R-SES-03, R-SES-41 |
| ~80% das sessões leves e ~20% intensas em atletas de elite | Seiler 2010 | 5 | R-SES-03 | R-SES-03 |
| Polarizado superior a limiar em atletas treinados (3 ensaios) | Rosenblat 2019 | 1 | Limite de 1 limiar/semana | R-SES-41 |
| Treino perto do limiar melhora o limiar em sedentários; condicionados precisam de mais intensidade | Londeree 1997 | 1 | R-SES-41 | R-SES-41 |
| Velocidade crítica só sustentável ~20-30 min; MLSS um pouco abaixo | Jones 2019 | 5 | Teto de bloco contínuo de limiar | R-SES-41 |
| Conceitos de limiar correlacionam com desempenho, mas há 25 definições | Faude 2009 | 5 | Descrição por faixa/RPE, não por número único | R-SES-41 |
| Uphill intervals: +2,0% no 5 km; alta intensidade melhor para economia (+2,4%) | Barnes 2013 | 2 | R-SES-65 | R-SES-65 |
| Subida exige mais ativação muscular; descida altera o apoio e a carga | Vernillo 2017 | 5 | R-SES-65 (descer andando) | R-SES-65 |
| Força melhora economia (SMD -1,42) | Balsalobre-Fernández 2016 | 1 | R-SES-70 | R-SES-70 |
| Força 2-3 sessões/semana; 2 provavelmente bastam; manutenção de 1; 1-2 séries até 3-6 | Blagrove 2018 | 1 | R-SES-70, R-SES-72 | R-SES-70, R-SES-72 |
| Força melhora desempenho (SMD 0,52); força máxima é superior | Berryman 2018 | 1 | R-SES-70 (nível C) | R-SES-70 |
| Explosivo e pesado melhoram a economia; isométrico não | Denadai 2017 | 1 | R-SES-70 | R-SES-70 |
| Carga alta, combinados e pliometria (<= 12 km/h) melhoram; submáximo e isométrico não | Llanos-Lagos 2024 | 1 | R-SES-70, R-SES-71 | R-SES-70, R-SES-71 |
| Pliometria de 9 semanas melhora economia a 18 km/h (+4,1%) | Saunders 2006 | 2 | R-SES-70 (nível B/C) | R-SES-70 |
| Força combinada com endurance melhora corrida | Rønnestad 2014 | 5 | R-SES-70 | R-SES-70 |
| Força reduz lesões esportivas (RR 0,32-0,34); alongamento não | Lauersen 2014; Lauersen 2018 | 1; 1 | R-SES-70; R-SES-80 | R-SES-70, R-SES-80 |
| Alongamento não altera economia de corrida | Warneke 2025 | 1 | R-SES-80 | R-SES-80 |
| Aquecimento: evidência insuficiente a favor, com peso positivo | Fradkin 2006 | 1 | R-SES-02 | R-SES-02 |
| Risco CV baixo em HIIT e moderado supervisionado em coronarianos | Rognmo 2012 | 3 | R-SES-07 (cautela; não extrapola) | R-SES-07 |
| Recuperação ativa reduz DOMS; massagem foi a melhor técnica | Dupuy 2018 | 1 | R-SES-21 (apoio indireto) | R-SES-21 |
| Não há evidência suficiente para recomendações precisas de treino a corredores | Midgley 2007 | 5 | R-SES-01 e marcações de "decisão de projeto" | R-SES-01 |

## 8. Sono e recuperação (`08-sono-recuperacao.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| Adultos devem dormir ≥ 7 h por noite de forma regular; ≤ 6 h é inapropriado | Watson 2015a; Watson 2015b | 4 | R-SON-01 | R-SON-01 |
| Efeito de 1 a 3 noites de restrição parcial no desempenho é incerto | Walsh 2021; Craven 2022 | 4; 1 | R-SON-06 (noite isolada = manter) | R-SON-06 |
| Restrição crônica de sono causa déficit cumulativo e não percebido | Van Dongen 2003 | 2 | R-SON-06 (contar noites seguidas) | R-SON-06 |
| Adaptação à restrição crônica estabiliza em nível pior; recuperação lenta | Belenky 2003 | 2 | R-SON-06, R-SON-10 | R-SON-06, R-SON-10 |
| Restrição prolongada piora humor e aumenta desconforto/dor | Haack 2005 | 2 | R-SON-06, R-SON-03 | R-SON-06, R-SON-03 |
| Sono < 8 h se associa a mais lesão em adolescentes | Milewski 2014; Gao 2019; Wang 2017 | 3; 1; 1 | Apenas justifica postura conservadora (R-SON-06); não aplicar 8 h | R-SON-06 |
| Sono ruim se associa a lesão em corredores | Mousavi 2021; Hayes 2019 | 3 | Apoio qualitativo a R-SON-06/08 | R-SON-06, R-SON-08 |
| Bem-estar baixo amplifica o risco de lesão em carga alta | Lathlean 2023 | 3 | R-SON-08 | R-SON-08 |
| Medidas subjetivas acompanham a carga melhor que as objetivas | Saw 2016 | 1 | R-SON-03, R-SON-07 | R-SON-03, R-SON-07 |
| Bem-estar de sono/fadiga/dor muscular/estresse/humor se associa à carga | Lathlean 2019; Matos 2019; Hooper 1995 | 3 | R-SON-03 | R-SON-03 |
| Interpretar mudança contra a própria referência | Buchheit 2014; Kellmann 2018 | 5; 4 | R-SON-05 | R-SON-05 |
| Overtraining não é diagnosticável por marcador único | Meeusen 2013 | 4 | R-SON-11 (sem diagnóstico) | R-SON-11 |
| FC de repouso não tem limiar nem direção consistente | Achten 2003; Nuuttila 2024; Bellenger 2016; Buchheit 2014 | 5; 3; 1; 5 | R-SON-14 | R-SON-14 |
| Encaminhar atleta com problema moderado/grave de sono | Walsh 2021 | 4 | R-SON-12 | R-SON-12 |
| Sono e bem-estar bons não autorizam aumentar carga | Walsh 2021; Roberts 2019 | 4; 2 | R-SON-09 | R-SON-09 |

## 9. Dor durante o treino (`09-dor.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| Continuar atividade guiada por monitoramento de dor não foi pior que repouso ativo em tendinopatia de Aquiles | Silbernagel 2007 | 2 | Base de R-DOR-04 (permite continuar na faixa baixa) | R-DOR-04 |
| Teto de 5/10 durante a atividade e retorno ao basal até a manhã seguinte | Smith 2017; Sprague 2021 | 1 (texto da metanálise) e 2 | R-DOR-04 (teto 5; `limite_dor_progressao` = 3/10 [P]), R-DOR-06 (dia seguinte) | R-DOR-04, R-DOR-06 |
| Faixas de dor por nível de carga (durante 1–2/2–3/4–5; depois 1–2/3–4/5–6) e retorno a correr com dor ao caminhar 1–2/10 | Silbernagel 2020 | 5 | R-DOR-04, R-DOR-06, R-DOR-10, R-DOR-11 | R-DOR-04, R-DOR-06, R-DOR-10, R-DOR-11 |
| Diretriz holandesa: usar escala de dor e pausar temporariamente o que provoca dor | de Vos 2021 | 4 | Justifica atividade sem dor no lugar de correr (R-DOR-04, R-DOR-11) | R-DOR-04, R-DOR-11 |
| Cortes de intensidade variam entre pessoas (≤5, 6–7, ≥8 ou ≤3, 4–6, ≥7) | Boonstra 2016 | 3 | Justifica comparar com o basal do atleta (R-DOR-06) | R-DOR-06 |
| 2 pontos na NRS é mudança clinicamente importante em dor aguda | Farrar 2003 | 3 | Aumento ≥ 2 como piora operacional (R-DOR-06) | R-DOR-06 |
| DOMS: início 12–24 h, pico 24–72 h, resolução 5–7 dias | Hody 2019 | 5 | R-DOR-08 | R-DOR-08 |
| DOMS: reduzir intensidade/duração 1–2 dias; introduzir novidade em 1–2 semanas | Cheung 2003 | 5 | R-DOR-08 | R-DOR-08 |
| DOMS é pós-atividade, difusa, sem defeito palpável; lesão estrutural é súbita durante a atividade | Mueller-Wohlfahrt 2013 | 4 | R-DOR-05, R-DOR-08 | R-DOR-05, R-DOR-08 |
| Dor óssea localizada, que não aquece, pior com carga, pode ocorrer em repouso/noite; sítios de alto risco | Hoenig 2022 | 5 | R-DOR-03 | R-DOR-03 |
| Retorno após lesão óssea: sem dor nas atividades diárias e sem dor durante e depois de cada etapa | Hoenig 2022 | 5 | R-DOR-10 | R-DOR-10 |
| Progressão exige marcha normal sem dor; analgésicos podem mascarar | Heiderscheit 2010 | 5 | R-DOR-07, R-DOR-14 | R-DOR-07, R-DOR-14 |
| Dor persistente: limitação de corrida ≥ 7 dias ou 3 sessões, ou consulta a profissional | Yamato 2015 | 4 | R-DOR-09 | R-DOR-09 |
| Dor no peito e tontura/perda de consciência levam a avaliação antes de ficar mais ativo | Warburton 2023 (PAR-Q+) | 4 | R-DOR-01 | R-DOR-01 |
| Sintomas de alerta cardiovascular fazem parte da triagem ACSM; sintomas novos em exercício levam a reavaliar | Riebe 2015 (resumo); Pelliccia 2021 | 4 | R-DOR-01 | R-DOR-01 |
| Sinais de calor/SNC (confusão, perda de equilíbrio, colapso) são emergência | Casa 2015 | 4 | R-DOR-02 | R-DOR-02 |
| Dor muscular + fraqueza + urina escura sugerem rabdomiólise | Chavez 2016 | 1 | R-DOR-13 (parte muscular); campos em R-DOR-15 | R-DOR-13 |

## 10. Planos por objetivo (`10-planos-objetivo.md`)

| Afirmação | Fonte | Nível | Como vira regra no app | Regra (ID) |
|---|---|---|---|---|
| Taper de 2 semanas com −41–60% de volume, mantendo intensidade e frequência, é o mais eficiente em atletas competitivos | Bosquet 2007 | 1 | R-PLN-10 | R-PLN-10 |
| Taper de ≤21 dias, volume −41–60% progressivo, sem mudar intensidade ou frequência melhora contrarrelógio; 8–14 dias com maior efeito | Wang 2023 | 1 | R-PLN-10 (curvas de R-PLN-13 recalculadas com recuperação em 75%) | R-PLN-10 |
| Em 158.117 maratonistas, taper estrito de 3 semanas = −5 min 32 s (2,6%) vs taper mínimo | Smyth 2021 | 3 | R-PLN-10 (maratona) | R-PLN-10 |
| Periodização compatível se zonas são % do ritmo de prova; piramidal e polarizado ≥ limiar | Kenneally 2018 | 1 | R-PLN-06 (não define duração de fases) | R-PLN-06 |
| Meia: >32 km/sem e longão >21 km → tempo melhor; maratona: <40 km/sem e longão <25 km → pior; treino não associado a lesão | Fokkema 2020 | 3 | R-PLN-03, R-PLN-11 (tetos em minutos a 6 min/km; longão 21/42 km limitado a 120/150 min) | R-PLN-03, R-PLN-11 |
| Maratona: <30 km/sem antes da prova → RR de lesão 2,02; lesão prévia RR 2,23 | Rasmussen 2013 | 3 | R-PLN-03, R-PLN-04 | R-PLN-03, R-PLN-04 |
| Maratonistas de primeira viagem que já correram uma meia → OR de lesão 0,40; longão maior → menos lesão no dia da prova | Toresdahl 2022 | 3 | R-PLN-03, R-PLN-04 | R-PLN-03, R-PLN-04 |
| Lesão prévia é o maior fator de risco em corredores de longa distância; falta de experiência e baixo volume em curtas | van Poppel 2021 | 1 | R-PLN-03, R-PLN-12 | R-PLN-03, R-PLN-12 |
| Plano de 13 semanas (+10%/semana) = plano de 8 semanas em lesão (20,8% vs 20,3%) | Buist 2008; Buist 2007 | 2 | R-PLN-07, R-PLN-12 | R-PLN-07, R-PLN-12 |
| Aumento >30% em 2 semanas: HR 1,59 (n.s.) para lesões relacionadas à distância | Nielsen 2014b | 3 | R-PLN-07 | R-PLN-07 |
| Aumento de 20–60% vs <20% aos 21 dias: +22,6% de risco de lesão (meia) | Damsted 2019 | 3 | R-PLN-07 | R-PLN-07 |
| Lesão em iniciantes: 17,8 vs 7,7 por 1000 h (novatos vs recreativos) | Videbæk 2015 | 1 | R-PLN-12, R-PLN-20 | R-PLN-12, R-PLN-20 |
| Start to Run (6 semanas): 10,9% de lesão; sem experiência de corrida, IMC e idade maiores → mais risco | Kluitenberg 2015b | 3 | R-PLN-12, R-PLN-16 | R-PLN-12, R-PLN-16 |
| 29,5% param em 26 semanas; lesão é a principal causa | Fokkema 2019 | 3 | R-PLN-12, R-PLN-20 | R-PLN-12, R-PLN-20 |
| Couch-to-5k modificado de 9 semanas: 19% de lesão; alta não conclusão; salto da semana 5 rápido demais | Relph 2023 | 3 | R-PLN-12, R-PLN-20 | R-PLN-12, R-PLN-20 |
| Adultos: 150–300 min moderados ou 75–150 vigorosos; força ≥2 dias; começar pouco e progredir | Bull 2020 | 4 | R-PLN-14 | R-PLN-14 |
| ≥150 min moderados (5 dias) ou 75 vigorosos (3 dias); progressão gradual reduz risco | Garber 2011 | 4 | R-PLN-14 | R-PLN-14 |
| Correr (qualquer quantidade) → −27% mortalidade por todas as causas; sem dose-resposta | Pedisic 2020 | 1 | R-PLN-14 | R-PLN-14 |
| 150–250 min/sem previnem ganho de peso e dão perda modesta; >250 min → perda significativa | Donnelly 2009 | 4 | R-PLN-15, R-PLN-16 | R-PLN-15, R-PLN-16 |
| Perda de ~2 kg com programa nas recomendações; benefícios independentes do peso | Swift 2014 | 5 | R-PLN-15 | R-PLN-15 |
| Aeróbico isolado 6–12 meses → −1,6 a −1,7 kg | Thorogood 2011 | 1 | R-PLN-15 | R-PLN-15 |
| Dose-resposta: −0,52 kg por 30 min/semana; −2,79 kg a 150 min; −4,19 kg a 300 min | Jayedi 2024 | 1 | R-PLN-15, R-PLN-16 | R-PLN-15, R-PLN-16 |
| HIIT ≈ contínuo moderado em composição corporal (18–45 anos) | Wewege 2017 | 1 | R-PLN-16 | R-PLN-16 |
| Duração de ciclo, fases, deload, tetos superiores, recuperação pós-prova | **sem evidência suficiente** | — | R-PLN-05, 06, 08, 11, 19 (todas [P]) | R-PLN-05, R-PLN-06, R-PLN-08, R-PLN-11, R-PLN-19 |
