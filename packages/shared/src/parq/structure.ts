// Estrutura do PAR-Q+ (7 perguntas gerais e 10 seções de seguimento), igual ao
// formulário oficial. O texto em si fica em text.pt-BR.ts, gerado a partir de
// docs/parq/parq-plus-pt-br.txt (copiado do PDF oficial, sem alteração; R-TRI-02).

export const PARQ_INSTRUMENT = {
  name: "PAR-Q+",
  version: "pt-BR 2023",
  officialPdf: "https://eparmedx.com/wp-content/uploads/2023/07/Brazilian-Portuguese.pdf",
  attribution:
    "PAR-Q+ © PAR-Q+ Collaboration; tradução de Bianca Bold e Juliano Schwartz; Schwartz et al., 2021; eparmedx.com",
} as const;

export const PARQ_GENERAL = [1, 2, 3, 4, 5, 6, 7] as const;

/** Seção de seguimento → ids das perguntas específicas. */
export const PARQ_FOLLOW_UP = {
  "1": ["1a", "1b", "1c"],
  "2": ["2a", "2b"],
  "3": ["3a", "3b", "3c", "3d"],
  "4": ["4a", "4b"],
  "5": ["5a", "5b", "5c", "5d", "5e"],
  "6": ["6a", "6b"],
  "7": ["7a", "7b", "7c", "7d"],
  "8": ["8a", "8b", "8c"],
  "9": ["9a", "9b", "9c"],
  "10": ["10a", "10b", "10c"],
} as const;

export type ParqSection = keyof typeof PARQ_FOLLOW_UP;

/** Todos os blocos de texto que o arquivo do dono precisa ter. */
export const PARQ_TEXT_KEYS = [
  "pagina1.titulo",
  "pagina1.introducao",
  "pagina1.cabecalho_perguntas",
  ...PARQ_GENERAL.map((q) => `geral.${q}`),
  "pagina1.se_todas_nao",
  "pagina1.se_algum_sim",
  "pagina1.adiar",
  "pagina1.declaracao",
  "seguimento.cabecalho",
  ...Object.entries(PARQ_FOLLOW_UP).flatMap(([s, subs]) => [`seguimento.${s}`, ...subs.map((id) => `seguimento.${id}`)]),
  "seguimento.rodape",
  "pagina4.cabecalho",
  "pagina4.todas_nao",
  "pagina4.algum_sim",
  "pagina4.adiar",
  "pagina4.mudanca_saude",
  "pagina4.avisos",
  "pagina4.declaracao",
  "atribuicao",
] as const;
