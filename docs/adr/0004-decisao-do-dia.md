# ADR 0004 — Decisão do dia (Fase 4a)

Data: 2026-10-10 · Status: aceito (fase aprovada pelo dono em 2026-10-10; os 8 itens abaixo seguem como padrão e podem ser revistos)

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
4. **Semana = 7 dias corridos** para sessões perdidas e corrida acima do teto. O volume já feito conta dentro da **semana do plano** (`weekStartedOn`, ADR 0006); sem ela, vale a janela móvel dos últimos 7 dias.
5. **Cortar Z3 (R-DIS-06):** troca a sessão por `rodagem-leve`; a pesquisa não define um degrau intermediário.
6. **Regenerativo** com 15 a 30 min (limitado ao planejado) e **mobilidade** com 15 min (ponto médio de 10–20).
7. **"Pontada que persiste" (R-DOR-05):** dor ≥ 3 em 2 dias distintos na mesma região.
8. **Dor ao caminhar para liberar a corrida (R-DOR-10):** a pesquisa diz "≤ 1–2/10"; o motor usa **2**. Usar 1 seria mais conservador.

Observação de verificação: um agente conferiu os 66 valores numéricos de `config.ts` contra os arquivos 05, 08 e 09 da pesquisa e não achou divergência.

## Consequências
- O check-in da Fase 5 pergunta "dor ao caminhar" (0–10) quando há bloqueio por dor e a autodeclaração profissional leva data (ADR 0006).
- A escada define a própria semana de recuperação (75% das repetições, R-PLN-08): o teto semanal de recuperação (R-PRG-07) não corta sessão de escada.
- As mensagens estão em português; a versão em inglês entra com o front (os códigos de motivo já são estáveis).
- A decisão depende das semanas dos planos (4b, agendadas na Fase 5) para existir "treino de hoje" em produção.
