import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "./api";

// Tipos e consultas do acompanhamento diário. O front só exibe o que a API devolve:
// nenhuma decisão de treino, limite ou classificação é calculada aqui.

export type Localized = { "pt-BR": string; en: string };

export type SessionView = {
  id: string;
  date: string;
  slug: string;
  name: Localized | null;
  kind: string;
  minutes: number;
  maxZone: string;
  targetRpe: number | null;
  optional: boolean;
  note: string | null;
  status: "pending" | "completed" | "skipped" | string;
  log: { completed: boolean; durationMinutes: number | null; distanceKm: number | null; srpe: number | null; notes: string | null } | null;
  allowed?: boolean;
};

export type DayAction = "manter" | "reduzir" | "regenerativo" | "descanso_ou_mobilidade" | "interromper_e_encaminhar";

export type PlanWeekInfo = {
  id: string;
  template: string | null;
  calendarWeek: number;
  templateWeek: number;
  phase: string;
  isRecovery: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  weekStart: string;
  weekEnd: string;
};

export type DayDecision = {
  action: DayAction;
  session: { slug: string | null; minutes: number; maxZone: string | null; changed: boolean };
  blockRunning: boolean;
  refer: boolean;
  urgent: boolean;
  sameDayMedical: boolean;
  needsEvaluation: boolean;
  needsCheckin: boolean;
  message: string;
  reasons: { code: string }[];
};

export type DayResponse = {
  date: string;
  plan: PlanWeekInfo | null;
  sessions: SessionView[];
  checkin: {
    sleepHours: number | null;
    sleepQuality: number | null;
    energy: number | null;
    mood: number | null;
    stress: number | null;
    muscleSoreness: number | null;
    restingHr: number | null;
    acuteIllness: boolean;
    dailyPainWalking: number | null;
  } | null;
  decision: DayDecision;
  todayName: Localized | null;
  questions: string[];
};

export type WeekResponse = { plan: PlanWeekInfo | null; sessions: SessionView[] };

export type HistoryResponse = {
  from: string;
  to: string;
  sleep: { date: string; hours: number | null; quality: number | null }[];
  pain: { date: string; region: string; intensity: number | null; moment: string | null }[];
  weekly: {
    weekStart: string;
    plannedSessions: number;
    completedSessions: number;
    adherencePct: number | null;
    minutes: number;
    srpeLoad: number;
  }[];
};

export const historyKey = (days: number) => ["history", days] as const;

export function useHistory(days: number, enabled = true) {
  return useQuery({
    queryKey: historyKey(days),
    queryFn: () => fetchApi<HistoryResponse>(`/history?days=${days}`),
    enabled,
    retry: false,
  });
}

export const dayKey = (date: string) => ["day", date] as const;
export const weekKey = (date: string) => ["week", date] as const;

export function useDay(date: string, enabled = true) {
  return useQuery({
    queryKey: dayKey(date),
    queryFn: () => fetchApi<DayResponse>(`/day/${date}`),
    enabled,
    retry: false,
  });
}

export function useWeek(date: string, enabled = true) {
  return useQuery({
    queryKey: weekKey(date),
    queryFn: () => fetchApi<WeekResponse>(`/plan/week/${date}`),
    enabled,
    retry: false,
  });
}
