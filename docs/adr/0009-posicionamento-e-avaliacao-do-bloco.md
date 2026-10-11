# ADR 0009 — Posicionamento na escada e avaliação do bloco

Data: 2026-10-11 · Status: aceito (regras [P] do dono: DEC-49 e DEC-50)

## Contexto
O plano de 5 km do iniciante começava sempre na etapa 1 (1 minuto de corrida), em 13 semanas, mesmo para quem já corre 5 a 7 km. A entrevista perguntava "por quantos minutos você corre sem parar", mas só usava a resposta para liberar 10 km. O dono também pediu que o atleta diga como se sente a cada 2 semanas.

## Decisão
- **Posicionamento (R-PLN-21, `packages/engine/src/plan/placement.ts`):** entrada na etapa mais avançada cujo maior bloco contínuo cabe no que o atleta declarou, menos 1 etapa; menos de 10 min, IMC 30 ou mais, cautela de lesão e início do zero ficam na etapa 1. A semana da etapa nunca passa de 120% do volume semanal declarado (R-PRG-04). `athlete_plans.start_template_week` guarda onde o plano começa; o plano restante é mais curto.
- **Avaliação do bloco (R-PLN-22):** `GET/PUT /plan/review/:date`, nos 3 últimos dias das semanas 2, 4, 6... Respostas: fácil, no ponto, puxado, não consegui. Puxado e não consegui repetem a etapa na escada; fácil não muda o plano (R-PLN-18) e só sugere refazer a avaliação. Nada na avaliação aumenta carga. Tabela `plan_reviews` (RLS).
- **Plano concluído:** `profile.completedPlan` e um cartão no painel levam à entrevista para o próximo objetivo.

## Alternativas
- Pular etapas da escada quando o atleta diz que está fácil: sem evidência e contra R-PLN-18; descartado pelo dono.
- Posicionar só pela declaração, sem o teto de volume: o motor diário cortava as sessões já no primeiro dia (pego pelo teste de coerência "seguir o plano à risca").

## Consequências
- Quem corre 40 min ou mais termina o plano de 5 km em 2 semanas; o próximo objetivo vem pela entrevista.
- Resposta "puxado" dada depois do registro da última sessão da semana refaz a semana seguinte, desde que ela não tenha nenhum registro.
