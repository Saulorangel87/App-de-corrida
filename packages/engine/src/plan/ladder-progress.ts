// Avanço da escada caminhada-corrida (R-PLN-12, R-SES-11, R-PRG-06): a etapa só avança sem dor e
// com as sessões feitas; senão repete, nunca "compensa". Função pura.
import { ESCADA_CAMINHADA_CORRIDA } from "./ladder";

export type LadderAction = "avancar" | "repetir" | "concluida";

export type LadderStep = {
  /** Posição na escada (1 a 13; a etapa 10b é a 11). */
  ordem: number;
  /** Já repetiu esta etapa uma vez (progressão lenta, R-PLN-12). */
  repeatedOnce: boolean;
};

export type LadderResult = LadderStep & {
  action: LadderAction;
  reason: "dor_no_limite" | "sessoes_nao_concluidas" | "progressao_lenta" | "ok" | "ultima_etapa";
};

/**
 * @param sessionsCompleted sessões concluídas na semana (de 3)
 * @param painAtLimit dor ≥ 3/10 durante ou depois, ou aumento ≥ 2 sobre a basal (`limite_dor_progressao`)
 * @param slowMode `cautela_lesao` ou IMC ≥ 30: cada etapa é repetida uma vez antes de avançar
 */
export function nextLadderStep(i: {
  step: LadderStep;
  sessionsCompleted: number;
  painAtLimit: boolean;
  slowMode: boolean;
}): LadderResult {
  const last = ESCADA_CAMINHADA_CORRIDA.length;
  const { ordem, repeatedOnce } = i.step;
  if (i.painAtLimit) return { ordem, repeatedOnce, action: "repetir", reason: "dor_no_limite" };
  // R-PLN-12: repete com 2 sessões não concluídas (R-PRG-06 c: mais de 1 não concluída)
  if (3 - i.sessionsCompleted >= 2) return { ordem, repeatedOnce, action: "repetir", reason: "sessoes_nao_concluidas" };
  if (i.slowMode && !repeatedOnce) return { ordem, repeatedOnce: true, action: "repetir", reason: "progressao_lenta" };
  if (ordem >= last) return { ordem, repeatedOnce: false, action: "concluida", reason: "ultima_etapa" };
  return { ordem: ordem + 1, repeatedOnce: false, action: "avancar", reason: "ok" };
}
