import { useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Check, Copy, type LucideIcon } from "lucide-react";
import { Link, type LinkProps } from "react-router";
import { ApiError } from "../api/client";

const control =
  "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-paper";

type Look = {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

const buttonClass = ({ variant = "primary", size = "md" }: Look) => {
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    secondary: "border border-neutral-300 bg-white text-ink hover:bg-paper",
    danger: "border border-red-700 bg-white text-red-700 hover:bg-red-50",
    ghost: "text-neutral-600 hover:bg-paper hover:text-ink",
  }[variant];
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-1.5 text-sm" }[size];
  return `inline-flex items-center justify-center gap-1.5 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${styles}`;
};

export function Button({
  variant,
  size,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return <button className={`${buttonClass({ variant, size })} ${className}`} {...props} />;
}

/** Lien d'application qui a l'apparence d'un bouton. */
export function ButtonLink({ variant, size, className = "", ...props }: LinkProps & Look) {
  return <Link className={`${buttonClass({ variant, size })} ${className}`} {...props} />;
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={control} {...props} />
);
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`${control} min-h-24`} {...props} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={control} {...props} />
);

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-accent" {...props} />
      {label}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Erreur";
  const details = error instanceof ApiError ? error.details : undefined;
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      role="alert"
    >
      {message}
      {details && (
        <ul className="list-disc pl-5">
          {details.map((d) => (
            <li key={d.path + d.message}>
              {d.path} : {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Titre de page, avec une ligne d'introduction et des actions à droite. */
export function PageHeader({
  title,
  intro,
  actions,
}: {
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {intro && <p className="max-w-2xl text-sm text-neutral-600">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Bloc encadré : liste d'éléments, formulaire secondaire, résumé. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white ${className}`}>{children}</div>
  );
}

export function EmptyState({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
      {Icon && <Icon size={20} className="text-neutral-400" />}
      <div>{children}</div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "green" | "red" | "amber" | "accent" | "ink";

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const styles = {
    neutral: "border-neutral-200 bg-paper text-neutral-700",
    green: "border-green-200 bg-green-50 text-green-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "border-accent/20 bg-accent-soft text-accent",
    ink: "border-ink bg-ink text-white",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export const statusTone = {
  pending: "amber",
  accepted: "green",
  rejected: "red",
} as const;
export const problemStatusTone = {
  open: "accent",
  solved: "green",
  closed: "neutral",
} as const;

export function Query<T>({
  query,
  children,
}: {
  query: { data: T | undefined; error: unknown; isLoading: boolean };
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading)
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Chargement">
        <div className="h-4 w-1/3 rounded bg-paper" />
        <div className="h-4 w-2/3 rounded bg-paper" />
        <div className="h-4 w-1/2 rounded bg-paper" />
      </div>
    );
  if (query.error) return <ErrorText error={query.error} />;
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function formatSize(bytes: number) {
  const units = ["o", "Ko", "Mo", "Go"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

/** Lit un formulaire non contrôlé en objet de chaînes. */
export const formValues = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form)) as Record<string, string>;

/** « Fon, Français » vers ["Fon", "Français"]. */
export const splitList = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- Identité visuelle ---------- */

const avatarColors = ["#5847d1", "#0f766e", "#b45309", "#be123c", "#1d4ed8", "#4d7c0f", "#7e22ce"];

/** Initiales sur une couleur pleine, stable pour un même nom. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: avatarColors[h % avatarColors.length],
      }}
    >
      {initials || "?"}
    </span>
  );
}

/**
 * Bandeau marine pleine largeur, repris de la landing. À placer en tête de page :
 * il sort du conteneur centré du Layout.
 */
export function Band({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative left-1/2 -mt-8 mb-8 w-screen -translate-x-1/2 border-b border-night-line bg-night text-[#e6ebf4] ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">{children}</div>
    </div>
  );
}

/** Petit libellé en capitales espacées, à la manière de la landing. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-night-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a95ab]">
      <span className="size-1.5 rounded-full bg-signal" />
      {children}
    </p>
  );
}

/** Titre d'affiche (Bebas Neue), pour les bandeaux. */
export function DisplayTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`font-display text-5xl leading-[0.95] tracking-wide uppercase sm:text-6xl ${className}`}
    >
      {children}
    </h1>
  );
}

/** Copie un texte dans le presse-papiers, avec un retour visible. */
export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? "Copié" : label}
    </Button>
  );
}

/** Boîte de dialogue modale native (élément <dialog>). */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-neutral-200 p-0 text-ink backdrop:bg-night/60"
    >
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
