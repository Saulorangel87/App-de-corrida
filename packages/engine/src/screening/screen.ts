import { TRI_VERSION, triV1 as cfg } from "./config";

export type ScreeningState =
  | "NAO_FEITA"
  | "LIBERADO"
  | "AVALIACAO_NECESSARIA"
  | "LIBERADO_APOS_AVALIACAO"
  | "ADIADO"
  | "EXPIRADO";

/** Saída para o motor. leve_moderada = somente Z1 (R-TRI-06 [P]). */
export type MaxIntensity = "nenhuma" | "leve_moderada" | "livre";

export type GeneralAnswers = Record<1 | 2 | 3 | 4 | 5 | 6 | 7, boolean>;

/**
 * Seguimento por condição (páginas 2 e 3): cada seção tem a pergunta de entrada
 * ("você tem esta condição?") e as perguntas específicas, por id (ex.: "4a").
 */
export type FollowUpSection = { has: boolean; answers: Record<string, boolean> };

/** Autodeclaração de avaliação profissional (R-TRI-05, sem documento). */
export type Evaluation = {
  result: "sem_restricoes" | "com_restricoes" | "encaminhado_ao_medico" | "nao_liberado";
  date: string; // AAAA-MM-DD
  source: "eparmedx" | "medico" | "profissional_educacao_fisica";
  /** Nova declaração datada de que a liberação inclui exercício vigoroso (exceção de R-TRI-06). */
  vigorousAllowedAt?: string;
};

export type ScreeningInput = {
  general: GeneralAnswers;
  /** Obrigatório se alguma geral = SIM. Chave = número da seção (1 a 10). */
  followUp?: Record<string, FollowUpSection>;
  /** Pergunta do app (fora do PAR-Q+), R-TRI-09. */
  pregnant: boolean;
  ageYears: number;
  /** Mesma definição ACSM de R-CLS-08: ≥ 30 min moderado, ≥ 3 dias/sem, nos últimos 3 meses. */
  regularExercise3m: boolean;
  /** Registro de consulta a profissional de educação física (desbloqueia R-TRI-07). */
  consultedProfessionalAt?: string;
  completedAt: string; // AAAA-MM-DD
  evaluation?: Evaluation;
  /** "Algo mudou na sua saúde?" = SIM depois do preenchimento (R-TRI-11). */
  healthChangedAt?: string;
  now: string; // AAAA-MM-DD
};

export type ScreeningReason =
  | "sintoma_geral" // R-TRI-04
  | "seguimento_sim" // R-TRI-05
  | "gravidez" // R-TRI-09
  | "avaliacao_com_restricoes" // R-TRI-05 / P3
  | "avaliacao_sem_restricoes" // R-TRI-06
  | "45_sem_exercicio_regular" // R-TRI-07
  | "validade_vencida" // R-TRI-10
  | "saude_mudou"; // R-TRI-11

export type ScreeningResult = {
  state: ScreeningState;
  maxIntensity: MaxIntensity;
  reasons: ScreeningReason[];
  /** Data até a qual a liberação vale (AAAA-MM-DD), quando liberado. */
  validUntil: string | null;
  expiresSoon: boolean;
  ruleVersion: typeof TRI_VERSION;
};

export class IncompleteScreeningError extends Error {}

const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

const result = (
  state: ScreeningState,
  maxIntensity: MaxIntensity,
  reasons: ScreeningReason[],
  validUntil: string | null = null,
  now?: string,
): ScreeningResult => ({
  state,
  maxIntensity,
  reasons,
  validUntil,
  expiresSoon: validUntil !== null && now !== undefined && daysBetween(now, validUntil) <= cfg.validity.warnDaysBefore,
  ruleVersion: TRI_VERSION,
});

/** Deriva o estado da triagem (docs/pesquisa/02-triagem.md, R-TRI-01 a R-TRI-11). */
export function screen(input: ScreeningInput): ScreeningResult {
  const generalYes = (Object.entries(input.general) as [string, boolean][]).filter(([, v]) => v).map(([k]) => Number(k));

  // R-TRI-11: mudança de saúde depois do preenchimento invalida.
  if (input.healthChangedAt && input.healthChangedAt >= input.completedAt) {
    return result("EXPIRADO", "nenhuma", ["saude_mudou"]);
  }

  // R-TRI-09: gravidez → adiado até orientação profissional.
  if (input.pregnant) return result("ADIADO", "nenhuma", ["gravidez"]);

  // Respostas do questionário (R-TRI-03 a R-TRI-05).
  const reasons: ScreeningReason[] = [];
  if (generalYes.some((q) => (cfg.alwaysBlockGeneral as readonly number[]).includes(q))) reasons.push("sintoma_geral");
  if (generalYes.length > 0) {
    if (!input.followUp) throw new IncompleteScreeningError("seguimento obrigatório quando há SIM nas perguntas gerais");
    const anyFollowUpYes = Object.values(input.followUp).some((s) => s.has && Object.values(s.answers).some(Boolean));
    if (anyFollowUpYes) reasons.push("seguimento_sim");
  }

  if (reasons.length === 0) {
    // LIBERADO, 12 meses (R-TRI-10).
    const validUntil = addMonths(input.completedAt, cfg.validity.clearedMonths);
    if (input.now > validUntil) return result("EXPIRADO", "nenhuma", ["validade_vencida"]);
    // R-TRI-07: 45+ sem exercício regular, até registrar consulta a profissional.
    if (input.ageYears >= cfg.ageRegularExerciseCheck && !input.regularExercise3m && !input.consultedProfessionalAt) {
      return result("LIBERADO", "leve_moderada", ["45_sem_exercicio_regular"], validUntil, input.now);
    }
    return result("LIBERADO", "livre", [], validUntil, input.now);
  }

  // AVALIACAO_NECESSARIA, até autodeclaração "sem restrições" (R-TRI-05).
  const ev = input.evaluation;
  if (!ev || ev.date < input.completedAt) return result("AVALIACAO_NECESSARIA", "nenhuma", reasons);
  if (ev.result !== "sem_restricoes") {
    // P3 [P]: o app não consegue respeitar restrições individuais; continua bloqueado.
    return result("AVALIACAO_NECESSARIA", "nenhuma", [...reasons, "avaliacao_com_restricoes"]);
  }
  const validUntil = addMonths(ev.date, cfg.validity.clearedAfterEvaluationMonths);
  if (input.now > validUntil) return result("EXPIRADO", "nenhuma", ["validade_vencida"]);
  // R-TRI-06: leve/moderada (só Z1) durante a validade, salvo nova declaração de vigoroso.
  const vigorous = ev.vigorousAllowedAt !== undefined && ev.vigorousAllowedAt >= ev.date;
  return result(
    "LIBERADO_APOS_AVALIACAO",
    vigorous ? "livre" : "leve_moderada",
    vigorous ? [] : ["avaliacao_sem_restricoes"],
    validUntil,
    input.now,
  );
}

/** Só estes estados permitem gerar treino (R-TRI-01). */
export const allowsTraining = (r: ScreeningResult) =>
  r.state === "LIBERADO" || r.state === "LIBERADO_APOS_AVALIACAO";
