/** Data de hoje no calendário do atleta (AAAA-MM-DD), no fuso do aparelho. A API só aceita hoje ±1 dia. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formata uma data AAAA-MM-DD (sem mudar de dia por causa do fuso). */
export function formatDate(iso: string, lang: string, options: Intl.DateTimeFormatOptions = { dateStyle: "long" }): string {
  return new Intl.DateTimeFormat(lang, { ...options, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
