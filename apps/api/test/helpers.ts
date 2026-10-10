import postgres from "postgres";
import { createDb } from "@passo/db";
import { createApp } from "../src/app";
import { rateLimitConfig } from "../src/config";
import { createLogger } from "../src/lib/logger";
import { memoryMailer } from "../src/lib/mailer";
import { API_ROLE_PASSWORD } from "./global-setup";

export const FRONT = "http://localhost:5173";

const adminUrl = () => process.env.TEST_DATABASE_URL!;

/** URL do mesmo banco, mas com o papel restrito da API (sem superusuário). */
export function apiUrl() {
  const u = new URL(adminUrl());
  u.username = "passo_api";
  u.password = API_ROLE_PASSWORD;
  return u.toString();
}

/** Conexão de superusuário só para preparar/inspecionar o banco nos testes. */
export const admin = postgres(adminUrl(), { max: 2, onnotice: () => {} });

const relaxed = {
  global: { windowMs: 60_000, limit: 10_000 },
  login: { windowMs: 60_000, limit: 10_000 },
  emailSending: { windowMs: 60_000, limit: 10_000 },
} satisfies typeof rateLimitConfig;

export function makeApp(options: { rateLimits?: typeof rateLimitConfig } = {}) {
  const { db, close } = createDb(apiUrl(), { max: 5 });
  const mailer = memoryMailer();
  const pending: Promise<void>[] = [];
  let clock: Date | null = null;
  const app = createApp({
    db,
    mailer,
    logger: createLogger({ silent: true }),
    production: false,
    frontendUrl: FRONT,
    sessionSecret: "test-secret-test-secret-test-secret-123",
    now: () => clock ?? new Date(),
    background: (_name, task) => void pending.push(task()),
    rateLimits: options.rateLimits ?? relaxed,
  });

  /** Espera as tarefas em segundo plano (envio de e-mail etc.). */
  const flush = async () => {
    while (pending.length) await Promise.all(pending.splice(0));
  };

  const request = (method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        origin: FRONT,
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  return {
    app,
    db,
    mailer,
    flush,
    request,
    setNow: (d: Date | null) => void (clock = d),
    close,
  };
}

export type TestApp = ReturnType<typeof makeApp>;

let counter = 0;
export const uniqueEmail = (prefix = "atleta") => `${prefix}.${Date.now()}.${counter++}@exemplo.com`;
export const PASSWORD = "Corrida-longa-2026!";

/** Extrai o token do último e-mail enviado para o endereço. */
export function tokenFrom(t: TestApp, to: string, subjectPart: string) {
  const mail = [...t.mailer.sent].reverse().find((m) => m.to === to && m.subject.includes(subjectPart));
  if (!mail) throw new Error(`nenhum e-mail "${subjectPart}" para ${to}`);
  const match = mail.text.match(/#token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("e-mail sem token");
  return decodeURIComponent(match[1]!);
}

export const cookieFrom = (res: Response) => {
  const raw = res.headers.get("set-cookie");
  return raw ? raw.split(";")[0]! : "";
};

/** Cadastra, confirma o e-mail e entra. Retorna o cookie de sessão. */
export async function signUpAndLogin(t: TestApp, email = uniqueEmail(), rememberMe = false) {
  const reg = await t.request("POST", "/auth/register", {
    name: "Atleta Teste",
    email,
    password: PASSWORD,
    acceptTerms: true,
    acceptHealthData: true,
  });
  if (reg.status !== 202) throw new Error(`cadastro falhou: ${reg.status}`);
  await t.flush();
  const token = tokenFrom(t, email, "Confirme");
  const ver = await t.request("POST", "/auth/verify-email", { token });
  if (ver.status !== 200) throw new Error(`verificação falhou: ${ver.status}`);
  const login = await t.request("POST", "/auth/login", { email, password: PASSWORD, rememberMe });
  if (login.status !== 200) throw new Error(`login falhou: ${login.status}`);
  const body = (await login.json()) as { user: { id: string } };
  return { email, cookie: cookieFrom(login), userId: body.user.id };
}
