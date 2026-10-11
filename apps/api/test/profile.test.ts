import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FRONT, PASSWORD, admin, makeApp, signUpAndLogin, tokenFrom, uniqueEmail, type TestApp } from "./helpers";

// Perfil: nome, troca de e-mail com confirmação e foto. O dono sempre vem da sessão.

let t: TestApp;
beforeAll(() => {
  t = makeApp();
});
afterAll(async () => {
  await t.close();
});

const json = async (res: Response) => (await res.json().catch(() => ({}))) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- corpo inspecionado livremente

/** JPEG mínimo para o teste: o servidor confere só a assinatura (FF D8 FF) e o tamanho. */
const jpeg = (size = 2000) => {
  const b = new Uint8Array(size);
  b.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return b;
};
const putPhoto = (cookie: string, bytes: Uint8Array, type = "image/jpeg") =>
  t.app.request("/api/v1/profile/photo", {
    method: "PUT",
    headers: { cookie, origin: FRONT, "content-type": type },
    body: new Blob([bytes as BlobPart]),
  });

describe("nome do perfil", () => {
  it("edita o nome (sem espaços nas pontas) e /auth/me reflete", async () => {
    const a = await signUpAndLogin(t);
    const res = await t.request("PATCH", "/auth/profile", { name: "  Maria Corredora  " }, a.cookie);
    expect(res.status).toBe(200);
    expect((await json(res)).user.name).toBe("Maria Corredora");
    const me = await json(await t.request("GET", "/auth/me", undefined, a.cookie));
    expect(me.user.name).toBe("Maria Corredora");
  });

  it("nome vazio ou comprido demais: 400; sem sessão: 401", async () => {
    const a = await signUpAndLogin(t);
    expect((await t.request("PATCH", "/auth/profile", { name: "   " }, a.cookie)).status).toBe(400);
    expect((await t.request("PATCH", "/auth/profile", { name: "x".repeat(101) }, a.cookie)).status).toBe(400);
    expect((await t.request("PATCH", "/auth/profile", { name: "Fulano" })).status).toBe(401);
  });

  it("só o dono muda o próprio nome", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    await t.request("PATCH", "/auth/profile", { name: "Só da A" }, a.cookie);
    const meB = await json(await t.request("GET", "/auth/me", undefined, b.cookie));
    expect(meB.user.name).toBe("Atleta Teste");
  });
});

describe("troca de e-mail com confirmação", () => {
  it("senha errada: 401 e nenhum e-mail", async () => {
    const a = await signUpAndLogin(t);
    const before = t.mailer.sent.length;
    const res = await t.request("POST", "/auth/email-change", { newEmail: uniqueEmail("novo"), password: "senha-errada-123" }, a.cookie);
    expect(res.status).toBe(401);
    await t.flush();
    expect(t.mailer.sent.length).toBe(before);
  });

  it("o e-mail só muda quando o link do endereço novo é aberto; encerra sessões e avisa o antigo", async () => {
    const a = await signUpAndLogin(t);
    const novo = uniqueEmail("novo");
    const res = await t.request("POST", "/auth/email-change", { newEmail: novo.toUpperCase(), password: PASSWORD }, a.cookie);
    expect(res.status).toBe(202);
    await t.flush();

    // nada muda antes da confirmação
    expect((await json(await t.request("GET", "/auth/me", undefined, a.cookie))).user.email).toBe(a.email);
    // o link vai para o endereço NOVO; o antigo recebe só um aviso, sem link de confirmação
    const confirm = t.mailer.sent.find((m) => m.to === novo && m.subject.includes("novo e-mail"));
    expect(confirm).toBeTruthy();
    const warning = t.mailer.sent.find((m) => m.to === a.email && m.subject.includes("troca de e-mail"));
    expect(warning).toBeTruthy();
    expect(warning!.text).not.toMatch(/confirmar-novo-email/);
    expect(warning!.text).not.toContain(novo); // o endereço novo aparece só parcialmente

    const token = tokenFrom(t, novo, "novo e-mail");
    const done = await t.request("POST", "/auth/email-change/confirm", { token });
    expect(done.status).toBe(200);
    await t.flush();

    // sessão antiga encerrada; entra com o endereço novo, não com o antigo
    expect((await t.request("GET", "/auth/me", undefined, a.cookie)).status).toBe(401);
    expect((await t.request("POST", "/auth/login", { email: a.email, password: PASSWORD })).status).toBe(401);
    const login = await t.request("POST", "/auth/login", { email: novo, password: PASSWORD });
    expect(login.status).toBe(200);
    expect((await json(login)).user.email).toBe(novo);
    expect(t.mailer.sent.some((m) => m.to === a.email && m.subject.includes("foi alterado"))).toBe(true);
  });

  it("o link vale uma vez e expira", async () => {
    const a = await signUpAndLogin(t);
    const novo = uniqueEmail("novo");
    await t.request("POST", "/auth/email-change", { newEmail: novo, password: PASSWORD }, a.cookie);
    await t.flush();
    const token = tokenFrom(t, novo, "novo e-mail");
    expect((await t.request("POST", "/auth/email-change/confirm", { token })).status).toBe(200);
    const again = await t.request("POST", "/auth/email-change/confirm", { token });
    expect(again.status).toBe(400);
    expect((await json(again)).error.code).toBe("INVALID_TOKEN");

    const b = await signUpAndLogin(t);
    const outro = uniqueEmail("novo");
    await t.request("POST", "/auth/email-change", { newEmail: outro, password: PASSWORD }, b.cookie);
    await t.flush();
    await admin`update auth_tokens set expires_at = now() - interval '1 minute' where user_id = ${b.userId} and type = 'email_change'`;
    expect((await t.request("POST", "/auth/email-change/confirm", { token: tokenFrom(t, outro, "novo e-mail") })).status).toBe(400);
    expect((await t.request("POST", "/auth/email-change/confirm", { token: "x".repeat(40) })).status).toBe(400);
  });

  it("endereço de outra conta: mesma resposta, nenhum e-mail, nada revelado", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    const before = t.mailer.sent.length;
    const res = await t.request("POST", "/auth/email-change", { newEmail: b.email, password: PASSWORD }, a.cookie);
    expect(res.status).toBe(202);
    const ok = await t.request("POST", "/auth/email-change", { newEmail: uniqueEmail("livre"), password: PASSWORD }, a.cookie);
    expect(await json(res)).toEqual(await json(ok));
    await t.flush();
    // só o pedido do endereço livre mandou e-mails (2: o link e o aviso)
    expect(t.mailer.sent.length - before).toBe(2);
    expect(t.mailer.sent.some((m) => m.to === b.email && m.subject.includes("novo e-mail"))).toBe(false);
  });

  it("pedir o mesmo e-mail que já é seu não manda nada", async () => {
    const a = await signUpAndLogin(t);
    const before = t.mailer.sent.length;
    expect((await t.request("POST", "/auth/email-change", { newEmail: a.email, password: PASSWORD }, a.cookie)).status).toBe(202);
    await t.flush();
    expect(t.mailer.sent.length).toBe(before);
  });

  it("outro atleta não consegue usar o link do pedido de A para trocar o próprio e-mail", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    const novo = uniqueEmail("novo");
    await t.request("POST", "/auth/email-change", { newEmail: novo, password: PASSWORD }, a.cookie);
    await t.flush();
    const token = tokenFrom(t, novo, "novo e-mail");
    // o link troca o e-mail do DONO do pedido (A), nunca o de quem o abre (B está logado, mas não importa)
    expect((await t.request("POST", "/auth/email-change/confirm", { token }, b.cookie)).status).toBe(200);
    const rows = await admin`select id, email from users where id in (${a.userId}, ${b.userId})`;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.email]));
    expect(byId[a.userId]).toBe(novo);
    expect(byId[b.userId]).toBe(b.email);
  });
});

describe("foto de perfil", () => {
  it("envia, mostra só para o dono, aparece no /auth/me e pode ser removida", async () => {
    const a = await signUpAndLogin(t);
    const b = await signUpAndLogin(t);
    expect((await t.request("GET", "/profile/photo", undefined, a.cookie)).status).toBe(404);

    const put = await putPhoto(a.cookie, jpeg(3000));
    expect(put.status).toBe(200);
    const { photoVersion } = await json(put);
    expect(photoVersion).toEqual(expect.any(Number));

    const got = await t.request("GET", "/profile/photo", undefined, a.cookie);
    expect(got.status).toBe(200);
    expect(got.headers.get("content-type")).toBe("image/jpeg");
    expect(got.headers.get("cache-control")).toMatch(/private/);
    expect(got.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await got.arrayBuffer()).byteLength).toBe(3000);

    const me = await json(await t.request("GET", "/auth/me", undefined, a.cookie));
    expect(me.user.photoVersion).toBe(photoVersion);
    // B não vê a foto de A: não há como pedir a de outra pessoa, e B não tem foto
    expect((await t.request("GET", "/profile/photo", undefined, b.cookie)).status).toBe(404);
    expect((await json(await t.request("GET", "/auth/me", undefined, b.cookie))).user.photoVersion).toBeNull();
    expect((await t.request("GET", "/profile/photo")).status).toBe(401);

    expect((await t.request("DELETE", "/profile/photo", undefined, a.cookie)).status).toBe(204);
    expect((await t.request("GET", "/profile/photo", undefined, a.cookie)).status).toBe(404);
    expect((await json(await t.request("GET", "/auth/me", undefined, a.cookie))).user.photoVersion).toBeNull();
  });

  it("só aceita JPEG de verdade: PNG, SVG e texto são recusados pelos bytes, não pelo cabeçalho", async () => {
    const a = await signUpAndLogin(t);
    const png = new Uint8Array(2000);
    png.set([0x89, 0x50, 0x4e, 0x47], 0);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    for (const [name, bytes] of [["png", png], ["svg", svg], ["vazio", new Uint8Array(0)]] as const) {
      // mesmo dizendo que é image/jpeg
      const res = await putPhoto(a.cookie, bytes);
      expect(res.status, name).toBe(400);
      expect(JSON.stringify(await json(res))).toContain("invalid_image");
    }
    expect((await t.request("GET", "/profile/photo", undefined, a.cookie)).status).toBe(404);
  });

  it("imagem grande demais: 400 acima de 60 KB e 413 acima do limite geral da API", async () => {
    const a = await signUpAndLogin(t);
    expect((await putPhoto(a.cookie, jpeg(61 * 1024))).status).toBe(400);
    expect((await putPhoto(a.cookie, jpeg(70 * 1024))).status).toBe(413);
    expect((await putPhoto(a.cookie, jpeg(60 * 1024))).status).toBe(200);
  });

  it("entra na exportação de dados e some com a exclusão da conta", async () => {
    const a = await signUpAndLogin(t);
    await putPhoto(a.cookie, jpeg(1500));
    const exp = await json(await t.request("GET", "/account/export", undefined, a.cookie));
    expect(exp.profilePhoto).toMatchObject({ contentType: "image/jpeg" });
    expect(Buffer.from(exp.profilePhoto.dataBase64, "base64").byteLength).toBe(1500);

    const [{ n }] = (await admin`select count(*)::int as n from user_photos where user_id = ${a.userId}`) as unknown as [{ n: number }];
    expect(n).toBe(1);
    const del = await t.request("DELETE", "/auth/account", { password: PASSWORD }, a.cookie);
    expect(del.status).toBe(204);
    const [{ after }] = (await admin`select count(*)::int as after from user_photos where user_id = ${a.userId}`) as unknown as [{ after: number }];
    expect(after).toBe(0);
  });
});
