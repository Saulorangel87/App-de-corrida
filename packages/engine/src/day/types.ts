import type { LevelName } from "../classification/classify";
import type { MaxIntensity, ScreeningState } from "../screening/screen";

export type Zone = "Z1" | "Z2" | "Z3";
export type SessionKind =
  | "qualidade"
  | "rodagem"
  | "longao"
  | "regenerativo"
  | "caminhada-corrida"
  | "forca"
  | "mobilidade";

/** Sessão planejada para o dia (vem do catálogo e do modelo do plano). */
export type PlannedSession = {
  slug: string;
  kind: SessionKind;
  minutes: number;
  maxZone: Zone;
  /** RPE-alvo CR-10 do catálogo (R-CRG-07). */
  targetRpe?: number;
};

/** Check-in do dia. As notas usam "5 = melhor" (convenção de R-SON). */
export type Checkin = {
  date: string; // AAAA-MM-DD
  sleepHours?: number;
  sleepQuality?: number; // 1–5
  energy?: number;
  mood?: number;
  stress?: number; // 5 = tranquilo
  muscleSoreness?: number; // 5 = sem dor muscular
  acuteIllness?: boolean;
  /** Tipo da sessão planejada nesse dia, quando conhecido (R-SON-06, S1). */
  plannedKind?: SessionKind;
};

export type CardioSigns = {
  chestPain?: boolean;
  disproportionateBreathlessness?: boolean;
  dizzyLosingBalance?: boolean;
  fainting?: boolean;
  palpitations?: boolean;
};

/** Relato de dor ou sintomas (R-DOR-15). */
export type PainReport = {
  date: string;
  moment: "treino" | "manha_seguinte" | "checkin";
  region?: string;
  intensity: number; // 0–10
  type?: "pontada" | "difusa" | "outra";
  suddenOnset?: boolean;
  changedStride?: boolean;
  worsensEachStrideOrNoWarmup?: boolean;
  bonePoint?: boolean;
  painWalking?: boolean;
  restOrNightPain?: boolean;
  persistentDaysSameSite?: number;
  highRiskBoneSite?: boolean;
  jointSwelling?: boolean;
  lockingOrGivingWay?: boolean;
  tinglingOrNumbness?: boolean;
  suddenWeaknessOrFootDrop?: boolean;
  darkUrineWithMuscleSwelling?: boolean;
  analgesicBeforeTraining?: boolean;
  /** Dor ao acordar no mesmo local (0–10), no dia seguinte a treino com dor (R-DOR-06). */
  morningSameSite?: number;
  /** Basal do local, quando conhecida (média dos 7 dias sem corrida; 0 se não havia). */
  baseline?: number;
  stiffnessLongerThanWarmup?: boolean;
  cardio?: CardioSigns;
  heat?: { confusionOrCollapse?: boolean; headacheNauseaInHeat?: boolean };
  doms?: {
    muscleOnly: boolean;
    diffuseBilateralOrLargeGroup: boolean;
    startedHoursAfter: number;
    noLocalSwelling: boolean;
    noStrideChange: boolean;
  };
};

export type WorkoutLog = {
  date: string;
  completed: boolean;
  minutes: number; // duração concluída (0 se não concluída)
  targetRpe?: number;
  reportedRpe?: number; // CR-10
  /** Sessão isenta do teto de 110% (escada caminhada-corrida e contínuas da etapa 12, R-PRG-02). */
  exempt?: boolean;
};

export type DayInput = {
  today: string;
  level: LevelName;
  flags: ("inicio_do_zero" | "retorno_de_pausa" | "cautela_lesao")[];
  screening: { state: ScreeningState; maxIntensity: MaxIntensity };
  /** Sessão planejada para hoje; null = dia sem treino no plano. */
  planned: PlannedSession | null;
  checkins: Checkin[];
  pain: PainReport[];
  logs: WorkoutLog[];
  /** Dias desde a última corrida concluída (R-PRG-08). */
  daysSinceLastRun: number;
  /** Motivo da pausa, se foi dor, lesão ou doença (R-PRG-09). */
  pauseCause?: "dor" | "lesao" | "doenca" | null;
  /** Data da autodeclaração "avaliado por profissional e liberado" (R-PRG-09, R-DOR-10). */
  clearedByProfessionalAt?: string | null;
  /** Volume (min) da última semana de construção concluída (R-PRG-03). */
  lastBuildWeekMinutes: number;
  /** A semana do plano está no teto semanal (carga alta, R-SON-08)? */
  highLoadWeek: boolean;
  /** Semana de recuperação do plano (R-PRG-07)? */
  isRecoveryWeek?: boolean;
  /** Sessão da escada caminhada-corrida (isenta dos tetos de 110%, R-PRG-02/03). */
  inLadder?: boolean;
  /**
   * Primeiro dia da semana do plano (janela de 7 dias). O teto semanal conta o que foi concluído
   * a partir daqui; sem isto, vale a janela móvel dos últimos 7 dias.
   */
  weekStartedOn?: string;
  /** Dor ao caminhar no dia a dia, 0–10, do último check-in (R-DOR-10). */
  dailyPainWalking?: number | null;
  /** Data do check-in de `dailyPainWalking`; só vale para dor relatada antes dela (R-DOR-10). */
  dailyPainWalkingOn?: string | null;
  /** Data da primeira corrida depois de uma pausa de 15 dias ou mais (sem Z3 por 2 semanas). */
  pauseReturnStartedOn?: string | null;
  /** O atleta pediu um dia mais leve hoje, sem sintoma ("não estou 100%", R-PRG-13). */
  lighterRequested?: boolean;
  /** Hoje está dentro de uma pausa planejada (R-PRG-14): sem treino; `planned` vem nulo. */
  inPlannedPause?: boolean;
};

export type Rank = 0 | 1 | 2 | 3;

export type DayAction =
  | "manter"
  | "reduzir"
  | "regenerativo"
  | "descanso_ou_mobilidade"
  | "interromper_e_encaminhar";

export type DayReason = {
  rule: string; // ex.: "R-SON-06"
  code: string; // estável, para o front traduzir
  detail?: string;
  sources: string[];
};
