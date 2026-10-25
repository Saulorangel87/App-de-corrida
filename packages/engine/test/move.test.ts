import { describe, expect, it } from "vitest";
import { checkMove, moveOptions, type MovableSession } from "../src";

// Semana de segunda 2026-10-05 a domingo 2026-10-11; hoje é segunda.
const WEEK = "2026-10-05";
const d = (n: number) => `2026-10-${String(n).padStart(2, "0")}`;
const run = (id: string, day: number, kind: MovableSession["kind"] = "rodagem", extra: Partial<MovableSession> = {}): MovableSession => ({
  id, date: d(day), kind, optional: kind === "forca" || kind === "mobilidade", ladder: false, logged: false, ...extra,
});
const base = { today: d(5), weekStart: WEEK, noConsecutiveRuns: false };

describe("trocar o dia do treino (regras do agendador)", () => {
  it("move para um dia livre da semana", () => {
    const s = run("a", 6);
    expect(checkMove({ ...base, session: s, to: d(9), others: [s, run("b", 7)] })).toEqual({ ok: true });
  });

  it("não move treino passado, para dia passado, para fora da semana ou já registrado", () => {
    const s = run("a", 6);
    expect(checkMove({ ...base, today: d(7), session: s, to: d(9), others: [] })).toEqual({ ok: false, reason: "dia_passado" });
    expect(checkMove({ ...base, today: d(6), session: s, to: d(5), others: [] })).toEqual({ ok: false, reason: "dia_passado" });
    expect(checkMove({ ...base, session: s, to: d(12), others: [] })).toEqual({ ok: false, reason: "fora_da_semana" });
    expect(checkMove({ ...base, session: { ...s, logged: true }, to: d(9), others: [] })).toEqual({ ok: false, reason: "ja_registrado" });
    expect(checkMove({ ...base, session: s, to: d(6), others: [] })).toEqual({ ok: false, reason: "mesmo_dia" });
  });

  it("uma corrida por dia", () => {
    expect(checkMove({ ...base, session: run("a", 6), to: d(9), others: [run("b", 9)] })).toEqual({ ok: false, reason: "dia_ocupado" });
  });

  it("qualidade nunca em dias seguidos (R-DIS-04)", () => {
    const q = run("a", 6, "qualidade");
    expect(checkMove({ ...base, session: q, to: d(9), others: [run("b", 10, "qualidade")] })).toEqual({ ok: false, reason: "qualidade_seguida" });
    expect(checkMove({ ...base, session: q, to: d(9), others: [run("b", 10, "rodagem")] })).toEqual({ ok: true });
  });

  it("escada e iniciante no começo: nenhuma corrida em dias seguidos (R-PLN-09), inclusive com a semana vizinha", () => {
    const s = run("a", 7, "caminhada-corrida", { ladder: true });
    expect(checkMove({ ...base, session: s, to: d(9), others: [run("b", 10, "caminhada-corrida", { ladder: true })] })).toEqual({
      ok: false, reason: "corridas_seguidas",
    });
    // domingo da semana anterior encosta na segunda desta
    expect(checkMove({ ...base, noConsecutiveRuns: true, session: run("c", 7), to: d(5), others: [run("z", 4)] })).toEqual({
      ok: false, reason: "corridas_seguidas",
    });
    // fora desses casos, corridas leves em dias seguidos podem
    expect(checkMove({ ...base, session: run("c", 7), to: d(5), others: [run("z", 4)] })).toEqual({ ok: true });
  });

  it("força fora do dia de sessão dura e com 48 h entre elas (R-SES-70)", () => {
    const f = run("f", 6, "forca");
    expect(checkMove({ ...base, session: f, to: d(9), others: [run("l", 9, "longao")] })).toEqual({ ok: false, reason: "forca_com_sessao_dura" });
    expect(checkMove({ ...base, session: f, to: d(9), others: [run("g", 10, "forca")] })).toEqual({ ok: false, reason: "forca_sem_intervalo" });
    expect(checkMove({ ...base, session: f, to: d(9), others: [run("g", 11, "forca"), run("r", 9)] })).toEqual({ ok: true });
    // e a sessão dura também não vai para o dia da força
    expect(checkMove({ ...base, session: run("q", 6, "qualidade"), to: d(9), others: [run("g", 9, "forca")] })).toEqual({
      ok: false, reason: "forca_com_sessao_dura",
    });
  });

  it("mobilidade: no máximo uma por dia, em qualquer dia", () => {
    const m = run("m", 6, "mobilidade");
    expect(checkMove({ ...base, session: m, to: d(9), others: [run("q", 9, "qualidade")] })).toEqual({ ok: true });
    expect(checkMove({ ...base, session: m, to: d(9), others: [run("n", 9, "mobilidade")] })).toEqual({ ok: false, reason: "dia_ocupado" });
  });

  it("lista os dias possíveis de hoje até o fim da semana", () => {
    const s = run("a", 6);
    expect(moveOptions({ ...base, today: d(7), session: { ...s, date: d(8) }, others: [run("b", 9)] })).toEqual([d(7), d(10), d(11)]);
  });
});
