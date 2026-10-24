import { asc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest } from "../../lib/errors.js";

export type License = typeof t.licenses.$inferSelect;

/** Liste lisible des restrictions. Vide si la licence n'impose rien : aucun avertissement. */
export function restrictionsOf(l: License): string[] {
  const out: string[] = [];
  if (l.noCommercialUse) out.push("Usage commercial interdit");
  if (l.noRedistribution) out.push("Redistribution interdite");
  if (l.noDerivatives) out.push("Modification et œuvres dérivées interdites");
  if (l.requiresShareAlike) out.push("Les œuvres dérivées doivent garder la même licence");
  if (l.requiresCommunityReturn) out.push("Retour obligatoire vers la communauté d'origine");
  return [...out, ...l.otherRestrictions];
}

export const withRestrictions = (l: License) => ({ ...l, restrictions: restrictionsOf(l) });

export async function listLicenses() {
  const rows = await db.select().from(t.licenses).orderBy(asc(t.licenses.name));
  return rows.map(withRestrictions);
}

export async function getLicense(id: string) {
  const [l] = await db.select().from(t.licenses).where(eq(t.licenses.id, id));
  if (!l) throw badRequest("Licence inconnue");
  return l;
}
