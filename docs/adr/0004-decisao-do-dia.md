# ADR 0004 — Decisão do dia (Fase 4a)

Data: 2026-10-10 · Status: aceito (4a); a parte 4b (semanas dos planos) ainda não existe

## Contexto
A seção 7 da especificação pede funções puras que recebam perfil, plano, histórico, check-ins e relatos de dor e devolvam a decisão do dia, só com sessões do catálogo, com limites versionados, texto e fontes em toda saída.

## Decisão
- **`decideDay(DayInput)`** em `packages/engine/src/day/`, sem banco nem rede. Módulos: `sleep.ts` (R-SON), `pain.ts` (R-DOR), `progression.ts` (R-PRG, R-CRG-07), `decide.ts` (precedência). Todos os limites em `config.ts` (`DIA-v1`), cada um com a regra e a fonte.
- **Precedência (R-PRG-11):** triagem e sinais de alerta > dor > sono e bem-estar. A decisão é a mais restritiva, **sem somar percentuais**: uma única redução de 20% (`reducao_reativa_volume`). Tetos de progressão só impedem aumento.
- **Cinco ações:** manter, reduzir, regenerativo, descanso ou mobilidade, interromper e encaminhar. O motor devolve também `blockRunning`, `refer`, `urgent` (SAMU 192) e `needsEvaluation` (R-TRI-12).
- **Só catálogo:** reduz para `rodagem-leve`, `regenerativo`, `mobilidade` ou mantém o slug com menos minutos. Nunca cria estrutura nova nem aumenta o planejado.
- **Sem ACWR** (R-PRG-01): nada usa razão aguda:crônica.
- **Estado é reproduzido, não guardado:** os níveis de sono, a saída do alerta em 2 dias e o teto de S3 vêm de reprocessar os check-ins em ordem. O motor não precisa de tabela de estado.
- **Bloqueios de dor** saem com a dor ao caminhar ≤ 2/10 (R-DOR-10) ou, quando a regra exige (alerta cardíaco, osso, dor persistente), com a autodeclaração profissional datada.

## Escolhas do projeto que a pesquisa não fixa (a confirmar com o dono)
1. **"Fase inicial do nível" (R-PRG-08/09):** 40, 60 e 120 min por semana e sessões de 20, 30 e 40 min (iniciante, intermediário, avançado), tirados do mínimo da rodagem leve (R-SES-20).
2. **Sem check-in hoje (R-SON-13):** mantém o último nível por até 3 dias; depois, L0 e pede o check-in.
3. **Persistência de bem-estar (R-SON-07):** sobe um nível mesmo que hoje esteja verde.
4. **Semana = 7 dias corridos** para sessões perdidas, volume já feito e corrida acima do teto.
5. **Cortar Z3 (R-DIS-06):** troca a sessão por `rodagem-leve`; a pesquisa não define um degrau intermediário.
6. **Regenerativo** com 15 a 30 min (limitado ao planejado) e **mobilidade** com 15 min (ponto médio de 10–20).
7. **"Pontada que persiste" (R-DOR-05):** dor ≥ 3 em 2 dias distintos na mesma região.

## Consequências
- O check-in da Fase 5 precisa perguntar "dor ao caminhar" (0–10) e registrar a data da autodeclaração; sem isso, bloqueios por dor não se encerram.
- As mensagens estão em português; a versão em inglês entra com o front (os códigos de motivo já são estáveis).
- A decisão depende das semanas dos planos (4b) para existir "treino de hoje" em produção.
