import { TriangleAlert } from "lucide-react";
import type { License } from "../api/types";

/** Affiché uniquement si la licence impose des restrictions. */
export function LicenseWarning({ license }: { license: Pick<License, "name" | "restrictions"> }) {
  if (!license.restrictions.length) return null;
  return (
    <div className="flex gap-2 border border-amber-700 bg-amber-50 p-3 text-sm" role="alert">
      <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-800" />
      <div>
        <p className="font-medium">Ressource sous licence {license.name}</p>
        <ul className="list-disc pl-5">
          {license.restrictions.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Confirmation avant téléchargement d'une ressource restreinte. */
export function confirmRestricted(license: Pick<License, "name" | "restrictions">) {
  if (!license.restrictions.length) return true;
  return window.confirm(
    `Licence ${license.name} :\n${license.restrictions.map((r) => `- ${r}`).join("\n")}\n\nTélécharger quand même ?`,
  );
}
