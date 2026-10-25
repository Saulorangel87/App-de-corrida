// Trocar o dia de um treino (pedido do atleta, aprovado pelo dono em 2026-10-25). Nenhuma regra nova:
// a troca só vale se a semana continuar dentro das mesmas regras do agendador (schedule.ts):
// qualidade nunca em dias seguidos (R-DIS-04, R-PLN-09), escada e iniciante nas 8 primeiras semanas
// sem corridas em dias seguidos (R-SES-10, R-PLN-09), força fora do dia de sessão dura e com 48 h
// entre elas (R-SES-70). Função pura: datas ISO (AAAA-MM-DD).
import type { SessionKind } from "../day/types";

export type MovableSession = {
  id: string;
  date: string;
  kind: SessionKind;
  optional: boolean;
  /** Sessão da escada caminhada-corrida. */
  ladder: boolean;
  /** Já tem registro (feito ou não feito). */
  logged: boolean;
};

export type MoveInput = {
  session: MovableSession;
  to: string;
  today: string;
  /** Primeiro dia da semana do plano (janela de 7 dias). */
  weekStart: string;
  /** Sessões dos dias vizinhos também contam: a semana anterior e a seguinte encostam nesta. */
  others: MovableSession[];
  /** Escada ou iniciante nas 8 primeiras semanas (R-PLN-09). */
  noConsecutiveRuns: boolean;
};

export type MoveBlock =
  | "mesmo_dia"
  | "ja_registrado"
  | "dia_passado"
  | "fora_da_semana"
  | "dia_ocupado"
  | "corridas_seguidas"
  | "qualidade_seguida"
  | "forca_com_sessao_dura"
  | "forca_sem_intervalo";

export type MoveResult = { ok: true } | { ok: false; reason: MoveBlock };

const DAY = 86_400_000;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
const isHard = (k: SessionKind) => k === "qualidade" || k === "longao";

export function checkMove(i: MoveInput): MoveResult {
  const s = i.session;
  if (i.to === s.date) return { ok: false, reason: "mesmo_dia" };
  if (s.logged) return { ok: false, reason: "ja_registrado" };
  if (s.date < i.today || i.to < i.today) return { ok: false, reason: "dia_passado" };
  const offset = dayDiff(i.weekStart, i.to);
  if (offset < 0 || offset > 6) return { ok: false, reason: "fora_da_semana" };

  const others = i.others.filter((o) => o.id !== s.id);
  const sameDay = others.filter((o) => o.date === i.to);
  const near = (o: MovableSession) => Math.abs(dayDiff(o.date, i.to)) === 1;

  if (!s.optional) {
    // Uma corrida por dia, como o agendador monta.
    if (sameDay.some((o) => !o.optional)) return { ok: false, reason: "dia_ocupado" };
    const runsNear = others.filter((o) => !o.optional && near(o));
    if ((i.noConsecutiveRuns || s.ladder || runsNear.some((o) => o.ladder)) && runsNear.length > 0)
      return { ok: false, reason: "corridas_seguidas" };
    if (s.kind === "qualidade" && runsNear.some((o) => o.kind === "qualidade")) return { ok: false, reason: "qualidade_seguida" };
    if (isHard(s.kind) && sameDay.some((o) => o.kind === "forca")) return { ok: false, reason: "forca_com_sessao_dura" };
    return { ok: true };
  }

  if (sameDay.some((o) => o.kind === s.kind)) return { ok: false, reason: "dia_ocupado" };
  if (s.kind === "forca") {
    if (sameDay.some((o) => isHard(o.kind))) return { ok: false, reason: "forca_com_sessao_dura" };
    if (others.some((o) => o.kind === "forca" && Math.abs(dayDiff(o.date, i.to)) < 2)) return { ok: false, reason: "forca_sem_intervalo" };
  }
  return { ok: true };
}

/** Dias da semana (de hoje em diante) para onde a sessão pode ir. */
export function moveOptions(i: Omit<MoveInput, "to">): string[] {
  const out: string[] = [];
  for (let k = 0; k < 7; k++) {
    const to = new Date(Date.parse(`${i.weekStart}T00:00:00Z`) + k * DAY).toISOString().slice(0, 10);
    if (checkMove({ ...i, to }).ok) out.push(to);
  }
  return out;
}
