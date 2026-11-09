/**
 * Pièces des fiches en verre à onglets (problème, dépôt, pull request) : barre d'onglets collante,
 * titres de section, listes révélées au défilement, champs, discussion.
 */
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Send, type LucideIcon } from "lucide-react";
import { useSession } from "../../api/auth";
import { useAddDiscussion, useDiscussions } from "../../api/hooks";
import type { Discussion } from "../../api/types";
import { PAL } from "../../content/problem-form";
import { ErrorText } from "../ui";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  INK,
  INK2,
  INK3,
  MONO,
  SOFT_SPRING,
  Tile,
} from "./Glass";
import { ListMessage } from "./MasterDetail";
import { formatDate } from "./problemBits";

/** Classe des champs de saisie en verre. */
export const FIELD = "pp-field block w-full bg-transparent px-4 text-[15.5px] outline-none";

export type TabDef<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
};

/**
 * Onglet courant dans l'URL (`?onglet=`, absent pour le premier). Changer d'onglet plus bas que
 * la barre remonte celle-ci en haut, pour lire le nouvel onglet depuis son début.
 */
export function useTab<T extends string>(ids: readonly T[], legacy?: (v: string) => T | null) {
  const [params, setParams] = useSearchParams();
  const anchor = useRef<HTMLDivElement>(null);
  const raw = params.get("onglet") ?? params.get("tab");
  const tab = (ids.find((t) => t === raw) ?? (raw && legacy?.(raw)) ?? ids[0]) as T;
  const setTab = (next: T, extra: Record<string, string | null> = {}) => {
    const el = anchor.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 76;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
    }
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete("tab");
        if (next === ids[0]) n.delete("onglet");
        else n.set("onglet", next);
        for (const [k, v] of Object.entries(extra)) {
          if (v === null) n.delete(k);
          else n.set(k, v);
        }
        return n;
      },
      { replace: true },
    );
  };
  return { tab, setTab, anchor };
}

/** Barre d'onglets collante sous l'en-tête et contenu animé de l'onglet courant. */
export function TabbedContent<T extends string>({
  tabs,
  tab,
  onTab,
  anchor,
  label,
  children,
}: {
  tabs: TabDef<T>[];
  tab: T;
  onTab: (t: T) => void;
  anchor: React.RefObject<HTMLDivElement>;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      {/* Repère (hauteur nulle) : la barre collante, elle, ne donne pas sa place d'origine. */}
      <div ref={anchor} aria-hidden className="-mb-6 h-0" />
      <div className="sticky top-[76px] z-30">
        <Glass variant="lg-strong" className="pp-scroll overflow-x-auto rounded-[26px] p-1.5">
          <div role="tablist" aria-label={label} className="flex min-w-max gap-1">
            {tabs.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onTab(t.id)}
                  className={`relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition-colors sm:px-5 ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
                >
                  {on && (
                    <motion.span
                      layoutId={`${label}-tab-lens`}
                      className="pp-lens absolute inset-0 rounded-full"
                      transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    />
                  )}
                  <t.icon size={16} className="relative" />
                  <span className="relative">{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`relative text-[12px] ${MONO} ${on ? ACCENT_TEXT : INK3}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Glass>
      </div>
      {/* Hauteur minimale : pendant le changement d'onglet, la page ne rétrécit pas sous la
          barre, sinon le navigateur ramènerait le défilement tout en haut. */}
      <div className="min-h-[calc(100dvh-160px)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

/** Titre de section dans un onglet. */
export function Heading({
  title,
  note,
  action,
}: {
  title: string;
  note?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-1">
      <div className="space-y-1.5">
        <h2 className={`text-[clamp(28px,2.6vw,38px)] leading-none ${DISPLAY} ${INK}`}>{title}</h2>
        {note && <p className={`max-w-[70ch] text-[14px] leading-snug ${INK3}`}>{note}</p>}
      </div>
      {action}
    </div>
  );
}

/** Élément de liste qui apparaît en douceur au défilement. */
export function Reveal({ i, children }: { i: number; children: ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...SOFT_SPRING, delay: Math.min(i, 6) * 0.04 }}
    >
      {children}
    </motion.li>
  );
}

export function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className={`block px-1 text-[11.5px] ${MONO} ${INK2}`}>{label}</span>
      {children}
      {hint && <span className={`block px-1 text-[12.5px] leading-snug ${INK3}`}>{hint}</span>}
    </label>
  );
}

/** Bouton principal (plein) ou secondaire (verre). */
export function GlassButton({
  primary = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...rest}
      style={primary ? CTA_FILL : undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold disabled:opacity-60 ${primary ? "" : `pp-field ${INK}`} ${className}`}
    />
  );
}

/* ───────────── Discussion ───────────── */

export function MessageCard({ message: d }: { message: Discussion }) {
  return (
    <div className="pp-card flex gap-3.5 p-4">
      <Tile c={PAL.amber} size={36} code={(d.author ?? "?").charAt(0).toUpperCase()} />
      <div className="min-w-0 flex-1">
        <p className={`text-[12.5px] ${INK3}`}>
          <Link to={`/u/${d.author}`} className={`font-semibold hover:underline ${INK2}`}>
            {d.author}
          </Link>{" "}
          · {formatDate(d.createdAt)}
        </p>
        <p className={`mt-1 text-[15px] leading-relaxed whitespace-pre-wrap ${INK}`}>{d.body}</p>
      </div>
    </div>
  );
}

/** Formulaire de message ; invite à se connecter pour un visiteur. */
export function MessageForm({ path, onSent }: { path: string; onSent?: () => void }) {
  const { data: session } = useSession();
  const add = useAddDiscussion(path);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (body)
      add.mutate(body, {
        onSuccess: () => {
          form.reset();
          onSent?.();
        },
      });
  }
  if (!session) {
    return (
      <p className={`px-1 text-[14px] ${INK3}`}>
        <Link to="/connexion" className={`font-semibold underline ${ACCENT_TEXT}`}>
          Connectez-vous
        </Link>{" "}
        pour participer.
      </p>
    );
  }
  return (
    <Glass as="form" onSubmit={submit} className="space-y-3 rounded-[24px] p-4">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Votre message"
        aria-label="Votre message"
        className={`${FIELD} resize-y py-3 placeholder:text-[color:var(--ink3)] ${INK}`}
      />
      <ErrorText error={add.error} />
      <GlassButton primary disabled={add.isPending}>
        <Send size={15} /> Publier
      </GlassButton>
    </Glass>
  );
}

/** Fil de discussion complet d'une ressource (`path` : chemin API, ex. /problems/<id>). */
export function GlassDiscussion({
  path,
  title = "Discussion",
  note,
}: {
  path: string;
  title?: string;
  note?: string;
}) {
  const list = useDiscussions(path);
  const items = list.data ?? [];
  return (
    <div className="space-y-5">
      <Heading title={title} note={note} />
      {list.isPending ? (
        <ListMessage>Chargement…</ListMessage>
      ) : items.length === 0 ? (
        <ListMessage>Aucun message. Posez la première question.</ListMessage>
      ) : (
        <ul className="space-y-3">
          {items.map((d, i) => (
            <Reveal key={d.id} i={i}>
              <MessageCard message={d} />
            </Reveal>
          ))}
        </ul>
      )}
      <MessageForm path={path} />
    </div>
  );
}

/** Affiche `children` seulement après un clic sur le bouton d'ouverture. */
export function Expandable({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children(() => setOpen(false))}</>;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`flex w-full items-center gap-3 rounded-full border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-2 pr-5 text-left text-[15px] ${INK}`}
    >
      <Tile c={PAL.lav} size={34} icon={Icon} />
      {label}
    </button>
  );
}
