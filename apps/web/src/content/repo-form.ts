// Listes d'options de la page « Créer un dépôt » : types, aides des champs texte.
// Les langues et le matériel reprennent les étiquettes de content/problem-form.ts, pour qu'un
// dépôt et un problème parlent le même vocabulaire (c'est ce qui permet de les rapprocher).

import { BrainCircuit, Database, Library } from "lucide-react";
import type { RepoType } from "../api/types";
import { PAL, tagSets, type HelpSet, type Tone } from "./problem-form";

export type TypeOption = {
  id: RepoType;
  label: string;
  text: string;
  icon: typeof BrainCircuit;
  c: Tone;
};

export const typeOptions: TypeOption[] = [
  {
    id: "model",
    label: "Modèle",
    text: "Entraîné et prêt à intégrer, avec ses limites connues.",
    icon: BrainCircuit,
    c: PAL.lav,
  },
  {
    id: "dataset",
    label: "Dataset",
    text: "Données collectées sur le terrain, avec leur provenance.",
    icon: Database,
    c: PAL.teal,
  },
  {
    id: "library",
    label: "Bibliothèque",
    text: "Code et outils réutilisables d’un projet à l’autre.",
    icon: Library,
    c: PAL.amber,
  },
];

const hardwareLabels = tagSets.materiel.groups.flatMap((g) => g.tags.map((t) => t.label));

/** Aides contextuelles des champs texte du dépôt. */
export const repoHelpSets: Record<
  "nom" | "description" | "tache" | "materiel" | "communaute" | "fiche" | "limites",
  HelpSet
> = {
  nom: {
    title: "Un nom court et parlant",
    subtitle: "Il apparaît dans l’adresse du dépôt. Lettres, chiffres, points et tirets.",
    mode: "replace",
    items: ["manioc-lite", "transcription-fon", "alertes-meteo-wolof", "ordonnances-ocr"],
  },
  description: {
    title: "Ce que fait le dépôt",
    subtitle: "Une phrase, lue dans la liste du hub. Touchez un exemple pour l’utiliser.",
    mode: "replace",
    items: [
      "Détection des maladies du manioc à partir d’une photo",
      "Transcription de la parole en fon",
      "Photos de feuilles annotées par des agronomes",
    ],
  },
  tache: {
    title: "Quelle tâche ?",
    subtitle: "Elle sert à filtrer le hub et à suggérer le dépôt aux problèmes compatibles.",
    mode: "replace",
    items: [
      "Classification d’images",
      "Détection d’objets",
      "Reconnaissance vocale",
      "Synthèse vocale",
      "Traduction",
      "Reconnaissance de texte (OCR)",
      "Prévision",
      "Géocodage",
    ],
  },
  materiel: {
    title: "Sur quel matériel ?",
    subtitle: "Le plus petit appareil sur lequel le dépôt fonctionne.",
    mode: "replace",
    items: hardwareLabels,
  },
  communaute: {
    title: "D’où viennent les données ?",
    subtitle: "La communauté qui a produit ou collecté les données, affichée sur le dataset.",
    mode: "replace",
    items: ["Agriculteurs du Zou", "Locuteurs du fon à Cotonou", "Centres de santé de Thiès"],
  },
  fiche: {
    title: "Une fiche utile",
    subtitle:
      "Markdown : titres, listes, tableaux, blocs de code. Touchez une section pour l’ajouter.",
    mode: "append",
    items: [
      "## Utilisation\n",
      "## Données d’entraînement\n",
      "## Résultats terrain\n",
      "## Installation\n",
      "## Citer ce dépôt\n",
    ],
  },
  limites: {
    title: "Ce qu’il ne sait pas faire",
    subtitle: "Dire les limites évite à d’autres de les découvrir sur le terrain.",
    mode: "append-line",
    items: [
      "Non testé hors de la zone de collecte",
      "Précision plus faible en faible luminosité",
      "Accents régionaux peu représentés",
      "Nécessite une connexion pour la première installation",
    ],
  },
};
