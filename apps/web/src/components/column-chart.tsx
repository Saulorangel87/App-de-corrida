import { useState, type ReactNode } from "react";

// Gráfico de colunas simples: uma série, uma linha de base, rótulos só onde cabem e a leitura
// completa do valor escolhido (toque, mouse ou foco) logo acima. Feito com SVG e classes do Tailwind
// (sem estilo inline, por causa da CSP). A tabela equivalente fica em `table`.

export type Column = {
  key: string;
  /** Valor da coluna; null = sem dado (não desenha barra). */
  value: number | null;
  /** Rótulo curto do eixo (data). */
  label: string;
  /** Frase completa lida acima do gráfico e pelos leitores de tela. */
  readout: string;
};

const HEIGHT = 160;
// Acima disso, não vale a pena ter uma parada de teclado por coluna: a tabela cobre.
const FOCUSABLE_LIMIT = 14;

export function ColumnChart({
  columns,
  max,
  maxLabel,
  color,
  gap = "px-px",
  labelEvery = 1,
  table,
  tableLabel,
}: {
  columns: Column[];
  max: number;
  maxLabel: string;
  /** Classe de cor do Tailwind aplicada ao texto (a barra usa currentColor). */
  color: string;
  gap?: string;
  labelEvery?: number;
  table: ReactNode;
  tableLabel: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const lastWithData = columns.reduce((found, c, i) => (c.value !== null ? i : found), -1);
  const active = picked ?? (lastWithData >= 0 ? lastWithData : columns.length - 1);
  const focusable = columns.length <= FOCUSABLE_LIMIT;

  return (
    // mt-auto: dentro de um card em coluna, o gráfico desce para o fim e as linhas de base de
    // cards vizinhos ficam alinhadas, mesmo com textos de apoio de alturas diferentes.
    <div className="mt-auto">
      <p aria-live="polite" className="mb-3 min-h-[1.5rem] text-sm font-semibold text-[#0F172A]">
        {columns[active]?.readout}
      </p>
      <p className="mb-1 text-[11px] tabular-nums text-gray-400">{maxLabel}</p>
      <div className="flex border-y border-t-gray-100 border-b-gray-300" role="group">
        {columns.map((c, i) => {
          const h = c.value === null || max <= 0 ? 0 : Math.max(2, Math.round((c.value / max) * HEIGHT));
          return (
            <button
              key={c.key}
              type="button"
              aria-label={c.readout}
              tabIndex={focusable ? 0 : -1}
              onMouseEnter={() => setPicked(i)}
              onMouseLeave={() => setPicked(null)}
              onFocus={() => setPicked(i)}
              onBlur={() => setPicked(null)}
              onClick={() => setPicked(i)}
              className={`flex h-40 min-w-0 max-w-[72px] flex-1 items-end rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] ${gap} ${
                i === active ? "bg-gray-100" : ""
              }`}
            >
              <svg
                viewBox={`0 0 24 ${HEIGHT}`}
                preserveAspectRatio="none"
                width="100%"
                height={HEIGHT}
                aria-hidden="true"
                className={`mx-auto max-w-[24px] ${color}`}
              >
                {h > 0 && <rect x="0" y={HEIGHT - h} width="24" height={h} rx="3" fill="currentColor" />}
              </svg>
            </button>
          );
        })}
      </div>
      <div className="flex" aria-hidden="true">
        {columns.map((c, i) => (
          <div key={c.key} className="relative h-5 min-w-0 max-w-[72px] flex-1">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-gray-500">
                {c.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#C2410C] hover:underline">{tableLabel}</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-gray-200">{table}</div>
      </details>
    </div>
  );
}
