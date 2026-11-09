// Contenu statique de l'interface. Pas d'image pour l'instant : toute photo ajoutée ici
// doit être une vraie photographie libre de droits, avec sa source et sa licence en commentaire.

import { africanCountries } from "./countries";
import { sectorOptions } from "./problem-form";

export const site = {
  name: "Plateforme IA appliquée",
  tagline: "Une plateforme d'échange pour les développeurs, par les développeurs.",
  intro:
    "Décrivez ce qui ne marche pas chez vous. La communauté propose des modèles, des jeux de données et des bibliothèques, testés sur le terrain et jugés sur vos critères.",
};

export const howItWorks = [
  {
    title: "Un besoin réel",
    text: "Une entreprise, une ONG ou une mairie publie un problème : secteur, pays, contraintes terrain, critères d'évaluation.",
  },
  {
    title: "Des dépôts rattachés",
    text: "Chaque dépôt (modèle, dataset, bibliothèque) répond à un problème dès sa création. En construction, il montre son README ; devenu solution, tout son travail.",
  },
  {
    title: "Une solution mise en avant",
    text: "L'auteur du problème choisit la solution à mettre en avant ; sinon, c'est celle que la communauté préfère.",
  },
];

export const faq = [
  {
    q: "Qui garde les droits sur une solution publiée ?",
    a: "L'auteur. La plateforme ne s'arroge aucune licence implicite : seule la licence choisie par l'auteur s'applique.",
  },
  {
    q: "Pourquoi un avertissement s'affiche sur certaines ressources ?",
    a: "Quand la licence d'une ressource interdit un usage (commercial, redistribution, modification) ou impose un retour vers la communauté d'origine, la plateforme le rappelle avant consultation et téléchargement. Aucune ressource sans restriction n'affiche d'avertissement.",
  },
  {
    q: "Où sont hébergées les données ?",
    a: "Sur le continent, dans un stockage auto-hébergé compatible S3.",
  },
  {
    q: "Qui décide qu'un dépôt est une solution ?",
    a: "Son auteur. Tant qu'il ne l'a pas déclaré « solution », le dépôt est en construction : seul son README est visible hors de son équipe. L'auteur du problème n'accepte ni ne rejette : il peut seulement choisir la solution mise en avant ; à défaut, c'est la plus appréciée par la communauté.",
  },
  {
    q: "Que devient mon dépôt si son problème est fermé ?",
    a: "Il reste lié, mais passe derrière les autres dans le hub et la recherche, et vous êtes prévenu. Si le sujet vous semble toujours d'actualité, liez votre dépôt à un autre problème, ou publiez-en un nouveau qui explique pourquoi le travail continue.",
  },
  {
    q: "Comment proposer une modification à un dépôt dont je ne suis pas membre ?",
    a: "Ouvrez une pull request depuis l'onglet dédié du dépôt, ajoutez-y vos fichiers. Le propriétaire ou un collaborateur la fusionne.",
  },
];

export const sectors = sectorOptions.map((s) => s.label);

export const countries: string[] = africanCountries.map((c) => c.name);

export const repoTypeLabels = {
  model: "Modèle",
  dataset: "Dataset",
  library: "Bibliothèque",
} as const;

export const repoStageLabels = {
  under_construction: "En construction",
  solution: "Solution",
} as const;

export const problemStatusLabels = {
  open: "Ouvert",
  solved: "Résolu",
  closed: "Fermé",
} as const;

export const pullStatusLabels = {
  open: "Ouverte",
  merged: "Fusionnée",
  closed: "Fermée",
} as const;
