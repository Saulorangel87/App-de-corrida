# Pesquisa científica da Fase 0

Esta pasta é a fonte da verdade para treinos, limites e classificação do Passo. Nenhum treino, limite ou critério do app pode ser inventado: tudo vem daqui, com referência aberta e conferida. Onde não há evidência, o texto diz **"sem evidência suficiente"** e a decisão fica como pergunta ao dono do projeto.

## Índice

| Arquivo | Conteúdo | Prefixo das regras |
|---|---|---|
| `01-classificacao.md` | Classificação em iniciante, intermediário e avançado (algoritmo `CLS-v1`) | R-CLS |
| `02-triagem.md` | Triagem pré-participação (PAR-Q+ e algoritmo ACSM) | R-TRI |
| `03-distribuicao-intensidade.md` | Distribuição de intensidade (polarizado, piramidal, limiar) | R-DIS |
| `04-controle-intensidade.md` | Controle de intensidade: modelo de 3 zonas, RPE, FC, teste da fala, pace | R-INT |
| `05-progressao-carga.md` | Progressão de carga, regra dos 10%, ACWR, deload, retorno após pausa | R-PRG |
| `06-carga-interna.md` | Session-RPE, monotonia e strain | R-CRG |
| `07-tipos-sessao.md` | Catálogo de sessões (caminhada-corrida, rodagem, longão, limiar, intervalado, fartlek, subidas, força, mobilidade) | R-SES |
| `08-sono-recuperacao.md` | Sono, bem-estar e recuperação (check-in) | R-SON |
| `09-dor.md` | Dor durante o treino, sinais de alerta, DOMS | R-DOR |
| `10-planos-objetivo.md` | Planos por objetivo (5 km, 10 km, 21 km, 42 km, saúde, emagrecimento) | R-PLN |
| `referencias.md` | Lista única e deduplicada de todas as referências (ordem alfabética) | — |
| `tabela-evidencias.md` | Afirmações que viram regra, por tema, com a coluna "Regra (ID)" | — |
| `pontos-fracos.md` | Evidência fraca ou conflitante e decisões de projeto, por tema | — |

Cada arquivo temático segue o mesmo formato: Resumo, Achados, Regras propostas para o app, Evidência fraca ou conflitante, Perguntas para o dono do projeto, Tabela de evidências e Referências.

## Escala de nível de evidência

Hierarquia Oxford CEBM simplificada, usada na coluna "Nível" de todas as tabelas:

| Nível | Tipo de fonte |
|---|---|
| 1 | Revisão sistemática ou meta-análise |
| 2 | Ensaio clínico randomizado |
| 3 | Coorte, caso-controle ou estudo observacional |
| 4 | Consenso ou posicionamento oficial (ACSM, OMS, BJSM, diretrizes, instrumentos oficiais) |
| 5 | Opinião de especialista, livro ou revisão narrativa |

"Sem evidência suficiente" (nível "—") marca lacunas. Quando uma afirmação combina fontes de níveis diferentes, a tabela mostra os níveis na ordem das fontes.

## Convenção dos IDs de regra

Formato `R-XXX-NN`: `XXX` é o tema (tabela acima) e `NN` é o número sequencial dentro do tema, com dois dígitos. Em `07-tipos-sessao.md` a numeração tem saltos por grupo de sessão (01-08 gerais, 10-12 caminhada-corrida, 20-22 rodagem e regenerativo, 30-32 longão, 40-42 limiar, 50-56 intervalado, 60-61 fartlek, 65-66 subidas, 70-72 força, 80-81 mobilidade). Os IDs são estáveis: o motor, os testes e o catálogo do banco devem referenciá-los. Mudar um valor exige nova versão da regra e novo teste.

Marcadores usados dentro das regras:

- `[E]` / `[EVID]`: o valor vem direto de estudo verificado.
- `[MISTA]`: a direção vem de evidência, mas o número exato é escolha de projeto.
- `[P]`, `[DECISÃO]`, `(D)`, `[convenção]` ou "decisão de projeto": convenção conservadora sem evidência direta. Precisa de aprovação do dono do projeto.
- "sem evidência suficiente": lacuna declarada; vira pergunta ao dono do projeto.

Chaves de citação seguem `[Sobrenome Ano]`. Obras diferentes do mesmo primeiro autor e ano recebem sufixo (`Kluitenberg 2015a`/`2015b`, `Nielsen 2014a`/`b`/`c`, `Watson 2015a`/`b`, `Mujika 2000a`/`b`, `Billat 2001a`/`b`, `Impellizzeri 2020a`/`b`). A chave identifica a mesma obra em todos os arquivos.

## Verificação das fontes

Coluna "Verificação" nas referências:

- **texto completo**: o texto foi lido (acesso aberto, PMC ou página da entidade).
- **resumo**: título, autores, ano, periódico e DOI foram confirmados em registro oficial (Europe PMC, PubMed, Crossref ou página do periódico) e o resumo foi lido; o artigo completo não. Marcado como "verificado pelo resumo". Números que viram regra devem, sempre que possível, ter vindo de texto completo.

Todos os DOIs e títulos foram conferidos automaticamente contra Europe PMC e Crossref e as divergências foram revisadas à mão. Diferenças entre ano online e ano da edição aparecem como "(online AAAA)" na coluna Ano.

## Regras que contradizem a especificação

Os arquivos propõem correções à seção 3 da especificação onde a evidência não sustenta o texto atual (por exemplo, "regra dos 10%" e razão aguda:crônica, histórico de lesões como critério de nível, "liberação médica" como saída padrão do PAR-Q+). Cada correção está descrita no arquivo do tema e listada nas perguntas ao dono do projeto. Nenhuma foi aplicada à especificação.
