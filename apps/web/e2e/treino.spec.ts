import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/api/v1";
const user = { id: "u1", name: "Ana Corredora", email: "ana@exemplo.com", language: "pt-BR" };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = iso(new Date());
const plusDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

type Json = Record<string, unknown>;

const planInfo = {
  id: "p1", template: "5k-iniciante", calendarWeek: 3, templateWeek: 3, phase: "base",
  isRecovery: false, isTaper: false, isRaceWeek: false, weekStart: today, weekEnd: plusDays(6),
};

const baseSession = {
  id: "s1",
  date: today,
  slug: "caminhada-corrida",
  name: { "pt-BR": "Caminhada e corrida", en: "Walk-run" },
  kind: "caminhada_corrida",
  minutes: 45,
  maxZone: "Z1",
  targetRpe: 3,
  optional: false,
  ladder: { etapa: "3", corridaMin: 3, caminhadaMin: 2, repeticoes: 4, continua: false },
  note: null,
  status: "pending",
  log: null,
};

const detail = {
  reason: "Alterna trechos de corrida e de caminhada em ritmo de conversa, sem falta de ar.",
  intensity: { zona: "Z1", descricao: "leve", testeDaFala: "frases completas, sem pausa", cr10: "1-3", fcMaxMedida: "<= 75%" },
  warmup: { minutos: 5, descricao: "Caminhada rápida." },
  main: {
    formato: "N x (corrida / caminhada), minutos de corrida e de caminhada por repetição",
    escada: { fonte: "Buist 2007, Tabela 2", sessoesPorEtapa: 3, unidade: "minutos" },
  },
  cooldown: { minutos: 5, descricao: "Caminhada rápida." },
  levelParams: { duracaoMin: [20, 40], frequenciaSemanal: [2, 3], evidencia: "P" },
  limits: ["Nenhuma sessão passa de 110% da maior sessão dos últimos 30 dias."],
  progression: "Avançar para a etapa seguinte após as 3 sessões concluídas sem dor.",
  regression: "Repetir a etapa ou voltar uma etapa.",
  evidence: {
    direct: ["Escada de etapas 1 a 12: Buist 2007, Tabela 2."],
    provisional: ["Degrau 10b."],
    insufficient: [],
  },
};

const workoutBody = (over: Json = {}) => ({
  session: baseSession,
  detail,
  catalogVersion: "1.0.0",
  references: [
    { citation: "Buist I et al. Br J Sports Med 2007.", doi: "10.1136/bjsm.2007.000000", url: null, studyType: "ensaio" },
    { citation: "Relph N et al. 2023 (sem DOI).", doi: null, url: "https://exemplo.org/relph", studyType: "revisão" },
  ],
  ...over,
});

async function mockApi(page: Page, opts: { workout?: Json; notFound?: boolean } = {}) {
  await page.route(`${API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "/auth/me") return json(200, { user });
    if (path === "/profile") return json(200, { profile: { plan: { objective: "5k", endDate: plusDays(60) } } });
    if (path.startsWith("/workouts/")) {
      return opts.notFound
        ? json(404, { error: { code: "NOT_FOUND", message: "x" } })
        : json(200, opts.workout ?? workoutBody());
    }
    if (path.startsWith("/day/")) {
      return json(200, {
        date: today, plan: planInfo, sessions: [baseSession], checkin: null,
        decision: {
          action: "manter", session: { slug: "caminhada-corrida", minutes: 45, maxZone: "Z1", changed: false },
          blockRunning: false, refer: false, urgent: false, sameDayMedical: false, needsEvaluation: false,
          needsCheckin: false, message: "Mantenha o treino planejado. [R-DIA-01]", reasons: [],
        },
        todayName: baseSession.name, questions: [],
      });
    }
    if (path.startsWith("/plan/week/")) return json(200, { plan: planInfo, sessions: [baseSession] });
    return json(404, { error: { code: "NOT_FOUND", message: "x" } });
  });
}

test("detalhe do treino: escada, razão, como fazer, intensidade, nível, limites e fontes", async ({ page }) => {
  await mockApi(page);
  await page.goto("/treino/s1");
  await expect(page.getByRole("heading", { name: "Caminhada e corrida", level: 1 })).toBeVisible();
  await expect(page.getByText("Planejado", { exact: true })).toBeVisible();
  await expect(page.getByText("45 min")).toBeVisible();

  // escada: só formatação do que a sessão traz
  await expect(page.getByText("Etapa 3 da escada")).toBeVisible();
  await expect(page.getByText("4 vezes: 3 min de corrida e 2 min de caminhada")).toBeVisible();

  await expect(page.getByText("Alterna trechos de corrida e de caminhada")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aquecimento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Volta à calma" })).toBeVisible();
  // intensidade com rótulos legíveis
  await expect(page.getByText("Teste da fala")).toBeVisible();
  await expect(page.getByText("frases completas, sem pausa")).toBeVisible();
  // nível do atleta: faixa vira "20–40" e o "P" vira ponto de partida
  await expect(page.getByText("20–40")).toBeVisible();
  await expect(page.getByText("Ponto de partida (valor provisório)")).toBeVisible();
  await expect(page.getByText("Nenhuma sessão passa de 110%")).toBeVisible();
  await expect(page.getByText("O app não faz diagnóstico.")).toBeVisible();
  await expect(page.getByText("Valores ainda provisórios")).toBeVisible();

  // decisão do motor, só para hoje
  await expect(page.getByText("Mantenha o treino planejado. [R-DIA-01]")).toBeVisible();

  // fontes: DOI vira link para doi.org; sem DOI usa a URL; abrem em nova aba sem opener
  const links = page.getByRole("link", { name: "Abrir fonte" });
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute("href", "https://doi.org/10.1136/bjsm.2007.000000");
  await expect(links.nth(1)).toHaveAttribute("href", "https://exemplo.org/relph");
  await expect(links.nth(0)).toHaveAttribute("rel", /noopener/);

  await expect(page.getByRole("link", { name: "Registrar treino" })).toHaveAttribute("href", "/registro/s1");
});

test("treino de outro dia não mostra a decisão de hoje, e complementar não tem registro", async ({ page }) => {
  await mockApi(page, {
    workout: workoutBody({
      session: { ...baseSession, date: plusDays(3), optional: true, kind: "mobilidade", ladder: null },
    }),
  });
  await page.goto("/treino/s1");
  await expect(page.getByText("Complementar", { exact: true })).toBeVisible();
  await expect(page.getByText("Mantenha o treino planejado.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Registrar treino" })).toHaveCount(0);
  await expect(page.getByText("Etapa 3 da escada")).toHaveCount(0);
});

test("treino inexistente ou de outra pessoa mostra o aviso e volta ao painel", async ({ page }) => {
  await mockApi(page, { notFound: true });
  await page.goto("/treino/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("Não encontramos este treino.")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao painel" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("painel leva ao detalhe do treino de hoje e da semana", async ({ page }) => {
  await mockApi(page);
  await page.goto("/painel");
  await page.getByRole("link", { name: "Ver o treino completo" }).click();
  await expect(page).toHaveURL(/\/treino\/s1$/);
  await expect(page.getByRole("heading", { name: "Caminhada e corrida", level: 1 })).toBeVisible();
});

test("celular: o detalhe não rola para o lado", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  await mockApi(page);
  await page.goto("/treino/s1");
  await expect(page.getByRole("heading", { name: "Caminhada e corrida", level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await ctx.close();
});
