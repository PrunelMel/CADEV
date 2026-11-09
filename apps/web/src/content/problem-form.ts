// Listes d'options de la page « Publier un problème » : secteurs, étiquettes terrain, aides.
// Modifier ici pour ajouter une option, aucun composant n'en contient.

import {
  Activity,
  Banknote,
  BatteryLow,
  Camera,
  Coins,
  Cpu,
  Gauge,
  GraduationCap,
  HeartPulse,
  Landmark,
  Languages,
  Laptop,
  MessageSquareText,
  Mic,
  Monitor,
  Phone,
  Plane,
  RadioTower,
  RefreshCw,
  Satellite,
  ShoppingBag,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Smartphone,
  Sprout,
  Sun,
  Tablet,
  Thermometer,
  TreePine,
  Truck,
  Wifi,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Teinte d'accent : [ton, ton profond]. */
export type Tone = readonly [string, string];

/** Tons pastel sur fond marine, dans l'esprit des pastilles vert/rouge de la carte d'accueil. */
export const PAL = {
  lav: ["#A99FF5", "#6F63D9"],
  mint: ["#6FE0A0", "#2FA66B"],
  coral: ["#F29A98", "#CC5E62"],
  sky: ["#86BDF5", "#4B83CF"],
  amber: ["#F0C277", "#C98F36"],
  teal: ["#6FD8CC", "#2FA399"],
  rose: ["#F2A0C6", "#CB5F93"],
  slate: ["#A5B0C8", "#68748F"],
  violet: ["#C7A6F5", "#8D5FDB"],
  lime: ["#BDDD7E", "#82A63B"],
  orange: ["#F4AA78", "#CF6F34"],
} as const satisfies Record<string, Tone>;

export type SectorOption = { id: string; label: string; icon: LucideIcon; c: Tone };

export const sectorOptions: SectorOption[] = [
  { id: "agriculture", label: "Agriculture", icon: Sprout, c: PAL.lime },
  { id: "sante", label: "Santé", icon: HeartPulse, c: PAL.rose },
  { id: "education", label: "Éducation", icon: GraduationCap, c: PAL.sky },
  { id: "finance", label: "Finance", icon: Banknote, c: PAL.mint },
  { id: "commerce", label: "Commerce", icon: ShoppingBag, c: PAL.orange },
  { id: "transport", label: "Transport", icon: Truck, c: PAL.lav },
  { id: "energie", label: "Énergie", icon: Zap, c: PAL.amber },
  { id: "environnement", label: "Environnement", icon: TreePine, c: PAL.teal },
  { id: "administration", label: "Administration publique", icon: Landmark, c: PAL.slate },
  { id: "langues", label: "Langues et traduction", icon: Languages, c: PAL.violet },
];

/** Disposition asymétrique des bulles de secteur (poids de largeur, hauteur de rangée, décalages). */
export const sectorRows = [
  { ids: ["agriculture", "sante"], w: [1.4, 1], h: 1.15, pl: "0%", pr: "7%" },
  { ids: ["education", "finance", "commerce"], w: [1, 1.15, 1.05], h: 0.92, pl: "10%", pr: "0%" },
  { ids: ["transport", "energie"], w: [1.15, 1], h: 1.05, pl: "0%", pr: "15%" },
  { ids: ["environnement", "administration"], w: [1, 1.5], h: 1, pl: "4%", pr: "0%" },
  { ids: ["langues"], w: [1], h: 0.95, pl: "16%", pr: "0%" },
];

export type TagOption = { label: string; icon?: LucideIcon; code?: string };
export type TagGroup = {
  id: string;
  label: string;
  tone: Tone;
  icon: LucideIcon;
  tags: TagOption[];
};
export type TagSet = {
  title: string;
  subtitle: string;
  search: string;
  placeholder: string;
  groupOwn: string;
  groups: TagGroup[];
};

export const tagSets: Record<"connectivite" | "materiel" | "langue", TagSet> = {
  connectivite: {
    title: "Quel réseau sur le terrain ?",
    subtitle: "Choisissez les étiquettes qui décrivent la connexion réelle des utilisateurs.",
    search: "Rechercher ou créer…",
    placeholder: "Hors ligne, 2G, réseau intermittent…",
    groupOwn: "Vos étiquettes",
    groups: [
      {
        id: "type",
        label: "Type de réseau",
        tone: PAL.sky,
        icon: Signal,
        tags: [
          { label: "Hors ligne", icon: WifiOff },
          { label: "2G", icon: SignalLow },
          { label: "3G", icon: SignalMedium },
          { label: "4G et plus", icon: SignalHigh },
        ],
      },
      {
        id: "qualite",
        label: "Qualité de la connexion",
        tone: PAL.amber,
        icon: Gauge,
        tags: [
          { label: "Réseau intermittent", icon: Activity },
          { label: "Bande passante faible", icon: Gauge },
          { label: "Données mobiles coûteuses", icon: Coins },
          { label: "Synchronisation différée", icon: RefreshCw },
        ],
      },
      {
        id: "autres",
        label: "Autres moyens",
        tone: PAL.teal,
        icon: RadioTower,
        tags: [
          { label: "SMS / USSD", icon: MessageSquareText },
          { label: "Wi-Fi communautaire", icon: Wifi },
          { label: "Radio longue portée", icon: RadioTower },
          { label: "Satellite", icon: Satellite },
        ],
      },
    ],
  },
  materiel: {
    title: "Quels appareils sont disponibles ?",
    subtitle: "Indiquez le matériel que la solution devra faire tourner.",
    search: "Rechercher ou créer…",
    placeholder: "Téléphone Android d'entrée de gamme…",
    groupOwn: "Vos étiquettes",
    groups: [
      {
        id: "tel",
        label: "Téléphones",
        tone: PAL.sky,
        icon: Smartphone,
        tags: [
          { label: "Téléphone Android d'entrée de gamme", icon: Smartphone },
          { label: "Smartphone récent", icon: Smartphone },
          { label: "Téléphone à touches", icon: Phone },
        ],
      },
      {
        id: "ordi",
        label: "Ordinateurs et cartes",
        tone: PAL.violet,
        icon: Laptop,
        tags: [
          { label: "Tablette", icon: Tablet },
          { label: "Ordinateur portable", icon: Laptop },
          { label: "Ordinateur partagé", icon: Monitor },
          { label: "Raspberry Pi", icon: Cpu },
        ],
      },
      {
        id: "terrain",
        label: "Équipement de terrain",
        tone: PAL.amber,
        icon: Thermometer,
        tags: [
          { label: "Capteurs IoT", icon: Thermometer },
          { label: "Caméra", icon: Camera },
          // L'icône « Drone » n'existe pas dans la version de lucide-react du projet.
          { label: "Drone", icon: Plane },
          { label: "Micro", icon: Mic },
          { label: "Panneau solaire", icon: Sun },
          { label: "Batterie limitée", icon: BatteryLow },
        ],
      },
    ],
  },
  langue: {
    title: "Quelles langues parlent les utilisateurs ?",
    subtitle: "Sélectionnez toutes les langues que la solution doit comprendre.",
    search: "Rechercher ou créer…",
    placeholder: "Fon, Darija, Wolof…",
    groupOwn: "Vos langues",
    groups: [
      {
        id: "repandues",
        label: "Langues répandues",
        tone: PAL.sky,
        icon: Languages,
        tags: [
          { label: "Français", code: "FR" },
          { label: "Arabe", code: "AR" },
          { label: "Anglais", code: "EN" },
          { label: "Portugais", code: "PT" },
          { label: "Swahili", code: "SW" },
        ],
      },
      {
        id: "locales",
        label: "Langues locales",
        tone: PAL.amber,
        icon: MessageSquareText,
        tags: [
          { label: "Darija", code: "DA" },
          { label: "Wolof", code: "WO" },
          { label: "Fon", code: "FON" },
          { label: "Haoussa", code: "HA" },
          { label: "Yoruba", code: "YO" },
          { label: "Amharique", code: "AM" },
          { label: "Lingala", code: "LN" },
          { label: "Bambara", code: "BM" },
          { label: "Peul", code: "FF" },
          { label: "Zoulou", code: "ZU" },
          { label: "Tamazight", code: "TZM" },
          { label: "Malgache", code: "MG" },
        ],
      },
    ],
  },
};

export type HelpMode = "replace" | "append" | "append-line";
export type HelpSet = { title: string; subtitle: string; mode: HelpMode; items: string[] };

/** Aides contextuelles des champs texte. */
export const helpSets: Record<"titre" | "description" | "criteres", HelpSet> = {
  titre: {
    title: "Un titre qu’on comprend en une seconde",
    subtitle: "Commencez par un verbe d’action. Touchez un exemple pour l’utiliser.",
    mode: "replace",
    items: [
      "Détecter les maladies du manioc",
      "Traduire les consignes médicales en wolof",
      "Estimer le rendement des champs de maïs",
      "Lire les ordonnances manuscrites hors ligne",
      "Prévoir les pénuries d’eau dans les villages",
    ],
  },
  description: {
    title: "Ce qu’il faut préciser",
    subtitle: "Touchez un repère pour l’ajouter à votre texte.",
    mode: "append",
    items: [
      "Qui est concerné : ",
      "Où et quand : ",
      "Ce qui est fait aujourd’hui : ",
      "Ce que la solution doit changer : ",
    ],
  },
  criteres: {
    title: "Des critères mesurables",
    subtitle: "Touchez une idée pour l’ajouter à la liste.",
    mode: "append-line",
    items: [
      "Fonctionne hors ligne",
      "Précision d’au moins 90 %",
      "Réponse en moins de 3 secondes",
      "Modèle de moins de 50 Mo",
      "Comprend les langues locales",
      "Testé sur un Android d’entrée de gamme",
    ],
  },
};
