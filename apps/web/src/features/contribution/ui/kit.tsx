// Briques de la charte propres à la contribution de données. Les primitives communes (Glass,
// Tile, couleurs, ressorts) viennent de components/glass/Glass.tsx.

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignLeft,
  AudioLines,
  Check,
  ChevronsUpDown,
  CircleDot,
  Film,
  Image,
  Mail,
  ShieldCheck,
  SquareCheck,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  CTA_FILL,
  DISPLAY,
  INK,
  INK2,
  INK3,
  SOFT_SPRING,
  SPRING,
} from "../../../components/glass/Glass";
import { PAL, type Tone } from "../../../content/problem-form";
import "./contribution.css";

export {
  ACCENT_FILL,
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  MONO,
  SPRING,
  Tile,
  WIDE,
} from "../../../components/glass/Glass";
export { PAL };

/** Action pas encore prête : reste cliquable (elle secoue la barre ou liste ce qui manque). */
export const PENDING_FILL = {
  color: "var(--accent-text)",
  background: "var(--accent-soft)",
  boxShadow: "inset 0 0 0 1px rgba(162,154,240,.3)",
};
export const SOFT_BTN =
  "grid size-8 place-items-center rounded-full text-[color:var(--ink2)] transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent-text)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[color:var(--ink2)]";

export const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.2, 0.9, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.18 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: SOFT_SPRING },
};

/** Icônes des types de blocs, par le nom déclaré dans le modèle. */
export const ICONS: Record<string, LucideIcon> = {
  Image,
  Video,
  AudioLines,
  Film,
  Type,
  AlignLeft,
  Mail,
  CircleDot,
  SquareCheck,
  ChevronsUpDown,
  ShieldCheck,
};

/** Teinte d'un type de bloc (clé de PAL déclarée dans le modèle). */
export const toneOf = (tone: string): Tone => (PAL as Record<string, Tone>)[tone] ?? PAL.slate;

/** Titre de groupe : carré vert + Montserrat argenté + filet + note facultative. */
export function Group({
  title,
  note,
  children,
  className = "space-y-5 pt-4",
}: {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="pp-sq" />
        <h2
          className="pp-wide pp-silver text-[12.5px] leading-none"
          style={{ letterSpacing: ".24em", fontWeight: 600 }}
        >
          {title}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[color:var(--hair)]" />
        {note && <span className={`pp-mono text-[11px] ${INK3}`}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function ProgressRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 11;
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--hair)" strokeWidth="3.2" />
      <circle
        cx="14"
        cy="14"
        r="11"
        fill="none"
        stroke={pct >= 1 ? "var(--ok)" : "var(--accent)"}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.min(1, Math.max(0, pct)))}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.9,.3,1), stroke .3s" }}
      />
    </svg>
  );
}

/** Titre de panneau : question ou consigne courte en Bebas, deux lignes au plus. */
export function PanelHead({
  title,
  subtitle,
  className = "mb-4 px-1",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2
        className={`text-[clamp(32px,3.4vh+12px,46px)] leading-[1] [text-wrap:balance] ${DISPLAY} ${INK}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-2 max-w-[56ch] text-[14.5px] leading-snug ${INK2}`}>{subtitle}</p>
      )}
    </div>
  );
}

/** Interrupteur accessible (rôle switch), état actif en lavande. */
export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{
        background: checked ? "var(--accent-soft2)" : "var(--chip)",
        boxShadow: `inset 0 0 0 1px ${checked ? "var(--accent)" : "var(--field-line)"}`,
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 size-5 rounded-full transition-transform duration-300"
        style={{
          background: checked ? "var(--accent)" : "var(--ink3)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

type ModalAction = { label: string; onClick: () => void };

/** Modale de confirmation : le vert est ici un état de réussite. */
export function SuccessModal({
  open,
  title,
  message,
  chips = [],
  primary,
  secondary,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  chips?: string[];
  primary?: ModalAction;
  secondary?: ModalAction;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            aria-hidden
            onClick={onClose}
            className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cd-done-title"
            initial={{ scale: 0.86, y: 36, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="lg lg-strong relative w-full max-w-[480px] rounded-[26px] p-8 text-center"
          >
            <span
              className="mx-auto grid size-20 place-items-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 35%, rgba(74,222,128,.22), rgba(74,222,128,.05) 70%)",
                boxShadow: "inset 0 0 0 1.5px #4ADE80, 0 0 44px -6px rgba(74,222,128,.55)",
              }}
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4ADE80"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                />
              </svg>
            </span>
            <h2
              id="cd-done-title"
              className="pp-wide pp-silver mt-6 text-[22px] leading-tight"
              style={{ letterSpacing: ".14em" }}
            >
              {title}
            </h2>
            {message && (
              <p className={`mx-auto mt-2 max-w-[36ch] text-[15.5px] leading-relaxed ${INK2}`}>
                {message}
              </p>
            )}
            {chips.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {chips.map((c) => (
                  <span
                    key={c}
                    className={`inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--chip)] pr-3.5 pl-3 text-[13.5px] font-semibold ${INK}`}
                  >
                    <Check size={14} strokeWidth={2.6} className="text-[color:var(--ok)]" />
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-7 flex gap-2.5">
              {secondary && (
                <button
                  type="button"
                  onClick={secondary.onClick}
                  className={`lg flex h-12 flex-1 items-center justify-center rounded-[12px] text-[15px] font-semibold ${INK}`}
                >
                  {secondary.label}
                </button>
              )}
              {primary && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  onClick={primary.onClick}
                  style={CTA_FILL}
                  className="flex h-12 flex-[1.5] items-center justify-center rounded-[12px] text-[15px] font-semibold"
                >
                  {primary.label}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { PageShell } from "../../../components/glass/PageShell";
