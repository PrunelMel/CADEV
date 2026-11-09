/** Petites pièces communes aux pages de problèmes en verre (liste et fiche). */
import { BadgeCheck, CircleDot, Lock, Shapes, type LucideIcon } from "lucide-react";
import type { ProblemStatus } from "../../api/types";
import { countryInfo } from "../../content/countries";
import { sectorOptions } from "../../content/problem-form";
import { problemStatusLabels } from "../../content/site";

export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const codeOf = (country: string) => countryInfo(country)?.code ?? null;
export const sectorIcon = (label: string) =>
  sectorOptions.find((s) => s.label === label)?.icon ?? Shapes;

const STATUS_ICON: Record<ProblemStatus, { icon: LucideIcon; color: string }> = {
  open: { icon: CircleDot, color: "var(--ok)" },
  solved: { icon: BadgeCheck, color: "var(--accent)" },
  closed: { icon: Lock, color: "var(--danger)" },
};

/** Statut d'un problème : une icône seule, son nom en infobulle et pour les lecteurs d'écran. */
export function StatusIcon({ status, size = 20 }: { status: ProblemStatus; size?: number }) {
  const { icon: Icon, color } = STATUS_ICON[status];
  return (
    <span title={problemStatusLabels[status]} className="shrink-0 pt-0.5" style={{ color }}>
      <Icon size={size} strokeWidth={1.9} aria-hidden />
      <span className="sr-only">{problemStatusLabels[status]}</span>
    </span>
  );
}
