# Melhorias futuras

Ideias registradas para um possível upgrade do Let's Go Run. **Nada aqui está aprovado nem implementado.** Cada item só vira trabalho depois de o dono decidir, e qualquer regra nova precisa de fonte verificada em `docs/pesquisa/` (regra inegociável do projeto).

## 1. Ritmo (pace) e treino de desempenho

Registrado em 2026-10-12, a pedido do dono, depois da pergunta "o app consegue melhorar o pace ou fazer treino de tiros?".

### Como está hoje

- **Tiros existem.** O catálogo tem Intervalado curto, Intervalado longo, Fartlek, Limiar contínuo e Subidas, só para os níveis intermediário e avançado. Os blocos de qualidade crescem ao longo do plano (por exemplo, +1 repetição a cada 2 semanas até o teto do nível).
- **Iniciante não faz tiros.** A pesquisa não sustenta esses treinos para quem está começando.
- **Intensidade é por zona e esforço, não por ritmo.** O controle é teste da fala, esforço percebido (CR-10) e zona de frequência cardíaca (R-INT-02). `targetPaceRelative` é `null` em todos os treinos do catálogo; o app nunca prescreve "5:10/km".
- **Pace não é medido.** O registro do treino guarda duração, distância, esforço percebido, dor e observações (`workoutLogSchema`). Não calcula pace nem compara com o passado.
- **Intensidade não sobe por desempenho.** A avaliação a cada 2 semanas só pode repetir a etapa (puxado, não consegui). "Fácil" não muda o plano, porque ele nunca passa do molde (R-PLN-18).
- **Tempos de 5 km e 10 km só classificam o nível** (CLS-v1). Não viram ritmos de treino.

### O que a pesquisa já cobre

A pesquisa de controle de intensidade (`docs/pesquisa/04-controle-intensidade.md`) já tem regras propostas para ritmo, ainda não implementadas:

- **R-INT-08 (pace a partir de prova recente):** só para intermediário e avançado, e só com prova ou teste de campo informado nas últimas 8 a 12 semanas. Equivalência de prova por Riegel (expoente 1,07) até 21,1 km; **nunca** para maratona (Vickers 2016). Sempre rotulado como estimativa.
- **R-INT-10 (registro da sessão):** guardar também FC média e máxima e **pace médio**, e usar a zona realizada na distribuição de intensidade.
- **Decisão conservadora (DEC-28, DEC-41):** o ritmo é apoio, não controle principal. O app mostraria só a equivalência de prova (Riegel até 21,1 km) e o ritmo de 5 e 10 km como referência de Z3 e teto de Z1, **sem faixas numéricas de pace para Z1 e Z2**. Velocidade crítica ficou fora da v1.
- **Limite da evidência:** não há estudo que valide deslocamentos de ritmo por zona em corredores recreacionais; a janela de 8 a 12 semanas é convenção do projeto [P].

### O que seria preciso para entregar

1. **Cálculo e exibição de pace** nos registros e no histórico (duração e distância já existem). Não exige regra nova.
2. **Pace médio no registro** (R-INT-10) e uso da zona realizada na distribuição.
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
