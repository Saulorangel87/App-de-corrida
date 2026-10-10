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
  termsVersion: "2026-10-10",
} as const;

export type RateLimitConfig = { windowMs: number; limit: number };

export const rateLimitConfig = {
  global: { windowMs: 15 * MINUTE, limit: 300 },
  login: { windowMs: 15 * MINUTE, limit: 10 },
  // cadastro, reenvio de verificação, esqueci a senha
  emailSending: { windowMs: HOUR, limit: 5 },
} satisfies Record<string, RateLimitConfig>;
