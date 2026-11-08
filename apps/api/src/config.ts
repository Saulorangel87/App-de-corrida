// Valores de segurança (seção 5 da especificação). Mudar aqui, não no código.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const authConfig = {
  session: {
    idleMs: 12 * HOUR, // sem "manter conectado"
    idleRememberMs: 30 * DAY, // com "manter conectado"
    absoluteMs: 90 * DAY,
    touchEveryMs: MINUTE, // grava last_seen_at no máximo 1x por minuto
  },
  lockout: {
    maxFailures: 5,
    windowMs: 15 * MINUTE,
    baseLockMs: 15 * MINUTE, // dobra a cada novo bloqueio
    maxLockMs: 24 * HOUR,
  },
  tokens: {
    emailVerificationMs: 24 * HOUR,
    passwordResetMs: 60 * MINUTE,
  },
  password: { min: 10, max: 128 },
  // E-mail único de incentivo para quem não montou o plano depois de confirmar o e-mail.
  nudge: {
    afterMs: 3 * DAY, // prazo depois da confirmação do e-mail
    maxPerRun: 20, // teto por rodada: um acúmulo não vira envio em massa
    // Só sai de dia (horário de Brasília); fora da janela espera a próxima rodada.
    timeZone: "America/Sao_Paulo",
    fromHour: 9,
    toHour: 20,
  },
  termsVersion: "2026-11-08", // igual a LEGAL_VERSION de apps/web/src/lib/legal.ts
} as const;

export type RateLimitConfig = { windowMs: number; limit: number };

export const rateLimitConfig = {
  global: { windowMs: 15 * MINUTE, limit: 300 },
  login: { windowMs: 15 * MINUTE, limit: 10 },
  // cadastro, reenvio de verificação, esqueci a senha
  emailSending: { windowMs: HOUR, limit: 5 },
} satisfies Record<string, RateLimitConfig>;
