import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

// Esqueletos de carregamento: blocos cinza, com brilho em CSS (index.css), no formato da tela
// que vai aparecer. Não mostram dado nenhum e ficam ocultos para leitor de tela: quem não vê
// recebe um único aviso "Carregando...".

/** Bloco que ocupa o lugar de um texto, número ou cartão. */
export function Skeleton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={`skeleton ${dark ? "skeleton-dark" : ""} rounded-lg ${className}`} />;
}

/** Região de carregamento: anuncia o estado uma vez e esconde os blocos. */
export function LoadingRegion({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div role="status">
      <span className="sr-only">{t("common.loading")}</span>
      {children}
    </div>
  );
}

const CARD = "rounded-2xl border border-[#E5E7EB] bg-white p-5";

/** Mesma grade do painel (cabeçalho, aviso, quatro números, treino de hoje, volume, três colunas). */
export function PanelSkeleton() {
  return (
    <LoadingRegion>
      <div className="mb-5 space-y-2.5">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-[76px] rounded-2xl" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${CARD} flex flex-col gap-3.5`}>
              <Skeleton className="size-10 rounded-[10px]" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl bg-[#111827] p-5">
            <Skeleton dark className="h-6 w-32 rounded-full" />
            <Skeleton dark className="h-7 w-56 max-w-full" />
            <Skeleton dark className="h-4 w-40" />
            <div className="flex gap-3">
              <Skeleton dark className="h-[62px] flex-1 rounded-xl" />
              <Skeleton dark className="h-[62px] flex-1 rounded-xl" />
            </div>
            <Skeleton dark className="h-28 rounded-xl" />
            <Skeleton dark className="h-[46px] rounded-xl" />
          </div>
          <div className={`${CARD} space-y-5`}>
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-8">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-[170px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[316px_minmax(0,1fr)_340px]">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[300px] rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Tela do plano completo: resumo, nota e a lista de semanas. */
export function PlanSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[78px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Tela do histórico: três números e dois gráficos. */
export function HistorySkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[78px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[280px] rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
