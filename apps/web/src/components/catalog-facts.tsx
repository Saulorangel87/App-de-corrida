import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

// Mostra um trecho do catálogo de treinos (chaves e valores do banco) como lista de fatos
// rotulados. O catálogo é texto em português; os rótulos vêm do i18n (`workout.keys`) e, para uma
// chave nova ainda sem rótulo, cai num nome legível feito da própria chave. Nada é calculado aqui.

const HIDDEN = new Set(["etapas"]);
const MAX_DEPTH = 4;

const humanize = (key: string) => {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const isPresent = (v: unknown) => v !== null && v !== undefined && v !== "";

/** Ordem de leitura: o que o atleta usa primeiro (zona, descrição, fala, esforço) e depois o resto. */
const PREFERRED = ["formato", "zona", "descricao", "minutos", "testeDaFala", "cr10", "cr10AlvoDeProjeto", "borg6a20", "fcMaxMedida", "fcMaxEstimada"];

export function CatalogFacts({
  data,
  exclude = [],
  depth = 0,
}: {
  data: Record<string, unknown>;
  /** Chaves que a tela já mostra de outro jeito. */
  exclude?: string[];
  depth?: number;
}) {
  const { t } = useTranslation();
  const rank = (k: string) => {
    const i = PREFERRED.indexOf(k);
    return i === -1 ? PREFERRED.length : i;
  };
  const keys = Object.keys(data)
    .filter((k) => !HIDDEN.has(k) && !exclude.includes(k) && isPresent(data[k]))
    .sort((a, b) => rank(a) - rank(b));
  if (keys.length === 0 || depth > MAX_DEPTH) return null;

  return (
    <dl className="divide-y divide-gray-100">
      {keys.map((key) => (
        <div key={key} className="py-2">
          <dt className="text-xs font-semibold text-gray-500">{t(`workout.keys.${key}`, { defaultValue: humanize(key) })}</dt>
          <dd lang="pt-BR" className="mt-0.5 text-sm leading-relaxed text-gray-800">
            <Value k={key} v={data[key]} depth={depth} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Value({ k, v, depth }: { k: string; v: unknown; depth: number }): ReactNode {
  const { t } = useTranslation();
  if (typeof v === "boolean") return v ? t("workout.yes") : t("workout.no");
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return k === "evidencia" && v === "P" ? t("workout.provisional") : v;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "number")) return v.length === 2 ? `${v[0]}–${v[1]}` : v.join(", ");
    return (
      <ul className="list-disc space-y-1 pl-5">
        {v.map((item, i) => (
          <li key={i}>{isObject(item) ? <CatalogFacts data={item} depth={depth + 1} /> : String(item)}</li>
        ))}
      </ul>
    );
  }
  if (isObject(v)) {
    return (
      <div className="mt-1 border-l-2 border-gray-100 pl-3">
        <CatalogFacts data={v} depth={depth + 1} />
      </div>
    );
  }
  return null;
}
