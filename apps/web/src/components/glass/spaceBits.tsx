/**
 * Pièces communes aux espaces personnels en verre (tableau de bord, profil, organisation) :
 * bandeau, ligne cliquable et carte de dépôt compacte.
 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ChevronRight, Construction, Lock, TriangleAlert } from "lucide-react";
import type { RepoType } from "../../api/types";
import { PAL, type Tone } from "../../content/problem-form";
import { typeOptions } from "../../content/repo-form";
import { repoTypeLabels } from "../../content/site";
import { hexA, INK, INK2, INK3, SOFT_SPRING, Tile } from "./Glass";
import type { LucideIcon } from "lucide-react";

const AMBER = PAL.amber[0];
const TYPE_BY_ID = Object.fromEntries(typeOptions.map((t) => [t.id, t]));

/** Bandeau en verre en tête d'un espace. */
export function SpaceHero({
  labelledBy,
  className = "",
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
      aria-labelledby={labelledBy}
      className={`lg lg-stage relative overflow-hidden rounded-[30px] p-5 sm:p-8 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/** Pastille avec l'initiale d'un nom (membre, organisation). */
export const Initial = ({
  name,
  size = 36,
  c = PAL.amber,
}: {
  name: string;
  size?: number;
  c?: Tone;
}) => <Tile c={c} size={size} code={(name.trim() || "?").charAt(0).toUpperCase()} />;

/** Ligne cliquable d'une liste : pastille, titre, détails, élément de fin. */
export function RowCard({
  to,
  icon,
  tone = PAL.lav,
  lead,
  title,
  meta,
  end,
}: {
  to: string;
  icon?: LucideIcon;
  tone?: Tone;
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <Link to={to} className="pp-card group flex items-center gap-3.5 p-4">
      {lead ?? (icon && <Tile c={tone} size={38} icon={icon} />)}
      <span className="min-w-0 flex-1">
        <span className={`block text-[15.5px] leading-snug font-semibold ${INK}`}>{title}</span>
        {meta && <span className={`mt-0.5 block text-[13px] leading-snug ${INK3}`}>{meta}</span>}
      </span>
      {end}
      <ChevronRight
        size={18}
        className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${INK3}`}
      />
    </Link>
  );
}

/** Carte compacte d'un dépôt : type, nom, visibilité, étape, problème lié, description. */
export function RepoMini({
  owner,
  name,
  type,
  description,
  isPrivate = false,
  building = false,
  problem,
  to = `/${owner}/${name}`,
}: {
  owner: string;
  name: string;
  type: RepoType;
  description?: string;
  isPrivate?: boolean;
  building?: boolean;
  problem?: { title: string; closed: boolean };
  to?: string;
}) {
  const t = TYPE_BY_ID[type];
  return (
    <Link to={to} className="pp-card flex h-full flex-col gap-2.5 p-4">
      <span className="flex items-start gap-3">
        {t && <Tile c={t.c} size={38} icon={t.icon} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-[family-name:var(--font-mono)] text-[14.5px]">
            <span className={INK3}>{owner}/</span>
            <span className={INK}>{name}</span>
          </span>
          <span className={`flex flex-wrap items-center gap-x-3 text-[12.5px] ${INK3}`}>
            {repoTypeLabels[type]}
            {isPrivate && (
              <span className="inline-flex items-center gap-1">
                <Lock size={12} /> Privé
              </span>
            )}
            {building && (
              <span className="inline-flex items-center gap-1">
                <Construction size={13} style={{ color: AMBER }} /> En construction
              </span>
            )}
          </span>
        </span>
      </span>
      {description && (
        <span className={`line-clamp-2 text-[14px] leading-snug ${INK2}`}>{description}</span>
      )}
      {problem && (
        <span
          className="mt-auto flex items-start gap-1.5 text-[12.5px] leading-snug"
          style={problem.closed ? { color: AMBER } : undefined}
        >
          {problem.closed && <TriangleAlert size={13} className="mt-0.5 shrink-0" />}
          <span className={problem.closed ? "" : INK3}>
            {problem.closed ? "Problème fermé : " : "Répond à "}« {problem.title} »
          </span>
        </span>
      )}
    </Link>
  );
}

/** Teinte douce pour une mise en garde dans une ligne. */
export const amberNote = { color: AMBER, background: hexA(AMBER, 0.1) };
