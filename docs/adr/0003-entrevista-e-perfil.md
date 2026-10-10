# ADR 0003 — Entrevista, triagem e escolha do plano (Fase 3)

Data: 2026-10-10 · Status: aceito

## Contexto
A seção 6 da especificação pede uma entrevista em etapas, com salvar e continuar depois, que devolve nível, explicação, plano inicial e data de reavaliação. As regras vêm de `docs/pesquisa/01-classificacao.md`, `02-triagem.md` e `10-planos-objetivo.md`.

## Decisão
- **Motor puro** (`packages/engine`): `classify` (CLS-v1), `screen` (TRI-v1) e `selectPlan` (PLN-v1), sem banco nem rede. Limites em `*/config.ts`, com a regra e a fonte em comentário. Mudar um limite exige nova versão.
- **Idade por mês e ano de nascimento** (decisão do dono; minimização de dados). Sem o dia, a idade é calculada nos dois sentidos conservadores: aniversário no fim do mês para o corte de 18 anos e no início do mês para a regra dos 45 anos (R-TRI-07).
- **PAR-Q+ sem alteração:** o texto vem de `docs/parq/parq-plus-pt-br.txt`, transcrito do PDF oficial (a extração automática perde acentos e dígitos). `parq:build` confere os 65 blocos e gera `text.pt-BR.ts` (`PARQ_TEXT_COMPLETE = true` desde 2026-10-10). A transcrição foi lida do PDF e conferida contra o texto bruto dele, palavra por palavra; a numeração impressa vem da estrutura (`structure.ts`) e caixas e linhas de assinatura foram omitidas (o aceite é eletrônico).
- **Respostas da triagem só em `health_screenings`** (SIM/NÃO, versão, datas, estado). No envio, o histórico da entrevista guarda só o id da triagem (R-TRI-15). Nenhum texto livre de condição ou medicamento é salvo.
- **Estado da triagem recalculado na leitura** (validade de 12 ou 6 meses, R-TRI-10), em vez de depender de uma tarefa agendada.
- **Plano só escolhido nesta fase** (decisão do dono): modelo por objetivo e nível, com rebaixamento e prazo; as semanas (`plan_template_weeks`) vêm na Fase 4. Sem triagem liberada ou com dor atual ≥ 3/10, nenhum plano é atribuído.
- **Auditoria:** cada envio grava três linhas em `engine_decisions` (TRI-v1, CLS-v1, PLN-v1); a API só pode inserir e ler nessa tabela.

## Consequências
- O perfil guarda as entradas usadas (`interview_result`), o que permite refazer a escolha do plano depois da autodeclaração de avaliação.
- A pergunta "exercício regular nos últimos 3 meses" serve à classificação (R-CLS-08) e à triagem (R-TRI-07): é feita uma vez só.
