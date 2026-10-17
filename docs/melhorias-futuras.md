# Melhorias futuras

Ideias registradas para um possível upgrade do Let's Go Run. **Nada aqui está aprovado nem implementado.** Cada item só vira trabalho depois de o dono decidir, e qualquer regra nova precisa de fonte verificada em `docs/pesquisa/` (regra inegociável do projeto).

## 1. Ritmo (pace) e treino de desempenho

Registrado em 2026-10-12, a pedido do dono, depois da pergunta "o app consegue melhorar o pace ou fazer treino de tiros?".

### Como está hoje

- **Tiros existem.** O catálogo tem Intervalado curto, Intervalado longo, Fartlek, Limiar contínuo e Subidas, só para os níveis intermediário e avançado. Os blocos de qualidade crescem ao longo do plano (por exemplo, +1 repetição a cada 2 semanas até o teto do nível).
- **Iniciante não faz tiros.** A pesquisa não sustenta esses treinos para quem está começando.
- **Intensidade é por zona e esforço, não por ritmo.** O controle é teste da fala, esforço percebido (CR-10) e zona de frequência cardíaca (R-INT-02). `targetPaceRelative` é `null` em todos os treinos do catálogo; o app nunca prescreve "5:10/km".
- **Pace é só informativo (2026-10-17).** O painel mostra o "Ritmo médio" da semana e o ritmo de cada treino recente; o registro mostra o ritmo enquanto o atleta digita distância e duração; o histórico mostra o ritmo médio do período e por semana (na tabela da carga). Tudo é minutos ÷ km dos treinos que têm os dois dados, rotulado como referência, sem meta nem comparação com o passado. O registro do treino guarda duração, distância, esforço percebido, dor e observações (`workoutLogSchema`). (Atualizado em 2026-10-17: antes dizia que o app não calculava pace.)
- **Intensidade não sobe por desempenho.** A avaliação a cada 2 semanas só pode repetir a etapa (puxado, não consegui). "Fácil" não muda o plano, porque ele nunca passa do molde (R-PLN-18).
- **Tempos de 5 km e 10 km só classificam o nível** (CLS-v1). Não viram ritmos de treino.

### O que a pesquisa já cobre

A pesquisa de controle de intensidade (`docs/pesquisa/04-controle-intensidade.md`) já tem regras propostas para ritmo, ainda não implementadas:

- **R-INT-08 (pace a partir de prova recente):** só para intermediário e avançado, e só com prova ou teste de campo informado nas últimas 8 a 12 semanas. Equivalência de prova por Riegel (expoente 1,07) até 21,1 km; **nunca** para maratona (Vickers 2016). Sempre rotulado como estimativa.
- **R-INT-10 (registro da sessão):** guardar também FC média e máxima e **pace médio**, e usar a zona realizada na distribuição de intensidade.
- **Decisão conservadora (DEC-28, DEC-41):** o ritmo é apoio, não controle principal. O app mostraria só a equivalência de prova (Riegel até 21,1 km) e o ritmo de 5 e 10 km como referência de Z3 e teto de Z1, **sem faixas numéricas de pace para Z1 e Z2**. Velocidade crítica ficou fora da v1.
- **Limite da evidência:** não há estudo que valide deslocamentos de ritmo por zona em corredores recreacionais; a janela de 8 a 12 semanas é convenção do projeto [P].

### O que seria preciso para entregar

1. ~~**Cálculo e exibição de pace** nos registros e no histórico~~ **Feito em 2026-10-17** (sem regra nova, sem dado novo no banco).
2. **Pace médio no registro** (R-INT-10): a exibição está feita; **falta guardar FC média e máxima** e usar a zona realizada na distribuição de intensidade (dado novo: exige texto de Privacidade com versão nova).
3. **Entrada de prova ou teste recente** na entrevista e no perfil, com data, para a janela de 8 a 12 semanas (hoje os tempos de 5 km e 10 km são opcionais e servem só à classificação, com validade de 6 meses).
4. **Ritmo de referência por prova recente** (R-INT-08), com o rótulo de estimativa e as restrições acima.
5. **Progressão baseada em desempenho** (por exemplo, subir a intensidade quando o treino fica "fácil" de forma consistente). Isso **é regra nova** e hoje contraria R-PLN-18; exigiria pesquisa, decisão do dono e uma versão nova do motor, com testes por regra.
6. **Textos do atleta** em linguagem simples, aprovados pelo dono, em português e inglês.

### Decisões que serão do dono

- Mostrar pace só como referência ou também como alvo por treino?
- Permitir que o plano suba de intensidade por desempenho, quebrando R-PLN-18 (o plano nunca passa do molde)?
- Aceitar a janela de 8 a 12 semanas para provas recentes (convenção [P]) ou exigir mais evidência?
- Coletar dados de relógio (FC, pace) por importação, ou só digitação manual?

### Cuidados

- Dados de ritmo e desempenho continuam sendo dados do atleta: entram na exportação e na exclusão, e o texto de Privacidade muda de versão se houver dado novo.
- Pace não pode empurrar o atleta a ignorar dor ou sono ruim; as regras de dor e de recuperação continuam com precedência (R-PRG-11).
- Qualquer item novo no motor leva teste por regra e entra na lista de regras com sua fonte.

## 2. Ideias vindas da análise do Runna

Registrado em 2026-10-17, a pedido do dono, depois de analisar o app Runna (Android, versão 8.55.0). **Nada aqui está aprovado nem implementado.**

**O que a análise permite afirmar.** A lógica de planos do Runna roda no servidor e não está no APK. O que se viu foram nomes de telas, recursos e textos do aplicativo. Estas ideias vêm de áreas de produto, **não de algoritmo copiado**, e nenhum texto, imagem ou código do Runna deve ser reaproveitado (são protegidos). Toda regra nova segue valendo o que o projeto exige: fonte verificada em `docs/pesquisa/`, decisão do dono, versão nova do motor e teste por regra.

### O que o motor já cobre (não é melhoria nova)

- **Retorno após pausa** (R-PRG-08): tabela única com cortes de 7, 14, 28 e 84 dias, volume de retorno de 70% e 50%, e sem Z3 por 2 semanas.
- **Pausa por dor, lesão ou doença** (R-PRG-09): o app só retoma depois da autodeclaração de liberação por profissional.
- **Doença aguda** (R-SON-16), **semana de recuperação** a 75% (R-PRG-07) e **congelamento da progressão** quando mais de 1 sessão não é concluída (R-PRG-06).
- **Pós-prova** (R-PLN-19): está definida na pesquisa como [P], sem fonte verificada. Não foi conferido se já está implementada no motor.

### 2.1 Pace (área do Runna: ritmo e tempo estimado de prova)

É a ideia com mais pesquisa pronta. Já está detalhada na seção 1. **A parte que não exigia regra nova foi entregue em 2026-10-17** (pace por treino, no registro e no histórico). O ritmo de referência por prova recente (R-INT-08) continua esperando as decisões do dono listadas na seção 1.

### 2.2 Reduzir a carga a pedido (áreas do Runna: "não estou 100%", redução de treino, modo Lifestyle)

- **Hoje:** só o check-in reduz o treino (sono, dor, DOMS), com o corte reativo de 20% (R-PRG-12).
- **Ideia:** o atleta poder pedir um dia ou uma semana mais leve sem relatar sintoma, **só para baixo**, o que respeita R-PLN-18 (o plano nunca passa do molde).
- **Precisa de regra nova?** Quase não: pode reaproveitar o corte de 20% que já existe. A decisão é do dono: aceitar esse reaproveitamento ou pedir pesquisa para um valor próprio.
- **Cuidado:** o pedido do atleta nunca desfaz dor ou sono ruim (R-PRG-11); ele só soma uma redução.

### 2.3 Pausa planejada (área do Runna: férias e viagem)

- **Hoje:** o único fluxo de pausa é por dor, lesão ou doença (`pauseSchema`, R-PRG-09). Quem viaja e fica dias sem correr volta pela tabela de R-PRG-08, calculada pelos dias desde a última corrida.
- **Ideia:** deixar o atleta avisar antes uma pausa com data de volta, para o app mostrar o que vai acontecer na volta (por exemplo, "volta com 70% do volume, sem treino forte por 2 semanas").
- **Precisa de regra nova?** Não nos números: a tabela de R-PRG-08 já decide. É uma mudança de tela e de API, e entra dado novo (datas da pausa), o que leva a texto de Privacidade com versão nova.

### 2.4 Adaptar ao clima (área do Runna: adaptação ao tempo)

- **Hoje:** só existem os sinais de calor ligados à dor (R-DOR-02, Casa 2015). A pesquisa deixa a regra de temperatura para "o tema ambiental, se houver", que **não foi pesquisado**.
- **O que seria preciso:** pesquisa nova (calor, hidratação, ajuste de esforço) com fonte verificada; uma API externa de tempo; e localização do atleta, que é dado pessoal e entra na LGPD e na Privacidade.
- **Avaliação:** é a mais pesada e a de menor retorno imediato. Deixar por último.

### O que não vale copiar

- **Subir a carga por desempenho** (modos "Optimal" e "Balanced"): contraria R-PLN-18. Só entraria com pesquisa, decisão explícita do dono e quebra consciente da regra (ver item 5 da seção 1).
- **Quilometragem do tênis:** o limite de uso precisa de fonte verificada, que não temos.
- **Força, ioga e pilates como treinos extras:** o catálogo já tem `forca-corredor` e `mobilidade`.

### Ordem sugerida

1. Pace (2.1), começando pelos passos que não pedem regra.
2. Redução a pedido (2.2).
3. Pausa planejada (2.3).
4. Clima (2.4), só se houver interesse e pesquisa.
