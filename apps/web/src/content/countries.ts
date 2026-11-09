// Pays d'Afrique : nom affiché, code ISO 3166-1 alpha-2, centre approximatif (longitude, latitude)
// pour placer les problèmes sur la carte, et région (découpage des Nations unies).
export const regions = {
  nord: { label: "Nord", name: "Afrique du Nord", color: "#fb923c" },
  ouest: { label: "Ouest", name: "Afrique de l'Ouest", color: "#2dd4bf" },
  centre: { label: "Centre", name: "Afrique centrale", color: "#60a5fa" },
  est: { label: "Est", name: "Afrique de l'Est", color: "#f87171" },
  sud: { label: "Sud", name: "Afrique australe", color: "#4ade80" },
} as const;
export type RegionId = keyof typeof regions;

export const africanCountries = [
  { name: "Afrique du Sud", code: "ZA", at: [24, -29], region: "sud" },
  { name: "Algérie", code: "DZ", at: [3, 28], region: "nord" },
  { name: "Angola", code: "AO", at: [17.5, -12.5], region: "centre" },
  { name: "Bénin", code: "BJ", at: [2.3, 9.5], region: "ouest" },
  { name: "Botswana", code: "BW", at: [24, -22], region: "sud" },
  { name: "Burkina Faso", code: "BF", at: [-1.5, 12.3], region: "ouest" },
  { name: "Burundi", code: "BI", at: [29.9, -3.4], region: "est" },
  { name: "Cabo Verde", code: "CV", at: [-24, 16], region: "ouest" },
  { name: "Cameroun", code: "CM", at: [12.5, 5.5], region: "centre" },
  { name: "Centrafrique", code: "CF", at: [20.9, 6.6], region: "centre" },
  { name: "Comores", code: "KM", at: [43.3, -11.7], region: "est" },
  { name: "Congo", code: "CG", at: [15.2, -0.7], region: "centre" },
  { name: "Côte d'Ivoire", code: "CI", at: [-5.5, 7.6], region: "ouest" },
  { name: "Djibouti", code: "DJ", at: [42.6, 11.8], region: "est" },
  { name: "Égypte", code: "EG", at: [30, 26.5], region: "nord" },
  { name: "Érythrée", code: "ER", at: [39, 15.2], region: "est" },
  { name: "Eswatini", code: "SZ", at: [31.5, -26.5], region: "sud" },
  { name: "Éthiopie", code: "ET", at: [39.5, 8.6], region: "est" },
  { name: "Gabon", code: "GA", at: [11.6, -0.6], region: "centre" },
  { name: "Gambie", code: "GM", at: [-15.4, 13.4], region: "ouest" },
  { name: "Ghana", code: "GH", at: [-1.2, 7.9], region: "ouest" },
  { name: "Guinée", code: "GN", at: [-11, 10.4], region: "ouest" },
  { name: "Guinée équatoriale", code: "GQ", at: [10.3, 1.6], region: "centre" },
  { name: "Guinée-Bissau", code: "GW", at: [-15, 12], region: "ouest" },
  { name: "Kenya", code: "KE", at: [37.9, 0.2], region: "est" },
  { name: "Lesotho", code: "LS", at: [28.2, -29.6], region: "sud" },
  { name: "Liberia", code: "LR", at: [-9.4, 6.4], region: "ouest" },
  { name: "Libye", code: "LY", at: [17, 27], region: "nord" },
  { name: "Madagascar", code: "MG", at: [46.8, -19.4], region: "est" },
  { name: "Malawi", code: "MW", at: [34.3, -13.2], region: "est" },
  { name: "Mali", code: "ML", at: [-2, 17.5], region: "ouest" },
  { name: "Maroc", code: "MA", at: [-6.5, 31.8], region: "nord" },
  { name: "Maurice", code: "MU", at: [57.6, -20.3], region: "est" },
  { name: "Mauritanie", code: "MR", at: [-10.5, 20.3], region: "ouest" },
  { name: "Mozambique", code: "MZ", at: [35.5, -18], region: "est" },
  { name: "Namibie", code: "NA", at: [17.5, -22.5], region: "sud" },
  { name: "Niger", code: "NE", at: [9.4, 17.4], region: "ouest" },
  { name: "Nigeria", code: "NG", at: [8.1, 9.6], region: "ouest" },
  { name: "Ouganda", code: "UG", at: [32.4, 1.3], region: "est" },
  { name: "RD Congo", code: "CD", at: [23.6, -2.9], region: "centre" },
  { name: "Rwanda", code: "RW", at: [29.9, -2], region: "est" },
  { name: "Sao Tomé-et-Principe", code: "ST", at: [6.6, 0.3], region: "centre" },
  { name: "Sénégal", code: "SN", at: [-14.5, 14.4], region: "ouest" },
  { name: "Seychelles", code: "SC", at: [55.5, -4.6], region: "est" },
  { name: "Sierra Leone", code: "SL", at: [-11.8, 8.5], region: "ouest" },
  { name: "Somalie", code: "SO", at: [46, 6], region: "est" },
  { name: "Soudan", code: "SD", at: [30, 15.5], region: "nord" },
  { name: "Soudan du Sud", code: "SS", at: [30.3, 7.3], region: "est" },
  { name: "Tanzanie", code: "TZ", at: [34.9, -6.3], region: "est" },
  { name: "Tchad", code: "TD", at: [18.7, 15.3], region: "centre" },
  { name: "Togo", code: "TG", at: [0.98, 8.5], region: "ouest" },
  { name: "Tunisie", code: "TN", at: [9.5, 34], region: "nord" },
  { name: "Zambie", code: "ZM", at: [27.8, -13.4], region: "est" },
  { name: "Zimbabwe", code: "ZW", at: [29.9, -19], region: "est" },
] as const satisfies readonly {
  name: string;
  code: string;
  at: readonly [number, number];
  region: RegionId;
}[];

const byName = new Map<string, (typeof africanCountries)[number]>(
  africanCountries.map((c) => [c.name, c]),
);
export const countryInfo = (name: string) => byName.get(name);

const byCode = new Map<string, (typeof africanCountries)[number]>(
  africanCountries.map((c) => [c.code, c]),
);
export const countryByCode = (code: string) => byCode.get(code);
