import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ApiError } from "../api/client";

const control =
  "w-full border border-neutral-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-neutral-900";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-700",
    secondary: "border border-neutral-300 hover:bg-neutral-100",
    danger: "border border-red-700 text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
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
      <span className="text-sm font-medium">{label}</span>
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
    <div className="text-sm text-red-700">
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

export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red" | "amber";
}) {
  const styles = {
    neutral: "border-neutral-300 text-neutral-700",
    green: "border-green-700 text-green-800",
    red: "border-red-700 text-red-700",
    amber: "border-amber-700 text-amber-800",
  }[tone];
  return <span className={`inline-block rounded border px-1.5 text-xs ${styles}`}>{children}</span>;
}

export const statusTone = { pending: "amber", accepted: "green", rejected: "red" } as const;

export function Query<T>({
  query,
  children,
}: {
  query: { data: T | undefined; error: unknown; isLoading: boolean };
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <p className="text-sm text-neutral-500">Chargement…</p>;
  if (query.error) return <ErrorText error={query.error} />;
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

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
