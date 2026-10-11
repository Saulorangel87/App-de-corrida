import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PASSWORD, admin, cookieFrom, makeApp, signUpAndLogin, tokenFrom, uniqueEmail, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

const register = (email: string, extra: Record<string, unknown> = {}) =>
  t.request("POST", "/auth/register", {
    name: "Ana",
    email,
    password: PASSWORD,
    acceptTerms: true,
    acceptHealthData: true,
    confirmAdult: true,
    ...extra,
  });

describe("cadastro", () => {
  it("responde igual para e-mail novo e já cadastrado, e avisa o dono por e-mail", async () => {
    const email = uniqueEmail();
    const first = await register(email);
    await t.flush();
    const second = await register(email.toUpperCase());
    await t.flush();

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(await second.json()).toEqual(await first.json());
    const subjects = t.mailer.sent.filter((m) => m.to === email).map((m) => m.subject);
    expect(subjects).toEqual(["Confirme seu e-mail – Let's Go Run", "Você já tem uma conta no Let's Go Run"]);
  });

  it("guarda o e-mail em minúsculas e o consentimento com a versão dos termos", async () => {
    const email = uniqueEmail("Maiusculas");
    await register(`  ${email.toUpperCase()} `);
    await t.flush();
    const rows = await admin`select u.email, c.terms_version, c.health_data_accepted
      from users u join consents c on c.user_id = u.id where u.email = ${email.toLowerCase()}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ terms_version: "2026-10-11", health_data_accepted: true });
  });

  it("exige a declaração de 18 anos ou mais e a registra no consentimento", async () => {
    const res = await register(uniqueEmail(), { confirmAdult: false });
    expect(res.status).toBe(400);
    const email = uniqueEmail();
    await register(email);
    await t.flush();
    const [row] = await admin`select c.adult_declared from consents c join users u on u.id = c.user_id where u.email = ${email}`;
    expect(row!.adult_declared).toBe(true);
  });

  it("exige os dois aceites", async () => {
    const res = await register(uniqueEmail(), { acceptHealthData: false });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["curta", "Abc12345!"],
    ["comum", "1234567890"],
    ["com o e-mail", "ana.silva.2026x"],
    ["repetitiva", "aaaaaaaaaaaa"],
  ])("recusa senha %s", async (_label, password) => {
    const res = await register("ana.silva@exemplo.com", { password });
    expect(res.status).toBe(400);
  });

  it("envia e-mail em inglês quando o idioma é en", async () => {
    const email = uniqueEmail();
    await register(email, { language: "en" });
    await t.flush();
    expect(t.mailer.sent.find((m) => m.to === email)?.subject).toBe("Confirm your email – Let's Go Run");
  });
});

describe("verificação de e-mail", () => {
  it("o link vale uma vez só", async () => {
    const email = uniqueEmail();
    await register(email);
    await t.flush();
    const token = tokenFrom(t, email, "Confirme");
    expect((await t.request("POST", "/auth/verify-email", { token })).status).toBe(200);
    expect((await t.request("POST", "/auth/verify-email", { token })).status).toBe(400);
  });

  it("um reenvio invalida o link anterior", async () => {
    const email = uniqueEmail();
    await register(email);
    await t.flush();
    const old = tokenFrom(t, email, "Confirme");
    expect((await t.request("POST", "/auth/resend-verification", { email })).status).toBe(202);
    await t.flush();
    const fresh = tokenFrom(t, email, "Confirme");
    expect(fresh).not.toBe(old);
    expect((await t.request("POST", "/auth/verify-email", { token: old })).status).toBe(400);
    expect((await t.request("POST", "/auth/verify-email", { token: fresh })).status).toBe(200);
  });

  it("link vencido é recusado", async () => {
    const email = uniqueEmail();
    await register(email);
    await t.flush();
    const token = tokenFrom(t, email, "Confirme");
    await admin`update auth_tokens set expires_at = now() - interval '1 second'
      where user_id = (select id from users where email = ${email})`;
    expect((await t.request("POST", "/auth/verify-email", { token })).status).toBe(400);
  });
});

describe("login", () => {
  it("erro genérico e igual para e-mail inexistente e senha errada", async () => {
    const { email } = await signUpAndLogin(t);
    const wrong = await t.request("POST", "/auth/login", { email, password: "senha-errada-123" });
    const unknown = await t.request("POST", "/auth/login", { email: uniqueEmail(), password: "senha-errada-123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("e-mail não confirmado só aparece para quem acertou a senha", async () => {
    const email = uniqueEmail();
    await register(email);
    await t.flush();
    expect((await t.request("POST", "/auth/login", { email, password: "senha-errada-123" })).status).toBe(401);
    const res = await t.request("POST", "/auth/login", { email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("cookie httpOnly, SameSite=Lax; sem 'manter conectado' é cookie de sessão", async () => {
    const { email } = await signUpAndLogin(t);
    const res = await t.request("POST", "/auth/login", { email, password: PASSWORD });
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Max-Age/i);
    const remember = await t.request("POST", "/auth/login", { email, password: PASSWORD, rememberMe: true });
    expect(remember.headers.get("set-cookie")).toMatch(/Max-Age=2592000/);
  });

  it("rotação: o login invalida a sessão que veio no cookie", async () => {
    const { email, cookie } = await signUpAndLogin(t);
    const again = await t.request("POST", "/auth/login", { email, password: PASSWORD }, cookie);
    expect(again.status).toBe(200);
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
    expect((await t.request("GET", "/auth/me", undefined, cookieFrom(again))).status).toBe(200);
  });

  it("logout encerra a sessão no servidor", async () => {
    const { cookie } = await signUpAndLogin(t);
    expect((await t.request("POST", "/auth/logout", {}, cookie)).status).toBe(204);
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
  });
});

describe("bloqueio após falhas", () => {
  it("5 falhas bloqueiam por 15 min (mesmo com a senha certa), avisa por e-mail e o tempo dobra", async () => {
    const { email } = await signUpAndLogin(t);
    for (let i = 0; i < 5; i++) {
      expect((await t.request("POST", "/auth/login", { email, password: `errada-${i}-xxxxx` })).status).toBe(401);
    }
    await t.flush();
    const blocked = await t.request("POST", "/auth/login", { email, password: PASSWORD });
    expect(blocked.status).toBe(401);
    expect((await blocked.json()).error.code).toBe("INVALID_CREDENTIALS");
    expect(t.mailer.sent.some((m) => m.to === email && m.subject.includes("bloqueado"))).toBe(true);

    const [first] = await admin`select locked_until - now() as left from users where email = ${email}`;
    expect(String(first!.left)).toMatch(/^00:1[45]:/);

    // Passado o bloqueio, novas 5 falhas bloqueiam por 30 min.
    await admin`update users set locked_until = now() - interval '1 second' where email = ${email}`;
    for (let i = 0; i < 5; i++) await t.request("POST", "/auth/login", { email, password: `errada-${i}-yyyyy` });
    const [second] = await admin`select locked_until - now() as left from users where email = ${email}`;
    expect(String(second!.left)).toMatch(/^00:(29|30):/);

    // Vencido o bloqueio, a senha certa entra e zera o contador.
    await admin`update users set locked_until = now() - interval '1 second' where email = ${email}`;
    expect((await t.request("POST", "/auth/login", { email, password: PASSWORD })).status).toBe(200);
    const [reset] = await admin`select lockout_level, failed_login_count from users where email = ${email}`;
    expect(reset).toMatchObject({ lockout_level: 0, failed_login_count: 0 });
  });

  it("tentativas simultâneas não escapam da contagem", async () => {
    const { email } = await signUpAndLogin(t);
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => t.request("POST", "/auth/login", { email, password: `paralela-${i}-zz` })),
    );
    const [row] = await admin`select locked_until is not null as locked from users where email = ${email}`;
    expect(row!.locked).toBe(true);
  });
});

describe("expiração de sessão", () => {
  it("12 h sem uso derrubam a sessão sem 'manter conectado'", async () => {
    const { cookie, userId } = await signUpAndLogin(t);
    await admin`update sessions set last_seen_at = now() - interval '12 hours 1 minute' where user_id = ${userId}`;
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
    const [{ count }] = (await admin`select count(*)::int from sessions where user_id = ${userId}`) as unknown as [{ count: number }];
    expect(count).toBe(0);
  });

  it("com 'manter conectado' 13 h passam, 30 dias não", async () => {
    const { cookie, userId } = await signUpAndLogin(t, uniqueEmail(), true);
    await admin`update sessions set last_seen_at = now() - interval '13 hours' where user_id = ${userId}`;
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(200);
    await admin`update sessions set last_seen_at = now() - interval '30 days 1 minute' where user_id = ${userId}`;
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
  });

  it("prazo absoluto de 90 dias vale mesmo com uso contínuo", async () => {
    const { cookie, userId } = await signUpAndLogin(t, uniqueEmail(), true);
    await admin`update sessions set absolute_expires_at = now() - interval '1 second' where user_id = ${userId}`;
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
  });

  it("a sessão nasce com prazo absoluto de 90 dias", async () => {
    const { userId } = await signUpAndLogin(t);
    const [row] = await admin`select extract(day from absolute_expires_at - created_at)::int as days from sessions where user_id = ${userId}`;
    expect(row!.days).toBe(90);
  });
});

describe("esqueci a senha", () => {
  it("resposta igual para e-mail existente e inexistente", async () => {
    const { email } = await signUpAndLogin(t);
    const a = await t.request("POST", "/auth/forgot-password", { email });
    const b = await t.request("POST", "/auth/forgot-password", { email: uniqueEmail() });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(await a.json()).toEqual(await b.json());
  });

  it("token de 60 min, uso único; redefinir encerra todas as sessões e avisa por e-mail", async () => {
    const { email, cookie, userId } = await signUpAndLogin(t);
    await t.request("POST", "/auth/forgot-password", { email });
    await t.flush();
    const token = tokenFrom(t, email, "Redefinir");

    const [row] = await admin`select extract(epoch from expires_at - created_at)::int as secs
      from auth_tokens where user_id = ${userId} and type = 'password_reset' and used_at is null`;
    expect(row!.secs).toBe(3600);

    const newPassword = "Outra-senha-forte-77";
    expect((await t.request("POST", "/auth/reset-password", { token, password: newPassword })).status).toBe(200);
    await t.flush();
    expect((await t.request("POST", "/auth/reset-password", { token, password: newPassword })).status).toBe(400);
    expect((await t.request("GET", "/auth/me", undefined, cookie)).status).toBe(401);
    expect(t.mailer.sent.some((m) => m.to === email && m.subject.includes("alterada"))).toBe(true);
    expect((await t.request("POST", "/auth/login", { email, password: PASSWORD })).status).toBe(401);
    expect((await t.request("POST", "/auth/login", { email, password: newPassword })).status).toBe(200);
  });

  it("dois pedidos simultâneos com o mesmo token: só um vence", async () => {
    const { email } = await signUpAndLogin(t);
    await t.request("POST", "/auth/forgot-password", { email });
    await t.flush();
    const token = tokenFrom(t, email, "Redefinir");
    const results = await Promise.all([
      t.request("POST", "/auth/reset-password", { token, password: "Paralela-senha-A1" }),
      t.request("POST", "/auth/reset-password", { token, password: "Paralela-senha-B2" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it("senha fraca na redefinição não gasta o token", async () => {
    const { email } = await signUpAndLogin(t);
    await t.request("POST", "/auth/forgot-password", { email });
    await t.flush();
    const token = tokenFrom(t, email, "Redefinir");
    expect((await t.request("POST", "/auth/reset-password", { token, password: "1234567890" })).status).toBe(400);
    expect((await t.request("POST", "/auth/reset-password", { token, password: "Agora-sim-forte-42" })).status).toBe(200);
  });
});
