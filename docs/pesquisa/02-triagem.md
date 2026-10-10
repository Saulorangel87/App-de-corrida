# Triagem pré-participação

## Resumo

O PAR-Q+ é um questionário de 7 perguntas gerais mais perguntas de seguimento por condição (10 seções). A versão oficial vigente é a de 2025 (formulário datado de 01-11-2024), e existe tradução oficial para o português do Brasil, aprovada pela PAR-Q+ Collaboration e publicada no site eparmedx.com [PARQ+ 2025] [PARQ+ Idiomas] [Schwartz 2021]. O instrumento tem direitos autorais, **não pode ser alterado "de forma alguma"** e exige o questionário inteiro; uso gratuito é permitido a participantes, profissionais, pesquisa não comercial e entidades sem fins lucrativos, mas **uso comercial exige licença escrita** [PARQ+ Termos]. Decisão do dono (2026-10-10): o app será sempre gratuito (uso não comercial); se um dia houver cobrança, pedir permissão escrita à PAR-Q+ Collaboration antes (R-TRI-14). Um "SIM" nas perguntas de seguimento não significa "procure um médico" em todos os casos: o roteiro oficial manda procurar o ePARmed-X+ (triagem online) e/ou um profissional de exercício qualificado, e só uma minoria é encaminhada ao médico [PARQ+ 2025] [Bredin 2013]. O algoritmo do ACSM (Riebe 2015) usa três fatores (nível atual de atividade, sinais/sintomas ou doença conhecida, intensidade desejada) e é mais rígido que o PAR-Q+ em um ponto: sintoma isolado exige liberação, mesmo sem doença diagnosticada [Riebe 2015] [Whitfield 2017]. Decisão do dono (correção aprovada à especificação): qualquer resposta de risco bloqueia o plano inteiro até o atleta informar avaliação profissional (autodeclaração datada), e depois a intensidade fica limitada a leve/moderada, que o app mapeia só para Z1. A implementação combina os dois instrumentos: PAR-Q+ integral e inalterado + uma camada de regras do app (separada do questionário) que aplica o critério de sintomas do ACSM, limita a intensidade e controla a validade (12 meses; 6 meses se liberado via seguimento).

## Achados

### 1. Versão atual, idiomas e fonte do texto oficial

- O site oficial (eparmedx.com) disponibiliza o PAR-Q+ em PDF preenchível de 2025 e a versão online (formulário Qualtrics que "sempre abre a versão mais recente aprovada pelo painel de consenso"). Rodapé: "Copyright PAR-Q+ Collaboration 2007-2026. All rights reserved." [PARQ+ Site]
- Texto oficial em inglês (2025): https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025Fillable.pdf. Lido na íntegra [PARQ+ 2025].
- **Português do Brasil: existe** versão listada na página de traduções: https://eparmedx.com/wp-content/uploads/2023/07/Brazilian-Portuguese.pdf. A página lista só português do Brasil (não há versão de Portugal). Créditos impressos no PDF: "Traduzido por Bianca Bold (tradutora profissional) e Juliano Schwartz. Copyright PAR-Q+ Collaboration. CAPES/UBC com apoio financeiro da University Health Network" [PARQ+ pt-BR] [PARQ+ Idiomas].
- Processo de tradução: duas traduções independentes, síntese por especialistas brasileiros, retrotradução por dois falantes nativos de inglês, revisão e aprovação final pela PAR-Q+ Collaboration; confiabilidade teste-reteste em 493 brasileiros (alfa de Cronbach 0,993; kappa das 7 perguntas gerais entre 0,882 e 0,976; CCI total 0,901, IC95% 0,887-0,914) [Schwartz 2021]. Nota: esse estudo mede reprodutibilidade, **não** sensibilidade/especificidade contra critério clínico.
- O artigo de Schwartz 2021 traz o questionário em português como imagens no Apêndice 1 (acesso aberto, CC BY) mas a página não dá termos de uso do questionário em si [Schwartz 2021]. A fonte a usar na implementação é o PDF do site oficial, não o artigo.
- Ressalva de verificação: o PDF em português é de 2023 e a versão em inglês é de 2025. Li ambos; a estrutura (7 perguntas gerais, 10 seções de seguimento, declaração, página de recomendações) é a mesma. **Não auditei diferenças de redação** entre as duas datas. O texto do PDF em português vem com codificação de fonte deslocada (só consegui decodificá-lo parcialmente: dígitos e algumas letras acentuadas se perdem na extração), então a implementação deve copiar o texto direto do PDF oficial/ ou pedir o arquivo-fonte à Collaboration, e não usar a minha extração.

### 2. Estrutura do PAR-Q+ (sem reproduzir o texto)

Resumo estrutural, em paráfrase curta; o texto literal fica no PDF oficial [PARQ+ 2025] [PARQ+ pt-BR]:

- **Página 1, 7 perguntas gerais (SIM/NÃO):** (1) diagnóstico médico de problema cardíaco ou pressão alta; (2) dor no peito em repouso, nas atividades diárias ou no exercício; (3) perda de equilíbrio por tontura ou perda de consciência nos últimos 12 meses (responder NÃO se a tontura foi por hiperventilação); (4) outra condição crônica diagnosticada (com campo para listar); (5) uso de medicação prescrita para condição crônica (com campo para listar); (6) problema ósseo, articular ou de partes moles atual ou nos últimos 12 meses que pode piorar com mais atividade; (7) médico já disse que só pode fazer atividade com supervisão médica.
- **Todas NÃO:** "liberado para atividade física"; assina a declaração; não preenche as páginas 2 e 3. Recomendações impressas: começar devagar e progredir; seguir as diretrizes da OMS para a idade; **se tem mais de 45 anos e NÃO está acostumado a exercício vigoroso a máximo esforço, consultar profissional de exercício qualificado antes dessa intensidade** [PARQ+ 2025].
- **Qualquer SIM:** preencher páginas 2 e 3.
- **Páginas 2 e 3, seguimento por condição (10 seções):** artrite/osteoporose/coluna; câncer; cardíaca/cardiovascular; pressão alta; metabólica (diabetes tipo 1, tipo 2, pré-diabetes); saúde mental/aprendizagem; doença respiratória; lesão medular; AVC; outra condição não listada ou duas ou mais condições. Cada seção abre com "dificuldade de controlar com medicação/tratamento?" e perguntas específicas (por exemplo: pressão em repouso ≥ 160/90 mmHg com ou sem medicação, "responda SIM se não sabe sua pressão"; sintomas de hipoglicemia; asma com sintomas persistentes; AVC nos últimos 6 meses; desmaio ou concussão nos últimos 12 meses) [PARQ+ 2025].
- **Página 4, desfecho:** todas NÃO no seguimento → "pronto para ser mais ativo" (começar com 20 a 60 min de intensidade baixa a moderada, 3 a 5 dias por semana, com aeróbio e fortalecimento, até chegar a 150 min/semana de intensidade moderada; mesma observação dos 45 anos). **Qualquer SIM no seguimento → "buscar mais informação antes de ficar mais ativo": completar o ePARmed-X+ (www.eparmedx.com) e/ou procurar um profissional de exercício qualificado para percorrê-lo** [PARQ+ 2025].
- **Adiar a prática se:** doença aguda temporária (resfriado, febre), gravidez (falar com profissional de saúde/médico/profissional de exercício e/ou completar o ePARmed-X+) ou mudança no estado de saúde [PARQ+ 2025].
- **Declaração do participante:** a liberação vale **no máximo 12 meses** e se invalida se a condição de saúde mudar; menor de idade ou que precisa de assentimento exige assinatura do responsável; o local de prática pode guardar cópia, mantendo confidencialidade [PARQ+ 2025]. A página de contato informa que a Collaboration **não guarda** cópias de formulários preenchidos [PARQ+ Contato].
- **Sem restrição de idade** no PAR-Q+ e no ePARmed-X+ (a restrição de idade do PAR-Q antigo foi removida por falta de evidência) [Warburton 2011a].

### 3. O que o ePARmed-X+ faz (relevante porque o PAR-Q+ encaminha para ele)

- Ferramenta online interativa que investiga mais a fundo; resultados possíveis: (1) liberação para atividade sem restrição; (2) liberação com restrições, com prescrição de exercício acompanhada por profissional qualificado; (3) encaminhamento ao médico para investigação/testes [Bredin 2013]. Validade: **PAR-Q+ 12 meses; ePARmed-X+ 6 meses** [Bredin 2013] [Warburton 2011a].
- Os autores estimam que ~1% a 2% dos respondentes acabam encaminhados a avaliação médica adicional e que a maioria dos "SIM" é reclassificada como liberada [Warburton 2011a] [Bredin 2013]. São números dos próprios criadores do instrumento; o artigo de Bredin não apresenta os métodos nem os dados por trás do 1% (os autores declaram não ter conflito de interesses, mas o texto tem tom promocional).
- A página do ePARmed-X+ não informa idiomas, custo nem se pode ser incorporado a outros apps [PARQ+ ePARmed]. **Não confirmei se o ePARmed-X+ está disponível em português.**

### 4. Condições de uso, licença e atribuição

Dos Termos e Condições (eparmedx.com/?page_id=746) [PARQ+ Termos]:

- A PAR-Q+ Collaboration detém o copyright do PAR-Q+, do ePARmed-X+ e dos recursos relacionados.
- **Uso gratuito** (inclusive das traduções): participantes, profissionais de exercício e clínicos usando para triagem pré-participação, pesquisadores em pesquisa não comercial e outras organizações sem fins lucrativos.
- **Uso comercial** (vender os formulários ou incorporá-los a produto à venda) exige aprovação escrita; existe licença comercial. Qualquer outro uso exige permissão prévia por escrito.
- **Modificação:** "não podem, sob nenhuma circunstância, ser alterados de qualquer forma, pois até mudanças pequenas podem alterar o desempenho" (tradução minha da cláusula). O formulário impresso reforça: usar o questionário inteiro, sem mudanças [PARQ+ 2025].
- **Atribuição:** creditar os desenvolvedores ao usar ou citar; reconhecer os tradutores nas versões traduzidas. A página "How to cite" indica citar Bredin 2013 e Warburton 2011 e diz que cópias postadas fora do site oficial podem estar desatualizadas, modificadas ou incompletas [PARQ+ Citação].
- **Isenção:** ferramentas educativas, não aconselhamento médico; sem garantia; sem responsabilização dos autores.
- **Link para o site:** analisado caso a caso; organizações com fins lucrativos precisam de licença comercial que inclua o link ou de pedido de licença com pedido de link.
- Os termos **não tratam de reprodução digital/incorporação em software**, nem de substituir a assinatura por aceite eletrônico. Como o uso do Passo é gratuito e sem fins lucrativos, o uso se enquadra no gratuito dos termos; por cautela, a tarefa recomendada da Fase 3 é comunicar o uso por e-mail (endereço geral listado na página de contato: eparmedx arroba gmail.com) [PARQ+ Contato]. Se algum dia houver cobrança, a permissão escrita vem antes.

Consequência: **este arquivo não reproduz o questionário**; registra apenas a estrutura e onde está o texto oficial.

### 5. Algoritmo de triagem do ACSM (Riebe 2015)

- Origem: mesa-redonda científica do ACSM (junho/2014) que atualizou a triagem de 2009 porque o modelo anterior gerava encaminhamentos excessivos a médicos, o que pode desestimular a prática; exercício é geralmente seguro, os eventos cardíacos relacionados ao exercício são raros e muitas vezes precedidos de sinais de alerta, e o risco cai com o condicionamento [Riebe 2015] [ACSM Roundtable 2015].
- Três fatores: (1) nível atual de atividade, (2) presença de sinais/sintomas e/ou doença cardiovascular, metabólica ou renal **conhecida**, (3) intensidade desejada. O perfil de fatores de risco cardiovascular **saiu** da decisão de encaminhamento; não há mais classificação baixo/moderado/alto risco; passou-se a recomendar "liberação médica" genérica (a forma de avaliar fica a critério do profissional de saúde) em vez de exame ou teste de esforço específico [Riebe 2015] [ACSM Roundtable 2015].
- Definições usadas pelo algoritmo (reproduzidas em Whitfield 2017, com permissão):
  - **Exercício regular:** "atividade física planejada e estruturada, pelo menos 30 min em intensidade moderada, em pelo menos 3 dias por semana, nos últimos 3 meses".
  - **Intensidade:** leve 30% a <40% FCR ou VO2R, 2 a <3 METs, PSE 9-11; moderada 40% a <60% FCR ou VO2R, 3 a <6 METs, PSE 12-13; vigorosa ≥60% FCR ou VO2R, ≥6 METs, PSE ≥14 (escala de Borg 6-20).
  - **Sinais e sintomas:** dor ou desconforto no peito, pescoço, mandíbula, braços ou outras áreas que possam refletir isquemia; falta de ar em repouso ou com esforço leve; tontura ou síncope; ortopneia ou dispneia paroxística noturna; edema de tornozelo; palpitações ou taquicardia; claudicação intermitente; sopro cardíaco conhecido; fadiga ou falta de ar incomuns nas atividades habituais.
  - **Doença conhecida:** cardíaca, vascular periférica ou cerebrovascular; diabetes tipo 1 e 2; doença renal (sem nota de definição no artigo reproduzido).
  - **Liberação médica:** "aprovação de um profissional de saúde para praticar exercício" [Whitfield 2017].
- Regras de decisão (resumo de Whitfield 2017, conferido com a figura nos slides oficiais do ACSM [ACSM Roundtable 2015]):

| Pratica exercício regular? | Doença conhecida? | Sintomas? | Recomendação |
|---|---|---|---|
| Não | Não | Não | Sem liberação para intensidade leve a moderada; pode progredir gradualmente para vigorosa seguindo as diretrizes do ACSM |
| Não | Sim (assintomático) | Não | Liberação recomendada; depois, leve a moderada, progressão gradual conforme tolerado |
| Não | Qualquer | Sim | Liberação recomendada; depois, leve a moderada |
| Sim | Não | Não | Sem liberação; continuar moderada ou vigorosa |
| Sim | Sim (assintomático) | Não | Pode continuar moderada; liberação (dentro dos últimos 12 meses se sem mudança de sintomas) recomendada antes de vigorosa |
| Sim | Qualquer | Sim | **Interromper o exercício e buscar liberação**; só volta após liberação |

- **O que o ACSM não cobre bem:** Whitfield 2017 aplicou o algoritmo ao NHANES 2001-04 (54,2% dos adultos seriam encaminhados antes de qualquer exercício; 2,6% só antes de exercício vigoroso) e conclui que faltam estudos de validação para saber se identifica corretamente quem tem risco de complicação cardiovascular [Whitfield 2017]. Não encontrei validação prospectiva do algoritmo.
- Edições do manual: os slides do ACSM indicam que o algoritmo entrou no GETP 10 (2017) [ACSM Roundtable 2015]. **Não confirmei** se o GETP 11 (2021) o manteve igual; não consegui abrir o resumo de revisões da edição.

### 6. Por que a intensidade e o histórico importam (risco absoluto)

- Meta-análise de estudos caso-cruzado: atividade física episódica eleva transitoriamente o risco de infarto (RR 3,45; IC95% 2,33-5,13) e de morte súbita cardíaca (RR 4,98; IC95% 1,47-16,91); o efeito é menor em quem tem maior nível habitual de atividade (cada vez a mais por semana de atividade habitual reduziu o RR em ~45% para infarto e ~30% para morte súbita). Os autores alertam que isso não indica dano líquido da atividade [Dahabreh 2011]. Sustenta: começar devagar, evitar esforço vigoroso desacostumado, tratar sedentários com cautela.

### 7. Diretriz brasileira (contexto)

- A Atualização da Diretriz em Cardiologia do Esporte e do Exercício da SBC/SBMEE (2019) diz que "idealmente, todos os candidatos a exercício de intensidade moderada a alta deveriam passar por avaliação pré-participação" e que o PAR-Q pode ser aplicado na anamnese. Para lazer: 18-35 anos "avaliação inicial + ECG de 12 derivações"; 35-59 anos "avaliação inicial + avaliação de risco coronariano + ECG + (considerar teste funcional)"; >60 anos "avaliação inicial + ECG + teste funcional". Teste ergométrico para assintomático com fator de risco em atividade de lazer leve a moderada: Classe III, nível C (leitura do trecho em inglês traduzido na PMC; **a leitura de "Classe III" como "não recomendado" deve ser confirmada no texto completo**). A mesma diretriz diz que não há evidência para ECG de rotina em programas populacionais de assintomáticos (Classe III) [Ghorayeb 2019]. Li apenas ~100 mil dos 440 mil caracteres da página; pode haver outras recomendações relevantes.
- Isto é mais conservador que ACSM/PAR-Q+ e é do contexto brasileiro. Uso como **orientação informativa**, não como bloqueio (ver Evidência fraca ou conflitante).

### 8. Carga de encaminhamento e usabilidade do PAR-Q+

- Em amostra online randomizada em Singapura (n = 1.019; idade média 46,9 anos), **33,1% teriam sido encaminhados** para avaliação médica pelo PAR-Q+ (15,4% aos 21-39,9; 34,5% aos 40-59,9; 57,2% aos ≥60 anos); 10,9% se só contassem quem não controla a condição. Só 4 das 7 perguntas gerais foram vistas como fáceis; 50,1% acharam longo; os autores concluem que o PAR-Q+ "provavelmente super-identificou" quem precisa de avaliação. 61,9% preferem refazer no máximo 1 vez por ano [Venkataraman 2024]. Contradiz a estimativa de 1-2% dos criadores, que se refere ao encaminhamento **após** o ePARmed-X+.

## Regras propostas para o app

Convenção: o **questionário PAR-Q+ é implementado sem alteração** (R-TRI-01/02). Tudo abaixo do questionário (derivação de estado, limites de intensidade, validade, gatilhos) é **camada do app**, separada visualmente, e não altera o instrumento.

**Estados da triagem** (campo `triagem.estado`): `NAO_FEITA`, `LIBERADO`, `AVALIACAO_NECESSARIA`, `LIBERADO_APOS_AVALIACAO`, `ADIADO`, `EXPIRADO`. Saída para o motor: `intensidade_maxima` em {`nenhuma`, `leve_moderada`, `livre`}. "Vigorosa" segue a definição do ACSM (PSE ≥14, ≥60% FCR, ≥6 METs) [Whitfield 2017]. **Mapeamento para as zonas do motor [P]:** `leve_moderada` = somente Z1 (R-INT-01); `livre` = Z1 a Z3 conforme o nível. Motivo: PSE ≤13 cai no meio da Z2 (12 a 14) e não há fonte que faça o mapeamento; vale o mais conservador até haver fonte.

1. **R-TRI-01 (obrigatória e anterior ao plano).** Sem triagem válida (`LIBERADO` ou `LIBERADO_APOS_AVALIACAO` dentro da validade) o motor não gera nenhum treino. Antes do questionário: confirmar idade ≥18 anos e coletar o consentimento explícito de dados de saúde (LGPD). [Warburton 2011a] [Bredin 2013]

2. **R-TRI-02 (questionário oficial, inalterado).** Exibir o PAR-Q+ em português do Brasil copiado do PDF oficial, com as 7 perguntas, a lógica de ramificação das páginas 2 e 3 e as recomendações da página 4, sem encurtar, reordenar ou reescrever. Mostrar a atribuição ("PAR-Q+ © PAR-Q+ Collaboration; tradução de Bianca Bold e Juliano Schwartz; Schwartz et al., 2021; eparmedx.com") e armazenar a versão do instrumento usada. Uso gratuito e não comercial (R-TRI-14). [PARQ+ Termos] [PARQ+ pt-BR] [Schwartz 2021]

3. **R-TRI-03 (liberado).** Todas as 7 gerais = NÃO, ou todas as perguntas de seguimento = NÃO (inclusive 10a-10c) → `LIBERADO`, sujeito a R-TRI-05/06/07. Mostrar as recomendações oficiais de início gradual. [PARQ+ 2025]

4. **R-TRI-04 (camada de sintomas, mais rígida que o PAR-Q+).** Se a pergunta geral 2 (dor no peito) ou 3 (tontura com perda de equilíbrio / perda de consciência) = SIM, ou a 7 (só atividade supervisionada) = SIM, o estado é `AVALIACAO_NECESSARIA` **independentemente** do resultado das páginas 2 e 3 (aceito pelo dono, P2). Motivo: no ACSM, sintoma suspeito exige liberação mesmo sem doença conhecida [Whitfield 2017]; na estrutura do PAR-Q+ uma pessoa com dor no peito e nenhuma condição diagnosticada pode responder NÃO a tudo no seguimento e sair como "pronta" (inferência minha a partir do formulário; não encontrei fonte que discuta isso). Regra aceita pelo dono em 2026-10-10 [P].

5. **R-TRI-05 (qualquer SIM no seguimento).** Qualquer SIM nas páginas 2 e 3 → `AVALIACAO_NECESSARIA`: nenhum treino é gerado. A tela oferece: (a) link externo oficial para o ePARmed-X+ (www.eparmedx.com) e (b) orientação de procurar médico ou profissional de educação física qualificado. Texto: "Antes de começar, procure mais orientação" (nunca diagnóstico, nunca "risco alto"). **Desbloqueio por autodeclaração (decisão do dono 6):** ao concluir, o atleta marca "fui avaliado por um profissional e liberado" e registra o resultado informado (`sem_restricoes`, `com_restricoes`, `encaminhado_ao_medico` ou `nao_liberado`), a data e a fonte (ePARmed-X+, médico, profissional); o app não exige documento. Só `sem_restricoes` → `LIBERADO_APOS_AVALIACAO`. `com_restricoes`, `encaminhado_ao_medico` e `nao_liberado` mantêm o estado bloqueado, porque o app não consegue respeitar restrições individualizadas (P3 resolvida: manter bloqueado, [P]). Depois do desbloqueio, a intensidade fica limitada (R-TRI-06) e, se o atleta já vinha correndo, a volta é gradual pela tabela única de R-PRG-08 (volume de retorno a no máximo 50% do anterior ou fase inicial do nível, o menor). [PARQ+ 2025] [Bredin 2013] [Riebe 2015]

6. **R-TRI-06 (limite de intensidade após avaliação).** Em `LIBERADO_APOS_AVALIACAO`, `intensidade_maxima = leve_moderada` (definição ACSM: PSE ≤13, <60% FCR), que o app implementa como **somente Z1** (RPE ≤ 11, fala em frases completas) até haver fonte para mapear PSE/FCR às zonas [P]. Ficam bloqueados `limiar-continuo`, `fartlek`, `intervalado-*` e `subidas`, qualquer bloco em Z2 ou Z3, tempo run e ritmo de prova; seguem permitidos `caminhada-corrida`, `rodagem-leve`, `regenerativo`, `longao` em Z1, `mobilidade` e `forca-corredor` nível A. Exceção: o atleta informa (nova autodeclaração datada) que a liberação inclui expressamente exercício vigoroso. Duração do teto: **sem evidência suficiente** (ACSM: "leve a moderada; pode progredir gradualmente conforme tolerado", sem prazo); decisão [P] (P4 resolvida): vale por toda a validade do estado (6 meses) e só sai com a nova declaração acima ou ao refazer o PAR-Q+. [Riebe 2015] [Whitfield 2017]

7. **R-TRI-07 (idade ≥45 e sem hábito de esforço vigoroso).** Pergunta do app (fora do PAR-Q+), feita só por organização do plano: "Nos últimos 3 meses você fez exercício planejado, ≥30 min em intensidade moderada, em ≥3 dias por semana?". Se idade ≥45 anos e resposta NÃO, `intensidade_maxima = leve_moderada` (somente Z1, R-TRI-06) até o atleta registrar que consultou um profissional de educação física qualificado (texto oficial do PAR-Q+), mesmo estando `LIBERADO`. [PARQ+ 2025] [Whitfield 2017]

8. **R-TRI-08 (sedentário liberado começa leve).** Quem não cumpre a definição de exercício regular começa em fase inicial sem sessões vigorosas, com progressão gradual (alinhar com os valores de progressão do arquivo de volume/progressão); o PAR-Q+ sugere 20 a 60 min em baixa a moderada intensidade, 3 a 5 dias por semana, até acumular 150 min/semana de intensidade moderada. [PARQ+ 2025] [Riebe 2015] [Dahabreh 2011]

9. **R-TRI-09 (adiar).** Gravidez informada ou doença aguda (resfriado, febre) → `ADIADO`: nenhum treino até recuperação (doença) ou orientação profissional (gravidez, conforme o PAR-Q+). A doença aguda é tratada no check-in diário: o item "doença aguda hoje (febre, resfriado)" de R-SON-16 gera `ADIADO` por esse dia (e enquanto durar). [PARQ+ 2025]

10. **R-TRI-10 (validade).** `LIBERADO` vale 12 meses da data de preenchimento; `LIBERADO_APOS_AVALIACAO` vale 6 meses (prazo do ePARmed-X+; escolha conservadora, já que o ACSM aceita liberação "dentro dos últimos 12 meses" quando não há mudança). Aviso 30 dias antes de vencer; ao vencer → `EXPIRADO` (sem novas sessões; histórico continua visível) até refazer o PAR-Q+ completo. [Bredin 2013] [Warburton 2011a] [Whitfield 2017]

11. **R-TRI-11 (mudança de saúde invalida).** O check-in semanal pergunta "algo mudou na sua saúde?" (novo diagnóstico, medicação, lesão, gravidez, internação). SIM → `EXPIRADO` e refazer o PAR-Q+. Declaração oficial: a liberação "se torna inválida se minha condição mudar". [PARQ+ 2025]

12. **R-TRI-12 (sinais de alerta durante ou após treino).** Se o atleta registrar dor ou desconforto no peito, desmaio, tontura intensa, palpitações ou falta de ar desproporcional: encerrar a sessão, não gerar novos treinos, estado `AVALIACAO_NECESSARIA`, mensagem para interromper e procurar atendimento médico, com o telefone de emergência **SAMU 192** (Brasil) em caso de dor no peito persistente, desmaio ou falta de ar intensa (decisão do dono 13). O desbloqueio é o mesmo de R-TRI-05 (autodeclaração datada) e vale igualmente para R-DOR-01. Base: no algoritmo do ACSM, sintoma em quem pratica = "interromper o exercício e buscar liberação"; eventos cardíacos relacionados ao exercício costumam ser precedidos de sinais de alerta. Esta regra complementa as de dor musculoesquelética do arquivo de dor. [Riebe 2015] [Whitfield 2017] [ACSM Roundtable 2015]

13. **R-TRI-13 (comunicação).** Mostrar sempre: o resultado em linguagem neutra, o motivo (qual bloco do questionário), o próximo passo concreto e a frase "Isto não é diagnóstico nem substitui avaliação profissional". Não mostrar rótulos de risco ("alto risco", "cardiopata"). Orientação informativa única no 1º acesso, sem bloquear: a Diretriz brasileira recomenda idealmente avaliação médica antes de exercício de intensidade moderada a alta (com ECG; avaliação de risco coronariano de 35 a 59 anos). [Ghorayeb 2019]

14. **R-TRI-14 (licença e uso).** Decisão do dono (2026-10-10): o Passo será **sempre gratuito** (uso não comercial), o que se enquadra no uso gratuito dos termos. **Condição:** se um dia houver cobrança (assinatura, plano pago ou produto à venda), pedir permissão escrita à PAR-Q+ Collaboration **antes** de cobrar e de manter o PAR-Q+ no app. Tarefa recomendada da Fase 3 (não bloqueia): comunicar o uso por e-mail, incluindo a incorporação do texto em português, o aceite eletrônico com data no lugar da assinatura e o tratamento dos campos livres. Plano B se a Collaboration se opuser: link para o PAR-Q+ online oficial com autodeclaração do resultado (menos preciso). [PARQ+ Termos]

15. **R-TRI-15 (dados).** Guardar: respostas SIM/NÃO, versão do instrumento, data, estado derivado, versão da regra e fonte/data da avaliação informada. Não guardar documentos médicos. Campos livres de condições e medicamentos: exibidos como o instrumento exige, mas **não armazenados** (minimização de dados, LGPD; P5 resolvida, [P]); só ficam as respostas SIM/NÃO. Exportação e exclusão conforme a LGPD; dono sempre vindo da sessão; recurso de outro usuário retorna 404. A Collaboration não recebe nem guarda formulários. [PARQ+ Contato] [AGENTS.md do projeto]

### Mapeamento resumido resposta → estado

| Situação | Estado | `intensidade_maxima` |
|---|---|---|
| 7 gerais = NÃO | `LIBERADO` | `livre` (sujeito a R-TRI-07/08) |
| Algum SIM nas gerais, mas Q2, Q3 e Q7 = NÃO, e seguimento todo NÃO | `LIBERADO` | `livre` (sujeito a R-TRI-07/08) |
| Q2, Q3 ou Q7 = SIM (R-TRI-04), ou sinal de alerta (R-TRI-12) | `AVALIACAO_NECESSARIA` | `nenhuma` |
| Qualquer SIM no seguimento | `AVALIACAO_NECESSARIA` | `nenhuma` |
| Avaliação informada "sem restrições" (autodeclaração datada) | `LIBERADO_APOS_AVALIACAO` | `leve_moderada` (somente Z1) |
| Grávida ou doença aguda | `ADIADO` | `nenhuma` |
| Validade vencida ou mudança de saúde | `EXPIRADO` | `nenhuma` |

## Evidência fraca ou conflitante

1. **O texto da especificação diverge do roteiro oficial.** A especificação diz "qualquer resposta de risco bloqueia treinos intensos e recomenda liberação médica". O PAR-Q+ não faz isso: SIM nas gerais leva às páginas de seguimento; SIM no seguimento leva ao ePARmed-X+ e/ou a um profissional de exercício qualificado (não necessariamente médico), e só uma minoria chega ao médico [PARQ+ 2025] [Bredin 2013]. Por outro lado, para quem tem doença conhecida e é inativo, o ACSM pede liberação **antes de qualquer** exercício, não só do intenso [Whitfield 2017]. Correção aprovada pelo dono (2026-10-10): bloquear o **plano inteiro** em `AVALIACAO_NECESSARIA` (mais rígido que "bloquear intensos"), desbloquear por autodeclaração de avaliação profissional, limitar depois a intensidade a leve/moderada (Z1) e trocar "liberação médica" por "avaliação (ePARmed-X+, profissional de exercício ou médico)".
2. **PAR-Q+ pode liberar quem tem sintoma isolado** (pergunta 2 ou 3 com SIM e nenhuma condição diagnosticada). O ACSM exige liberação para sintoma [Whitfield 2017]. Decisão conservadora: R-TRI-04. Marcado como inferência minha.
3. **Faltam dados de sensibilidade e especificidade do PAR-Q+.** Só achei confiabilidade (Schwartz 2021) e taxa de encaminhamento (Venkataraman 2024), não acurácia contra desfecho cardíaco. O mesmo vale para o algoritmo do ACSM (Whitfield 2017 pede validação). Decisão: usar os dois como filtros conservadores, nunca como garantia de segurança, e deixar isso claro na tela (R-TRI-13).
4. **Taxas de encaminhamento conflitantes:** 1-2% (criadores, após ePARmed-X+) contra 33,1% (Singapura, só PAR-Q+). Como o app não incorpora o ePARmed-X+, esperar bloqueio relevante (de ~15% abaixo dos 40 a ~57% acima dos 60 anos, na amostra de Singapura) e fazer o fluxo de saída (R-TRI-05) simples [Venkataraman 2024] [Warburton 2011a].
5. **Diretriz brasileira (SBC 2019) mais conservadora** que ACSM/PAR-Q+ (recomenda idealmente avaliação, com ECG, para exercício moderado a alto, inclusive em lazer). Ao mesmo tempo, a própria diretriz classifica ECG de rotina em assintomáticos como Classe III. Decisão: mensagem informativa sem bloqueio (R-TRI-13); sem endurecimento para ≥35 anos na v1 (P6 resolvida, [P]).
6. **Validade de 12 meses (PAR-Q+) e 6 meses (ePARmed-X+)** vêm dos autores do instrumento sem justificativa empírica nos textos que li [Bredin 2013] [Warburton 2011a]. O ACSM usa "últimos 12 meses" para liberação. Decisão: 12 meses no PAR-Q+, 6 meses após avaliação (R-TRI-10).
7. **Duração do teto de intensidade após liberação:** sem evidência suficiente (R-TRI-06). Decisão [P]: teto durante os 6 meses de validade.
8. **Versões:** PDF em português de 2023 vs inglês de 2025; não auditei diferenças. Citação de Riebe 2015 aparece como 47(11):2473-2479 (Digital Commons URI, DOI) e como 48(3):579 em uma lista de referências de terceiros; adotei a primeira (a segunda parece erro). Não confirmei se o GETP 11 (2021) mudou o algoritmo.
9. **Artigo de Bredin 2013** é uma descrição pelos próprios autores do instrumento (nível 5), com afirmações de apoio de baixa qualidade (jornal, site de clínica). Usado só para validade e saídas do ePARmed-X+; o 1% de encaminhamento não deve virar premissa do app.

## Decisões do dono e de projeto (2026-10-10)

- **P1. Modelo do Passo e licença.** Decisão do dono: o app será sempre gratuito (uso não comercial). Condição registrada: se um dia houver cobrança, pedir permissão escrita antes (R-TRI-14).
- **P2. Camada de sintomas (R-TRI-04).** Aceito: bloquear quem responder SIM às perguntas gerais 2, 3 ou 7 mesmo que o seguimento fique todo NÃO (mais rígido que o PAR-Q+ e igual ao critério do ACSM) [P].
- **P3. "Liberado com restrições".** Sem evidência suficiente para o app respeitar restrições individuais. Decisão [P]: manter bloqueado.
- **P4. Teto de intensidade após avaliação.** Decisão [P]: manter `leve_moderada` (somente Z1) durante toda a validade de 6 meses; destrava com nova declaração do profissional ou ao refazer o PAR-Q+. Sem evidência suficiente para prazo menor.
- **P5. Dados livres.** Decisão [P]: não guardar as listas de condições e medicamentos (minimização de dados).
- **P6. Diretriz brasileira.** Decisão [P]: a orientação fica só informativa.
- **P7. Autodeclaração.** Decisão do dono (6): autodeclaração com data e fonte, sem anexo (menos dados sensíveis). Recomenda-se revisão jurídica dos termos de uso antes do lançamento (tarefa, não bloqueia).
- **P8. Texto de emergência.** Decisão do dono (13): a mensagem de urgência usa SAMU 192 (Brasil).
- **P9. ePARmed-X+ em português.** Não consegui confirmar. Tarefa da Fase 3 (verificação, não decisão): testar manualmente o link oficial antes de depender dele na tela de R-TRI-05; se não houver português, a tela orienta procurar profissional de exercício.

## Tabela de evidências

| Afirmação | Fonte | Nível | Como vira regra no app |
|---|---|---|---|
| PAR-Q+ tem 7 perguntas gerais; SIM abre seguimento; SIM no seguimento leva ao ePARmed-X+ e/ou profissional qualificado | [PARQ+ 2025] [Schwartz 2021] | 4 | R-TRI-02, 03, 05 |
| Existe tradução oficial pt-BR aprovada pela Collaboration | [PARQ+ Idiomas] [Schwartz 2021] | 3/4 | R-TRI-02 |
| Questionário não pode ser alterado; uso comercial exige licença; atribuição obrigatória | [PARQ+ Termos] [PARQ+ 2025] | 4 | R-TRI-02, 14 |
| Validade: PAR-Q+ 12 meses; ePARmed-X+ 6 meses; inválido se a saúde mudar | [PARQ+ 2025] [Bredin 2013] [Warburton 2011a] | 4/5 | R-TRI-10, 11 |
| ePARmed-X+ pode liberar sem restrição, com restrição ou encaminhar ao médico | [Bredin 2013] | 5 | R-TRI-05 |
| Mais de 45 anos sem hábito de esforço vigoroso: consultar profissional qualificado antes dessa intensidade | [PARQ+ 2025] | 4 | R-TRI-07 |
| Adiar prática em doença aguda e gravidez | [PARQ+ 2025] | 4 | R-TRI-09 |
| Algoritmo ACSM: nível atual de atividade, sintomas/doença conhecida, intensidade desejada | [Riebe 2015] [Whitfield 2017] | 4 | R-TRI-04, 06, 07 |
| Sintoma exige liberação antes (ou interrupção do) exercício, mesmo sem doença diagnosticada | [Whitfield 2017] [ACSM Roundtable 2015] | 4 | R-TRI-04, 12 |
| Definições de exercício regular, intensidade e sintomas | [Whitfield 2017] (reproduz Riebe 2015) | 3/4 | R-TRI-06, 07, 12 |
| Risco transitório de infarto e morte súbita com esforço, menor com maior atividade habitual | [Dahabreh 2011] | 1 | R-TRI-08 |
| PAR-Q+ encaminharia 33,1% numa amostra online e é difícil de entender | [Venkataraman 2024] | 3 | Evidência fraca 4; R-TRI-05 simples |
| Diretriz brasileira recomenda idealmente avaliação para exercício moderado a alto | [Ghorayeb 2019] | 4 | R-TRI-13 |

## Referências

| Chave | Autores | Ano | Título | Periódico | DOI/URL | Tipo de estudo | Nível | Verificação |
|---|---|---|---|---|---|---|---|---|
| PARQ+ 2025 | PAR-Q+ Collaboration | 2025 | The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+), formulário oficial | eparmedx.com | https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025Fillable.pdf | Instrumento oficial de consenso (AGREE) | 4 | texto completo (PDF lido) |
| PARQ+ pt-BR | PAR-Q+ Collaboration; trad. Bold B, Schwartz J | 2023 | PAR-Q+ em português (Brasil) | eparmedx.com | https://eparmedx.com/wp-content/uploads/2023/07/Brazilian-Portuguese.pdf | Instrumento oficial traduzido | 4 | texto completo (PDF lido; extração com codificação parcial) |
| PARQ+ Idiomas | PAR-Q+ Collaboration | 2026 | Translations / Languages | eparmedx.com | https://eparmedx.com/print-versions-of-par-q/languages/ | Página da entidade | 4 | texto completo (página lida) |
| PARQ+ Termos | PAR-Q+ Collaboration | 2026 | Terms and Conditions | eparmedx.com | https://eparmedx.com/?page_id=746 | Página da entidade | 4 | texto completo (página lida) |
| PARQ+ Citação | PAR-Q+ Collaboration | 2026 | How to Cite | eparmedx.com | https://eparmedx.com/how-to-cite/ | Página da entidade | 4 | texto completo (página lida) |
| PARQ+ Contato | PAR-Q+ Collaboration | 2026 | Contact Us | eparmedx.com | https://eparmedx.com/contact-us/ | Página da entidade | 4 | texto completo (página lida) |
| PARQ+ Site / ePARmed | PAR-Q+ Collaboration | 2026 | Página inicial, PAR-Q+ online e ePARmed-X+ | eparmedx.com | https://eparmedx.com/ ; https://eparmedx.com/?page_id=75 ; https://eparmedx.com/?page_id=24 | Páginas da entidade | 4 | texto completo (páginas lidas) |
| Warburton 2011a | Warburton DER, Jamnik VK, Bredin SSD, Gledhill N | 2011 | The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+) and Electronic Physical Activity Readiness Medical Examination (ePARmed-X+) | Health & Fitness Journal of Canada 4(2):3-17 | https://doi.org/10.14288/hfjc.v4i2.103 | Documento de desenvolvimento do instrumento (baseado em 10 revisões sistemáticas, AGREE) | 4 | texto completo (acesso aberto, lido) |
| Bredin 2013 | Bredin SSD, Gledhill N, Jamnik VK, Warburton DER | 2013 | PAR-Q+ and ePARmed-X+: New risk stratification and physical activity clearance strategy for physicians and patients alike | Canadian Family Physician 59(3):273-277 | https://pmc.ncbi.nlm.nih.gov/articles/PMC3596208 (PMID 23486800; sem DOI na página) | Artigo descritivo dos autores do instrumento | 5 | texto completo (PMC) |
| Schwartz 2021 | Schwartz J, Oh P, Takito MY, Saunders B, Dolan E, Franchini E, Rhodes RE, Bredin SSD, Coelho JP, dos Santos P, Mazzuco M, Warburton DER | 2021 | Translation, Cultural Adaptation, and Reproducibility of the Physical Activity Readiness Questionnaire for Everyone (PAR-Q+): The Brazilian Portuguese Version | Frontiers in Cardiovascular Medicine 8:712696 | https://doi.org/10.3389/fcvm.2021.712696 (PMC8350392) | Estudo de reprodutibilidade (teste-reteste, n = 493) | 3 | texto completo (PMC) |
| Riebe 2015 | Riebe D, Franklin BA, Thompson PD, Garber CE, Whitfield GP, Magal M, Pescatello LS | 2015 | Updating ACSM's recommendations for exercise preparticipation health screening | Med Sci Sports Exerc 47(11):2473-2479 | 10.1249/MSS.0000000000000664 (PMID 26473759) | Consenso de mesa-redonda do ACSM | 4 | resumo (artigo pago, HTTP 402); definições e regras conferidas em Whitfield 2017 (texto completo, reproduz a figura com permissão) |
| ACSM Roundtable 2015 | American College of Sports Medicine (Riebe D et al., apresentação) | 2015 | ACSM Scientific Roundtable: Updating Recommendations for Exercise Preparticipation Health Screening (slides) | ACSM; cópia em uwi.edu | https://uwi.edu/sport/sites/sport/files/ACSM-ReccommendationsforPHEScreening.pdf | Material de apresentação oficial | 5 | texto completo (slides lidos); usado só para confirmar ramos da figura e o ponto "GETP 10 (2017)" |
| Whitfield 2017 | Whitfield GP, Riebe D, Magal M, Liguori G | 2017 | Applying the ACSM Preparticipation Screening Algorithm to U.S. Adults: National Health and Nutrition Examination Survey 2001-2004 | Med Sci Sports Exerc 49(10):2056-2063 | 10.1249/MSS.0000000000001331 (PMC7059860) | Estudo observacional transversal (NHANES) | 3 | texto completo (PMC) |
| Dahabreh 2011 | Dahabreh IJ, Paulus JK | 2011 | Association of Episodic Physical and Sexual Activity With Triggering of Acute Cardiac Events: Systematic Review and Meta-analysis | JAMA 305(12):1225-1233 | https://doi.org/10.1001/jama.2011.336 (PMC5479331) | Revisão sistemática com meta-análise | 1 | texto completo (manuscrito PMC; resumo e números conferidos) |
| Venkataraman 2024 | Venkataraman A, Hong IZ, Ho LC, Teo TL, Ang SH-C | 2024 | Public Perceptions on the Use of the Physical Activity Readiness Questionnaire | Healthcare (Basel) 12(17):1686 | https://doi.org/10.3390/healthcare12171686 (PMC11395539) | Inquérito transversal randomizado online (n = 1.019) | 3 | texto completo (PMC) |
| Ghorayeb 2019 | Ghorayeb N, Stein R, Daher DJ, Silveira AD, Ritt LEF, Santos DFP, et al. | 2019 | The Brazilian Society of Cardiology and Brazilian Society of Exercise and Sports Medicine Updated Guidelines for Sports and Exercise Cardiology - 2019 | Arquivos Brasileiros de Cardiologia 112(3):326-368 | https://doi.org/10.5935/abc.20190048 (PMC6424031) | Diretriz de sociedades médicas | 4 | texto completo parcial (PMC, primeiros ~100 mil de 440 mil caracteres lidos) |

Fontes consideradas e **não usadas** por não terem sido abertas: Warburton et al. 2011, "Evidence-based risk assessment and recommendations for physical activity clearance: consensus document" (APNM 36(S1):S266-S298; só confirmei a citação por fontes secundárias); ESC Guidelines on sports cardiology 2020 (Pelliccia et al., Eur Heart J 2021; não localizei o trecho de triagem de sedentários); ACSM's Guidelines 11ª edição (2021).
