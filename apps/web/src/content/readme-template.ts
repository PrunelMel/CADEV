// Modèle de README d'un dépôt : il reprend la fiche (problème, type, fiche technique, licence,
// provenance) et laisse à compléter l'utilisation et les résultats terrain. Pré-rempli à la
// création du dépôt, affiché aussi pour un dépôt dont le README est vide.

import type { RepoType } from "../api/types";
import { repoTypeLabels } from "./site";

export type ReadmeData = {
  name: string;
  description: string;
  type: RepoType | null;
  problem: { id: string; title: string } | null;
  task: string;
  languages: string[];
  worksOffline: boolean;
  targetHardware: string;
  license: string | null;
  provenance: string | null;
};

const value = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "Non précisé");

export function readmeTemplate(d: ReadmeData) {
  const rows: [string, string][] = [
    ["Type", d.type ? repoTypeLabels[d.type] : "Non précisé"],
    ["Tâche", value(d.task)],
    ["Langues", d.languages.length ? d.languages.join(", ") : "Non précisé"],
    ["Fonctionnement hors ligne", d.worksOffline ? "Oui" : "Non"],
    ["Matériel cible", value(d.targetHardware)],
    ["Licence", value(d.license)],
  ];
  if (d.type === "dataset") rows.push(["Provenance des données", value(d.provenance)]);
  return [
    `# ${d.name.trim() || "nom-du-depot"}`,
    "",
    d.description.trim() || "Ce que fait ce dépôt, en une phrase.",
    "",
    ...(d.problem ? [`> Répond au problème : [${d.problem.title}](/problemes/${d.problem.id})`, ""] : []),
    "| Fiche | |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | ${v.replace(/\|/g, "/")} |`),
    "",
    "## Utilisation",
    "",
    "À compléter : comment installer et utiliser ce dépôt.",
    "",
    "## Résultats terrain",
    "",
    "À compléter : où et comment le dépôt a été testé, ce qui a marché, ce qui a échoué.",
    "",
  ].join("\n");
}
