import { useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import type { License } from "../api/types";
import { Button, Dialog } from "./ui";

type Lic = Pick<License, "name" | "restrictions">;

/** Affiché uniquement si la licence impose des restrictions. */
export function LicenseWarning({ license }: { license: Lic }) {
  if (!license.restrictions.length) return null;
  return (
    <div
      className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      role="alert"
    >
      <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-800" />
      <div>
        <p className="font-medium">Licence {license.name} : conditions à respecter</p>
        <ul className="list-disc pl-5">
          {license.restrictions.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Lien de téléchargement. Sur une ressource restreinte, une boîte de dialogue rappelle
 * les conditions avant de lancer le téléchargement ; sinon le lien part directement.
 */
export function RestrictedDownload({
  href,
  license,
  filename,
  children,
  className = "",
}: {
  href: string;
  license: Lic;
  filename: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!license.restrictions.length) {
    return (
      <a href={href} className={className} title={`Télécharger ${filename}`}>
        {children}
      </a>
    );
  }
  return (
    <>
      <button
        type="button"
        className={className}
        title={`Télécharger ${filename}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Télécharger ${filename}`}>
        <LicenseWarning license={license} />
        <p className="text-sm text-neutral-600">
          En téléchargeant ce fichier, vous vous engagez à respecter ces conditions.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <a
            href={href}
            onClick={() => setOpen(false)}
            className="inline-flex items-center rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-white hover:bg-ink-soft"
          >
            J'ai compris, télécharger
          </a>
        </div>
      </Dialog>
    </>
  );
}
