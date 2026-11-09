// Panneau de droite : le formulaire tel que le contributeur le verra, édité en place.
// Disposition verticale (v1). Les blocs se réordonnent par glisser-déposer (poignée ou clavier),
// l'intitulé se renomme directement dans la carte, et un bloc déposé sur la zone « lier » d'une
// ancre rejoint son groupe.

import { useState, type Dispatch, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  GripVertical,
  Link2,
  MousePointerClick,
  SlidersHorizontal,
  Trash2,
  Unlink2,
} from "lucide-react";
import { BLOCK_TYPES, LIMITS, units, type Block, type FormConfig, type Unit } from "../model";
import type { BuilderAction } from "../state/builderReducer";
import type { InsertHint } from "../state/dnd";
import { BlockBody } from "./BlockBody";
import { AccentTitle } from "./FormRenderer";
import { ACCENT_TEXT, ICONS, INK, INK2, INK3, SOFT_BTN, Tile, toneOf } from "./kit";

type Dispatcher = Dispatch<BuilderAction>;
export type ActiveDrag =
  { kind: "palette"; type: Block["type"] } | { kind: "unit"; id: string } | null;

const InsertLine = () => <div aria-hidden className="pp-insert my-1.5" />;

function LinkSlot({ anchorId }: { anchorId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `link:${anchorId}`,
    data: { kind: "link", anchorId },
  });
  return (
    <div
      ref={setNodeRef}
      data-over={isOver}
      className="pp-slot mt-3 flex min-h-[44px] items-center justify-center gap-2 px-3 text-[13.5px]"
    >
      <Link2 size={15} />
      Déposer ici pour lier à ce bloc
    </div>
  );
}

/** Intitulé éditable en place : mono capitales comme chez le contributeur. */
function EditableLabel({ block, dispatch }: { block: Block; dispatch: Dispatcher }) {
  return (
    <input
      value={block.label}
      maxLength={LIMITS.label}
      placeholder="Intitulé du bloc"
      aria-label="Intitulé du bloc"
      onFocus={() => dispatch({ type: "SELECT", id: block.id })}
      onChange={(e) =>
        dispatch({ type: "UPDATE", id: block.id, patch: { label: e.target.value }, at: Date.now() })
      }
      className={`pp-labelinput pp-mono min-w-0 text-[12px] leading-snug ${INK2}`}
    />
  );
}

/** Rend les champs inertes pendant la conception (pas de prop `inert` dans React 18). */
const inertRef = (inert: boolean) => (el: HTMLDivElement | null) => {
  if (!el) return;
  if (inert) el.setAttribute("inert", "");
  else el.removeAttribute("inert");
};

function BlockCard({
  block,
  selected,
  dispatch,
  resourceUrl,
  onInspect,
  member = false,
  handle,
  children,
}: {
  block: Block;
  selected: boolean;
  dispatch: Dispatcher;
  resourceUrl: (id: string) => string;
  onInspect?: (id: string) => void;
  member?: boolean;
  handle?: ReactNode;
  children?: ReactNode;
}) {
  const def = BLOCK_TYPES[block.type];
  const Icon = ICONS[def.icon];
  const isMedia = "mediaKind" in def;
  const action = (label: string, onClick: () => void, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={SOFT_BTN}
    >
      {icon}
    </button>
  );
  return (
    <div
      className="pp-card group p-4"
      data-selected={selected}
      data-block-card={block.id}
      style={member ? { borderRadius: 16 } : undefined}
      onClick={() => dispatch({ type: "SELECT", id: block.id })}
    >
      <div className="flex items-center gap-2.5">
        {handle ?? <span className="w-1.5" />}
        <Tile c={toneOf(def.tone)} size={34} icon={Icon} />
        <div className="min-w-0 flex-1">
          <EditableLabel block={block} dispatch={dispatch} />
        </div>
        {def.collects && block.required && (
          <span
            className={`pp-mono hidden rounded-full bg-[color:var(--accent-soft)] px-2 py-1 text-[10px] leading-none sm:block ${ACCENT_TEXT}`}
          >
            Obligatoire
          </span>
        )}
        <div
          className={`flex shrink-0 items-center gap-0.5 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
        >
          {onInspect &&
            action("Réglages du bloc", () => onInspect(block.id), <SlidersHorizontal size={15} />)}
          {member &&
            action(
              "Délier ce bloc",
              () => dispatch({ type: "UNLINK", id: block.id }),
              <Unlink2 size={15} />,
            )}
          {action(
            "Dupliquer le bloc",
            () => dispatch({ type: "DUPLICATE", id: block.id }),
            <Copy size={15} />,
          )}
          {action(
            "Supprimer le bloc",
            () => dispatch({ type: "REMOVE", id: block.id }),
            <Trash2 size={15} />,
          )}
        </div>
      </div>
      {/* les champs sont inertes pendant la conception ; les médias restent lisibles pour vérifier le fichier */}
      <div
        className="mt-3.5"
        ref={inertRef(!isMedia)}
        aria-hidden={isMedia ? undefined : true}
        style={isMedia ? undefined : { pointerEvents: "none" }}
      >
        <BlockBody
          block={block}
          mode="edit"
          resourceUrl={resourceUrl}
          onPickMedia={() => dispatch({ type: "SELECT", id: block.id })}
        />
      </div>
      {block.help && <p className={`mt-2.5 px-1 text-[13px] leading-snug ${INK3}`}>{block.help}</p>}
      {children}
    </div>
  );
}

function SortableUnit({
  unit,
  selectedId,
  dispatch,
  resourceUrl,
  onInspect,
  hint,
  linking,
  activeId,
}: {
  unit: Unit;
  selectedId: string | null;
  dispatch: Dispatcher;
  resourceUrl: (id: string) => string;
  onInspect?: (id: string) => void;
  hint: InsertHint;
  linking: boolean;
  activeId: string | null;
}) {
  const { anchor, members } = unit;
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: anchor.id, data: { kind: "unit" } });
  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Déplacer le bloc « ${anchor.label || BLOCK_TYPES[anchor.type].label} » (Espace puis flèches)`}
      className={`${SOFT_BTN} -ml-1 cursor-grab touch-none active:cursor-grabbing`}
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      {hint?.overId === anchor.id && hint.position === "before" && <InsertLine />}
      <BlockCard
        block={anchor}
        selected={selectedId === anchor.id}
        dispatch={dispatch}
        resourceUrl={resourceUrl}
        onInspect={onInspect}
        handle={handle}
      >
        {members.length > 0 && (
          <div className="mt-4 space-y-3 border-l-2 border-[color:var(--accent-soft2)] pl-3.5">
            {members.map((m) => (
              <BlockCard
                key={m.id}
                block={m}
                member
                selected={selectedId === m.id}
                dispatch={dispatch}
                resourceUrl={resourceUrl}
                onInspect={onInspect}
              />
            ))}
          </div>
        )}
        {linking && activeId !== anchor.id && members.length + 1 < LIMITS.linkGroup && (
          <LinkSlot anchorId={anchor.id} />
        )}
      </BlockCard>
      {hint?.overId === anchor.id && hint.position === "after" && <InsertLine />}
    </div>
  );
}

/** Texte cliquable qui devient un champ : garde le rendu final (dernier mot en lavande). */
function EditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const size = "text-[clamp(34px,3.4vh+12px,52px)]";
  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={LIMITS.title}
        aria-label="Titre du formulaire"
        placeholder="Titre du formulaire"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
        className={`pp-field pp-display w-full bg-transparent px-3 py-1 leading-[1.1] outline-none ${size} ${INK}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Modifier le titre du formulaire"
      className="block w-full rounded-[10px] text-left transition-colors hover:bg-[color:var(--accent-soft)]"
    >
      {value ? (
        <AccentTitle text={value} className={size} as="span" />
      ) : (
        <span className={`pp-display ${size} leading-[.95] ${INK3}`}>Titre du formulaire</span>
      )}
    </button>
  );
}

function EditableIntro({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="pp-field">
        <textarea
          autoFocus
          value={value}
          maxLength={LIMITS.intro}
          aria-label="Texte d’introduction"
          placeholder="Une ou deux phrases qui disent au contributeur quoi faire"
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className={`block max-h-[220px] min-h-[84px] w-full resize-none bg-transparent px-4 py-3 text-[16px] leading-relaxed outline-none [field-sizing:content] ${INK}`}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Modifier le texte d’introduction"
      className="block w-full rounded-[10px] px-1 text-left transition-colors hover:bg-[color:var(--accent-soft)]"
    >
      {value ? (
        <span
          className={`block max-w-[52ch] text-[16.5px] leading-relaxed whitespace-pre-line ${INK2}`}
        >
          {value}
        </span>
      ) : (
        <span className={`block text-[15px] leading-relaxed ${INK3}`}>
          Ajouter un texte d’introduction…
        </span>
      )}
    </button>
  );
}

/** `onInspect` : ouvre les réglages d'un bloc quand l'inspecteur n'est pas affiché à côté. */
export function Canvas({
  config,
  selectedId,
  dispatch,
  resourceUrl,
  onInspect,
  hint,
  activeDrag,
}: {
  config: FormConfig;
  selectedId: string | null;
  dispatch: Dispatcher;
  resourceUrl: (id: string) => string;
  onInspect?: (id: string) => void;
  hint: InsertHint;
  activeDrag: ActiveDrag;
}) {
  const list = units(config.blocks);
  const { setNodeRef, isOver } = useDroppable({ id: "canvas", data: { kind: "canvas" } });
  const dragging = !!activeDrag;
  const linking =
    dragging &&
    !(
      activeDrag.kind === "unit" && list.find((u) => u.anchor.id === activeDrag.id)?.members.length
    );
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <EditableTitle
          value={config.title}
          onChange={(title) => dispatch({ type: "SET_META", patch: { title }, at: Date.now() })}
        />
        <EditableIntro
          value={config.intro}
          onChange={(intro) => dispatch({ type: "SET_META", patch: { intro }, at: Date.now() })}
        />
      </div>
      <div ref={setNodeRef} className="space-y-3">
        {list.length === 0 && (
          <div
            className="pp-slot grid min-h-[220px] place-items-center px-6 py-10 text-center"
            data-over={isOver}
          >
            <div className="max-w-[34ch] space-y-3">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
                <MousePointerClick size={22} />
              </span>
              <p className={`text-[16px] font-semibold ${INK}`}>Glissez un bloc ici</p>
              <p className="text-[14px] leading-snug">
                Commencez par un bloc audio, image ou vidéo, puis ajoutez les champs à remplir. Sur
                mobile, touchez le + d’un bloc.
              </p>
            </div>
          </div>
        )}
        <SortableContext
          items={list.map((u) => u.anchor.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.map((u) => (
            <SortableUnit
              key={u.anchor.id}
              unit={u}
              selectedId={selectedId}
              dispatch={dispatch}
              resourceUrl={resourceUrl}
              onInspect={onInspect}
              hint={hint}
              linking={linking}
              activeId={activeDrag?.kind === "unit" ? activeDrag.id : null}
            />
          ))}
        </SortableContext>
        {list.length > 0 && dragging && (
          <div
            className="pp-slot grid min-h-[56px] place-items-center text-[13.5px]"
            data-over={isOver}
          >
            Déposer ici pour ajouter à la fin
          </div>
        )}
      </div>
    </div>
  );
}

/** Fantôme affiché sous le pointeur quand on déplace un bloc existant. */
export function UnitGhost({ block }: { block: Block }) {
  const def = BLOCK_TYPES[block.type];
  return (
    <div
      className="pp-card flex w-[320px] items-center gap-3 p-3"
      style={{
        background: "var(--glass2)",
        boxShadow: "inset 0 0 0 1px var(--accent), 0 24px 50px -16px rgba(162,154,240,.55)",
      }}
    >
      <Tile c={toneOf(def.tone)} size={34} icon={ICONS[def.icon]} />
      <span className={`min-w-0 flex-1 truncate text-[14.5px] font-semibold ${INK}`}>
        {block.label || def.label}
      </span>
    </div>
  );
}
