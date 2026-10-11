import { expect, test } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };
const today = new Date().toLocaleDateString("sv-SE");

// O servidor devolve os textos calculados no idioma pedido em Accept-Language; a tela só os mostra.

const MESSAGES = {
  "pt-BR": "Siga o treino de hoje como planejado.",
  en: "Follow today's workout as planned.",
} as const;
const SUMMARY = {
  "pt-BR": "Corrida contínua em ritmo de conversa.",
  en: "Continuous running at a conversational pace.",
} as const;

test("trocar o idioma refaz as consultas e mostra o texto do servidor no idioma novo", async ({ page }) => {
  const seen: string[] = [];
  const lang = (h: Record<string, string>) => (h["accept-language"]?.startsWith("en") ? "en" : "pt-BR") as "en" | "pt-BR";
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const l = lang(req.headers());
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: null, screening: null } });
    if (path.startsWith("/day/")) {
      seen.push(l);
      return json(200, {
        date: today,
        plan: { id: "p", template: "10k-intermediario", calendarWeek: 1, templateWeek: 1, phase: "base", isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: today, weekEnd: today },
        sessions: [],
        checkin: { sleepHours: 7, sleepQuality: 4, energy: 4, mood: 4, stress: 2, muscleSoreness: 2, restingHr: null, acuteIllness: false, dailyPainWalking: null },
        decision: {
          action: "manter", session: { slug: null, minutes: 0, maxZone: null, changed: false },
          blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false,
          needsCheckin: false, message: MESSAGES[l], reasons: [], sources: [],
        },
        todayName: null,
        questions: [],
      });
    }
    if (path.startsWith("/plan/week/")) return json(200, { plan: null, sessions: [] });
    if (path.startsWith("/workouts/")) {
      return json(200, {
        session: {
          id: "s1", date: today, slug: "rodagem-leve", name: { "pt-BR": "Rodagem leve", en: "Easy run" }, kind: "rodagem",
          minutes: 40, maxZone: "Z1", targetRpe: 3, optional: false, ladder: null, note: null, status: "pending", log: null,
        },
        detail: {
          summary: SUMMARY[l], intensity: null, how: { warmup: null, main: null, cooldown: null }, level: null,
          frequency: [], limits: [], progression: [], regression: [], evidence: { direct: [], initial: [], insufficient: [] },
        },
        catalogVersion: "1.0.0",
        references: [],
      });
    }
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });

  await page.goto("/painel");
  await expect(page.getByText(MESSAGES["pt-BR"])).toBeVisible();
  expect(seen).toEqual(["pt-BR"]);

  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByText(MESSAGES.en)).toBeVisible();
  await expect(page.getByText(MESSAGES["pt-BR"])).toHaveCount(0);
  expect(seen.at(-1)).toBe("en");
  // o parágrafo do motor leva o idioma certo
  await expect(page.getByText(MESSAGES.en)).toHaveAttribute("lang", "en");

  // o detalhe do treino também vem no idioma da tela
  await page.goto("/treino/s1");
  await expect(page.getByText(SUMMARY.en)).toBeVisible();
  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.getByText(SUMMARY["pt-BR"])).toBeVisible();
});
