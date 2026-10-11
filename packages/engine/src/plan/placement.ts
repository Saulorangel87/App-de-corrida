// Posicionamento na escada de caminhada e corrida (R-PLN-21, DEC-49): o plano não começa sempre na
// etapa 1; a entrada vem do que o atleta declarou conseguir correr sem parar. Função pura.
import { weeklyCaps } from "../day/progression";
import { ESCADA_CAMINHADA_CORRIDA } from "./ladder";
import { plnV1 } from "./config";
import { materializeWeek } from "./materialize";
import type { PlanTemplate } from "./templates";

export type PlacementReason =
  | "declarado" // entrou pelo maior bloco contínuo declarado, com a folga
  | "teto_de_volume" // o volume semanal da etapa passaria de 120% do que o atleta faz (R-PRG-04)
  | "abaixo_do_minimo" // declarou menos que o mínimo: etapa 1
  | "imc" // IMC ≥ 30: etapa 1 (R-SES-10)
  | "cautela_lesao" // R-CLS-09: etapa 1 (escolha conservadora, [P])
  | "inicio_do_zero"; // R-CLS-08: etapa 1 (declaração incoerente com a história, [P])

export type LadderPlacement = {
  /** Semana do modelo onde o plano começa (1 = início do modelo). */
  startWeek: number;
  /** Etapa da escada dessa semana ("1" a "12", "10b"). */
  etapa: string;
  /** Posição na escada (1 a 13). */
  ordem: number;
  reason: PlacementReason;
};

/** Maior bloco contínuo de corrida da etapa, em minutos (maior `corridaMin` entre as 3 sessões). */
export const longestBlockMinutes = (ordem: number): number =>
  Math.max(...ESCADA_CAMINHADA_CORRIDA[ordem - 1]!.sessoes.map((s) => s.corridaMin));

export type PlacementInput = {
  template: PlanTemplate;
  /** "Por quantos minutos você consegue correr sem parar?" (entrevista). */
  canRunContinuousMinutes: number;
  /** Volume semanal que o atleta faz hoje, em minutos (0 = não informado): limita a entrada (R-PRG-04). */
  baseWeeklyMinutes?: number;
  bmi?: number;
  cautelaLesao?: boolean;
  inicioDoZero?: boolean;
};

/** null quando o modelo não tem escada (nada a posicionar). */
export function ladderPlacement(i: PlacementInput): LadderPlacement | null {
  const cfg = plnV1.placement;
  const ordemOfWeek = (w: number) => {
    const stage = i.template.weeks[w - 1]?.ladderStage;
    return stage ? ESCADA_CAMINHADA_CORRIDA.find((e) => e.etapa === stage)!.ordem : null;
  };
  const ordens = i.template.weeks.map((_, k) => ordemOfWeek(k + 1)).filter((o): o is number => o !== null);
  if (ordens.length === 0) return null;
  const highest = Math.max(...ordens);

  const first = (reason: PlacementReason): LadderPlacement => ({ startWeek: 1, etapa: stageOf(ordemOfWeek(1)!), ordem: ordemOfWeek(1)!, reason });
  if ((i.bmi ?? 0) >= cfg.bmiAlwaysFirst) return first("imc");
  if (i.cautelaLesao) return first("cautela_lesao");
  if (i.inicioDoZero) return first("inicio_do_zero");
  if (i.canRunContinuousMinutes < cfg.minContinuousMinutes) return first("abaixo_do_minimo");

  // Etapa mais avançada cujo maior bloco contínuo cabe no que o atleta declarou, menos a folga.
  let fits = 1;
  for (const e of ESCADA_CAMINHADA_CORRIDA) {
    if (longestBlockMinutes(e.ordem) <= i.canRunContinuousMinutes) fits = e.ordem;
  }
  // A primeira semana do modelo com a etapa (as semanas de recuperação repetem etapas já vistas).
  const weekOf = (ordem: number) => {
    for (let w = 1; w <= i.template.weeks.length; w++) if (ordemOfWeek(w) === ordem) return w;
    return 1;
  };
  let target = Math.min(Math.max(1, fits - cfg.marginStages), highest);
  let reason: PlacementReason = "declarado";

  // R-PRG-04: a semana da etapa não passa de 120% do volume semanal que o atleta já faz (a escada é
  // isenta do teto de 110%, mas não deste). Sem volume informado (0) não há teto, como na escada do zero.
  const base = i.baseWeeklyMinutes ?? 0;
  const cap = base > 0 ? weeklyCaps(base, false).absolute : null;
  if (cap !== null) {
    const weekMinutes = (ordem: number) =>
      materializeWeek({ template: i.template, weekNumber: weekOf(ordem), baseWeeklyMinutes: 0 }).weeklyRunMinutes;
    while (target > 1 && weekMinutes(target) > cap) {
      target -= 1;
      reason = "teto_de_volume";
    }
  }
  return { startWeek: weekOf(target), etapa: stageOf(target), ordem: target, reason };
}

const stageOf = (ordem: number) => ESCADA_CAMINHADA_CORRIDA[ordem - 1]!.etapa;
