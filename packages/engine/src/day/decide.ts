// Decisão do dia (R-PRG-11): precedência entre triagem, dor, sono e tetos de progressão.
// Função pura: o motor nunca cria um treino; só escolhe e reduz sessões do catálogo.
import { CATALOG, DIA_VERSION, diaV1 as cfg } from "./config";
import { evaluatePain, type PainFinding } from "./pain";
import {
  freezeReasons,
  longestSessionLast30,
  recoveryWeekMinutes,
  returnFromPause,
  sessionCapMinutes,
  weeklyCaps,
  type FreezeReason,
  type ReturnBand,
} from "./progression";
import { evaluateWellbeing, type WellbeingResult } from "./sleep";
import type { DayAction, DayInput, DayReason, PlannedSession, Zone } from "./types";

export type DayDecision = {
  date: string;
  action: DayAction;
  planned: PlannedSession | null;
  /** O que fazer hoje, sempre do catálogo (slug null = descanso). */
  session: { slug: string | null; minutes: number; maxZone: Zone | null; changed: boolean };
  blockRunning: boolean;
  refer: boolean;
  /** Parar e buscar atendimento imediato (SAMU 192). */
  urgent: boolean;
  sameDayMedical: boolean;
  /** A triagem passa a AVALIACAO_NECESSARIA (R-TRI-12). */
  needsEvaluation: boolean;
  freezeProgression: boolean;
  freezeReasons: FreezeReason[];
  noZ3: boolean;
  returnBand: ReturnBand;
  caps: { sessionMinutes: number | null; weeklyMinutes: number | null; absoluteWeeklyMinutes: number | null };
  needsCheckin: boolean;
  persistentSleepIssue: boolean;
  /** Texto curto para o atleta, sem códigos nem colchetes; as fontes ficam em `sources`. */
  message: string;
  /** Tudo que contribuiu, na ordem de precedência (auditoria em engine_decisions). */
  reasons: DayReason[];
  sources: string[];
  levels: { sleep: number; wellbeing: number; load: number; painReduce: boolean; painBlock: boolean };
  ruleVersion: typeof DIA_VERSION;
};

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);
const age = (d: string, today: string) => Math.round((parse(today) - parse(d)) / DAY_MS);
const floor5 = (n: number) => Math.floor(n / 5) * 5;
const hoursText = (h: number) => String(h).replace(".", ",");
const unique = (xs: string[]) => [...new Set(xs)];

/** Frase do limite que reduziu o treino de hoje, em linguagem simples (R-PRG-02 a R-PRG-08, R-SES-07/08). */
function capSentence(r: DayReason): string | null {
  const minutes = (r.detail ?? "").replace(" na semana", "");
  switch (r.code) {
    case "teto_da_sessao":
      return r.rule === "R-PRG-08"
        ? `Hoje o treino ficou em ${minutes}: depois de uma pausa, o app limita a duração de cada corrida e aumenta aos poucos.`
        : `Hoje o treino ficou em ${minutes}: nenhuma corrida deve passar de 110% da sua maior corrida dos últimos 30 dias.`;
    case "teto_semanal":
      return r.rule === "R-PRG-07"
        ? "Esta é uma semana de recuperação: o volume cai para 75% da última semana de construção e o treino forte vira leve."
        : `Esta semana o volume está limitado a ${minutes}: o app só deixa o volume crescer até 110% da última semana de construção (regra de cautela do app).`;
    case "semana_de_recuperacao":
      return "Esta é uma semana de recuperação: o volume cai para 75% da última semana de construção e o treino forte vira leve.";
    case "sem_z3_apos_pausa":
      return "Nas duas primeiras semanas depois de uma pausa, o app não inclui esforço forte (Z3).";
    case "somente_z1":
      return "Hoje o treino fica só em esforço leve (Z1), por causa da sua triagem de saúde ou da sua dor.";
    case "retomada_gradual":
      return "Depois de uma pausa longa, a volta é gradual: começamos por um treino mais leve.";
    default:
      return null;
  }
}

const FREEZE_TEXT: Record<FreezeReason, string> = {
  dor_limite: "você teve dor de 3 ou mais durante ou depois do treino, ou um aumento de 2 pontos na manhã seguinte",
  sono_s1_na_semana: "houve noites de sono ruins nesta semana",
  sessoes_nao_concluidas: "mais de uma sessão não foi concluída",
  corrida_acima_do_teto: "você correu acima do limite de uma corrida",
  rpe_acima_do_alvo: "o esforço relatado ficou acima do alvo em 2 de 3 sessões",
};
const joinAnd = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

type Rank = 0 | 1 | 2 | 3 | 4;
type Gate = { rank: Rank; text: string; sources: string[]; reasons: DayReason[] };

const ACTION_BY_RANK: Record<Rank, DayAction> = {
  0: "manter",
  1: "reduzir",
  2: "regenerativo",
  3: "descanso_ou_mobilidade",
  4: "interromper_e_encaminhar",
};

const SAMU = "em emergência, ligue 192 (SAMU)";

function sleepGate(w: WellbeingResult, todayKind: string | undefined, todayHours: number | undefined): Gate | null {
  if (w.level === 0) return null;
  const reasons = w.reasons.filter((r) => r.rule !== "R-SON-12");
  const sources = reasons.flatMap((r) => r.sources);
  const rank = w.level as Rank;
  const qualityDay = todayKind === "qualidade" || todayKind === "longao";
  const effect = rank === 1 ? "reduzimos a intensidade e o volume de hoje" : rank === 2 ? "hoje o treino é regenerativo" : "hoje é dia de descanso ou mobilidade leve";
  let cause: string;
  if (w.carried) cause = "Você ainda está em um período de recuperação do sono e do bem-estar e não fez o check-in de hoje.";
  else if (w.s >= 2 && w.night) cause = "Houve várias noites ruins seguidas ou nesta semana. O cansaço por falta de sono se acumula e muitas vezes não é percebido.";
  else if (w.s === 1 && w.night === "muito_ruim" && qualityDay && todayHours !== undefined)
    cause = `Você dormiu ${hoursText(todayHours)} h. Uma noite curta não costuma exigir mudança, mas hoje o treino é puxado.`;
  else if (w.s === 1) cause = "Duas das últimas três noites foram ruins.";
  else if (w.delta !== null && w.delta <= cfg.wellbeing.deviationYellow)
    cause = `A soma das suas respostas de bem-estar (qualidade do sono, energia, humor, estresse e dor muscular) está ${Math.abs(w.delta)} pontos abaixo da sua média dos últimos 14 dias.`;
  else cause = "Seu check-in de bem-estar de hoje ficou abaixo do esperado.";
  return { rank, text: `${cause} Por isso, ${effect}.`, sources, reasons };
}

function painGate(p: ReturnType<typeof evaluatePain>): Gate | null {
  if (!p.urgent && !p.blockRunning && !p.refer && !p.reduce) return null;
  const reasons: DayReason[] = p.findings.map((f: PainFinding) => ({
    rule: f.rule, code: f.code, detail: f.detail, sources: f.sources,
  }));
  const sources = reasons.flatMap((r) => r.sources);
  if (p.urgent)
    return {
      rank: 4,
      text: `Pare agora. Dor no peito, falta de ar fora do normal, tontura forte, desmaio ou confusão exigem avaliação médica. Procure atendimento imediatamente; ${SAMU}. O Let's Go Run não faz diagnóstico.`,
      sources, reasons,
    };
  if (p.blockRunning && p.refer)
    return {
      rank: 4,
      text: `Seus sintomas têm características que precisam de avaliação profissional antes de você voltar a correr. Não podemos dizer o que é; só um profissional pode examinar. Treinos de corrida estão pausados.${p.sameDayMedical ? " Procure atendimento médico ainda hoje." : ""}`,
      sources, reasons,
    };
  if (p.blockRunning)
    return {
      rank: 3,
      text: "Sua dor passou do limite de segurança. Hoje não corra: caminhe ou escolha uma atividade sem dor (bicicleta, água). A corrida volta quando a dor ao caminhar ficar em 2/10 ou menos.",
      sources, reasons,
    };
  if (p.refer)
    return {
      rank: 1,
      text: "Essa dor já vem limitando seus treinos; vale uma avaliação de fisioterapeuta ou médico do esporte. Por ora, o treino de hoje ficou mais leve.",
      sources, reasons,
    };
  const doms = p.findings.every((f) => f.code === "doms");
  return {
    rank: 1,
    text: doms
      ? "Dor muscular dos dois lados, que apareceu depois de um treino mais forte, costuma ser dor muscular tardia e melhora em até uma semana. Mantenha leve; se for num ponto só, piorar ou passar de 7 dias, procure um profissional."
      : "Sua dor ficou acima do que consideramos seguro para treinar forte. Por isso o treino de hoje ficou mais leve. Se a dor continuar ou piorar, procure um fisioterapeuta ou médico do esporte.",
    sources, reasons,
  };
}

/** Decisão do dia a partir do plano, dos check-ins, das dores e do histórico concluído. */
export function decideDay(i: DayInput): DayDecision {
  const planned = i.planned;
  const cautela = i.flags.includes("cautela_lesao");
  const todayCheckin = i.checkins.find((c) => c.date === i.today);

  const wellbeing = evaluateWellbeing({
    checkins: i.checkins, today: i.today, todayKind: planned?.kind, highLoadWeek: i.highLoadWeek,
  });
  const pain = evaluatePain({
    today: i.today, reports: i.pain, dailyPainWalking: i.dailyPainWalking, clearedAt: i.clearedByProfessionalAt,
  });
  const longest30 = longestSessionLast30(i.logs, i.today);
  const ret = returnFromPause({
    level: i.level, daysSinceLastRun: i.daysSinceLastRun, lastBuildWeekMinutes: i.lastBuildWeekMinutes, longest30,
    pauseCause: i.pauseCause, clearedByProfessionalAt: i.clearedByProfessionalAt,
    pauseReturnStartedOn: i.pauseReturnStartedOn, today: i.today,
  });

  // ---- 1) triagem e sinais de alerta (R-TRI-01/09/11/12) ----
  const gates: Gate[] = [];
  const sc = i.screening.state;
  if (sc === "AVALIACAO_NECESSARIA")
    gates.push({
      rank: 4, text: "Antes de começar, procure mais orientação. Registre aqui quando um profissional avaliar e liberar você.",
      sources: ["PARQ+ 2025", "Riebe 2015"], reasons: [{ rule: "R-TRI-05", code: "triagem_avaliacao_necessaria", sources: ["PARQ+ 2025"] }],
    });
  else if (sc === "EXPIRADO")
    gates.push({
      rank: 3, text: "Sua triagem de saúde venceu ou sua saúde mudou. Refaça o questionário PAR-Q+ para voltar a treinar.",
      sources: ["PARQ+ 2025"], reasons: [{ rule: "R-TRI-10", code: "triagem_expirada", sources: ["PARQ+ 2025"] }],
    });
  else if (sc === "ADIADO")
    gates.push({
      rank: 3, text: "Hoje não tem treino: o início fica adiado (doença aguda ou gravidez). Volte quando estiver bem ou com orientação profissional.",
      sources: ["PARQ+ 2025"], reasons: [{ rule: "R-TRI-09", code: "triagem_adiada", sources: ["PARQ+ 2025"] }],
    });
  else if (sc === "NAO_FEITA")
    gates.push({
      rank: 3, text: "Para receber treinos, responda primeiro à triagem de saúde (PAR-Q+).",
      sources: [], reasons: [{ rule: "R-TRI-01", code: "triagem_nao_feita", sources: [] }],
    });
  if (wellbeing.acuteIllnessToday)
    gates.push({
      rank: 3, text: "Doença aguda hoje (febre, resfriado): sem treino. É melhor esperar até se sentir bem.",
      sources: ["PARQ+ 2025"], reasons: [{ rule: "R-SON-16", code: "doenca_aguda", sources: ["PARQ+ 2025"] }],
    });
  if (ret.waitingProfessional)
    gates.push({
      rank: 4,
      text: "Sua pausa foi por dor, lesão ou doença. Procure um profissional de saúde; quando ele liberar, registre aqui para retomar o plano com volta gradual.",
      sources: ["Garber 2011"], reasons: [{ rule: "R-PRG-09", code: "pausa_aguardando_liberacao", sources: [] }],
    });

  // ---- 2) dor (R-DOR-*) e 3) sono/bem-estar (R-SON-*) ----
  const pg = painGate(pain);
  if (pg) gates.push(pg);
  const sg = sleepGate(wellbeing, planned?.kind, todayCheckin?.sleepHours);
  if (sg) gates.push(sg);

  // R-PRG-11: a mais restritiva, sem somar; empate pela ordem de precedência.
  let rank: Rank = 0;
  let primary: Gate | null = null;
  for (const g of gates) {
    if (g.rank > rank) {
      rank = g.rank;
      primary = g;
    }
  }

  // ---- Tetos (R-PRG-02 a R-PRG-04, R-PRG-07, R-PRG-08) ----
  const exempt = !!i.inLadder;
  const weekly = weeklyCaps(i.lastBuildWeekMinutes, cautela);
  const sessionCap = exempt ? null : sessionCapMinutes(longest30);
  let weeklyCap = exempt ? weekly.absolute : weekly.target;
  // A escada define a própria semana de recuperação (75% das repetições, R-PLN-08): não se corta no meio.
  if (i.isRecoveryWeek && !exempt && i.lastBuildWeekMinutes > 0) weeklyCap = recoveryWeekMinutes(i.lastBuildWeekMinutes);
  if (ret.weeklyMinutesCap !== null) weeklyCap = weeklyCap === null ? ret.weeklyMinutesCap : Math.min(weeklyCap, ret.weeklyMinutesCap);
  let effectiveSessionCap = sessionCap;
  if (ret.sessionMinutesCap !== null) effectiveSessionCap = effectiveSessionCap === null ? ret.sessionMinutesCap : Math.min(effectiveSessionCap, ret.sessionMinutesCap);
  // Semana do plano (janela fixa de 7 dias) quando conhecida; senão, os últimos 7 dias.
  const weekDone = i.logs
    .filter((l) => {
      if (!l.completed || age(l.date, i.today) < 0) return false;
      return i.weekStartedOn !== undefined ? l.date >= i.weekStartedOn : age(l.date, i.today) <= 6;
    })
    .reduce((s, l) => s + l.minutes, 0);

  // ---- Sessão do dia, sempre do catálogo ----
  const capReasons: DayReason[] = [];
  let session: DayDecision["session"] = { slug: null, minutes: 0, maxZone: null, changed: false };
  const base = planned;

  // L3 só por sono: troca por mobilidade leve (a corrida não fica "bloqueada").
  const sleepOnlyL3 = rank === 3 && !!sg && sg.rank === 3 && gates.filter((g) => g.rank >= 3).every((g) => g === sg);
  if (rank === 4 || (rank === 3 && !sleepOnlyL3)) {
    session = { slug: null, minutes: 0, maxZone: null, changed: !!base };
  } else if (rank === 3) {
    // L3 por sono: mobilidade leve do catálogo (10–20 min; usa o ponto médio)
    session = { slug: CATALOG.mobility, minutes: 15, maxZone: null, changed: true };
  } else if (rank === 2 && base) {
    session = { slug: CATALOG.recovery, minutes: Math.min(30, Math.max(15, base.minutes)), maxZone: "Z1", changed: true };
  } else if (base) {
    let { slug, minutes, maxZone } = base;
    let changed = false;
    const needsEasy: string[] = [];
    if (base.kind === "qualidade" && rank === 1) needsEasy.push("reducao");
    if (base.maxZone !== "Z1" && (i.screening.maxIntensity === "leve_moderada" || pain.reduce)) needsEasy.push("so_z1");
    if (base.maxZone === "Z3" && ret.noZ3) needsEasy.push("sem_z3");
    if (base.kind === "qualidade" && i.isRecoveryWeek) needsEasy.push("recuperacao");
    if (needsEasy.length > 0 && base.kind !== "caminhada-corrida") {
      slug = i.level === "iniciante" && i.flags.includes("inicio_do_zero") && base.kind === "qualidade" ? CATALOG.walkRun : CATALOG.easyRun;
      maxZone = "Z1";
      changed = true;
      if (needsEasy.includes("so_z1"))
        capReasons.push({ rule: "R-SES-07", code: "somente_z1", sources: ["Garber 2011", "Rognmo 2012"] });
      if (needsEasy.includes("sem_z3"))
        capReasons.push({ rule: "R-PRG-08", code: "sem_z3_apos_pausa", sources: ["Mujika 2000a", "Mujika 2000b"] });
      if (needsEasy.includes("recuperacao"))
        capReasons.push({ rule: "R-PRG-07", code: "semana_de_recuperacao", sources: ["Meeusen 2013", "Mujika 2000b"] });
    }
    if (rank === 1) {
      minutes = Math.floor((minutes * (100 - cfg.reactiveReductionPct)) / 100);
      changed = true;
    }
    if (ret.band === "longa" && ret.restartWith && base.kind !== "caminhada-corrida" && base.kind !== "rodagem") {
      slug = ret.restartWith;
      maxZone = "Z1";
      changed = true;
      capReasons.push({ rule: "R-SES-08", code: "retomada_gradual", sources: ["Garber 2011"] });
    }
    if (effectiveSessionCap !== null && minutes > effectiveSessionCap) {
      minutes = effectiveSessionCap;
      changed = true;
      capReasons.push({
        rule: ret.sessionMinutesCap !== null && ret.sessionMinutesCap === effectiveSessionCap ? "R-PRG-08" : "R-PRG-02",
        code: "teto_da_sessao", detail: `${effectiveSessionCap} min`, sources: ["Frandsen 2025"],
      });
    }
    if (weeklyCap !== null) {
      const remaining = weeklyCap - weekDone;
      if (minutes > remaining) {
        minutes = floor5(Math.max(0, remaining));
        changed = true;
        capReasons.push({
          rule: i.isRecoveryWeek ? "R-PRG-07" : "R-PRG-03", code: "teto_semanal", detail: `${weeklyCap} min na semana`,
          sources: i.isRecoveryWeek ? ["Meeusen 2013"] : ["Buist 2008", "Damsted 2018", "Nielsen 2012"],
        });
      }
    }
    session = minutes >= 10 ? { slug, minutes, maxZone, changed } : { slug: null, minutes: 0, maxZone: null, changed: true };
  }

  // ---- Congelamento da progressão (R-PRG-06) ----
  let sleepS1 = false;
  for (let n = 0; n <= 6 && !sleepS1; n++) {
    const date = addDays(i.today, -n);
    const kind = i.checkins.find((c) => c.date === date)?.plannedKind;
    if (evaluateWellbeing({ checkins: i.checkins, today: date, todayKind: kind }).s >= 1) sleepS1 = true;
  }
  const freezes = freezeReasons({ painLimit: pain.freezeProgression, sleepS1OrWorseThisWeek: sleepS1, logs: i.logs, today: i.today });
  const freezeProgression = freezes.length > 0 || ret.band !== "segue";

  // ---- Monta a saída ----
  const reasons: DayReason[] = [...gates.flatMap((g) => g.reasons), ...capReasons];
  if (wellbeing.persistentSleepIssue) reasons.push(...wellbeing.reasons.filter((r) => r.rule === "R-SON-12"));
  if (freezes.length > 0) reasons.push({ rule: "R-PRG-06", code: "progressao_congelada", detail: freezes.join(","), sources: [] });
  if (wellbeing.needsCheckin && !wellbeing.acuteIllnessToday)
    reasons.push({ rule: "R-SON-13", code: "pedir_checkin", sources: [] });

  let text = primary?.text;
  if (!text) {
    if (!base) text = "Hoje é dia de descanso no seu plano.";
    else if (capReasons.length > 0) {
      const why = unique(capReasons.map(capSentence).filter((x): x is string => x !== null));
      text = why.length > 0 ? `Seu treino de hoje foi ajustado. ${why.join(" ")}` : "Seu treino de hoje foi ajustado para respeitar os limites de progressão.";
    } else text = "Siga o treino de hoje como planejado.";
  }
  if (freezes.length > 0 && rank < 3)
    text += ` A progressão está parada esta semana (o plano repete a semana anterior) porque ${joinAnd(freezes.map((f) => FREEZE_TEXT[f]))}.`;
  if (wellbeing.persistentSleepIssue)
    text += " Seu sono insuficiente já dura semanas; vale conversar com um profissional de saúde.";
  if (wellbeing.needsCheckin && !wellbeing.acuteIllnessToday) text += " Faça o check-in de hoje.";
  const allSources = unique([...(primary?.sources ?? []), ...reasons.flatMap((r) => r.sources)]);

  return {
    date: i.today,
    action: ACTION_BY_RANK[rank],
    planned: base,
    session,
    blockRunning: rank >= 3 && !sleepOnlyL3,
    refer: pain.refer || rank === 4 || ret.waitingProfessional,
    urgent: pain.urgent,
    sameDayMedical: pain.sameDayMedical,
    needsEvaluation: pain.needsEvaluation,
    freezeProgression,
    freezeReasons: freezes,
    noZ3: ret.noZ3,
    returnBand: ret.band,
    caps: {
      sessionMinutes: effectiveSessionCap,
      weeklyMinutes: weeklyCap,
      absoluteWeeklyMinutes: weekly.absolute,
    },
    needsCheckin: wellbeing.needsCheckin && !wellbeing.acuteIllnessToday,
    persistentSleepIssue: wellbeing.persistentSleepIssue,
    message: text,
    reasons,
    sources: allSources,
    levels: {
      sleep: wellbeing.s, wellbeing: wellbeing.bn, load: wellbeing.level,
      painReduce: pain.reduce, painBlock: pain.blockRunning,
    },
    ruleVersion: DIA_VERSION,
  };
}
