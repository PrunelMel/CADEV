import { site } from "./site";

// Tous les textes et réglages de la landing sont ici.
// Image: /assets/globe-poster.png (apps/web/public), WebGL fallback poster, from the africa-hero landing source.

/** Total scroll length of the hero, in vh. Every scroll point below is given in vh too. */
export const HERO_VH = 1320;
/** Converts a scroll point in vh to a fraction of the hero. */
const at = (vh: number) => vh / HERO_VH;

export const heroCopy = {
  eyebrow: "Une communauté à travers l'Afrique",
  /** Hero lockup: top line, big word on the left, box on the right (top 30%), accent line (rest). */
  title: {
    full: "L'IA dont l'Afrique a besoin sera bâtie par nous.",
    top: "L'IA dont l'Afrique",
    big: "a besoin",
    box: "sera",
    accent: "bâtie par nous.",
  },
  joinCta: "Rejoindre la communauté",
  /** Where the "Join the community" buttons go: the sign-up page. */
  joinHref: "/inscription",
  /** Accès direct à l'application, sans compte. */
  exploreCta: "Explorer les problèmes",
  exploreHref: "/accueil",
  scrollHint: "Faites défiler",
  statusTitle: "État du réseau",
  statusRegionWest: "Afrique de l'Ouest",
  statusRegionSouth: "Afrique australe",
  onlineLabel: "En ligne",
  offlineLabel: "Hors ligne",
};

export const mapConfig = {
  idleSpin: 6,          // degrees per second (6 = one turn per minute), 0 turns it off
  idleSpinStop: 0.01,
  /** Grid step in degrees. Smaller means more, finer dots. */
  cell: 0.9,
  /** Continent bounds used to frame the opening shot (lon, lat). */
  continent: { minLon: -18, maxLon: 52, minLat: -35, maxLat: 38 },
  /** Center of the soft light behind the continent. */
  focus: { lon: 18, lat: 4 },
  /** Where the zoom ends (Gulf of Guinea, around Benin). */
  target: { lon: 2.5, lat: 9 },
  /** Degrees visible across the larger screen side at full zoom. */
  endSpan: 42,
  /**
   * Scroll timeline (fractions of the hero):
   * 0 to rotateEnd: the globe turns from the Atlantic to Africa,
   * rotateEnd to morphEnd: the globe flattens into the Africa map,
   * morphEnd to zoomEnd: zoom into the target while markers appear,
   * zoomEnd to panStart: hold on West Africa (final call to action),
   * panStart to panEnd: the camera glides south to Southern Africa,
   * panEnd to returnStart: hold on Southern Africa while the three steps play,
   * returnStart to returnEnd: pull back to the continent, fold back into the
   * globe with every marker lit, and settle on the right beside the closing.
   */
  timeline: {
    rotateEnd: at(185),
    morphEnd: at(299),
    zoomEnd: at(616),
    panStart: at(704),
    panEnd: at(845),
    returnStart: at(1100),
    returnEnd: at(1260),
  },
  /** How visible the other continents are on the closing globe (0 hidden, 1 full). */
  closingWorld: 0.4,
  /** Where the pan ends (Southern Africa, Madagascar on the right). */
  southTarget: { lon: 22, lat: -23 },
  /** How much the camera pulls back halfway through the pan (0.25 = 25% wider). */
  panDip: 0.22,
  /** Opening globe view: centered on the Atlantic, Americas and Africa visible. */
  globeStart: { lon: -42, lat: 16 },
  /** Marker areas. West: appear during the zoom. Central and south: during the pan. */
  westRegion: { minLon: -17, maxLon: 22, minLat: 0, maxLat: 19 },
  centralRegion: { minLon: 10, maxLon: 34, minLat: -14, maxLat: 2 },
  southRegion: { minLon: 12, maxLon: 41, minLat: -35, maxLat: -16 },
  markersWest: 18,
  markersCentral: 6,
  markersSouth: 14,
  /** Markers spread over the rest of the continent, early in the zoom. */
  markersElsewhere: 8,
  onlineRatio: 0.62,
};

/**
 * Sections shown over the animation. `show` is the scroll window (fractions
 * of the hero) where the section is visible; it fades over `fade` at each end.
 * Title styles: "block" = words on a color block plus plain lines,
 * "center" = small spaced line over a big tracked line with green squares.
 */
export type SectionTitle =
  | { style: "block"; lines: { text: string; block?: boolean }[] }
  | { style: "center"; kicker: string; main: string };

export interface StorySection {
  id: string;
  label: string;
  title: SectionTitle;
  /** Full sentence, read by screen readers instead of the split title. */
  titleText: string;
  text: string;
  cta?: string;
  placement: "left" | "top";
  show: [number, number];
}

export const sections: StorySection[] = [
  {
    id: "sovereignty",
    label: "Souveraineté",
    title: {
      style: "block",
      lines: [{ text: "Ce que nous bâtissons", block: true }, { text: "reste à nous." }],
    },
    titleText: "Ce que nous bâtissons reste à nous.",
    text: "Nos données, nos communautés, nos solutions. Les développeurs et les communautés qu'ils servent décident de l'usage de leur travail, et en tirent profit. Aucune extraction silencieuse, aucun droit caché. L'ouverture, à nos conditions.",
    placement: "left",
    show: [at(65), at(145)],
  },
  {
    id: "everyone",
    label: "Chacun a sa place",
    title: {
      style: "center",
      kicker: "Pas besoin d’entraîner un modèle",
      main: "Pour faire avancer l’IA",
    },
    titleText: "Pas besoin d’entraîner un modèle pour faire avancer l’IA.",
    text: "Les données collectées sur le terrain, un problème clairement décrit, l’avis sur la solution d’un autre. Chaque contribution pose une pierre. La communauté vaut ce que vaut chacun de ceux qui s’impliquent.",
    placement: "top",
    show: [at(343), at(475)],
  },
  {
    id: "join",
    label: "Nous rejoindre",
    title: {
      style: "block",
      lines: [
        { text: "La prochaine avancée" },
        { text: "ne viendra pas de loin." },
        { text: "Elle viendra de nous.", block: true },
      ],
    },
    titleText: "La prochaine avancée ne viendra pas de loin. Elle viendra de nous.",
    text: "Rejoignez les développeurs qui bâtissent l’IA appliquée de l’Afrique, ensemble, un vrai problème à la fois.",
    cta: "Rejoindre la communauté",
    placement: "left",
    show: [at(563), at(704)],
  },
];

/** Fade length at each end of a section's window, and of the hero title. */
export const sectionFade = at(22);
/** Scroll point where the hero title has fully faded out. */
export const introEnd = at(65);

/**
 * Three steps shown over Southern Africa. `show` is the panel's scroll window;
 * each step becomes active once the scroll passes its `at` point, and the
 * number slide plus text change then play as a short timed transition.
 */
export const steps = {
  show: [at(830), at(1100)] as [number, number],
  items: [
    {
      at: at(847),
      title: "Les problèmes avant les modèles",
      text: "Nous partons de ce qui ne marche pas sur le terrain, pas de ce qui est à la mode. Chaque modèle, chaque dataset, chaque ligne de code est rattaché à un vrai besoin, un vrai lieu et aux personnes qui l’attendent.",
    },
    {
      at: at(935),
      title: "Par les développeurs, pour les développeurs",
      text: "Pas de gardiens du temple, des bâtisseurs qui en font grandir d’autres. Nous partageons ce qui a marché et ce qui a échoué : personne ne repart de zéro, et chacun est reconnu pour les problèmes qu’il a résolus.",
    },
    {
      at: at(1012),
      title: "Ce que nous bâtissons reste à nous",
      text: "Nos données, nos communautés, nos solutions. Les développeurs et les communautés qu’ils servent décident de l’usage de leur travail, et c’est à eux qu’il profite.",
    },
  ],
};

/** Status card: from the end of the West Africa zoom until the return to the globe. */
export const statusShow: [number, number] = [at(506), at(1100)];
/** Point during the pan where the card switches from West to Southern Africa. */
export const statusSwitch = at(782);

/** Closing, beside the globe: the hero title comes back with the join button. */
export const closing = {
  show: [at(1230), at(4000)] as [number, number],
  label: "Nous rejoindre",
  text: "Rejoignez les développeurs qui bâtissent l’IA appliquée de l’Afrique, ensemble, un vrai problème à la fois.",
};

/** Pied de page : liens vers l'application. Le nom vient de site.ts. `logo` : chemin dans /public, ou null. */
export const footer = {
  name: site.name,
  logo: null as string | null,
  tagline: "L'IA appliquée pour l'Afrique, par les développeurs, pour les développeurs.",
  columns: [
    {
      title: "Plateforme",
      links: [
        { label: "Problèmes", href: "/problemes" },
        { label: "Hub de solutions", href: "/hub" },
        { label: "Recherche", href: "/accueil" },
      ],
    },
    {
      title: "Communauté",
      links: [
        { label: "Rejoindre la communauté", href: "/inscription" },
        { label: "Publier un problème", href: "/problemes/nouveau" },
        { label: "Connexion", href: "/connexion" },
      ],
    },
    {
      title: "À propos",
      links: [
        { label: "Questions fréquentes", href: "/faq" },
        { label: "Souveraineté des données", href: "/faq" },
      ],
    },
  ],
  legal: `© 2026 ${site.name}. Projet présenté à la Coupe CAdev 2026.`,
};
