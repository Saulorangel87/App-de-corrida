# ADR 0006 — Acompanhamento diário (Fase 5)

Data: 2026-10-10 · Status: aceito, com 9 escolhas do projeto para o dono confirmar

## Contexto
A Fase 4 deixou o motor pronto (`decideDay`, modelos de plano), mas sem dados reais: faltava agendar as semanas do plano para cada atleta, receber o check-in e o registro pós-treino, e devolver a decisão do dia com o motivo. A seção 8 da especificação define o que o atleta registra e o que o sistema devolve.

## Decisão
- **Datas do calendário do atleta.** O cliente envia a data local (`AAAA-MM-DD`); o servidor aceita só hoje e um dia de cada lado (fusos de −12 a +14). Não se guarda fuso.
- **Semana do plano = janela de 7 dias a partir de `start_date`** (tabela `athlete_plan_weeks`), não semana de segunda a domingo. O teto semanal da decisão do dia passou a contar o que foi concluído **dentro dessa janela** (`DayInput.weekStartedOn`); sem ela, valeria a janela móvel de 7 dias e cortaria sessões que o próprio plano montou.
- **Dias de treino.** A entrevista só dá quantidade de dias e o dia do longão; o motor escolhe os dias mais espaçados (`availableWeekdays`), contando a virada da semana.
- **Semanas criadas na primeira consulta** (`GET /day/:date`, `GET /plan/week/:date`). Ao criar a semana N, a N−1 fecha: sessões pendentes viram "não feitas" e, na escada, `nextLadderStep` decide avançar ou repetir. Repetir mantém a mesma semana do modelo (`template_week`) e adia o resto do plano.
- **A semana já nasce dentro dos tetos** (`buildAthleteWeek`): usa o volume concluído na última semana de construção (R-PRG-05) para limitar a 110% (105% com cautela) ou a 75% na recuperação. Assim quem segue o plano não recebe corte do motor diário. Um teste confere isso nos 13 modelos, em 2 volumes e 2 disponibilidades.
- **Menos dias do que corridas:** as corridas leves saem primeiro e **o volume delas é repartido entre as que ficam**, respeitando os tetos por sessão. Perder carga em silêncio fazia o volume cair semana a semana (R-PRG-03 compara com o que foi concluído).
- **Check-in:** um por dia (`PUT` substitui; o que ficou de fora é apagado). Notas de 1 a 5 com "5 = melhor". "Dor ao caminhar" só é perguntada quando há bloqueio por dor (`questions` da resposta).
- **Dor:** relato junto do registro de treino (`PUT /workouts/:id/log`, substitui) ou avulso (`POST /pain/:date`). Dor da manhã seguinte na mesma região vira `morningSameSite` do relato do treino (R-DOR-06). Persistência (dias seguidos na região) e basal (média de 7 dias sem corrida) são calculadas, não digitadas. Relato com intensidade 0 e sem sintoma não é gravado; sinal cardiopulmonar sempre vale (DEC-05).
- **Decisão do dia gravada.** Cada cálculo com resultado novo vira linha em `engine_decisions` (`for_date`, regra aplicada = `DIA-v1:<regras>`, entradas completas em `context`). O mesmo resultado não duplica linha.
- **Sessão não registrada em dia passado = não concluída** (R-PRG-06 c). O treino de hoje não conta como histórico da própria decisão de hoje.
- **Pausa e liberação** (R-PRG-09): o atleta declara a pausa (`PUT /profile/pause`) e depois a liberação profissional com data (`POST /profile/professional-clearance`). O episódio fecha 2 semanas após a primeira corrida depois da liberação. Quem começa do zero não "volta de pausa": a contagem de dias sem correr parte da entrevista.
- **Complementares:** força só em dia `manter` ou `reduzir`; mobilidade em qualquer dia, exceto `interromper_e_encaminhar`. Vêm com `allowed` na resposta.
- **Histórico:** sono, dor, carga semanal (sRPE × minutos, unidades arbitrárias) e aderência (concluídas ÷ devidas), por semana do plano. O sRPE nunca decide o dia (R-CRG-08).
- **LGPD:** `GET /account/export` devolve todos os dados do atleta em JSON, sem hash de senha nem sessões. A exclusão de conta apaga as tabelas novas em cascata (teste).
- **Escada com RLS e testes:** `athlete_plan_weeks` tem RLS; todas as rotas novas têm teste "A tenta acessar B".

## Escolhas do projeto que a pesquisa não fixa (a confirmar com o dono)
1. **Minutos por sessão da entrevista** viram teto de duração de cada sessão, **inclusive o longão** (só reduz). A escada não é encurtada. Um 21 km com 60 min por sessão nunca chega ao longão que o modelo pede; hoje o app não avisa isso na escolha do plano.
2. **Dias da semana escolhidos pelo motor** (mais espaçados, com o longão no dia pedido), sem perguntar quais dias o atleta pode.
3. **Semana de 7 dias a partir do início do plano**, não de segunda a domingo (muda o dia da semana em que o volume "zera").
4. **Corrida leve a menos quando faltam dias** e volume repartido (acima). A alternativa seria avisar que o plano pede mais dias do que o atleta tem.
5. **Escada com menos de 3 dias disponíveis:** a sessão que não coube não conta como "não concluída"; o atleta avança com 2.
6. **Pausa declarada pelo atleta**, e liberação por autodeclaração com data. Não há detecção automática da causa da pausa.
7. **Sessão não registrada = não concluída** no dia seguinte, e a semana fecha sozinha no início da próxima. Registro tardio (depois do fechamento) grava, mas não refaz a decisão da escada.
8. **Força** só entra em dia `manter`/`reduzir`; **mobilidade** quase sempre.
9. **Teto de 110% usa o concluído** da última semana de construção; a primeira semana usa a média da entrevista (convertida a 7 min/km).

## Limitações conhecidas
- Corrida **fora do plano** (dia sem sessão, ou sessão extra) não é registrada; só se registra o que está agendado.
- Sem notificação (e-mail ou push) do ajuste: o aviso é a resposta da API (`nextDay`) e o `GET /day`.
- Mensagens só em português; os códigos de motivo são estáveis para o front traduzir.
- A adjacência entre o último dia de uma semana e o primeiro da seguinte é tratada só pelo espaçamento dos dias escolhidos, não por verificação.
- Sem teste com atleta real: tudo é verificado por regras e simulação, não por dados de campo.

## Consequências
- A decisão do dia depende de o atleta ter feito a entrevista (`409 INTERVIEW_REQUIRED` caso contrário).
- Mudar o cálculo dos tetos ou a composição da semana exige nova versão (`DIA-v1`/`PLN-v1`); semanas já criadas não são reescritas.
- A Fase 6 só consome estas rotas: `GET /day/:date`, `GET /plan/week/:date`, `PUT /checkins/:date`, `POST /pain/:date`, `PUT /workouts/:id/log`, `PUT /profile/pause`, `POST /profile/professional-clearance`, `GET /history`, `GET /account/export`.
