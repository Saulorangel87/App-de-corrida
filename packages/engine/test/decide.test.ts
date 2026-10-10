import { describe, expect, it } from "vitest";
import { decideDay } from "../src/day/decide";
import type { Checkin, DayInput, PainReport, PlannedSession, WorkoutLog } from "../src/day/types";

// Cenários da seção 7 da especificação e da precedência de R-PRG-11.
const TODAY = "2026-10-20";
const d = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const interval: PlannedSession = { slug: "intervalado-curto", kind: "qualidade", minutes: 50, maxZone: "Z3", targetRpe: 8 };
const easy: PlannedSession = { slug: "rodagem-leve", kind: "rodagem", minutes: 40, maxZone: "Z1", targetRpe: 3 };
const long: PlannedSession = { slug: "longao", kind: "longao", minutes: 70, maxZone: "Z1", targetRpe: 3 };
const ladder: PlannedSession = { slug: "caminhada-corrida", kind: "caminhada-corrida", minutes: 30, maxZone: "Z1", targetRpe: 3 };

const ck = (n: number, hours: number, o: Partial<Checkin> = {}): Checkin => ({
  date: d(n), sleepHours: hours, sleepQuality: 4, energy: 4, mood: 4, stress: 4, muscleSoreness: 4, ...o,
});
const good = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ck(from + i, 7.5));
const pain = (n: number, o: Partial<PainReport>): PainReport => ({ date: d(n), moment: "treino", intensity: 0, ...o });
const done = (n: number, minutes: number, o: Partial<WorkoutLog> = {}): WorkoutLog => ({ date: d(n), completed: true, minutes, ...o });

/** Atleta intermediário saudável, com histórico de sessões de 50 min e semana de construção de 150 min. */
const base = (o: Partial<DayInput> = {}): DayInput => ({
  today: TODAY,
  level: "intermediario",
  flags: [],
  screening: { state: "LIBERADO", maxIntensity: "livre" },
  planned: easy,
  checkins: good(-6, 0),
  pain: [],
  logs: [done(-12, 50), done(-9, 45), done(-5, 50), done(-2, 45)],
  daysSinceLastRun: 2,
  lastBuildWeekMinutes: 150,
  highLoadWeek: false,
  ...o,
});

describe("sem alertas", () => {
  it("mantém o treino planejado, sem aumentar", () => {
    const r = decideDay(base());
    expect(r).toMatchObject({ action: "manter", blockRunning: false, refer: false, urgent: false });
    expect(r.session).toMatchObject({ slug: "rodagem-leve", minutes: 40, changed: false });
    expect(r.message).toBe("Siga o treino de hoje como planejado.");
    expect(r.ruleVersion).toBe("DIA-v1");
  });

  it("dia sem treino no plano: nada a fazer", () => {
    const r = decideDay(base({ planned: null }));
    expect(r).toMatchObject({ action: "manter", session: { slug: null, minutes: 0 } });
    expect(r.message).toBe("Hoje é dia de descanso no seu plano.");
  });

  it("nunca aumenta além do planejado (R-SON-09, R-PLN-18)", () => {
    for (const planned of [easy, long, interval, ladder]) {
      const r = decideDay(base({ planned }));
      expect(r.session.minutes).toBeLessThanOrEqual(planned.minutes);
    }
  });
});

describe("dor alta no meio do plano", () => {
  it("dor 6/10 no treino de ontem: bloqueia a corrida, sem diagnóstico e sem encaminhar à primeira vez", () => {
    const r = decideDay(base({ planned: interval, pain: [pain(-1, { intensity: 6, region: "joelho" })] }));
    expect(r.action).toBe("descanso_ou_mobilidade");
    expect(r).toMatchObject({ blockRunning: true, refer: false, urgent: false, session: { slug: null, minutes: 0 } });
    expect(r.message).toContain("2/10");
    expect(r.freezeProgression).toBe(true);
  });

  it("dor 3–4: troca a qualidade por rodagem leve e reduz 20%", () => {
    const r = decideDay(base({ planned: interval, pain: [pain(-1, { intensity: 4, region: "joelho" })] }));
    expect(r.action).toBe("reduzir");
    expect(r.session).toMatchObject({ slug: "rodagem-leve", maxZone: "Z1", minutes: 40, changed: true });
    expect(r.freezeReasons).toContain("dor_limite");
  });

  it("dor que muda a passada: interrompe e encaminha", () => {
    const r = decideDay(base({ pain: [pain(-1, { intensity: 1, changedStride: true, region: "tornozelo" })] }));
    expect(r.action).toBe("interromper_e_encaminhar");
    expect(r).toMatchObject({ blockRunning: true, refer: true, session: { slug: null } });
  });

  it("sinal cardíaco: urgente, com o SAMU 192, e pede avaliação", () => {
    const r = decideDay(base({ pain: [pain(0, { moment: "checkin", cardio: { chestPain: true } })] }));
    expect(r).toMatchObject({ action: "interromper_e_encaminhar", urgent: true, needsEvaluation: true });
    expect(r.message).toContain("192");
    expect(r.message).toContain("não faz diagnóstico");
  });
});

describe("várias noites ruins seguidas", () => {
  it("3 noites ruins seguidas: troca por regenerativo", () => {
    const r = decideDay(base({ checkins: [...good(-6, -3), ck(-2, 6.0), ck(-1, 5.5), ck(0, 6.0)], planned: interval }));
    expect(r.action).toBe("regenerativo");
    expect(r.session).toMatchObject({ slug: "regenerativo", maxZone: "Z1", minutes: 30 });
    expect(r.message).toContain("regenerativo");
    expect(r.sources).toEqual(expect.arrayContaining(["Van Dongen 2003", "Belenky 2003"]));
  });

  it("5 noites ruins em 7 dias: descanso ou mobilidade leve; a corrida não fica bloqueada", () => {
    const week = [ck(-6, 6.0), ck(-5, 7.5), ck(-4, 6.0), ck(-3, 5.5), ck(-2, 7.5), ck(-1, 6.0), ck(0, 6.0)];
    const r = decideDay(base({ checkins: week, planned: easy }));
    expect(r.action).toBe("descanso_ou_mobilidade");
    expect(r.session).toMatchObject({ slug: "mobilidade", minutes: 15 });
    expect(r.blockRunning).toBe(false);
  });

  it("uma noite de 4,5 h antes do treino de qualidade reduz; antes de um treino fácil, não", () => {
    const checkins = [...good(-6, -1), ck(0, 4.5)];
    const hard = decideDay(base({ checkins, planned: interval }));
    expect(hard.action).toBe("reduzir");
    expect(hard.message).toContain("4,5 h");
    expect(decideDay(base({ checkins, planned: easy })).action).toBe("manter");
  });

  it("sem check-in hoje: pede o check-in, sem tratar a ausência como sinal", () => {
    const r = decideDay(base({ checkins: good(-6, -1) }));
    expect(r.needsCheckin).toBe(true);
    expect(r.action).toBe("manter");
    expect(r.message).toContain("Faça o check-in de hoje.");
  });
});

describe("precedência (R-PRG-11): a mais restritiva, sem somar", () => {
  it("dor 3–4 e sono L1 no mesmo dia: uma única redução de 20%", () => {
    const checkins = [...good(-6, -1), ck(0, 4.5)];
    const r = decideDay(base({ checkins, planned: interval, pain: [pain(-1, { intensity: 3, region: "joelho" })] }));
    expect(r.action).toBe("reduzir");
    expect(r.session.minutes).toBe(40); // 50 × 0,8; nunca 50 × 0,8 × 0,8
    expect(r.session.slug).toBe("rodagem-leve");
  });

  it("sono L2 e dor 3–4: vale o regenerativo (sono mais restritivo)", () => {
    const checkins = [...good(-6, -3), ck(-2, 6.0), ck(-1, 6.0), ck(0, 5.5)];
    const r = decideDay(base({ checkins, planned: interval, pain: [pain(-1, { intensity: 3, region: "joelho" })] }));
    expect(r.action).toBe("regenerativo");
  });

  it("dor bloqueia e sono pede só redução: vale o bloqueio", () => {
    const checkins = [...good(-6, -1), ck(0, 4.5)];
    const r = decideDay(base({ checkins, planned: interval, pain: [pain(-1, { intensity: 5, region: "joelho" })] }));
    expect(r.action).toBe("descanso_ou_mobilidade");
    expect(r.blockRunning).toBe(true);
  });

  it("alerta de saúde vale mais que qualquer sono bom", () => {
    const r = decideDay(base({ pain: [pain(0, { moment: "checkin", cardio: { palpitations: true } })] }));
    expect(r.action).toBe("interromper_e_encaminhar");
  });

  it("doença aguda hoje: sem treino, mesmo com sono ótimo", () => {
    const r = decideDay(base({ checkins: [...good(-6, -1), ck(0, 8, { acuteIllness: true })] }));
    expect(r.action).toBe("descanso_ou_mobilidade");
    expect(r.session.slug).toBeNull();
    expect(r.message).toContain("Doença aguda");
  });
});

describe("triagem com risco", () => {
  it.each([
    ["AVALIACAO_NECESSARIA", "interromper_e_encaminhar"],
    ["ADIADO", "descanso_ou_mobilidade"],
    ["EXPIRADO", "descanso_ou_mobilidade"],
    ["NAO_FEITA", "descanso_ou_mobilidade"],
  ] as const)("%s → nenhuma sessão (%s)", (state, action) => {
    const r = decideDay(base({ screening: { state, maxIntensity: "nenhuma" }, planned: easy }));
    expect(r.action).toBe(action);
    expect(r.session.slug).toBeNull();
  });

  it("liberado após avaliação (só Z1): troca qualquer sessão acima de Z1 por rodagem leve", () => {
    const r = decideDay(base({ screening: { state: "LIBERADO_APOS_AVALIACAO", maxIntensity: "leve_moderada" }, planned: interval }));
    expect(r.session).toMatchObject({ slug: "rodagem-leve", maxZone: "Z1", minutes: 50 });
    expect(r.reasons.map((x) => x.code)).toContain("somente_z1");
  });
});

describe("volta de pausa e tetos", () => {
  it("15 a 28 dias parado: 70% da maior sessão e sem Z3", () => {
    const r = decideDay(base({ daysSinceLastRun: 20, planned: interval, logs: [done(-22, 50), done(-25, 45)] }));
    expect(r.noZ3).toBe(true);
    expect(r.returnBand).toBe("reduzido");
    expect(r.session.slug).toBe("rodagem-leve"); // Z3 cortado
    expect(r.session.minutes).toBeLessThanOrEqual(35); // 70% de 50
  });

  it("29 dias ou mais: recomeça pela escada (iniciante) com a fase inicial do nível", () => {
    const r = decideDay(base({ level: "intermediario", daysSinceLastRun: 40, planned: long, lastBuildWeekMinutes: 100, logs: [done(-45, 60)] }));
    expect(r.returnBand).toBe("longa");
    expect(r.session.slug).toBe("caminhada-corrida");
    expect(r.session.minutes).toBeLessThanOrEqual(20);
    expect(r.freezeProgression).toBe(true);
  });

  it("pausa por lesão sem liberação: não retoma sozinho", () => {
    const r = decideDay(base({ daysSinceLastRun: 12, pauseCause: "lesao", clearedByProfessionalAt: null }));
    expect(r.action).toBe("interromper_e_encaminhar");
    expect(r.session.slug).toBeNull();
  });

  it("teto de 110% da maior sessão: 70 min planejados com maior de 50 viram 55", () => {
    const r = decideDay(base({ planned: long, logs: [done(-10, 50), done(-5, 45)], lastBuildWeekMinutes: 400 }));
    expect(r.session.minutes).toBe(55);
    expect(r.reasons.map((x) => x.code)).toContain("teto_da_sessao");
  });

  it("a escada caminhada-corrida é isenta do teto de sessão", () => {
    const r = decideDay(base({ planned: { ...ladder, minutes: 60 }, inLadder: true, logs: [done(-10, 30)], lastBuildWeekMinutes: 400 }));
    expect(r.session.minutes).toBe(60);
  });

  it("teto semanal: o que já foi feito na semana reduz o que resta", () => {
    // última semana de construção 100 min → teto 110; já fez 90 nos últimos 7 dias
    const r = decideDay(base({ planned: easy, lastBuildWeekMinutes: 100, logs: [done(-3, 45), done(-1, 45)] }));
    expect(r.session.minutes).toBe(20);
    expect(r.reasons.map((x) => x.code)).toContain("teto_semanal");
  });

  it("semana de recuperação: tira a sessão de qualidade e limita a 75% da última de construção", () => {
    const r = decideDay(base({ planned: interval, isRecoveryWeek: true, lastBuildWeekMinutes: 120, logs: [] }));
    expect(r.session.slug).toBe("rodagem-leve");
    expect(r.session.minutes).toBeLessThanOrEqual(90);
  });

  it("semana de prova: o polimento (volume menor) nunca é aumentado pelo motor", () => {
    const taper: PlannedSession = { slug: "rodagem-leve", kind: "rodagem", minutes: 20, maxZone: "Z1" };
    const r = decideDay(base({ planned: taper, lastBuildWeekMinutes: 150 }));
    expect(r.session.minutes).toBe(20);
    expect(r.caps.weeklyMinutes).toBe(165);
  });

  it("cautela_lesao usa 105% no teto semanal", () => {
    const r = decideDay(base({ flags: ["cautela_lesao"], lastBuildWeekMinutes: 100 }));
    expect(r.caps.weeklyMinutes).toBe(105);
    expect(r.caps.absoluteWeeklyMinutes).toBe(110);
  });
});

describe("auditoria e fontes", () => {
  it("toda decisão traz texto, regra aplicada e fontes", () => {
    const r = decideDay(base({ planned: interval, pain: [pain(-1, { intensity: 4, region: "joelho" })] }));
    expect(r.message).toMatch(/\[Silbernagel/);
    expect(r.reasons[0]).toMatchObject({ rule: "R-DOR-04", code: "dor_3_4" });
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it("sono insuficiente persistente avisa para procurar um profissional (R-SON-12)", () => {
    const checkins = Array.from({ length: 21 }, (_, i) => ck(-20 + i, 5.5));
    const r = decideDay(base({ checkins }));
    expect(r.persistentSleepIssue).toBe(true);
    expect(r.message).toContain("profissional de saúde");
  });
});
