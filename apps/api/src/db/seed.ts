import { db } from "./index.js";
import { licenses } from "./schema.js";

type License = typeof licenses.$inferInsert;

// Catalogue initial. Les résumés sont indicatifs : le texte officiel de chaque licence fait foi.
const catalog: License[] = [
  {
    id: "mit",
    name: "MIT",
    url: "https://opensource.org/license/mit",
    summary: "Usage, modification et redistribution libres, avec mention de l'auteur.",
  },
  {
    id: "apache-2.0",
    name: "Apache 2.0",
    url: "https://www.apache.org/licenses/LICENSE-2.0",
    summary:
      "Usage libre, avec mention de l'auteur et des modifications. Inclut une licence de brevet.",
  },
  {
    id: "cc-by-4.0",
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    summary: "Réutilisation libre avec attribution.",
  },
  {
    id: "cc-by-sa-4.0",
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    summary: "Réutilisation libre avec attribution, les œuvres dérivées gardent la même licence.",
    requiresShareAlike: true,
  },
  {
    id: "cc-by-nc-4.0",
    name: "CC BY-NC 4.0",
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    summary: "Réutilisation avec attribution, sans usage commercial.",
    noCommercialUse: true,
  },
  {
    id: "cc-by-nc-nd-4.0",
    name: "CC BY-NC-ND 4.0",
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    summary: "Partage avec attribution, sans usage commercial ni modification.",
    noCommercialUse: true,
    noDerivatives: true,
  },
  {
    id: "noodl",
    name: "Nwulite Obodo Open Data License (NOODL)",
    summary:
      "Licence pensée pour les données africaines : l'usage commercial hors du continent implique un retour vers les communautés d'origine. Texte officiel à joindre.",
    requiresCommunityReturn: true,
  },
  {
    id: "all-rights-reserved",
    name: "Tous droits réservés",
    summary: "L'auteur conserve tous les droits. Consultation uniquement.",
    noCommercialUse: true,
    noRedistribution: true,
    noDerivatives: true,
  },
];

for (const l of catalog) {
  await db.insert(licenses).values(l).onConflictDoUpdate({ target: licenses.id, set: l });
}
console.log(`${catalog.length} licences insérées ou mises à jour.`);
process.exit(0);
