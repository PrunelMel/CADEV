// Petites pièces de la page du concepteur : pastille d'état, bouton Publier (avec la liste de ce
// qui manque), bascule de mode, onglets, panneau coulissant, notification, états de chargement.
// Aucune logique métier : tout arrive par les props.

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  CloudOff,
  Loader2,
  Rocket,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { ApiError } from "../../../api/client";
import { blockDef, type ConfigIssue, type FormConfig } from "../model";
import type { SaveStatus } from "../state/useBuilder";
import { CTA_FILL, Glass, INK, INK2, INK3, MONO, PENDING_FILL, SOFT_BTN, SPRING } from "./kit";

/* ───────────────────────── anomalies de publication ───────────────────────── */

const PATH_LABEL: Record<string, string> = {
  title: "Titre du formulaire",
  blocks: "Formulaire",
  "storage.format": "Format d’enregistrement",
  "code.fields": "Champs du code importé",
  code: "Code importé",
  mode: "Mode",
};

export type Issue = { blockId: string | null; code?: boolean; path: string; text: string };

/** Rend une erreur de validation { path, message } lisible, avec le bloc concerné s'il y en a un. */
export function describeIssue(config: FormConfig, e: Pick<ConfigIssue, "path" | "message">): Issue {
  const m = /^blocks\[(\d+)\](?:\.(.+))?$/.exec(e.path ?? "");
  const block = m ? config.blocks?.[Number(m[1])] : null;
  if (block) {
    const type = blockDef(block.type)?.label ?? "Bloc";
    return {
      blockId: block.id,
      path: e.path,
      text: `${type}${block.label ? ` « ${block.label} »` : ""} : ${e.message}`,
    };
  }
  return {
    blockId: null,
    code: (e.path ?? "").startsWith("code"),
    path: e.path,
    text: `${PATH_LABEL[e.path] ?? (e.path || "Formulaire")} : ${e.message}`,
  };
}

/* ───────────────────────── état d'enregistrement ───────────────────────── */

export function StatusPill({
  status,
  dirty,
  error,
  onRetry,
}: {
  status: SaveStatus;
  dirty: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (status === "error") {
    const offline = !(error instanceof ApiError);
    return (
      <button
        type="button"
        onClick={onRetry}
        title={error instanceof Error ? error.message : undefined}
        className="pp-pill transition-colors hover:bg-[color:var(--accent-soft)]"
        style={{ color: "var(--danger)", borderColor: "rgba(248,113,113,.35)" }}
      >
        <CloudOff size={13} />
        {offline ? "Hors ligne" : "Échec"} · Réessayer
      </button>
    );
  }
  const saving = status === "saving";
  return (
    <span role="status" aria-live="polite" className="pp-pill">
      {saving ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <span
          aria-hidden
          className="pp-sq"
          style={
            dirty ? { background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" } : undefined
          }
        />
      )}
      {saving ? "Enregistrement…" : dirty ? "Modifications en attente" : "Enregistré"}
    </span>
  );
}

/* ───────────────────────── publication ───────────────────────── */

export function PublishButton({
  ready,
  busy,
  published,
  onClick,
  issues,
  open,
  onClose,
  onPickIssue,
  shakeKey,
}: {
  ready: boolean;
  busy: boolean;
  published: boolean;
  onClick: () => void;
  issues: Issue[];
  open: boolean;
  onClose: () => void;
  onPickIssue: (i: Issue) => void;
  shakeKey: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  // Secousse à chaque clic « pas prêt » ; l'API Web Animations garde le focus sur le bouton.
  useEffect(() => {
    if (!shakeKey || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const f = (x: number) => ({ transform: `translateX(${x}px)` });
    btn.current?.animate?.([f(0), f(-7), f(6), f(-4), f(3), f(0)], {
      duration: 450,
      easing: "ease",
    });
  }, [shakeKey]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);

  return (
    <div ref={box} className="relative">
      <motion.button
        ref={btn}
        type="button"
        onClick={onClick}
        disabled={busy}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING}
        aria-haspopup={ready ? undefined : "dialog"}
        aria-expanded={ready ? undefined : open}
        style={ready ? CTA_FILL : PENDING_FILL}
        className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Rocket size={16} strokeWidth={2.2} />
        )}
        {busy ? "Publication…" : published ? "Publier les modifications" : "Publier"}
      </motion.button>
      <AnimatePresence>
        {open && !ready && (
          <motion.div
            role="dialog"
            aria-label="Ce qu’il reste à faire avant de publier"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="lg lg-strong absolute top-[calc(100%+10px)] right-0 z-40 w-[min(380px,calc(100vw-32px))] rounded-[20px] p-4"
          >
            <p className={`mb-3 px-1 text-[11px] ${MONO} ${INK3}`}>Avant de publier</p>
            <ul className="space-y-1.5">
              {issues.map((i, n) => (
                <li key={`${i.path}-${n}`}>
                  <button
                    type="button"
                    onClick={() => onPickIssue(i)}
                    className={`flex w-full items-start gap-2.5 rounded-[12px] px-2.5 py-2 text-left text-[14px] leading-snug transition-colors hover:bg-[color:var(--accent-soft)] ${INK}`}
                  >
                    <TriangleAlert
                      size={15}
                      className="mt-0.5 shrink-0 text-[color:var(--accent-text)]"
                    />
                    <span className="min-w-0 flex-1">{i.text}</span>
                    <ChevronRight size={15} className={`mt-0.5 shrink-0 ${INK3}`} />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── bascule de mode et onglets ───────────────────────── */

export function ModeSwitch<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon: LucideIcon }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Façon de créer le formulaire"
      className="inline-flex rounded-full bg-[color:var(--chip)] p-1"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "" : `${INK2} hover:text-[color:var(--ink)]`}`}
            style={
              on
                ? {
                    background: "var(--accent-soft2)",
                    color: "var(--accent-text)",
                    boxShadow: "inset 0 0 0 1px var(--accent)",
                  }
                : undefined
            }
          >
            <Icon size={15} strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export type Tab<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string | number | null;
};

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    const step = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (step == null && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (i + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    document.getElementById(`cd-tab-${tabs[next].id}`)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Sections du concepteur"
      onKeyDown={onKeyDown}
      className="inline-flex max-w-full overflow-x-auto rounded-full bg-[color:var(--chip)] p-1"
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const on = value === id;
        return (
          <button
            key={id}
            id={`cd-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="cd-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={`relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
          >
            {on && (
              <motion.span
                layoutId="cd-tab-lens"
                className="pp-lens absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              <Icon size={15} strokeWidth={2.2} />
              {label}
              {badge != null && <span className={`text-[10.5px] ${MONO} ${INK3}`}>{badge}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── panneau coulissant (petits écrans) ───────────────────────── */

/** Feuille qui monte du bas : palette de blocs et inspecteur sur les petits écrans. */
export function Sheet({
  open,
  onClose,
  label,
  closable = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  closable?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-[color:var(--scrim)]"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="lg lg-strong fixed inset-x-0 bottom-0 z-[60] flex max-h-[86dvh] min-h-[50dvh] flex-col rounded-t-[28px] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-[640px]"
          >
            <span
              aria-hidden
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[color:var(--hair)]"
            />
            {closable && (
              <button
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                className={`${SOFT_BTN} absolute top-3 right-3 z-10`}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── notification, états ───────────────────────── */

export type Notice = { text: string; key: number } | null;

export function Toast({ notice }: { notice: Notice }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[65] flex justify-center px-4">
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.key}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={`lg lg-strong flex h-11 items-center rounded-full px-5 text-[14.5px] font-semibold ${INK}`}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CenterCard({
  title,
  children,
  action,
  busy,
  tone,
}: {
  title: string;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
  busy?: boolean;
  tone?: "error";
}) {
  return (
    <div className="col-span-full grid min-h-[60dvh] place-items-center">
      <Glass
        className="lg-strong w-full max-w-[460px] rounded-[26px] p-8 text-center"
        role={tone === "error" ? "alert" : "status"}
      >
        {busy && (
          <Loader2
            size={26}
            className="mx-auto mb-4 animate-spin text-[color:var(--accent)]"
            aria-hidden
          />
        )}
        <h1
          className="pp-wide pp-silver text-[18px] leading-tight"
          style={{ letterSpacing: ".14em" }}
        >
          {title}
        </h1>
        {children && (
          <div className={`mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed ${INK2}`}>
            {children}
          </div>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            style={CTA_FILL}
            className="mt-6 inline-flex h-11 items-center rounded-full px-6 text-[14.5px] font-semibold"
          >
            {action.label}
          </button>
        )}
      </Glass>
    </div>
  );
}
