import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PASSWORD, admin, makeApp, signUpAndLogin, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

describe("exclusão da conta (LGPD, seção 10.1)", () => {
  it("senha errada não apaga; senha certa apaga tudo de verdade", async () => {
    const a = await signUpAndLogin(t);
    await t.request("PUT", "/interview/basicos", { birthMonth: 1, birthYear: 1990, sex: "M", heightCm: 175 }, a.cookie);
    await admin`insert into engine_decisions (user_id, context, applied_rule, output_decision, engine_version)
      values (${a.userId}, '{}'::jsonb, 'TESTE', 'x', 'teste')`;

    expect((await t.request("DELETE", "/auth/account", { password: "senha-errada-123" }, a.cookie)).status).toBe(401);
    expect((await t.request("GET", "/auth/me", undefined, a.cookie)).status).toBe(200);

    const res = await t.request("DELETE", "/auth/account", { password: PASSWORD }, a.cookie);
    expect(res.status).toBe(204);
    expect((await t.request("GET", "/auth/me", undefined, a.cookie)).status).toBe(401);

    const [left] = await admin`select
      (select count(*)::int from users where id = ${a.userId}) as users,
      (select count(*)::int from sessions where user_id = ${a.userId}) as sessions,
      (select count(*)::int from consents where user_id = ${a.userId}) as consents,
      (select count(*)::int from interview_responses where user_id = ${a.userId}) as interviews,
      (select count(*)::int from engine_decisions where user_id = ${a.userId}) as decisions`;
    expect(left).toEqual({ users: 0, sessions: 0, consents: 0, interviews: 0, decisions: 0 });
    expect((await t.request("POST", "/auth/login", { email: a.email, password: PASSWORD })).status).toBe(401);
  });

  it("A só consegue excluir a própria conta", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    expect((await t.request("DELETE", "/auth/account", { password: PASSWORD }, a.cookie)).status).toBe(204);
    expect((await t.request("GET", "/auth/me", undefined, b.cookie)).status).toBe(200);
  });

  it("sem sessão: 401", async () => {
    expect((await t.request("DELETE", "/auth/account", { password: PASSWORD })).status).toBe(401);
  });
});

describe("exportação dos dados (LGPD, seção 10)", () => {
  it("devolve só os dados do próprio atleta, sem hash de senha nem sessões", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    const res = await t.request("GET", "/account/export", undefined, a.cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const text = await res.text();
    const body = JSON.parse(text) as { account: { id: string; email: string }; consents: unknown[] };
    expect(body.account).toMatchObject({ id: a.userId, email: a.email });
    expect(body.consents).toHaveLength(1);
    expect(text).not.toContain(b.userId);
    expect(text).not.toContain(b.email);
    expect(text).not.toMatch(/password|\$argon2/i);

    expect((await t.request("GET", "/account/export")).status).toBe(401);
  });
});
