// Ritmo (pace) é só aritmética sobre o que o atleta informou: minutos por quilômetro. Não é meta nem
// regra de treino (a intensidade continua sendo controlada por esforço e zona).

/** Minutos por km, ou null quando falta distância ou duração. */
export function paceMinPerKm(distanceKm: number | null | undefined, minutes: number | null | undefined): number | null {
  if (!distanceKm || !minutes || distanceKm <= 0 || minutes <= 0) return null;
  return minutes / distanceKm;
}

/** Minutos por km em "5:41". */
export function paceText(minutesPerKm: number): string {
  const total = Math.round(minutesPerKm * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
