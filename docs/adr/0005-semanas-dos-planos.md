# ADR 0005 — Semanas e sessões dos 13 modelos de plano (Fase 4b)

Data: 2026-10-10 · Status: aceito (fase aprovada pelo dono em 2026-10-10; os 8 itens abaixo seguem como padrão e podem ser revistos)

## Contexto
A decisão do dia (ADR 0004) precisa de um "treino de hoje". Os modelos tinham só objetivo, nível e duração. A pesquisa (10-planos-objetivo.md) dá as curvas de volume de 5 modelos, a escada do iniciante, tetos, polimento e regras de frequência, mas não escreve semana por semana os 13 modelos.

## Decisão
- **Gerador no motor** (`packages/engine/src/plan/`): `buildPlanTemplate(objetivo, nível)` devolve semanas com fase, índice de volume (pico = 100), recuperação, polimento, semana de prova e sessões (slug do catálogo + parte do volume). É a fonte única; o seed só grava o que o motor gera.
- **Curvas:** as 5 curvas publicadas na pesquisa entram como estão; as outras 8 seguem o mesmo gerador (+7,5% por semana de carga, ×0,75 na recuperação, polimento da R-PLN-10). Testes conferem as regras em todas as 13: crescimento ≤ 110% (≤ 120% na escada), recuperação em 75%, pico 100, frequência por nível, qualidade por nível, polimento.
- **Semana concreta** (`materializeWeek`): converte o índice em minutos para o atleta (semana 1 ≈ média atual; pico = menor entre o teto do modelo e a base; piso de 90% da base), com tetos de pico e longão (R-PLN-11, R-SES-30/31), 110% da maior corrida em 30 dias, 105% com `cautela_lesao`, e **orçamento de intensidade da semana** (Z3 ≤ 12% intermediário e 15% avançado, Z2 ≤ 15%; estourou, a sessão regride: intervalado-longo → curto → fartlek → rodagem).
- **Escada:** sai do seed e vai para o motor (`ladder.ts`), usada pelo catálogo e pelos planos. `nextLadderStep` decide avançar ou repetir (dor no limite, 2 sessões perdidas, progressão lenta).
- **Agenda** (`scheduleWeek`): distribui as sessões nos dias do atleta; qualidade nunca em dias seguidos, longão no dia escolhido, escada com dia de descanso, força em dia sem sessão dura; o que não cabe vai para `unplaced` (nunca "compensa").
- **Banco:** `plan_template_weeks` (refeita) e `plan_template_sessions`, com índices únicos e leitura apenas para a API. Seed idempotente: 13 modelos, 157 semanas.

## Escolhas do projeto que a pesquisa não fixa (a confirmar com o dono)
1. **Rotação das sessões de qualidade** por objetivo e nível (ex.: 5 km intermediário: fartlek, subidas, intervalado curto, intervalado longo; 21/42 km: fartlek e limiar). Está em `templates.ts`.
2. **Parte de cada sessão no volume:** longão de 26% a 40% (nunca acima de ~40%, R-SES-31), qualidade de 13% a 25%, o resto em rodagens leves.
3. **Iniciante em 10 km:** sem qualidade (R-SES-40 exige etapa 12 + 8 semanas) e longão só a partir da semana 5.
4. **Força (2 por semana, 1 em polimento e prova) e mobilidade (2)** entram como sessões **opcionais** de duração fixa (30 e 15 min), fora do volume de corrida.
5. **Saúde para iniciante** usa a escada, com a recuperação repetindo a etapa a 75% das repetições (R-PLN-08); chega à etapa 9 (64 min de corrida/semana) e o resto dos 150 min vem de caminhada e outros esportes.
6. **Saúde (todos os níveis):** 3 corridas por semana, sem qualidade, alvo de 150 min/semana (teto de 300 só depois de 12 semanas, R-PLN-16, ainda não implementado).
7. **Semana de prova:** o índice (−40% no 5 km; −45% a −60% nos demais) é volume de **treino**; o dia da prova é extra. Duas corridas curtas.
8. **5 km avançado:** recuperação nas semanas 4 e 8 e polimento de 1 semana (R-PLN-13).

## Consequências
- Mudar uma curva ou composição exige nova versão do modelo (`PLN-v1`) e reexecutar o seed.
- A persistência do plano agendado (`scheduled_workouts`) e a recomputação semanal a partir do que foi concluído entraram na Fase 5 (ADR 0006): a semana nasce dentro dos tetos sobre o volume concluído e, com menos dias que corridas, o volume das leves é repartido entre as que ficam (`maxRuns`).
- O limite de 300 min/semana com `controle_de_peso` (R-PLN-16) e o corte de 40 min contínuos para o longão do iniciante em plano direto (R-SES-30) não têm gatilho ainda: dependem de dados da Fase 5.
