// Dor e sinais de alerta: docs/pesquisa/09-dor.md (R-DOR-01 a R-DOR-15).
// O app não diagnostica: só reduz, bloqueia a corrida ou orienta procurar um profissional.
import { diaV1 as cfg } from "./config";
import type { PainReport } from "./types";

export type PainOutput = "CONTINUAR" | "REDUZIR" | "INTERROMPER" | "BLOQUEAR_CORRIDA" | "ENCAMINHAR" | "URGENTE";

export type PainFinding = {
  rule: string;
  code: string;
  outputs: PainOutput[];
  sources: string[];
  /** Data do relato que originou o achado. */
  reportDate: string;
  region?: string;
  detail?: string;
  /** Bloqueio de corrida mínimo, até esta data (inclusive). */
  blockThrough?: string;
  /** Só sai do bloqueio com a autodeclaração de avaliação profissional (R-DOR-10). */
  needsProfessional?: boolean;
  /** Estado da triagem passa a AVALIACAO_NECESSARIA (R-TRI-12). */
  needsEvaluation?: boolean;
  /** Atendimento médico no mesmo dia (R-DOR-13, urina escura). */
  sameDayMedical?: boolean;
};

export type PainResult = {
  findings: PainFinding[];
  /** Reduzir hoje: troca da sessão de qualidade por Z1 e −20% (R-PRG-12). */
  reduce: boolean;
  /** Corrida bloqueada hoje (alternativa só sem dor). */
  blockRunning: boolean;
  /** Orientar procurar um profissional. */
  refer: boolean;
  /** Parar e atendimento imediato (SAMU 192). */
  urgent: boolean;
  needsEvaluation: boolean;
  sameDayMedical: boolean;
  /** `limite_dor_progressao` atingido na semana (R-PRG-06 a). */
  freezeProgression: boolean;
  /** Maior dor relevante nos últimos 2 dias. */
  worstRecentPain: number;
};

const DAY_MS = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY_MS).toISOString().slice(0, 10);
const age = (d: string, today: string) => Math.round((parse(today) - parse(d)) / DAY_MS);

const SRC = {
  r04: ["Silbernagel 2007 via Smith 2017", "Sprague 2021", "Silbernagel 2020"],
  r05: ["Mueller-Wohlfahrt 2013", "Yamato 2015"],
  r06: ["Smith 2017", "Sprague 2021", "Farrar 2003"],
  r07: ["Heiderscheit 2010", "Hoenig 2022"],
  r08: ["Hody 2019", "Cheung 2003", "Mueller-Wohlfahrt 2013"],
  r09: ["Yamato 2015"],
  r01: ["Warburton 2023", "Riebe 2015", "Pelliccia 2021", "Kim 2025"],
  r02: ["Casa 2015"],
  r03: ["Hoenig 2022", "Warden 2014"],
  r11: ["Silbernagel 2020", "Hoenig 2022"],
  r13: ["Chavez 2016", "Finucane 2020"],
  r14: ["Heiderscheit 2010"],
} as const;

/** R-DOR-08: "padrão de DOMS" só se TODOS os critérios forem verdadeiros. */
const isDomsPattern = (r: PainReport): boolean => {
  const d = r.doms;
  return (
    !!d && d.muscleOnly && d.diffuseBilateralOrLargeGroup && d.startedHoursAfter >= cfg.pain.domsMinHoursAfter &&
    d.noLocalSwelling && d.noStrideChange && r.intensity <= cfg.pain.domsMaxIntensity && !r.bonePoint && !r.changedStride &&
    !r.suddenOnset && !r.jointSwelling && !r.lockingOrGivingWay
  );
};

const hasCardio = (r: PainReport) => {
  const c = r.cardio;
  return !!c && !!(c.chestPain || c.disproportionateBreathlessness || c.dizzyLosingBalance || c.fainting || c.palpitations);
};

export function evaluatePain(input: {
  today: string;
  reports: PainReport[];
  /** Dor ao caminhar no dia a dia, 0–10, no último check-in (R-DOR-10). */
  dailyPainWalking?: number | null;
  /**
   * Data do check-in em que `dailyPainWalking` foi informada. Só libera um bloqueio a resposta
   * dada DEPOIS do relato de dor que o causou: uma resposta anterior não diz nada sobre a lesão nova.
   */
  dailyPainWalkingOn?: string | null;
  /** Data da autodeclaração de liberação profissional (R-DOR-10). */
  clearedAt?: string | null;
}): PainResult {
  const { today } = input;
  const reports = input.reports
    .filter((r) => r.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const findings: PainFinding[] = [];

  // R-DOR-14: com analgésico antes do treino, a dor menor não conta como melhora.
  const effective = (r: PainReport, idx: number) => {
    if (!r.analgesicBeforeTraining) return r.intensity;
    const prev = reports
      .slice(0, idx)
      .filter((p) => p.region === r.region && age(p.date, r.date) <= 14)
      .map((p) => p.intensity);
    return Math.max(r.intensity, ...prev);
  };

  reports.forEach((r, idx) => {
    const a = age(r.date, today);
    const intensity = effective(r, idx);
    const base = r.baseline ?? 0;

    // ---- Sinais de alerta (R-DOR-01 a R-DOR-03) ----
    if (hasCardio(r)) {
      findings.push({
        rule: "R-DOR-01", code: "alerta_cardiopulmonar", outputs: ["URGENTE", "BLOQUEAR_CORRIDA", "ENCAMINHAR"],
        sources: [...SRC.r01], reportDate: r.date, needsProfessional: true, needsEvaluation: true,
      });
    }
    if (r.heat?.confusionOrCollapse && a <= 1) {
      findings.push({
        rule: "R-DOR-02", code: "calor_confusao", outputs: ["URGENTE", "BLOQUEAR_CORRIDA"],
        sources: [...SRC.r02], reportDate: r.date, blockThrough: addDays(r.date, 1),
      });
    }
    if (r.heat?.headacheNauseaInHeat && a <= 0) {
      findings.push({
        rule: "R-DOR-02", code: "calor_sintomas", outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA"],
        sources: [...SRC.r02], reportDate: r.date, blockThrough: r.date,
      });
    }
    const boneCriteria =
      !!r.worsensEachStrideOrNoWarmup || !!r.painWalking || !!r.restOrNightPain || (r.persistentDaysSameSite ?? 0) >= 3 || !!r.highRiskBoneSite;
    if (r.bonePoint && r.intensity >= 1 && boneCriteria) {
      findings.push({
        rule: "R-DOR-03", code: "suspeita_lesao_ossea", outputs: ["BLOQUEAR_CORRIDA", "ENCAMINHAR"],
        sources: [...SRC.r03], reportDate: r.date, region: r.region, needsProfessional: true,
      });
    }

    // ---- Sintomas que bloqueiam e encaminham (R-DOR-12, R-DOR-13) ----
    if (r.jointSwelling || r.lockingOrGivingWay) {
      findings.push({
        rule: "R-DOR-12", code: "articulacao_inchaco_travamento", outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA", "ENCAMINHAR"],
        sources: [], reportDate: r.date, region: r.region, detail: "sem evidência suficiente verificada [P]",
      });
    }
    if (r.tinglingOrNumbness || r.suddenWeaknessOrFootDrop || r.darkUrineWithMuscleSwelling) {
      findings.push({
        rule: "R-DOR-13", code: r.darkUrineWithMuscleSwelling ? "urina_escura_dor_muscular" : "dormencia_fraqueza",
        outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA", "ENCAMINHAR"],
        sources: r.darkUrineWithMuscleSwelling ? [SRC.r13[0]] : [SRC.r13[1]],
        reportDate: r.date, region: r.region, sameDayMedical: !!r.darkUrineWithMuscleSwelling,
      });
    }

    // ---- Passada alterada (R-DOR-07) ----
    if (r.changedStride && r.intensity > 0) {
      findings.push({
        rule: "R-DOR-07", code: "passada_alterada", outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA", "ENCAMINHAR"],
        sources: [...SRC.r07], reportDate: r.date, region: r.region, blockThrough: addDays(r.date, 2),
      });
    }

    // ---- Início súbito / pontada (R-DOR-05) ----
    if ((r.suddenOnset || r.type === "pontada") && intensity >= cfg.pain.suddenAtLeast && r.moment !== "checkin") {
      findings.push({
        rule: "R-DOR-05", code: "pontada_inicio_subito", outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA"],
        sources: [...SRC.r05], reportDate: r.date, region: r.region, blockThrough: addDays(r.date, 2),
      });
    }

    // ---- Dor durante ou depois do treino (R-DOR-04) ----
    if (r.moment === "treino" && !isDomsPattern(r)) {
      if (intensity >= cfg.pain.stopFrom) {
        findings.push({
          rule: "R-DOR-04", code: "dor_ge_5", outputs: ["INTERROMPER", "BLOQUEAR_CORRIDA"],
          sources: [...SRC.r04], reportDate: r.date, region: r.region, blockThrough: addDays(r.date, 1),
        });
      } else if (intensity > cfg.pain.continueMax && a <= 1) {
        findings.push({
          rule: "R-DOR-04", code: "dor_3_4", outputs: ["REDUZIR"], sources: [...SRC.r04], reportDate: r.date, region: r.region,
        });
      }
    }

    // ---- Manhã seguinte (R-DOR-06) ----
    if ((r.moment === "manha_seguinte" || r.morningSameSite !== undefined) && !isDomsPattern(r)) {
      const morning = r.morningSameSite ?? r.intensity;
      if (morning >= cfg.pain.stopFrom) {
        findings.push({
          rule: "R-DOR-06", code: "manha_ge_5", outputs: ["BLOQUEAR_CORRIDA"],
          sources: [...SRC.r06], reportDate: r.date, region: r.region, blockThrough: addDays(r.date, 1),
        });
      } else if (a <= 1 && (morning - base >= cfg.pain.morningRiseLimit || (morning > base && r.stiffnessLongerThanWarmup))) {
        findings.push({
          rule: "R-DOR-06", code: "manha_aumento", outputs: ["REDUZIR"], sources: [...SRC.r06], reportDate: r.date, region: r.region,
        });
      }
    }

    // ---- Dor antes do treino, no check-in (R-DOR-11) ----
    if (r.moment === "checkin" && a === 0) {
      if (intensity >= cfg.pain.stopFrom) {
        findings.push({
          rule: "R-DOR-11", code: "pre_treino_ge_5", outputs: ["BLOQUEAR_CORRIDA"],
          sources: [...SRC.r11], reportDate: r.date, region: r.region, blockThrough: r.date,
        });
      } else if (intensity > cfg.pain.continueMax) {
        findings.push({
          rule: "R-DOR-11", code: "pre_treino_3_4", outputs: ["REDUZIR"], sources: [...SRC.r11], reportDate: r.date, region: r.region,
        });
      }
    }

    // ---- DOMS (R-DOR-08): enquanto há dor, e mais 1 dia depois que some, reduz ----
    if (isDomsPattern(r) && a <= 1) {
      findings.push({ rule: "R-DOR-08", code: "doms", outputs: ["REDUZIR"], sources: [...SRC.r08], reportDate: r.date, region: r.region });
    }
  });

  // ---- Padrões ao longo do tempo ----
  const within = (n: number) => reports.filter((r) => age(r.date, today) <= n);
  const training14 = within(14).filter((r) => r.moment === "treino" && !isDomsPattern(r));

  // R-DOR-04: 2 ocorrências ≥ 5 em 14 dias → encaminhar
  const severe = training14.filter((r) => r.intensity >= cfg.pain.stopFrom);
  if (severe.length >= cfg.pain.stopRepeatsIn14d) {
    findings.push({
      rule: "R-DOR-04", code: "dor_ge_5_repetida", outputs: ["BLOQUEAR_CORRIDA", "ENCAMINHAR"], sources: [...SRC.r04],
      reportDate: severe[severe.length - 1]!.date, needsProfessional: true,
    });
  }

  // R-DOR-05: dor recorrente na mesma região
  const regions = new Set(training14.map((r) => r.region).filter((x): x is string => !!x));
  for (const region of regions) {
    const rs = training14.filter((r) => r.region === region);
    const a3 = rs.filter((r) => r.intensity >= cfg.pain.recurrentA.minIntensity).length;
    const a5 = rs.filter((r) => r.intensity >= cfg.pain.recurrentB.minIntensity).length;
    if (a3 >= cfg.pain.recurrentA.count || a5 >= cfg.pain.recurrentB.count) {
      findings.push({
        rule: "R-DOR-05", code: "dor_recorrente_mesma_regiao", outputs: ["ENCAMINHAR"], sources: [...SRC.r05],
        reportDate: rs[rs.length - 1]!.date, region,
      });
    }
  }

  // R-DOR-05: pontada/início súbito que persiste (≥ 3 em dias distintos na região) → encaminhar
  for (const s of findings.filter((f) => f.code === "pontada_inicio_subito")) {
    const days = new Set(
      reports.filter((r) => r.region === s.region && r.intensity >= cfg.pain.suddenAtLeast && r.date >= s.reportDate).map((r) => r.date),
    );
    if (days.size >= 2) {
      findings.push({ rule: "R-DOR-05", code: "pontada_persiste", outputs: ["ENCAMINHAR"], sources: [...SRC.r05], reportDate: s.reportDate, region: s.region });
    }
  }

  // R-DOR-09: 3 treinos seguidos com dor ≥ 3, ou 7 dias, ou piora em 3 relatos
  const trainingAll = reports.filter((r) => r.moment === "treino" && !isDomsPattern(r) && age(r.date, today) <= 30);
  const lastThree = trainingAll.slice(-cfg.pain.persistentTrainings);
  if (lastThree.length === cfg.pain.persistentTrainings && lastThree.every((r) => r.intensity >= cfg.pain.progressionLimit) && age(lastThree[2]!.date, today) <= 1) {
    findings.push({ rule: "R-DOR-09", code: "dor_persistente_3_treinos", outputs: ["ENCAMINHAR"], sources: [...SRC.r09], reportDate: lastThree[2]!.date, needsProfessional: true });
  }
  const painDays = reports.filter((r) => r.intensity >= cfg.pain.progressionLimit && !isDomsPattern(r) && age(r.date, today) <= 13);
  if (painDays.length > 0) {
    const first = painDays[0]!.date;
    const last = painDays[painDays.length - 1]!.date;
    const span = Math.round((parse(last) - parse(first)) / DAY_MS);
    if (span >= cfg.pain.persistentDays - 1 && age(last, today) <= 1) {
      findings.push({ rule: "R-DOR-09", code: "dor_persistente_7_dias", outputs: ["ENCAMINHAR"], sources: [...SRC.r09], reportDate: last, needsProfessional: true });
    }
  }
  const lastReports = reports.filter((r) => !isDomsPattern(r)).slice(-cfg.pain.worseningReports);
  if (
    lastReports.length === cfg.pain.worseningReports &&
    lastReports.every((r, i) => i === 0 || r.intensity >= lastReports[i - 1]!.intensity + 1) &&
    age(lastReports[lastReports.length - 1]!.date, today) <= 1
  ) {
    findings.push({
      rule: "R-DOR-09", code: "dor_piorando", outputs: ["ENCAMINHAR"], sources: [...SRC.r09],
      reportDate: lastReports[lastReports.length - 1]!.date,
    });
  }

  // R-DOR-08: DOMS que passa de 7 dias ou piora → encaminhar
  const doms = reports.filter((r) => isDomsPattern(r));
  if (doms.length > 0) {
    const span = Math.round((parse(doms[doms.length - 1]!.date) - parse(doms[0]!.date)) / DAY_MS);
    const worsening = doms.length >= 3 && doms[doms.length - 1]!.intensity > doms[doms.length - 2]!.intensity;
    if ((span > cfg.pain.domsReferAfterDays || worsening) && age(doms[doms.length - 1]!.date, today) <= 1) {
      findings.push({ rule: "R-DOR-08", code: "doms_persistente", outputs: ["ENCAMINHAR"], sources: [...SRC.r08], reportDate: doms[doms.length - 1]!.date });
    }
  }

  // R-DOR-02: sintomas de calor repetidos em 2 treinos → encaminhar
  const heat = within(14).filter((r) => r.heat?.headacheNauseaInHeat);
  if (heat.length >= cfg.pain.heatRepeatsToRefer) {
    findings.push({ rule: "R-DOR-02", code: "calor_repetido", outputs: ["ENCAMINHAR"], sources: [...SRC.r02], reportDate: heat[heat.length - 1]!.date });
  }

  // ---- Quais bloqueios ainda valem hoje (R-DOR-10) ----
  const cleared = input.clearedAt ?? null;
  const walkingOn = input.dailyPainWalkingOn ?? null;
  const walkingOk = (f: PainFinding) =>
    input.dailyPainWalking !== null &&
    input.dailyPainWalking !== undefined &&
    input.dailyPainWalking <= cfg.pain.returnWalkingMax &&
    walkingOn !== null &&
    walkingOn > f.reportDate;
  const isActive = (f: PainFinding): boolean => {
    const blocks = f.outputs.includes("BLOQUEAR_CORRIDA") || f.outputs.includes("URGENTE") || f.outputs.includes("INTERROMPER");
    const refers = f.outputs.includes("ENCAMINHAR");
    if (!blocks && !refers) return true; // REDUZIR: a janela de idade já foi aplicada ao gerar o achado
    // R-DOR-10: bloqueio por sinal de alerta, osso ou dor persistente só sai com a autodeclaração.
    if (f.needsProfessional) return !(cleared !== null && cleared >= f.reportDate);
    if (!blocks) return age(f.reportDate, today) <= 14; // só orientação de procurar profissional
    // Bloqueio comum: vale pelo prazo mínimo e depois até a dor ao caminhar ficar ≤ 2/10 (R-DOR-10).
    if (f.blockThrough && today <= f.blockThrough) return true;
    return !walkingOk(f);
  };
  const active = findings.filter(isActive);

  const has = (o: PainOutput) => active.some((f) => f.outputs.includes(o));
  const urgent = has("URGENTE");
  const interrupt = has("INTERROMPER");
  const blockRunning = has("BLOQUEAR_CORRIDA") || interrupt || urgent;
  const refer = has("ENCAMINHAR") || urgent;
  const reduce = has("REDUZIR");

  const recent2 = reports.filter((r) => age(r.date, today) <= 1).map((r) => r.intensity);
  const freezeProgression =
    reports.some((r) => age(r.date, today) <= 6 && r.moment === "treino" && !isDomsPattern(r) && r.intensity >= cfg.pain.progressionLimit) ||
    active.some((f) => f.code === "manha_aumento" || f.code === "manha_ge_5");

  return {
    findings: active,
    reduce,
    blockRunning,
    refer,
    urgent,
    needsEvaluation: active.some((f) => f.needsEvaluation),
    sameDayMedical: active.some((f) => f.sameDayMedical),
    freezeProgression,
    worstRecentPain: recent2.length ? Math.max(...recent2) : 0,
  };
}
