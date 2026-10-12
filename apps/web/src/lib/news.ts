import { useCallback, useState } from "react";

/**
 * Novidades do app: correções de erro, limitações explicadas e avisos que a pessoa precisa saber.
 * A lista é do código (nada de dado novo no banco). "Entendi" fica guardado só no navegador.
 * Texto em linguagem simples, sem código de regra nem sigla; novo item pede aprovação do dono.
 */
export type NewsKind = "correcao" | "limitacao" | "novidade";

export type NewsItem = {
  /** Estável: é o que o "Entendi" guarda. Nunca reutilizar nem mudar. */
  id: string;
  /** Dia do aviso (AAAA-MM-DD). Quem criou a conta depois desse dia não vê o aviso no painel. */
  date: string;
  kind: NewsKind;
  title: { "pt-BR": string; en: string };
  text: { "pt-BR": string; en: string };
};

/** Mais recente primeiro. */
export const NEWS: readonly NewsItem[] = [
  {
    id: "2026-10-12-prazo-da-prova",
    date: "2026-10-12",
    kind: "limitacao",
    title: {
      "pt-BR": "Prova perto demais para o plano",
      en: "Race too close for the plan",
    },
    text: {
      "pt-BR":
        "Quando a data da prova está perto demais para a distância escolhida, o app não monta o plano, porque por segurança ele não encurta a preparação. Antes, a tela só dizia que o plano seria montado depois. Agora ela explica quantas semanas faltam, a partir de que data ou com qual distância menor o plano cabe, e leva você direto ao objetivo para ajustar.",
      en: "When the race date is too close for the chosen distance, the app does not build a plan, because for safety it never shortens the preparation. Before, the screen only said the plan would be built later. Now it explains how many weeks are missing, from which date or with which shorter distance the plan fits, and takes you straight to the goal step to adjust it.",
    },
  },
  {
    id: "2026-10-12-registro-na-virada-da-semana",
    date: "2026-10-12",
    kind: "correcao",
    title: {
      "pt-BR": "Registrar o treino de domingo na segunda-feira",
      en: "Logging Sunday's workout on Monday",
    },
    text: {
      "pt-BR":
        "Corrigimos um erro que mostrava \"Não encontramos este treino\" quando você abria, na segunda-feira, o treino feito no domingo à noite. Agora o registro abre normalmente.",
      en: "We fixed an error that showed \"We could not find this workout\" when you opened, on Monday, a workout done on Sunday night. The log now opens normally.",
    },
  },
  {
    id: "2026-10-12-dor-ao-caminhar",
    date: "2026-10-12",
    kind: "correcao",
    title: {
      "pt-BR": "Dor ao caminhar e volta à corrida",
      en: "Walking pain and returning to running",
    },
    text: {
      "pt-BR":
        "Depois de uma dor mais forte, a corrida só volta quando a dor ao caminhar é baixa. Corrigimos um caso em que uma resposta antiga, dada antes da dor nova, podia liberar a corrida cedo demais. Agora só vale a resposta dada depois da dor mais recente.",
      en: "After stronger pain, running only comes back when walking pain is low. We fixed a case where an old answer, given before the new pain, could clear running too early. Now only an answer given after the most recent pain counts.",
    },
  },
];

/** Quem criou a conta depois do dia do aviso já nasceu com a correção: não precisa saber. */
export const newsFor = (createdOn: string | undefined): NewsItem[] =>
  NEWS.filter((n) => !createdOn || createdOn <= n.date);

const STORAGE_KEY = "passo:novidades:lidas";

/** Ids já marcados como lidos por esta pessoa, neste navegador. Falha em silêncio (modo privado). */
function readSeen(userId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    return Array.isArray(all[userId]) ? all[userId]! : [];
  } catch {
    return [];
  }
}

function writeSeen(userId: string, ids: string[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [userId]: ids }));
  } catch {
    /* sem armazenamento: o aviso volta na próxima visita, sem prejuízo */
  }
}

/** Novidades da pessoa: o que ainda não foi lido (para o painel) e o histórico inteiro (para a página). */
export function useNews(user: { id: string; createdOn?: string } | undefined) {
  const userId = user?.id;
  const [seen, setSeen] = useState<string[]>(() => (userId ? readSeen(userId) : []));
  const all = newsFor(user?.createdOn);
  const unread = all.filter((n) => !seen.includes(n.id));

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const ids = Array.from(new Set([...readSeen(userId), ...NEWS.map((n) => n.id)]));
    writeSeen(userId, ids);
    setSeen(ids);
  }, [userId]);

  return { all, unread, markAllRead };
}
