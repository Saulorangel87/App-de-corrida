# Carga interna: session-RPE, monotonia e strain

## Resumo
O método session-RPE (sRPE) multiplica a nota de esforço da sessão (escala CR-10 modificada por Foster, 0 a 10) pela duração em minutos; foi proposto por Foster e colegas em 2001 e tem validade e confiabilidade apoiadas por muitos estudos em vários esportes, mas com poucos dados em corredores adultos recreativos [Foster 2001; Haddad 2017; Mann 2019; Scheltinga 2026]. Monotonia (média diária / desvio padrão da carga diária na semana) e strain (carga semanal × monotonia) vêm de um estudo com 25 atletas que usou **doença**, não lesão, como desfecho, e dizia que os limiares eram **individuais** [Foster 1998]. O valor "monotonia > 2,0" aparece em revisões como associado a doença em um único estudo; a revisão sistemática não encontrou apoio consistente para monotonia e strain como preditores de lesão ou doença [Jones 2017]. Conclusão: o app deve calcular sRPE semanal, monotonia e strain como **indicadores descritivos**, usar monotonia > 2,0 apenas como alerta informativo fraco (nunca bloqueio) e não usar strain com limiar absoluto. A evidência para limiares é fraca.

## Achados

### Session-RPE (sRPE)
- Definição: o atleta responde "como foi seu treino?" com uma nota na escala CR-10 modificada de Foster (0 repouso, 1 muito muito fácil, 2 fácil, 3 moderado, 4 um pouco difícil, 5 difícil, 7 muito difícil, 10 máximo; os números 6, 8 e 9 existem sem rótulo) e a carga em unidades arbitrárias (UA) é nota × duração em minutos. Exemplo: sessão de 87 min com nota 4 = 348 UA [Haddad 2017]. A nota refere-se à intensidade média de toda a sessão, informada de forma retrospectiva, e o atleta deve ser familiarizado com a escala antes [Haddad 2017].
- Validade original: comparada com um critério baseado em frequência cardíaca, a relação foi consistente em ciclismo (estável e intervalado) e basquete; o escore sRPE foi sistematicamente maior em valor absoluto; os autores concluem que é válido para uma ampla variedade de exercícios [Foster 2001] (poucos participantes; ciclismo e basquete, não corrida).
- Revisão de validade: 36 estudos testaram validade e confiabilidade com a CR-10 e confirmaram validade, boa confiabilidade e consistência interna em vários esportes, sexos e idades; pode ser usado sozinho, embora alguns recomendem combinar com frequência cardíaca [Haddad 2017]. É uma revisão com busca de bases, mas não é sistemática formal.
- Em corredores: 15 adolescentes corredores de fundo, sRPE com r = 0,74 a 0,89 frente a medidas baseadas em FC, melhor quando relatado logo ao fim da sessão; notas dadas 30 min depois foram ~26% menores que as dadas imediatamente (sRPE −26,5%) [Mann 2019]. Em 12 corredores experientes em sessões ao ar livre, sRPE distinguiu tipos de sessão (contínuo, submáximo, intervalado), mas correlacionou apenas fraca-moderadamente com TRIMP (r = 0,49) e com carga biomecânica (r = 0,25) [Scheltinga 2026]. Em 68 corredores recreativos, o uso de sRPE junto com duração deu uma estimativa mais individualizada da variação semanal do que a duração sozinha (tamanho de efeito pequeno, d ≈ 0,24); os autores recomendam registrar sRPE e duração [Napier 2020].
- Limite importante: não há demonstração de que o sRPE preveja lesão em corredores. Medidas de carga interna estão, segundo uma revisão conceitual, "provavelmente distantes demais da causa da lesão" para ter relação confiável com ela [Kalkhoven 2021].
- Prescrito vs percebido: o RPE planejado pelo treinador e o percebido pelo atleta podem divergir (exemplo em nadadores) [Haddad 2017].

### Monotonia e strain
- Definição: monotonia = média da carga diária da semana / desvio padrão da carga diária da semana; strain = carga semanal × monotonia [Haddad 2017; Foster 1998]. Foster propôs que treino monótono (pouca variação) somado a carga alta aumenta a chance de sobretreinamento/doença [Foster 1998].
- Estudo original: 25 atletas experientes (natação, segundo Jones 2017) registraram sRPE; carga (média móvel de 6 semanas), monotonia e strain foram correlacionados com doenças banais e lesões menores. "Uma alta porcentagem das doenças pôde ser explicada quando os atletas excediam limiares individualmente identificáveis, principalmente relacionados ao strain" [Foster 1998]. Segundo a revisão de Jones, os picos de monotonia (> 2,0) e strain explicaram 77% e 89% das doenças, respectivamente, e 52% e 59% das ultrapassagens de limiar não resultaram em doença [Jones 2017]. Ou seja, o corte de 2,0 não é um limiar populacional validado e tem muitos falsos alarmes.
- Revisão sistemática de 68 estudos de carga e lesão/doença: só um estudo associou monotonia e strain a doença; os demais não acharam associação com lesão ou doença; estudos individuais divergem (futebol: monotonia associada a lesão traumática, não de sobrecarga; basquete feminino, n = 12: r = 0,67 com lesão; futebol australiano e rugby league: sem associação) [Jones 2017]. Conclusão dos autores: o papel de monotonia e strain no monitoramento e prevenção de lesão "não é atualmente apoiado pela literatura"; mudança aguda de carga e carga crônica têm evidência melhor [Jones 2017].
- Em corredores: estudo de 25 corredores de trilha encontrou monotonia e strain maiores na semana da lesão do que nas semanas anteriores para sRPE, tempo e distância, com grande variabilidade entre indivíduos; é coincidente e não preditivo, e a amostra é pequena [Matos 2020].
- Matemática: monotonia depende de quantos dias de descanso (zeros) há na semana e de quão iguais são as cargas. Exemplos (desvio padrão populacional; valores calculados para este documento, não retirados da literatura): 3 corridas iguais em 7 dias = 0,87; 4 iguais = 1,15; 5 iguais = 1,58; 6 iguais = 2,45; 6 corridas variando de leve a longa ≈ 1,43. Portanto, com até 5 dias de corrida por semana, a monotonia dificilmente passa de 2,0; só passa com 6 ou mais dias de carga parecida. Com desvio padrão amostral (n−1) os valores caem ~8%. As fontes que li não especificam qual desvio padrão Foster usava.

## Regras propostas para o app

1. **R-CRG-01 (sRPE da sessão):** após cada treino concluído, o app pede a nota CR-10 modificada de Foster (inteiro de 0 a 10; mínimo 1 se o treino foi concluído), na tela pós-treino, **imediatamente** após o fim da sessão e sempre no mesmo momento, mostrando os rótulos da escala. Carga da sessão (UA) = nota × duração real total em minutos (aquecimento, trechos de caminhada e intervalos incluídos). [Foster 2001; Haddad 2017; Mann 2019 para o momento do registro]. A tradução em português dos rótulos não tem validação encontrada (ver perguntas).
2. **R-CRG-02 (carga planejada):** o catálogo traz RPE-alvo para cada treino; carga estimada do treino = RPE-alvo × duração planejada, para comparar com o realizado [Haddad 2017 para a lógica de usar a mesma escala para prescrever e relatar].
3. **R-CRG-03 (carga semanal):** carga semanal = soma das cargas (UA) de todas as sessões concluídas na semana civil (segunda a domingo, fuso do atleta). Duas sessões no mesmo dia somam. Sessão não concluída = 0. Gráfico de carga semanal no histórico, sem faixa de risco. Se o atleta registrar atividade fora da corrida (opcional), entra com sRPE da mesma forma [Foster 2001].
4. **R-CRG-04 (monotonia):** calculada só para semana civil **fechada** (7 dias), com carga diária = soma das UA do dia (dias sem treino = 0; dia sem registro e sem marcação conta como 0 após 48 h). Monotonia = média das 7 cargas diárias / desvio padrão **populacional** das 7 cargas (escolha conservadora: dá valor maior que o amostral; a fonte não especifica). Se o desvio padrão for 0 (ex.: sem treino na semana, ou carga idêntica nos 7 dias), monotonia = indefinida; não calcular nem alertar [Foster 1998; Haddad 2017].
5. **R-CRG-05 (strain):** strain = carga semanal × monotonia, só para semanas com monotonia definida. Mostrar como número de acompanhamento junto à carga semanal. **Sem limiar absoluto**: Foster descreveu limiares individuais, e a revisão sistemática não sustenta o uso [Foster 1998; Jones 2017]. Não há alerta baseado em strain.
6. **R-CRG-06 (alerta fraco de monotonia):** se a monotonia de uma semana fechada for **> 2,0**, o app mostra um aviso informativo, sem bloquear nem alterar carga automaticamente: "Seus treinos desta semana tiveram carga muito parecida e poucos dias de descanso. Alterne dias leves, mais fortes e descanso." E o motor garante pelo menos 1 dia completo de descanso e variação de intensidade na semana seguinte (regra de estrutura do plano nos arquivos de treino). Valor de 2,0: limiar relatado em estudo único, de doença, em nadadores [Jones 2017, citando Foster 1998]; **evidência fraca**. O aviso não afirma risco de lesão nem faz diagnóstico.
7. **R-CRG-07 (prescrito vs percebido, convenção):** se em 2 das últimas 3 sessões o RPE relatado superar o RPE-alvo em **2 ou mais pontos** (em sessões com alvo ≤ 4), o motor congela a progressão da semana seguinte e sugere revisar sono e recuperação; se vier junto de dor, aplica as regras de dor (outro arquivo) e orienta procurar profissional. Os pontos de corte (2 pontos; 2 de 3 sessões) são **[convenção; sem evidência suficiente]**; só o fato de prescrito e percebido poderem divergir vem da literatura [Haddad 2017].
8. **R-CRG-08 (uso e comunicação):** sRPE, carga semanal, monotonia e strain são indicadores do próprio atleta; nunca comparar com outros usuários nem tratar como diagnóstico. Os limites de progressão do volume e da corrida individual ficam em R-PRG (arquivo 05), que não depende de sRPE.
9. **R-CRG-09 (dados insuficientes):** não calcular monotonia/strain na primeira semana do atleta (semana parcial) nem em semana com menos de 3 dias com registro de sessão ou de descanso confirmado **[convenção]**.

## Evidência fraca ou conflitante

| Ponto | Conflito | Decisão conservadora proposta |
|---|---|---|
| Validade do sRPE em corredores adultos recreativos | Validade ampla em outros esportes; em corredores só amostras pequenas (n = 12 a 15 adolescentes/experientes) e correlação fraca-moderada com TRIMP [Haddad 2017; Mann 2019; Scheltinga 2026] | Usar como medida de esforço percebido e carga relatada, não como medida fisiológica nem preditor de lesão |
| sRPE e lesão em corredores | Sem estudo que mostre predição; crítica de que carga interna está distante da causa da lesão [Kalkhoven 2021] | Não usar sRPE para liberar ou bloquear progressão de volume; uso restrito a R-CRG-07 (convenção) |
| Monotonia > 2,0 | Valor vem de estudo único, n = 25, desfecho doença, limiares individuais; falsos alarmes de 52% [Foster 1998; Jones 2017] | Alerta informativo, sem bloqueio |
| Strain | Limiar só individual; revisão sistemática não sustenta [Jones 2017] | Sem limiar; só exibição |
| Monotonia e lesão em corredores | Só um estudo de 25 corredores de trilha, coincidente, não preditivo [Matos 2020] | Não tratar como fator de risco comprovado |
| Cálculo do desvio padrão | Fontes lidas não especificam populacional ou amostral | Populacional (mais conservador) |
| Momento do registro | Nota dada 30 min depois é ~26% menor em adolescentes corredores [Mann 2019]; não li a fonte que fixa o momento original de Foster | Registrar logo ao fim, sempre igual |

## Perguntas para o dono do projeto
1. Aprova usar monotonia > 2,0 apenas como alerta informativo (e não como regra de bloqueio), sabendo que a evidência é fraca e que, com até 5 corridas por semana, o alerta quase nunca dispara?
2. Aprova strain apenas como número de acompanhamento, sem limiar? (sem evidência suficiente para limiar)
3. A escala CR-10 em português: sem evidência suficiente de uma tradução validada encontrada nesta pesquisa; aceita usar uma tradução própria dos rótulos de Foster, marcada como não validada, ou prefere buscar a validação?
4. Aprova a regra de convenção R-CRG-07 (2 pontos acima do alvo em 2 de 3 sessões congela a progressão)? Sem evidência suficiente para esses valores.
5. O app deve aceitar RPE com meio ponto (ex.: 4,5)? Não verifiquei se há base na literatura; a proposta usa inteiros.

## Tabela de evidências

| Afirmação | Fonte | Nível | Como vira regra no app |
|---|---|---|---|
| sRPE = nota CR-10 × minutos; nota informada após a sessão sobre toda a sessão | Foster 2001; Haddad 2017 | 3 e 5 | R-CRG-01 |
| sRPE correlaciona com FC em ciclismo e basquete; válido para vários tipos de exercício | Foster 2001 | 3 | R-CRG-01 |
| 36 estudos confirmaram validade e confiabilidade em vários esportes | Haddad 2017 | 5 | R-CRG-01 |
| Em adolescentes corredores, sRPE r = 0,74 a 0,89 vs FC; nota cai ~26% se relatada 30 min depois | Mann 2019 | 3 | R-CRG-01 (registrar logo ao fim) |
| Em corredores, sRPE e TRIMP têm correlação fraca-moderada (r = 0,49) | Scheltinga 2026 | 3 | Interpretar como esforço percebido |
| sRPE + duração dá estimativa mais individualizada que duração sozinha em corredores recreativos | Napier 2020 | 3 | R-CRG-03 |
| Monotonia = média/DP diária; strain = carga semanal × monotonia | Foster 1998; Haddad 2017 | 3 e 5 | R-CRG-04, R-CRG-05 |
| Monotonia > 2,0 e strain explicaram 77% e 89% das doenças em um estudo (n = 25), com falsos alarmes | Foster 1998 (via Jones 2017) | 3 | R-CRG-06 (alerta fraco) |
| Monotonia e strain não são apoiados como preditores de lesão/doença na literatura | Jones 2017 | 1 | R-CRG-05, R-CRG-06 (sem bloqueio) |
| Carga interna distante da causa da lesão | Kalkhoven 2021 | 5 | R-CRG-08 |
| Monotonia/strain maiores na semana da lesão em corredores de trilha (n = 25) | Matos 2020 | 3 | Sem regra; apenas contexto |
| Prescrito e percebido podem divergir | Haddad 2017 | 5 | R-CRG-07 (convenção) |

## Referências

| Chave | Autores | Ano | Título | Periódico | DOI/URL | Tipo de estudo | Nível | Verificação |
|---|---|---|---|---|---|---|---|---|
| Foster 1998 | Foster C | 1998 | Monitoring training in athletes with reference to overtraining syndrome | Med Sci Sports Exerc 30(7):1164-1168 | 10.1097/00005768-199807000-00023 (PMID 9662690) | Coorte observacional (n = 25) | 3 | resumo; o valor 2,0 foi lido em Jones 2017 |
| Foster 2001 | Foster C, Florhaug JA, Franklin J, Gottschall L, Hrovatin LA, Parker S, Doleshal P, Dodge C | 2001 | A new approach to monitoring exercise training | J Strength Cond Res 15(1):109-115 | 10.1519/1533-4287(2001)015<0109:ANATME>2.0.CO;2 (PMID 11708692) | Estudo de validação | 3 | resumo |
| Haddad 2017 | Haddad M, Stylianides G, Djaoui L, Dellal A, Chamari K | 2017 | Session-RPE method for training load monitoring: validity, ecological usefulness, and influencing factors | Front Neurosci 11:612 | 10.3389/fnins.2017.00612 (PMC5673663) | Revisão com busca em bases | 5 | texto completo (PMC) |
| Mann 2019 | Mann RH, Williams CA, Clift BC, Barker AR | 2019 | The validation of session rating of perceived exertion for quantifying internal training load in adolescent distance runners | Int J Sports Physiol Perform 14(3):354-359 | 10.1123/ijspp.2018-0120 (PMID 30160557) | Estudo de validação (n = 15) | 3 | resumo |
| Napier 2020 | Napier C, Menon C, Paquette MR | 2020 | Session rating of perceived exertion combined with training volume for estimating training responses in runners | J Athl Train 55(12):1285-1291 | 10.4085/1062-6050-573-19 (PMC7740055) | Série de casos (n = 68) | 3 | resumo |
| Scheltinga 2026 | Scheltinga BL, Buurke JH, Kok JN, Reenalda J | 2026 | Do training load metrics agree? A comparison of session rate of perceived exertion, physiological and biomechanical load in outdoor running | Sports Med Open 12:18 | 10.1186/s40798-025-00969-9 (PMC12949214) | Estudo observacional (n = 12) | 3 | resumo |
| Jones 2017 | Jones CM, Griffiths PC, Mellalieu SD | 2017 (online 2016) | Training load and fatigue marker associations with injury and illness: a systematic review of longitudinal studies | Sports Med 47(5):943-974 | 10.1007/s40279-016-0619-5 (PMC5394138) | Revisão sistemática (68 estudos, majoritariamente esportes coletivos) | 1 | texto completo (PMC) |
| Matos 2020 | Matos S, Clemente FM, Silva R, Cancela Carral JM | 2020 | Variations of workload indices prior to injuries: a study in trail runners | Int J Environ Res Public Health 17(11):4037 | 10.3390/ijerph17114037 (PMC7312824) | Coorte (n = 25) | 3 | resumo |
| Kalkhoven 2021 | Kalkhoven JT, Watsford ML, Coutts AJ, Edwards WB, Impellizzeri FM | 2021 | Training load and injury: causal pathways and future directions | Sports Med 51(6):1137-1150 | 10.1007/s40279-020-01413-6 (PMID 33400216) | Revisão conceitual | 5 | resumo |
