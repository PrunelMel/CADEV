// Registre des types de blocs de la page-formulaire de contribution.
// Source unique de vérité : la palette, le rendu, l'inspecteur (front) et la validation des
// soumissions (API) lisent tous ce fichier. Ajouter un type de bloc = ajouter une entrée ici, puis
// son rendu dans apps/web/src/features/contribution/ui/BlockBody.tsx.
//
// TypeScript pur, sans dépendance : importé tel quel par l'API et par le front.

const MB = 1024 * 1024;

export const MEDIA_KINDS = ["image", "gif", "audio", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Types MIME acceptés par type de média (l'API revérifie par signature binaire). */
export const MIME_BY_KIND: Record<MediaKind, string[]> = {
  image: ["image/png", "image/jpeg", "image/webp"],
  gif: ["image/gif"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"],
  video: ["video/mp4", "video/webm"],
};

/** Sous-dossier de l'arborescence qui reçoit chaque type de média. */
export const RESOURCE_FOLDER: Record<MediaKind, string> = {
  image: "images",
  gif: "gifs",
  audio: "audio",
  video: "videos",
};

export const MAX_BYTES: Record<MediaKind, number> = {
  image: 10 * MB,
  gif: 15 * MB,
  audio: 50 * MB,
  video: 200 * MB,
};

export const STORAGE_FORMATS = ["csv", "xlsx", "txt"] as const;
export type StorageFormat = (typeof STORAGE_FORMATS)[number];

/** Colonnes ajoutées par la plateforme à chaque réponse ; interdites comme clés de champ. */
export const SYSTEM_COLUMNS = [
  "submission_id",
  "submitted_at",
  "contributor_id",
  "form_revision",
] as const;

export const LIMITS = {
  blocks: 100,
  title: 120,
  intro: 2000,
  label: 200,
  help: 500,
  options: 50,
  optionLength: 120,
  linkGroup: 6, // une ancre + 5 blocs liés au maximum
  answerBytes: 64 * 1024,
  reviewsPerSubmission: 20,
  reviewValue: 5000,
  reviewComment: 500,
  maxLength: { text: 200, textarea: 5000, email: 254 },
} as const;

export const BLOCK_CATEGORIES = [
  { id: "media", label: "Médias" },
  { id: "input", label: "Champs" },
  { id: "special", label: "Validation" },
] as const;
export type BlockCategory = (typeof BLOCK_CATEGORIES)[number]["id"];

/** Propriétés d'un bloc ; chaque type n'en utilise qu'une partie (voir `defaults.props`). */
export type BlockProps = {
  resourceId?: string | null;
  alt?: string;
  placeholder?: string;
  maxLength?: number;
  options?: string[];
  targetKeys?: string[] | null;
  minAgreements?: number;
};

/**
 * category   : groupe dans la palette
 * tone       : clé de la palette PAL du front
 * icon       : nom d'icône lucide-react (résolu côté front)
 * collects   : le bloc produit une valeur dans les réponses
 * valueType  : 'string' | 'string[]'
 * pii        : donnée personnelle, jamais montrée aux autres contributeurs
 * mediaKind  : pour les blocs d'affichage, type de fichier attendu
 * options    : le bloc porte une liste de choix (props.options)
 * defaults   : libellé et props d'un bloc fraîchement déposé
 */
export type BlockDef = {
  category: BlockCategory;
  tone: string;
  icon: string;
  label: string;
  hint: string;
  keywords: string[];
  collects: boolean;
  valueType?: "string" | "string[]";
  pii?: boolean;
  mediaKind?: MediaKind;
  options?: boolean;
  minOptions?: number;
  review?: boolean;
  defaults: { label: string; props: BlockProps };
};

export const BLOCK_TYPES = {
  image: {
    category: "media",
    tone: "sky",
    icon: "Image",
    label: "Bloc image",
    hint: "Affiche une image",
    keywords: ["photo", "illustration", "visuel", "afficher"],
    mediaKind: "image",
    collects: false,
    defaults: { label: "Observez l’image", props: { resourceId: null, alt: "" } },
  },
  video: {
    category: "media",
    tone: "sky",
    icon: "Video",
    label: "Bloc vidéo",
    hint: "Lit une vidéo",
    keywords: ["film", "clip", "lecture", "visionner"],
    mediaKind: "video",
    collects: false,
    defaults: { label: "Regardez la vidéo", props: { resourceId: null } },
  },
  audio: {
    category: "media",
    tone: "sky",
    icon: "AudioLines",
    label: "Bloc audio",
    hint: "Diffuse un enregistrement",
    keywords: ["son", "voix", "écoute", "dialecte", "locuteur"],
    mediaKind: "audio",
    collects: false,
    defaults: { label: "Écoutez l’enregistrement", props: { resourceId: null } },
  },
  gif: {
    category: "media",
    tone: "sky",
    icon: "Film",
    label: "Bloc GIF",
    hint: "Affiche une animation",
    keywords: ["animation", "animé", "boucle"],
    mediaKind: "gif",
    collects: false,
    defaults: { label: "Observez l’animation", props: { resourceId: null, alt: "" } },
  },
  text: {
    category: "input",
    tone: "lav",
    icon: "Type",
    label: "Champ texte",
    hint: "Réponse courte, une ligne",
    keywords: ["court", "mot", "nom", "ligne"],
    collects: true,
    valueType: "string",
    defaults: { label: "Votre réponse", props: { placeholder: "", maxLength: 200 } },
  },
  textarea: {
    category: "input",
    tone: "lav",
    icon: "AlignLeft",
    label: "Zone de texte long",
    hint: "Réponse libre, plusieurs lignes",
    keywords: ["transcription", "traduction", "paragraphe", "commentaire", "long"],
    collects: true,
    valueType: "string",
    defaults: { label: "Votre réponse", props: { placeholder: "", maxLength: 5000 } },
  },
  email: {
    category: "input",
    tone: "amber",
    icon: "Mail",
    label: "Champ e-mail",
    hint: "Adresse e-mail, jamais partagée",
    keywords: ["courriel", "contact", "mail", "personnel"],
    collects: true,
    valueType: "string",
    pii: true,
    defaults: { label: "Votre adresse e-mail", props: { placeholder: "nom@exemple.org" } },
  },
  radio: {
    category: "input",
    tone: "teal",
    icon: "CircleDot",
    label: "Bouton radio",
    hint: "Un seul choix parmi plusieurs",
    keywords: ["choix unique", "option", "qcm"],
    collects: true,
    valueType: "string",
    options: true,
    minOptions: 2,
    defaults: { label: "Votre choix", props: { options: ["Option 1", "Option 2"] } },
  },
  checkbox: {
    category: "input",
    tone: "teal",
    icon: "SquareCheck",
    label: "Case à cocher",
    hint: "Plusieurs choix possibles",
    keywords: ["choix multiple", "cocher", "case"],
    collects: true,
    valueType: "string[]",
    options: true,
    minOptions: 1,
    defaults: { label: "Cochez ce qui convient", props: { options: ["Option 1", "Option 2"] } },
  },
  select: {
    category: "input",
    tone: "teal",
    icon: "ChevronsUpDown",
    label: "Liste déroulante",
    hint: "Un choix dans une liste",
    keywords: ["menu", "déroulant", "dropdown", "liste"],
    collects: true,
    valueType: "string",
    options: true,
    minOptions: 2,
    defaults: {
      label: "Choisissez dans la liste",
      props: { options: ["Option 1", "Option 2"], placeholder: "Choisir…" },
    },
  },
  validation: {
    category: "special",
    tone: "violet",
    icon: "ShieldCheck",
    label: "Validation de données",
    hint: "Relire et corriger les contributions existantes",
    keywords: ["vérifier", "correction", "relecture", "qualité", "valider"],
    collects: false,
    review: true,
    defaults: {
      label: "Relisez une contribution existante",
      props: { targetKeys: null, minAgreements: 2 },
    },
  },
} satisfies Record<string, BlockDef>;

export type BlockType = keyof typeof BLOCK_TYPES;
export const BLOCK_TYPE_IDS = Object.keys(BLOCK_TYPES) as BlockType[];

/** Définition d'un type de bloc, ou undefined pour un type inconnu (donnée non fiable). */
export const blockDef = (type: string): BlockDef | undefined =>
  (BLOCK_TYPES as Record<string, BlockDef>)[type];

export const isMediaType = (type: string) => blockDef(type)?.category === "media";
export const isInputType = (type: string) => blockDef(type)?.collects === true;

/** Types de blocs média compatibles avec un fichier importé (pour l'inspecteur). */
export const blockTypesForKind = (kind: MediaKind) =>
  BLOCK_TYPE_IDS.filter((t) => blockDef(t)?.mediaKind === kind);

const fold = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Recherche de la palette : par nom, par attribut (mots-clés, indice, catégorie, type).
 * Sans requête, renvoie tous les types dans l'ordre du registre.
 */
export function searchBlocks(query: string): BlockType[] {
  const q = fold(query);
  if (!q) return [...BLOCK_TYPE_IDS];
  const categoryLabel = Object.fromEntries(BLOCK_CATEGORIES.map((c) => [c.id, c.label]));
  const scored: [BlockType, number][] = [];
  for (const id of BLOCK_TYPE_IDS) {
    const def: BlockDef = BLOCK_TYPES[id];
    const label = fold(def.label);
    let score = 0;
    if (label.startsWith(q)) score = 100;
    else if (label.includes(q)) score = 80;
    else if (fold(id) === q) score = 75;
    else if (def.keywords.some((k) => fold(k).includes(q))) score = 60;
    else if (fold(def.hint).includes(q)) score = 40;
    else if (fold(categoryLabel[def.category]).includes(q)) score = 20;
    if (score) scored.push([id, score]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
