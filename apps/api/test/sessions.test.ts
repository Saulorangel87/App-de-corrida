import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeApp, signUpAndLogin, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

type SessionList = { sessions: { id: string; current: boolean }[] };

describe("sessões ativas (A tenta acessar B)", () => {
  it("cada um lista só as próprias sessões", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    const listA = (await (await t.request("GET", "/auth/sessions", undefined, a.cookie)).json()) as SessionList;
    const listB = (await (await t.request("GET", "/auth/sessions", undefined, b.cookie)).json()) as SessionList;
    expect(listA.sessions).toHaveLength(1);
    expect(listA.sessions[0]!.current).toBe(true);
    const idsA = new Set(listA.sessions.map((s) => s.id));
    expect(listB.sessions.some((s) => idsA.has(s.id))).toBe(false);
  });

  it("A não encerra a sessão de B: 404, e a sessão de B continua", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    const { sessions } = (await (await t.request("GET", "/auth/sessions", undefined, b.cookie)).json()) as SessionList;
    const res = await t.request("DELETE", `/auth/sessions/${sessions[0]!.id}`, undefined, a.cookie);
    expect(res.status).toBe(404);
    expect((await t.request("GET", "/auth/me", undefined, b.cookie)).status).toBe(200);
  });

  it("404 igual para id inexistente e id inválido", async () => {
    const a = await signUpAndLogin(t);
    const missing = await t.request("DELETE", "/auth/sessions/00000000-0000-4000-8000-000000000000", undefined, a.cookie);
    const invalid = await t.request("DELETE", "/auth/sessions/nao-e-uuid", undefined, a.cookie);
    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(404);
    expect(await missing.json()).toEqual(await invalid.json());
  });

  it("o dono encerra outra sessão sua", async () => {
    const a = await signUpAndLogin(t);
    const other = await t.request("POST", "/auth/login", { email: a.email, password: "Corrida-longa-2026!" });
    const otherCookie = other.headers.get("set-cookie")!.split(";")[0]!;
    const { sessions } = (await (await t.request("GET", "/auth/sessions", undefined, a.cookie)).json()) as SessionList;
    const target = sessions.find((s) => !s.current)!;
    expect((await t.request("DELETE", `/auth/sessions/${target.id}`, undefined, a.cookie)).status).toBe(204);
    expect((await t.request("GET", "/auth/me", undefined, otherCookie)).status).toBe(401);
    expect((await t.request("GET", "/auth/me", undefined, a.cookie)).status).toBe(200);
  });

  it("rotas protegidas sem sessão: 401", async () => {
    expect((await t.request("GET", "/auth/me")).status).toBe(401);
    expect((await t.request("GET", "/auth/sessions")).status).toBe(401);
    expect((await t.request("GET", "/auth/me", undefined, "passo_session=forjado")).status).toBe(401);
  });
});
