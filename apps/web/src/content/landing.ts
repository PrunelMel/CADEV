// All static copy and tuning for the landing hero lives here.
// Image: /assets/globe-poster.png (apps/web/public), WebGL fallback poster, from the africa-hero landing source.

/** Total scroll length of the hero, in vh. Every scroll point below is given in vh too. */
export const HERO_VH = 1320;
/** Converts a scroll point in vh to a fraction of the hero. */
const at = (vh: number) => vh / HERO_VH;

export const heroCopy = {
  eyebrow: "Live network across Africa",
  /** Hero lockup: top line, big word on the left, box on the right (top 30%), accent line (rest). */
  title: {
    full: "The AI Africa needs will be built by us.",
    top: "The AI Africa",
    big: "Needs",
    box: "Will be",
    accent: "Built by us.",
  },
  joinCta: "Join the community",
  /** Where the "Join the community" buttons go: the sign-up page. */
  joinHref: "/inscription",
  scrollHint: "Scroll to explore",
  statusTitle: "Live status",
  statusRegionWest: "West Africa",
  statusRegionSouth: "Southern Africa",
  onlineLabel: "Online",
  offlineLabel: "Offline",
};

export const mapConfig = {
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
    label: "Sovereignty",
    title: {
      style: "block",
      lines: [{ text: "What we build", block: true }, { text: "stays ours." }],
    },
    titleText: "What we build stays ours.",
    text: "Our data, our communities, our solutions. We believe developers and the communities they serve should decide how their work is used, and benefit from it. No silent extraction, no hidden rights. Openness on our own terms.",
    placement: "left",
    show: [at(65), at(145)],
  },
  {
    id: "everyone",
    label: "Everyone has a part",
    title: {
      style: "center",
      kicker: "You don’t need to train a model",
      main: "To move AI forward",
    },
    titleText: "You don’t need to train a model to move AI forward.",
    text: "The data collected in the field, the problem described clearly, the review of someone else’s solution. Every contribution builds the foundation. The community is only as strong as everyone who shows up.",
    placement: "top",
    show: [at(343), at(475)],
  },
  {
    id: "join",
    label: "Join us",
    title: {
      style: "block",
      lines: [
        { text: "The next breakthrough" },
        { text: "won’t come from far away." },
        { text: "It’ll come from us.", block: true },
      ],
    },
    titleText: "The next breakthrough won’t come from far away. It’ll come from us.",
    text: "Join the developers building Africa’s applied AI, together, one real problem at a time.",
    cta: "Join the community",
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
      title: "Problems before models",
      text: "We start from what’s broken in the field, not from what’s trending. Every model, dataset and line of code is tied to a real need, a real place and the people waiting for it.",
    },
    {
      at: at(935),
      title: "By developers, for developers",
      text: "No gatekeepers, just builders lifting builders. We share what worked and what failed, so no one starts from zero and everyone is known for the problems they’ve solved.",
    },
    {
      at: at(1012),
      title: "What we build stays ours",
      text: "Our data, our communities, our solutions. Developers and the communities they serve decide how their work is used, and they’re the ones who benefit from it.",
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
  label: "Join us",
  text: "Join the developers building Africa’s applied AI, together, one real problem at a time.",
};

/**
 * Footer. PLACEHOLDERS: replace the name, tagline, links and social accounts
 * with the real ones. `logo` is a path in /public, or null to use the dot mark.
 */
export const footer = {
  name: "Community Name",
  logo: null as string | null,
  tagline: "Applied AI for Africa, by developers, for developers.",
  columns: [
    { title: "Platform", links: [{ label: "Challenges", href: "#" }] },
    {
      title: "Community",
      links: [
        { label: "Join the community", href: "#" },
        { label: "Events", href: "#" },
        { label: "Contributors", href: "#" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Our principles", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ],
  socials: [
    { label: "GitHub", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "X", href: "#" },
    { label: "Discord", href: "#" },
  ],
  legal: "© 2026 Community Name. All rights reserved.",
};
