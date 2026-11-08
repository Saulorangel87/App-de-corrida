import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, FRONT, makeApp, signUpAndLogin, uniqueEmail, type TestApp } from "./helpers";
import { signNudgeToken, verifyNudgeToken } from "../src/lib/crypto";

// E-mail único de incentivo: confirmou o e-mail, 3 dias sem montar o plano.

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  t.setNow(null);
  await t.close();
});

// Data própria deste arquivo: os usuários dos outros testes não entram na conta (confirmaram o e-mail em outro dia).
const CONFIRMED_AT = new Date("2026-03-02T12:00:00Z");
const at = (days: number, hourUtc: number) => new Date(CONFIRMED_AT.getTime() + days * 86_400_000 + (hourUtc - 12) * 3_600_000);

async function newUser() {
  t.setNow(CONFIRMED_AT);
  return signUpAndLogin(t, uniqueEmail("inativo"));
}

const mailsTo = (email: string) => t.mailer.sent.filter((m) => m.to === email && m.subject.includes("plano de corrida está esperando"));
const optOutTokenOf = (email: string) => {
  const mail = mailsTo(email)[0]!;
  const match = mail.text.match(/\/sem-lembrete#token=([A-Za-z0-9_.%-]+)/);
  return decodeURIComponent(match![1]!);
};

describe("e-mail para quem não montou o plano", () => {
  it("só sai depois de 3 dias, uma vez, com link para não receber", async () => {
    const u = await newUser();

    await t.app.nudge.sendDue(at(2, 15)); // 2 dias: cedo demais
    expect(mailsTo(u.email)).toHaveLength(0);

    await t.app.nudge.sendDue(at(3, 15)); // 3 dias, 12h em Brasília
    const [mail] = mailsTo(u.email);
    expect(mail?.subject).toBe("Seu plano de corrida está esperando – Let's Go Run");
    expect(mail?.text).toContain(`${FRONT}/entrevista`);
    expect(mail?.text).toMatch(new RegExp(`${FRONT}/sem-lembrete#token=`));
    expect(mail?.html).toContain("Não quero receber este lembrete");
    expect(mail?.text).not.toMatch(/dor|lesão|peso|saúde/i);

    await t.app.nudge.sendDue(at(4, 15));
    await t.app.nudge.sendDue(at(30, 15));
    expect(mailsTo(u.email)).toHaveLength(1);
    const [row] = await admin`select nudge_sent_at from users where id = ${u.userId}`;
    expect(row?.nudge_sent_at).toBeTruthy();
  });

  it("não sai de madrugada: espera a janela das 9h às 20h de Brasília", async () => {
    const u = await newUser();
    await t.app.nudge.sendDue(at(3, 4)); // 01h em Brasília
    await t.app.nudge.sendDue(at(3, 23)); // 20h em Brasília: já fora
    expect(mailsTo(u.email)).toHaveLength(0);
    await t.app.nudge.sendDue(at(4, 13)); // 10h em Brasília
    expect(mailsTo(u.email)).toHaveLength(1);
  });

  it("não vai para quem já montou o plano", async () => {
    const allNo = { "1": false, "2": false, "3": false, "4": false, "5": false, "6": false, "7": false };
    const interview = {
      basicos: { birthMonth: 1, birthYear: new Date().getUTCFullYear() - 30, sex: "F", heightCm: 165, weightKg: 60 },
      triagem: { general: allNo, pregnant: false },
      historico: {
        monthsRegular: 24, weeklySessions: 3, weeklyVolume: { unit: "km", value: 25 }, longestRecentKm: 12,
        canRunContinuousMinutes: 60, daysSinceLastRun: 2, halfMarathonLast3m: false, regularExercise3m: true,
      },
      lesoes: { injury12m: false, runningInjuryLast3m: false, injuryOrPersistentPainLast6w: false, currentPain: { intensity: 0 } },
      objetivo: { goal: "primeira_prova", raceDistance: "10k" },
      disponibilidade: { daysPerWeek: 4, minutesPerSession: 60, longRunDay: 7 },
      recuperacao: { sleepHours: 7.5, stress: 2, workType: "sedentario", otherSportsMinutesPerWeek: 0, strengthTraining: true },
      recursos: { hrDevice: "relogio", track: false, treadmill: true, terrain: ["plano"] },
    };
    const u = await newUser();
    for (const [step, data] of Object.entries(interview)) await t.request("PUT", `/interview/${step}`, data, u.cookie);
    const submit = await t.request("POST", "/interview/submit", {}, u.cookie);
    expect(submit.status).toBeLessThan(300);
    const [plan] = await admin`select count(*)::int as n from athlete_plans where user_id = ${u.userId}`;
    expect(plan?.n).toBe(1);

    await t.app.nudge.sendDue(at(5, 15));
    expect(mailsTo(u.email)).toHaveLength(0);
  });

  it("não vai para quem não confirmou o e-mail", async () => {
    t.setNow(CONFIRMED_AT);
    const email = uniqueEmail("sem-confirmar");
    await t.request("POST", "/auth/register", {
      name: "Sem Confirmar", email, password: "Corrida-longa-2026!", acceptTerms: true, acceptHealthData: true, confirmAdult: true,
    });
    await t.flush();
    await t.app.nudge.sendDue(at(5, 15));
    expect(mailsTo(email)).toHaveLength(0);
  });

  it("o link do rodapé desliga o envio, mesmo antes dele, e some do envio seguinte", async () => {
    const early = await newUser();
    const early_token = signNudgeToken("test-secret-test-secret-test-secret-123", early.userId);
    const off = await t.request("POST", "/auth/nudge-opt-out", { token: early_token });
    expect(off.status).toBe(200);
    await t.app.nudge.sendDue(at(6, 15));
    expect(mailsTo(early.email)).toHaveLength(0);

    const late = await newUser();
    await t.app.nudge.sendDue(at(6, 15));
    expect(mailsTo(late.email)).toHaveLength(1);
    const again = await t.request("POST", "/auth/nudge-opt-out", { token: optOutTokenOf(late.email) });
    expect(again.status).toBe(200);
    // repetir o link continua funcionando e não muda nada
    expect((await t.request("POST", "/auth/nudge-opt-out", { token: optOutTokenOf(late.email) })).status).toBe(200);
    const [row] = await admin`select nudge_opt_out_at from users where id = ${late.userId}`;
    expect(row?.nudge_opt_out_at).toBeTruthy();
  });

  it("recusa link alterado, de outra chave ou sem assinatura", async () => {
    const u = await newUser();
    const good = signNudgeToken("test-secret-test-secret-test-secret-123", u.userId);
    const tampered = `${good.slice(0, -2)}${good.endsWith("AA") ? "BB" : "AA"}`;
    const otherKey = signNudgeToken("outra-chave-outra-chave-outra-chave-999", u.userId);
    for (const token of [tampered, otherKey, u.userId, `${u.userId}.`, "x".repeat(40)]) {
      const res = await t.request("POST", "/auth/nudge-opt-out", { token });
      expect(res.status, token).toBe(400);
    }
    const [row] = await admin`select nudge_opt_out_at from users where id = ${u.userId}`;
    expect(row?.nudge_opt_out_at).toBeNull();
    expect(verifyNudgeToken("test-secret-test-secret-test-secret-123", good)).toBe(u.userId);
    expect(verifyNudgeToken("test-secret-test-secret-test-secret-123", `${good}.extra`)).toBeNull();
  });

  it("se o envio falhar, a vez volta para a próxima rodada", async () => {
    const u = await newUser();
    const original = t.mailer.send;
    t.mailer.send = async () => {
      throw new Error("falha simulada");
    };
    try {
      await t.app.nudge.sendDue(at(7, 15));
    } finally {
      t.mailer.send = original;
    }
    expect(mailsTo(u.email)).toHaveLength(0);
    const [row] = await admin`select nudge_sent_at from users where id = ${u.userId}`;
    expect(row?.nudge_sent_at).toBeNull();

    await t.app.nudge.sendDue(at(7, 16));
    expect(mailsTo(u.email)).toHaveLength(1);
  });

  it("usa o idioma da conta", async () => {
    const u = await newUser();
    await admin`update users set language = 'en' where id = ${u.userId}`;
    await t.app.nudge.sendDue(at(8, 15));
    const mail = t.mailer.sent.find((m) => m.to === u.email && m.subject.includes("running plan"));
    expect(mail?.subject).toBe("Your running plan is waiting – Let's Go Run");
    expect(mail?.text).toContain("I don't want to receive this reminder");
  });
});
