import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

// Mapa do corpo clicável (R-DOR-15). Duas vistas esquemáticas, frente e costas. Cada região é um
// botão (teclado e leitor de tela). Os ids são os de `BODY_REGIONS` em @passo/shared; o lado vai
// no sufixo: `_d` (direita do atleta) e `_e` (esquerda).

type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number };

/** Formas de uma perna, desenhadas na metade esquerda da vista; a outra é o espelho. */
type Part = { id: string; shape: Shape };

const FRONT_LEG: Part[] = [
  { id: "quadril_virilha", shape: { kind: "ellipse", cx: 80, cy: 214, rx: 17, ry: 14 } },
  { id: "coxa_frente", shape: { kind: "rect", x: 64, y: 232, w: 32, h: 70, r: 12 } },
  { id: "joelho", shape: { kind: "ellipse", cx: 80, cy: 312, rx: 15, ry: 12 } },
  { id: "canela", shape: { kind: "rect", x: 69, y: 326, w: 22, h: 60, r: 9 } },
  { id: "tornozelo", shape: { kind: "ellipse", cx: 80, cy: 394, rx: 11, ry: 8 } },
  { id: "pe_lateral", shape: { kind: "rect", x: 58, y: 406, w: 9, h: 20, r: 4 } },
  { id: "pe_dorso", shape: { kind: "rect", x: 69, y: 404, w: 22, h: 22, r: 8 } },
];

const BACK_LEG: Part[] = [
  { id: "gluteo", shape: { kind: "ellipse", cx: 82, cy: 222, rx: 19, ry: 18 } },
  { id: "coxa_atras", shape: { kind: "rect", x: 64, y: 244, w: 32, h: 62, r: 12 } },
  { id: "joelho", shape: { kind: "ellipse", cx: 80, cy: 316, rx: 15, ry: 11 } },
  { id: "panturrilha", shape: { kind: "rect", x: 68, y: 332, w: 24, h: 46, r: 11 } },
  { id: "tendao_aquiles", shape: { kind: "rect", x: 75, y: 380, w: 10, h: 24, r: 5 } },
  { id: "pe_planta_calcanhar", shape: { kind: "ellipse", cx: 80, cy: 418, rx: 14, ry: 10 } },
];

/** Afasta e alarga as formas a partir do centro (x = 100): alvos maiores para o toque. */
const SPREAD = 1.3;
const spread = (s: Shape): Shape =>
  s.kind === "ellipse"
    ? { ...s, cx: 100 - (100 - s.cx) * SPREAD, rx: s.rx * SPREAD }
    : { ...s, x: 100 - (100 - s.x) * SPREAD, w: s.w * SPREAD };

const mirror = (s: Shape): Shape =>
  s.kind === "ellipse" ? { ...s, cx: 200 - s.cx } : { ...s, x: 200 - s.x - s.w };

type Props = {
  selected: string[];
  onToggle: (region: string) => void;
  /** Nome de uma região (com o lado) para o leitor de tela. */
  label: (region: string) => string;
};

export function BodyMap({ selected, onToggle, label }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<"front" | "back">("front");
  return (
    <div className="space-y-3">
      <div role="group" aria-label={t("body.view")} className="mx-auto grid w-full max-w-[260px] grid-cols-2 gap-2">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
              view === v ? "border-[#FF5A1F] bg-orange-50 text-[#FF5A1F]" : "border-gray-300 bg-white text-[#111827] hover:border-gray-400"
            }`}
          >
            {t(v === "front" ? "body.front" : "body.back")}
          </button>
        ))}
      </div>
      {view === "front" ? (
        <View title={t("body.front")} legSide={{ left: "d", right: "e" }} legs={FRONT_LEG} {...{ selected, onToggle, label }} />
      ) : (
        <View
          title={t("body.back")}
          legSide={{ left: "e", right: "d" }}
          legs={BACK_LEG}
          center={{ id: "lombar_sacro", shape: { kind: "rect", x: 74, y: 150, w: 52, h: 48, r: 10 } }}
          {...{ selected, onToggle, label }}
        />
      )}
    </div>
  );
}

function View({
  title,
  legs,
  legSide,
  center,
  selected,
  onToggle,
  label,
}: Props & {
  title: string;
  legs: Part[];
  /** Lado do atleta que aparece na metade esquerda e na direita da figura. */
  legSide: { left: "d" | "e"; right: "d" | "e" };
  center?: Part;
}) {
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 200 440" className="mx-auto h-auto w-full max-w-[260px]" role="group" aria-label={title}>
        {/* silhueta (só decoração) */}
        <g className="fill-gray-200" aria-hidden="true">
          <circle cx="100" cy="28" r="18" />
          <rect x="56" y="54" width="88" height="152" rx="22" />
          <rect x="24" y="60" width="22" height="132" rx="11" />
          <rect x="154" y="60" width="22" height="132" rx="11" />
          <rect x="46" y="204" width="50" height="228" rx="18" />
          <rect x="104" y="204" width="50" height="228" rx="18" />
        </g>
        {legs.flatMap((p) => [
          <Region key={`${p.id}-l`} id={`${p.id}_${legSide.left}`} shape={spread(p.shape)} {...{ selected, onToggle, label }} />,
          <Region key={`${p.id}-r`} id={`${p.id}_${legSide.right}`} shape={mirror(spread(p.shape))} {...{ selected, onToggle, label }} />,
        ])}
        {center && <Region id={center.id} shape={center.shape} {...{ selected, onToggle, label }} />}
      </svg>
    </figure>
  );
}

function Region({
  id,
  shape,
  selected,
  onToggle,
  label,
}: Pick<Props, "selected" | "onToggle" | "label"> & { id: string; shape: Shape }) {
  const on = selected.includes(id);
  const cls = on
    ? "fill-[#FF5A1F] stroke-[#c2410c]"
    : "fill-white stroke-gray-400 group-hover:fill-orange-100 group-focus-visible:stroke-[#111827]";
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(id);
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={label(id)}
      className="group cursor-pointer outline-none"
      onClick={() => onToggle(id)}
      onKeyDown={onKey}
    >
      {shape.kind === "ellipse" ? (
        <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} strokeWidth={on ? 3 : 2} className={cls} />
      ) : (
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} strokeWidth={on ? 3 : 2} className={cls} />
      )}
    </g>
  );
}
