// Regiões do mapa do corpo do registro de dor (R-DOR-15). O motor só compara o texto da região
// (dor recorrente no mesmo local); aqui ficam os ids usados pelo app e a marca de "sítio de alto risco".

export type BodyRegion = {
  /** Id base. Regiões com lado viram `<id>_d` (direita) e `<id>_e` (esquerda). */
  id: string;
  sided: boolean;
  /** Em qual vista do mapa a região aparece. */
  view: "front" | "back" | "both";
  /**
   * Sítio de alto risco para lesão óssea (R-DOR-03, Hoenig 2022; Warden 2014): colo do fêmur/virilha,
   * tíbia anterior, maléolo medial, navicular/dorso do pé, base do 5º metatarso, patela, sacro/púbis e
   * lombar. O mapa é mais grosso que a lista da pesquisa; na dúvida a região conta como de alto risco
   * (decisão conservadora, a mesma da regra). Só tem efeito quando o atleta marca "ponto doloroso no osso".
   */
  highRiskBone: boolean;
};

export const BODY_REGIONS: readonly BodyRegion[] = [
  { id: "lombar_sacro", sided: false, view: "back", highRiskBone: true },
  { id: "quadril_virilha", sided: true, view: "front", highRiskBone: true },
  { id: "gluteo", sided: true, view: "back", highRiskBone: false },
  { id: "coxa_frente", sided: true, view: "front", highRiskBone: false },
  { id: "coxa_atras", sided: true, view: "back", highRiskBone: false },
  { id: "joelho", sided: true, view: "both", highRiskBone: true },
  { id: "canela", sided: true, view: "front", highRiskBone: true },
  { id: "panturrilha", sided: true, view: "back", highRiskBone: false },
  { id: "tendao_aquiles", sided: true, view: "back", highRiskBone: false },
  { id: "tornozelo", sided: true, view: "front", highRiskBone: true },
  { id: "pe_dorso", sided: true, view: "front", highRiskBone: true },
  { id: "pe_lateral", sided: true, view: "front", highRiskBone: true },
  { id: "pe_planta_calcanhar", sided: true, view: "back", highRiskBone: false },
] as const;

/** Região geral: sintomas sem local (peito, calor) e relatos sem mapa. */
export const GENERAL_REGION = "geral";

/** `joelho_d` → `joelho`. */
export const baseRegionId = (region: string) => region.replace(/_(d|e)$/, "");

/** A região do mapa é um sítio de alto risco para lesão óssea (R-DOR-03)? */
export function isHighRiskBoneRegion(region: string): boolean {
  const base = BODY_REGIONS.find((r) => r.id === baseRegionId(region));
  return base?.highRiskBone ?? false;
}
