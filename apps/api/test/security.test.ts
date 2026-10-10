import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FRONT, makeApp, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

describe("headers e bordas", () => {
  it("headers de segurança em toda resposta", async () => {
    const res = await t.app.request("/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("permissions-policy")).toContain("camera=()");
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("/ready confere o banco", async () => {
    expect((await t.app.request("/ready")).status).toBe(200);
  });

  it("CORS só libera o front, com credenciais", async () => {
    const ok = await t.app.request("/api/v1/auth/login", {
      method: "OPTIONS",
      headers: { origin: FRONT, "access-control-request-method": "POST" },
    });
    expect(ok.headers.get("access-control-allow-origin")).toBe(FRONT);
    expect(ok.headers.get("access-control-allow-credentials")).toBe("true");
    const evil = await t.app.request("/api/v1/auth/login", {
      method: "OPTIONS",
      headers: { origin: "https://malicioso.example", "access-control-request-method": "POST" },
    });
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("CORS libera os métodos que o front usa (inclui PUT: etapas da entrevista, check-in, pós-treino)", async () => {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const res = await t.app.request("/api/v1/interview/basicos", {
        method: "OPTIONS",
        headers: { origin: FRONT, "access-control-request-method": method },
      });
      expect(res.headers.get("access-control-allow-methods"), method).toContain(method);
    }
  });

  it("em desenvolvimento, 127.0.0.1 vale como localhost; em produção, só a origem exata", async () => {
    const alias = "http://127.0.0.1:5173";
    const preflight = (app: TestApp["app"]) =>
      app.request("/api/v1/auth/login", { method: "OPTIONS", headers: { origin: alias, "access-control-request-method": "POST" } });
    expect((await preflight(t.app)).headers.get("access-control-allow-origin")).toBe(alias);
    const ok = await t.request("POST", "/auth/logout", {}, undefined, { origin: alias });
    expect(ok.status).not.toBe(403);

    const prod = makeApp({ production: true });
    try {
      expect((await preflight(prod.app)).headers.get("access-control-allow-origin")).toBeNull();
      const blocked = await prod.request("POST", "/auth/logout", {}, undefined, { origin: alias });
      expect(blocked.status).toBe(403);
    } finally {
      await prod.close();
    }
  });

  it("CSRF: POST de outra origem é recusado", async () => {
    const res = await t.request("POST", "/auth/logout", {}, undefined, { origin: "https://malicioso.example" });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("CSRF");
    const cross = await t.app.request("/api/v1/auth/logout", { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    expect(cross.status).toBe(403);
  });

  it("formato de erro padrão e 404 para rota inexistente", async () => {
    const res = await t.app.request("/api/v1/nao-existe");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Não encontrado." } });
  });

  it("validação não ecoa os valores enviados", async () => {
    const res = await t.request("POST", "/auth/login", { email: "nao-e-email", password: "segredo-que-nao-volta" });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("segredo-que-nao-volta");
  });

  it("corpo grande demais: 413", async () => {
    const res = await t.request("POST", "/auth/login", { email: "a@b.co", password: "x".repeat(70_000) });
    expect(res.status).toBe(413);
  });
});

describe("rate limiting", () => {
  it("login: passa do limite por IP, recebe 429", async () => {
    const limited = makeApp({
      rateLimits: {
        global: { windowMs: 60_000, limit: 1000 },
        login: { windowMs: 60_000, limit: 3 },
        emailSending: { windowMs: 60_000, limit: 2 },
      },
    });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) {
        statuses.push((await limited.request("POST", "/auth/login", { email: "x@exemplo.com", password: "qualquer-uma" })).status);
      }
      expect(statuses).toEqual([401, 401, 401, 429]);
      const forgot: number[] = [];
      for (let i = 0; i < 3; i++) {
        forgot.push((await limited.request("POST", "/auth/forgot-password", { email: "x@exemplo.com" })).status);
      }
      expect(forgot).toEqual([202, 202, 429]);
    } finally {
      await limited.close();
    }
  });

  it("redefinir senha: não divide o limite de e-mails nem o do login, e tem teto próprio", async () => {
    const limited = makeApp({
      rateLimits: {
        global: { windowMs: 60_000, limit: 1000 },
        login: { windowMs: 60_000, limit: 3 },
        emailSending: { windowMs: 60_000, limit: 1 },
      },
    });
    try {
      // esgota o balde do login e o de e-mails
      for (let i = 0; i < 4; i++) await limited.request("POST", "/auth/login", { email: "x@exemplo.com", password: "qualquer-uma" });
      await limited.request("POST", "/auth/forgot-password", { email: "x@exemplo.com" });
      expect((await limited.request("POST", "/auth/forgot-password", { email: "x@exemplo.com" })).status).toBe(429);

      const body = { token: "t".repeat(30), password: "Corrida-longa-2026!" };
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) statuses.push((await limited.request("POST", "/auth/reset-password", body)).status);
      expect(statuses).toEqual([400, 400, 400, 429]);
    } finally {
      await limited.close();
    }
  });
});
