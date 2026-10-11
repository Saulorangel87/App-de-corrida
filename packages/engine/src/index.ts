// Motor de regras: funções puras, sem banco nem rede. Limites em */config.ts,
// cada valor com a referência de docs/pesquisa/.
export * from "./classification/classify";
export * from "./classification/explain";
export { CLS_VERSION, clsV1 } from "./classification/config";
export * from "./screening/screen";
export { TRI_VERSION, triV1 } from "./screening/config";
export * from "./plan/select";
export { PLN_VERSION, plnV1, type Objective } from "./plan/config";
export * from "./day/decide";
export * from "./day/sleep";
export * from "./day/pain";
export * from "./day/progression";
export * from "./day/types";
export { DIA_VERSION, diaV1, CATALOG } from "./day/config";
export * from "./plan/ladder";
export * from "./plan/templates";
export * from "./plan/materialize";
export * from "./plan/ladder-progress";
export * from "./plan/placement";
export * from "./plan/schedule";
export * from "./plan/week";
export * from "./day/derive";
