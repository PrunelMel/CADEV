// Panneau de gauche : recherche + cartes de blocs à glisser vers le formulaire.
// Chaque carte se saisit à la souris, au doigt ou au clavier (Espace, flèches, Espace) et possède
// un bouton « + » qui ajoute le bloc sans glisser (accessibilité, mobile).

import { useDraggable } from "@dnd-kit/core";
import { Check, PenLine, Plus, Search, X } from "lucide-react";
import type { Tone } from "../../../content/problem-form";
import { BLOCK_CATEGORIES, BLOCK_TYPES, searchBlocks, type BlockType } from "../model";
import { Glass, Group, hexA, ICONS, INK, INK2, INK3, PanelHead, SOFT_BTN, toneOf } from "./kit";

const dim = "bg-[color:var(--chip)]";

/** Mini-maquette du rendu de chaque bloc : on reconnaît le bloc avant de le déposer. */
function Mock({ type, c }: { type: BlockType; c: Tone }) {
  const line = (w: string, extra = "") => (
    <span className={`block h-2 rounded-full ${dim} ${extra}`} style={{ width: w }} />
  );
  const box = "rounded-[8px] bg-[color:var(--field)] px-2.5 py-2";
  const ring = { boxShadow: "inset 0 0 0 1px var(--field-line)" };
  switch (type) {
    case "audio":
      return (
        <svg viewBox="0 0 120 40" className="h-9 w-[104px]" aria-hidden>
          {[10, 22, 14, 30, 18, 34, 12, 26, 32, 16, 24, 10, 20, 28, 12].map((h, i) => (
            <rect
              key={i}
              x={4 + i * 7.6}
              y={20 - h / 2}
              width="4"
              height={h}
              rx="2"
              fill={c[0]}
              fillOpacity={i < 8 ? 0.95 : 0.4}
            />
          ))}
        </svg>
      );
    case "video":
      return (
        <span
          className="grid h-[46px] w-[78px] place-items-center rounded-[10px]"
          style={{ background: hexA(c[1], 0.22), boxShadow: `inset 0 0 0 1px ${hexA(c[0], 0.4)}` }}
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path d="M8 5.5v13l11-6.5z" fill={c[0]} />
          </svg>
        </span>
      );
    case "image":
    case "gif":
      return (
        <span
          className="relative block h-[46px] w-[78px] overflow-hidden rounded-[10px]"
          style={{ background: hexA(c[1], 0.2), boxShadow: `inset 0 0 0 1px ${hexA(c[0], 0.4)}` }}
        >
          <span
            className="absolute top-2 right-2 size-3 rounded-full"
            style={{ background: c[0] }}
          />
          <svg viewBox="0 0 78 46" className="absolute inset-0" aria-hidden>
            <path d="M0 46V34l18-14 14 11 12-8 34 17v6z" fill={c[0]} fillOpacity=".55" />
          </svg>
          {type === "gif" && (
            <span className="pp-mono absolute bottom-1 left-1.5 text-[9px]" style={{ color: c[0] }}>
              gif
            </span>
          )}
        </span>
      );
    case "text":
      return (
        <span className={`${box} flex h-9 w-[104px] items-center`} style={ring}>
          <span className="h-4 w-px" style={{ background: c[0] }} />
          {line("46%", "ml-2")}
        </span>
      );
    case "textarea":
      return (
        <span className={`${box} block w-[104px] space-y-1.5`} style={ring}>
          {line("90%")}
          {line("72%")}
          {line("40%")}
        </span>
      );
    case "email":
      return (
        <span className={`${box} flex h-9 w-[104px] items-center gap-2`} style={ring}>
          <b
            className="text-[13px] font-medium"
            style={{ color: c[0], fontFamily: "var(--font-mono)" }}
          >
            @
          </b>
          {line("52%")}
        </span>
      );
    case "radio":
    case "checkbox":
      return (
        <span className="block w-[104px] space-y-1.5">
          {[true, false].map((on) => (
            <span key={String(on)} className={`${box} flex items-center gap-2 py-1.5`} style={ring}>
              <span
                className={`size-3 border ${type === "radio" ? "rounded-full" : "rounded-[4px]"}`}
                style={{
                  borderColor: on ? c[0] : "var(--field-line)",
                  background: on ? c[0] : "transparent",
                }}
              />
              {line(on ? "60%" : "44%")}
            </span>
          ))}
        </span>
      );
    case "select":
      return (
        <span className={`${box} flex h-9 w-[104px] items-center justify-between`} style={ring}>
          {line("48%")}
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <path
              d="M2 4.5l4 3.5 4-3.5"
              fill="none"
              stroke={c[0]}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    case "validation":
      return (
        <span className="block w-[104px] space-y-1.5">
          <span className={`${box} flex items-center gap-2 py-1.5`} style={ring}>
            {line("70%")}
          </span>
          <span className="flex gap-1.5">
            <span
              className="grid h-6 flex-1 place-items-center rounded-full"
              style={{ background: hexA(c[0], 0.3), color: c[0] }}
            >
              <Check size={12} strokeWidth={3} />
            </span>
            <span
              className={`grid h-6 flex-1 place-items-center rounded-full ${dim}`}
              style={{ color: c[0] }}
            >
              <PenLine size={12} strokeWidth={2.4} />
            </span>
          </span>
        </span>
      );
    default:
      return null;
  }
}

/** Bandeau teinté : fond marine, deux halos au ton du bloc, trame de points, icône en filigrane. */
export function BlockThumb({ type, height = 84 }: { type: BlockType; height?: number }) {
  const def = BLOCK_TYPES[type];
  const c = toneOf(def.tone);
  const Icon = ICONS[def.icon];
  return (
    <div className="relative overflow-hidden bg-[#0A0F1D]" style={{ height }} aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 170% at 100% 0%, ${hexA(c[0], 0.3)}, transparent 62%), radial-gradient(90% 130% at 0% 100%, ${hexA(c[1], 0.16)}, transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200,206,226,.55) 1.1px, transparent 1.6px)",
          backgroundSize: "11px 11px",
          WebkitMaskImage: "linear-gradient(100deg, transparent 8%, #000 88%)",
          maskImage: "linear-gradient(100deg, transparent 8%, #000 88%)",
        }}
      />
      <Icon
        aria-hidden
        size={92}
        strokeWidth={1.1}
        className="absolute -top-3 -right-3 rotate-[12deg]"
        style={{ color: hexA(c[0], 0.28) }}
      />
      <div className="relative grid h-full place-items-center">
        <Mock type={type} c={c} />
      </div>
    </div>
  );
}

function PaletteCard({ type, onAdd }: { type: BlockType; onAdd: (t: BlockType) => void }) {
  const def = BLOCK_TYPES[type];
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
  });
  return (
    <div
      ref={setNodeRef}
      className={`pp-card flex flex-col overflow-hidden transition-opacity ${isDragging ? "opacity-40" : ""}`}
      data-palette={type}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${def.label} : glisser dans le formulaire`}
        className="cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] active:cursor-grabbing"
      >
        <BlockThumb type={type} />
      </div>
      <div className="flex items-start gap-2 p-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <p className={`text-[14.5px] leading-tight font-semibold ${INK}`}>{def.label}</p>
          <p className={`mt-1 text-[12.5px] leading-snug ${INK3}`}>{def.hint}</p>
        </div>
        <button
          type="button"
          aria-label={`Ajouter ${def.label}`}
          onClick={() => onAdd(type)}
          className={`${SOFT_BTN} -mt-0.5 -mr-1 bg-[color:var(--chip)]`}
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

/** Carte flottante qui suit le pointeur pendant le glisser (DragOverlay). */
export function PaletteGhost({ type }: { type: BlockType }) {
  return (
    <div
      className="pp-card w-[200px] overflow-hidden"
      style={{
        boxShadow: "inset 0 0 0 1px var(--accent), 0 24px 50px -16px rgba(162,154,240,.55)",
        background: "var(--glass2)",
      }}
    >
      <BlockThumb type={type} height={64} />
      <p className={`px-3 py-2.5 text-[14.5px] font-semibold ${INK}`}>{BLOCK_TYPES[type].label}</p>
    </div>
  );
}

export function BlockPalette({
  query,
  onQuery,
  onAdd,
}: {
  query: string;
  onQuery: (q: string) => void;
  onAdd: (t: BlockType) => void;
}) {
  const ids = searchBlocks(query);
  const groups = BLOCK_CATEGORIES.map((c) => ({
    ...c,
    ids: ids.filter((id) => BLOCK_TYPES[id].category === c.id),
  })).filter((g) => g.ids.length);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHead
        title="Quel bloc ajouter ?"
        subtitle="Glissez-le dans le formulaire, ou touchez le +."
      />
      <Glass className="flex h-[52px] shrink-0 items-center gap-3 rounded-full pr-2 pl-4 focus-within:shadow-[0_0_0_4px_var(--accent-ring),0_14px_34px_-14px_var(--shade)]">
        <Search size={18} className={`shrink-0 ${INK2}`} strokeWidth={2.2} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQuery("");
          }}
          aria-label="Rechercher un bloc"
          placeholder="Nom ou attribut : audio, choix, e-mail…"
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent text-[15.5px] font-medium outline-none placeholder:font-normal placeholder:text-[color:var(--ink3)] [&::-webkit-search-cancel-button]:hidden ${INK}`}
        />
        {query && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => onQuery("")}
            className={SOFT_BTN}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        )}
      </Glass>
      <div className="pp-scroll mt-3 -mr-2 min-h-0 flex-1 overflow-y-auto pr-2 pb-2">
        {groups.map((g) => (
          <Group key={g.id} title={g.label} note={String(g.ids.length)} className="space-y-3 pt-4">
            <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-1 min-[1180px]:grid-cols-2">
              {g.ids.map((id) => (
                <PaletteCard key={id} type={id} onAdd={onAdd} />
              ))}
            </div>
          </Group>
        ))}
        {groups.length === 0 && (
          <p className={`px-1 pt-6 text-[14.5px] ${INK3}`}>
            Aucun bloc ne correspond à « {query} »
          </p>
        )}
      </div>
    </div>
  );
}
