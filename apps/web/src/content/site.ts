// Contenu statique de l'interface. Pas d'image pour l'instant : toute photo ajoutée ici
// doit être une vraie photographie libre de droits, avec sa source et sa licence en commentaire.

import { africanCountries } from "./countries";

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
    title: "Des solutions rattachées",
    text: "Les développeurs proposent un dépôt (modèle, dataset, bibliothèque) avec ses résultats terrain. Les échecs restent visibles.",
  },
  {
    title: "Une validation par le porteur",
    text: "L'auteur du problème accepte ou rejette chaque solution et chaque contribution de données.",
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
    q: "Qui valide une solution ?",
    a: "L'auteur du problème, car c'est lui qui connaît le terrain et qui a posé les critères d'évaluation.",
  },
  {
    q: "Comment proposer une modification à un dépôt dont je ne suis pas membre ?",
    a: "Ouvrez une pull request depuis l'onglet dédié du dépôt, ajoutez-y vos fichiers. Le propriétaire ou un collaborateur la fusionne.",
  },
];

export const sectors = [
  "Agriculture",
  "Santé",
  "Éducation",
  "Finance",
  "Commerce",
  "Transport",
  "Énergie",
  "Environnement",
  "Administration publique",
  "Langues et traduction",
];

export const countries: string[] = africanCountries.map((c) => c.name);

export const repoTypeLabels = {
  model: "Modèle",
  dataset: "Dataset",
  library: "Bibliothèque",
} as const;

export const statusLabels = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Rejetée",
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
