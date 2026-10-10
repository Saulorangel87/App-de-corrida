import { describe, expect, it } from "vitest";
import { decideDay } from "../src/day/decide";
import { weeklyCaps } from "../src/day/progression";
import { lastBuildWeekMinutes, type ClosedWeek } from "../src/day/derive";
import type { Checkin, DayInput, WorkoutLog } from "../src/day/types";
import { allPlanTemplates, type PlanTemplate } from "../src/plan/templates";
import { buildAthleteWeek } from "../src/plan/week";

// Invariante entre o plano (4b) e a decisão do dia (4a): quem segue o plano à risca, descansado e
// sem dor, nunca recebe ajuste. Se um teto da decisão cortar uma sessão que o próprio plano
// montou, as duas partes discordam.

const START = "2026-10-05"; // segunda-feira
const DAY_MS = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const age = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

function follow(template: PlanTemplate, base: number, avail: { daysPerWeek: number; minutesPerSession: number }) {
  const problems: string[] = [];
  const logs: WorkoutLog[] = [];
  const closed: ClosedWeek[] = [];
  const zeroStart = !!template.weeks[0]!.ladderStage;
  let lastBuild = base;
  let lastRun: string | null = null;

  for (const tw of template.weeks) {
    const startDate = addDays(START, 7 * (tw.weekNumber - 1));
    const longest30 = logs
      .filter((l) => l.completed && age(l.date, startDate) > 0 && age(l.date, startDate) <= 30)
      .reduce((m, l) => Math.max(m, l.minutes), 0);
    const aw = buildAthleteWeek({
      template,
      weekNumber: tw.weekNumber,
      baseWeeklyMinutes: base,
      longest30,
      daysPerWeek: avail.daysPerWeek,
      minutesPerSession: avail.minutesPerSession,
      longRunDay: 7,
      startWeekday: 1,
      lastBuildWeekMinutes: lastBuild,
    });
    const runs = aw.placed.filter((p) => !p.session.optional).sort((a, b) => a.dayOffset - b.dayOffset);
    const target = weeklyCaps(lastBuild, false).target;
    const highLoadWeek = !tw.ladderStage && !tw.isRecovery && target !== null && aw.week.weeklyRunMinutes >= target;

    let done = 0;
    for (const p of runs) {
      const date = addDays(startDate, p.dayOffset);
      const checkins: Checkin[] = Array.from({ length: 14 }, (_, k) => ({
        date: addDays(date, -k), sleepHours: 8, sleepQuality: 5, energy: 4, mood: 4, stress: 4, muscleSoreness: 4,
      }));
      const input: DayInput = {
        today: date,
        level: template.level,
        flags: zeroStart ? ["inicio_do_zero"] : [],
        screening: { state: "LIBERADO", maxIntensity: "livre" },
        planned: {
          slug: p.session.slug, kind: p.session.kind, minutes: p.session.minutes, maxZone: p.session.maxZone,
          ...(p.session.targetRpe !== undefined ? { targetRpe: p.session.targetRpe } : {}),
        },
        checkins,
        pain: [],
        logs: [...logs],
        daysSinceLastRun: lastRun ? age(lastRun, date) : zeroStart ? 0 : 2,
        lastBuildWeekMinutes: lastBuild,
        highLoadWeek,
        isRecoveryWeek: tw.isRecovery,
        inLadder: !!p.session.ladder,
        weekStartedOn: startDate,
      };
      const dec = decideDay(input);
      if (dec.action !== "manter" || dec.session.changed || dec.session.minutes !== p.session.minutes) {
        problems.push(
          `${template.slug} base ${base} semana ${tw.weekNumber} ${date} ${p.session.slug} ${p.session.minutes} min → ${dec.action} ${dec.session.slug} ${dec.session.minutes} min [${dec.reasons.map((r) => `${r.rule}:${r.code}`).join(", ")}]`,
        );
      }
      logs.push({
        date, completed: true, minutes: p.session.minutes, targetRpe: p.session.targetRpe,
        reportedRpe: p.session.targetRpe, exempt: !!p.session.ladder,
      });
      lastRun = date;
      done += p.session.minutes;
    }
    closed.push({ isRecovery: tw.isRecovery, isTaper: tw.isTaper || tw.isRaceWeek, minutes: done });
    lastBuild = lastBuildWeekMinutes(closed, base);
  }
  return problems;
}

describe("seguir o plano à risca nunca gera ajuste (13 modelos)", () => {
  for (const template of allPlanTemplates()) {
    const zero = !!template.weeks[0]!.ladderStage;
    const bases = zero ? [0] : [Math.round(template.peakWeeklyCapMinutes * 0.45), Math.round(template.peakWeeklyCapMinutes * 0.75)];
    for (const base of bases) {
      for (const avail of [
        { daysPerWeek: 5, minutesPerSession: 120 },
        { daysPerWeek: 3, minutesPerSession: 60 },
      ]) {
        it(`${template.slug}: base ${base} min, ${avail.daysPerWeek} dias, ${avail.minutesPerSession} min por sessão`, () => {
          const problems = follow(template, base, avail);
          expect(problems, problems.slice(0, 6).join("\n")).toEqual([]);
        });
      }
    }
  }
});
