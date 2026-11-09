// Logique PURE du glisser-déposer (aucune dépendance à React ni à dnd-kit) : on décide ici quoi
// faire d'un dépôt. Le composant ne fait que brancher les événements de dnd-kit sur ces fonctions.
//
// Identifiants de zones :
//   'canvas'          le formulaire (liste vide, ou fin de liste)
//   'link:<anchorId>' zone « lier à ce bloc » d'une ancre
//   '<anchorId>'      une unité (ancre + blocs liés) du formulaire
// Sources :
//   { kind: 'palette', type }   carte de la palette
//   { kind: 'unit', id }        unité déjà placée dans le formulaire

import type { CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import { units, type BlockType, type FormConfig } from "../model";
import type { BuilderAction } from "./builderReducer";

export const LINK_PREFIX = "link:";
export const CANVAS_ID = "canvas";
export const isLinkId = (id: UniqueIdentifier | null | undefined) =>
  String(id ?? "").startsWith(LINK_PREFIX);
export const anchorOf = (id: UniqueIdentifier) => String(id).slice(LINK_PREFIX.length);

export type DragSource = { kind: "palette"; type: BlockType } | { kind: "unit"; id: string };
export type Position = "before" | "after";
export type InsertHint = { overId: string; position: Position } | null;

/** Le pointeur est-il dans la moitié haute ou basse de la cible ? */
export function insertPosition(pointerY: number, rect: { top: number; height: number }): Position {
  return pointerY < rect.top + rect.height / 2 ? "before" : "after";
}

/**
 * Convertit un dépôt en action du reducer, ou null quand il n'y a rien à faire.
 * `position` ne sert qu'aux cartes de la palette (les unités déjà placées suivent l'animation
 * de tri : l'élément prend la place de la cible).
 */
export function dropToAction({
  source,
  overId,
  config,
  position = "before",
}: {
  source: DragSource | null;
  overId: UniqueIdentifier | null | undefined;
  config: FormConfig;
  position?: Position;
}): BuilderAction | null {
  const over = overId == null ? "" : String(overId);
  if (!over || !source) return null;
  const list = units(config.blocks);

  if (source.kind === "palette") {
    if (isLinkId(over)) return { type: "ADD", blockType: source.type, linkedTo: anchorOf(over) };
    if (over === CANVAS_ID) return { type: "ADD", blockType: source.type };
    const i = list.findIndex((u) => u.anchor.id === over);
    if (i < 0) return null;
    return { type: "ADD", blockType: source.type, unitIndex: position === "after" ? i + 1 : i };
  }

  if (isLinkId(over)) {
    const anchorId = anchorOf(over);
    return anchorId === source.id ? null : { type: "LINK", id: source.id, anchorId };
  }
  if (over === CANVAS_ID) return null;
  const from = list.findIndex((u) => u.anchor.id === source.id);
  const to = list.findIndex((u) => u.anchor.id === over);
  return from < 0 || to < 0 || from === to ? null : { type: "MOVE_UNIT", from, to };
}

/**
 * Repère d'insertion affiché pendant le glisser d'une carte de la palette. Pour une unité déjà
 * placée, l'animation de tri montre déjà où elle va tomber : pas de repère.
 */
export function insertionHint(
  {
    source,
    overId,
    pointerY,
  }: { source: DragSource; overId: UniqueIdentifier | null; pointerY: number | null },
  rect: { top: number; height: number } | null,
): InsertHint {
  if (source.kind !== "palette" || !rect || pointerY == null) return null;
  const over = overId == null ? "" : String(overId);
  if (!over || over === CANVAS_ID || isLinkId(over)) return null;
  return { overId: over, position: insertPosition(pointerY, rect) };
}

/**
 * Détection de collision : la zone « lier » sous le pointeur l'emporte ; sinon l'unité la plus
 * proche ; sinon le formulaire lui-même (liste vide).
 */
export function makeCollisionDetection({
  pointerWithin,
  closestCenter,
}: {
  pointerWithin: CollisionDetection;
  closestCenter: CollisionDetection;
}): CollisionDetection {
  return (args) => {
    const all = args.droppableContainers;
    const links = all.filter((c) => isLinkId(c.id));
    const hit = links.length ? pointerWithin({ ...args, droppableContainers: links }) : [];
    if (hit.length) return hit;
    const items = all.filter((c) => c.id !== CANVAS_ID && !isLinkId(c.id));
    if (items.length) {
      const near = closestCenter({ ...args, droppableContainers: items });
      if (near.length) return near;
    }
    return pointerWithin({ ...args, droppableContainers: all.filter((c) => c.id === CANVAS_ID) });
  };
}
