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
  summary: "Alterna trechos de corrida e de caminhada em ritmo de conversa, sem falta de ar.",
  intensity: {
    groups: [
      {
        title: null,
        zone: "Esforço leve (Z1)",
        facts: [
          { label: "Teste da fala", value: "Frases completas, sem pausa" },
          { label: "Esforço percebido (0 a 10)", value: "1 a 3" },
        ],
        watch: [{ label: "Com a frequência cardíaca máxima medida", value: "Até 75%" }],
      },
    ],
    notes: ["Se a fala, o esforço e o relógio indicarem zonas diferentes, vale a mais forte: então diminua o ritmo."],
    studies: ["Nos estudos, o treino de base ficou perto de 70% da frequência cardíaca máxima medida (Helgerud, 2007)."],
  },
  how: {
    warmup: { minutes: "5", text: "Caminhada rápida.", facts: [] },
    main: {
      minutes: null,
      text: "N x (corrida / caminhada), minutos de corrida e de caminhada por repetição",
      facts: [{ label: "Etapas", value: "A escada tem 12 etapas, mais um degrau extra (10b)." }],
    },
    cooldown: { minutes: "5", text: "Caminhada rápida.", facts: [] },
  },
  level: [
    { label: "Duração (min)", value: "20 a 40" },
    { label: "Base", value: "Valor inicial do app, ainda sem estudo direto" },
  ],
  frequency: [{ label: "Sessões por semana", value: "3" }],
  limits: ["Nenhuma corrida passa de 110% da sua maior corrida dos últimos 30 dias."],
  progression: ["Você avança para a próxima etapa quando as 3 sessões da etapa foram feitas sem dor de 3 ou mais."],
  regression: ["Repetir a etapa ou voltar uma etapa."],
  evidence: {
    direct: ["Escada de etapas 1 a 12: Buist (2007), Tabela 2."],
    initial: ["Degrau 10b."],
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
          needsCheckin: false, message: "Mantenha o treino planejado.", reasons: [], sources: ["Garber 2011"],
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
  // rótulos fixos com o nome do esforço, sem sigla solta
  await expect(page.getByText("Até esforço leve (Z1)")).toBeVisible();
  await expect(page.getByText("Esforço alvo: 3 de 10")).toBeVisible();

  // escada: só formatação do que a sessão traz
  await expect(page.getByText("Etapa 3 da escada")).toBeVisible();
  await expect(page.getByText("4 vezes: 3 min de corrida e 2 min de caminhada")).toBeVisible();

  await expect(page.getByText("Alterna trechos de corrida e de caminhada")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aquecimento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Volta à calma" })).toBeVisible();

  // intensidade em palavras: zona com nome, escala 0 a 10 e frequência cardíaca só no bloco do relógio
  await expect(page.getByText("Esforço leve (Z1)", { exact: true })).toBeVisible();
  await expect(page.getByText("Esforço percebido (0 a 10)").first()).toBeVisible();
  await expect(page.getByText("Se você usa relógio de frequência cardíaca")).toBeVisible();
  await expect(page.getByText("Com a frequência cardíaca máxima medida")).toBeVisible();

  await expect(page.getByText("20 a 40")).toBeVisible();
  await expect(page.getByText("Valor inicial do app, ainda sem estudo direto")).toBeVisible();
  await expect(page.getByText("Nenhuma corrida passa de 110%")).toBeVisible();
  await expect(page.getByText("O app não faz diagnóstico.")).toBeVisible();
  await expect(page.getByText("Valores iniciais do app")).toBeVisible();

  // decisão do motor, só para hoje, sem código nem colchete; as fontes ficam à parte
  await expect(page.getByText("Mantenha o treino planejado.")).toBeVisible();
  await expect(page.getByText(/\[R-|\[Garber/)).toHaveCount(0);
  await page.getByText("Base científica deste conselho").click();
  await expect(page.getByText("Garber (2011)")).toBeVisible();

  // nenhuma tela mostra código de regra, marcador provisório ou crase
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/R-[A-Z]{3}-\d+|\[P\]|`|CR-10|<=|>=/);

  // fontes: DOI vira link para doi.org; sem DOI usa a URL; abrem em nova aba sem opener
  const links = page.getByRole("link", { name: "Abrir fonte" });
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute("href", "https://doi.org/10.1136/bjsm.2007.000000");
  await expect(links.nth(1)).toHaveAttribute("href", "https://exemplo.org/relph");
  await expect(links.nth(0)).toHaveAttribute("rel", /noopener/);

  await expect(page.getByRole("link", { name: "Registrar treino" })).toHaveAttribute("href", "/registro/s1");
});

test("glossário: definições dos termos técnicos, fechado por padrão", async ({ page }) => {
  await mockApi(page);
  await page.goto("/treino/s1");
  const glossary = page.locator("details", { has: page.getByText("Glossário", { exact: true }) });
  await expect(glossary.getByText("VO2max")).toBeHidden();
  await glossary.getByText("Glossário", { exact: true }).click();
  await expect(glossary.getByText("VO2max", { exact: true })).toBeVisible();
  await expect(glossary.getByText("Economia de corrida")).toBeVisible();
  await expect(glossary.getByText("1RM (uma repetição máxima)")).toBeVisible();
  await expect(glossary.getByText("Teste da fala")).toBeVisible();
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

test("fonte com endereço que não é https não vira link (javascript:, data:, http:)", async ({ page }) => {
  await mockApi(page, {
    workout: workoutBody({
      references: [
        { citation: "Fonte com javascript.", doi: null, url: "javascript:alert(1)", studyType: "ensaio" },
        { citation: "Fonte com data.", doi: null, url: "data:text/html,<script>alert(1)</script>", studyType: "ensaio" },
        { citation: "Fonte com http simples.", doi: null, url: "http://exemplo.org/x", studyType: "ensaio" },
        { citation: "Fonte boa.", doi: null, url: "https://exemplo.org/boa", studyType: "ensaio" },
      ],
    }),
  });
  await page.goto("/treino/s1");
  const links = page.getByRole("link", { name: "Abrir fonte" });
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute("href", "https://exemplo.org/boa");
  await expect(page.getByText("Fonte com javascript.")).toBeVisible(); // a citação continua à mostra
});
