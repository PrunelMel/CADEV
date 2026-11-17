// Contenu statique de l'interface. Pas d'image pour l'instant : toute photo ajoutée ici
// doit être une vraie photographie libre de droits, avec sa source et sa licence en commentaire.

import { africanCountries } from "./countries";
import { sectorOptions } from "./problem-form";

export const site = {
  name: "BHEM AI COMMUNITY",
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

/** Page FAQ, section « Notre communauté » : objectif, vision et qui peut en faire partie. */
export const community = {
  goal: "Relier les besoins réels du terrain africain aux personnes capables d'y répondre avec l'IA. Un problème est publié une fois ; modèles, datasets et bibliothèques s'y rattachent, et chacun voit ce qui a déjà été tenté.",
  vision:
    "Une IA appliquée bâtie en Afrique, par et pour ses communautés : des solutions qui fonctionnent hors ligne, dans les langues locales, sur du matériel modeste, et des données qui restent à ceux qui les produisent.",
  audiences: [
    {
      id: "dev",
      title: "Développeurs",
      text: "Vous savez à quel besoin réel vous répondez, avec quelles contraintes et qui attend le résultat. Votre profil montre des problèmes résolus, pas une liste de dépôts.",
      link: { label: "Parcourir les problèmes", href: "/problemes" },
    },
    {
      id: "non-tech",
      title: "Non-techniciens",
      text: "Entreprises, ONG, institutions, collectivités : décrivez en langage courant ce qui ne marche pas chez vous. La communauté s'en charge.",
      link: { label: "Publier un problème", href: "/problemes/nouveau" },
    },
    {
      id: "all",
      title: "Tout le monde",
      text: "Agriculteurs, étudiants, enseignants, locuteurs de langues locales : vos données, vos retours de terrain et vos questions font avancer les solutions.",
      link: { label: "Explorer le hub", href: "/hub" },
    },
  ],
};

/** Page FAQ, section « Comment contribuer » : les étapes de chaque profil (mêmes ids que `community.audiences`). */
export const contributionPaths = {
  dev: {
    intro: "Partez d'un besoin réel, montrez que vous y travaillez, publiez votre réponse.",
    steps: [
      {
        title: "Choisir un problème",
        text: "Parcourez les problèmes par pays ou par secteur, et lisez leurs contraintes terrain : connectivité, matériel, langues.",
      },
      {
        title: "Se déclarer dessus",
        text: "« Je travaille dessus », avec une note : les autres savent qui avance sur quoi, et personne ne refait le même travail.",
      },
      {
        title: "Créer un dépôt lié",
        text: "Modèle, dataset ou bibliothèque, avec sa fiche technique (langues, hors ligne, matériel cible) et une licence du catalogue.",
      },
      {
        title: "Le déclarer solution",
        text: "Quand il est prêt, passez-le de « en construction » à « solution » et décrivez ses résultats terrain dans le README.",
      },
      {
        title: "Améliorer les dépôts des autres",
        text: "Proposez vos fichiers par pull request ; le propriétaire ou un collaborateur décide de les fusionner.",
      },
    ],
    cta: { label: "Parcourir les problèmes", href: "/problemes" },
  },
  "non-tech": {
    intro: "Vous connaissez le besoin : décrivez-le, la communauté s'occupe de la technique.",
    steps: [
      {
        title: "Publier un problème",
        text: "Un titre, une description en langage courant, le secteur et le pays suffisent. Les contraintes terrain sont facultatives.",
      },
      {
        title: "Poser vos critères",
        text: "Dites à quoi vous reconnaîtrez une bonne solution : c'est sur ces critères que les dépôts seront lus.",
      },
      {
        title: "Collecter des données",
        text: "Concevez une page de contribution pour que les membres vous envoient photos, textes ou enregistrements du terrain.",
      },
      {
        title: "Mettre une solution en avant",
        text: "Choisissez celle qui répond le mieux ; sans choix de votre part, c'est la plus appréciée par la communauté.",
      },
    ],
    cta: { label: "Publier un problème", href: "/problemes/nouveau" },
  },
  all: {
    intro: "Pas besoin de coder : vos données et votre regard de terrain comptent autant.",
    steps: [
      {
        title: "Contribuer des données",
        text: "Remplissez la page de contribution d'un problème : une photo de feuille malade, un enregistrement dans votre langue.",
      },
      {
        title: "Relire les contributions",
        text: "Signalez si une réponse vous paraît juste ; le nombre de relecteurs d'accord est le seul signal, personne ne tranche.",
      },
      {
        title: "Partager vos retours",
        text: "Posez vos questions et racontez ce que vous voyez sur le terrain, dans la discussion de chaque problème.",
      },
      {
        title: "Aimer les solutions utiles",
        text: "Vos likes désignent la solution mise en avant quand l'auteur du problème n'a pas choisi.",
      },
    ],
    cta: { label: "Voir les problèmes", href: "/problemes" },
  },
} as const;

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
