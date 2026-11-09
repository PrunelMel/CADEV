// Carte de l'Afrique en points (charte « Liquid Glass ») : pays, régions, tracés et cadrage.
// Partagée par la page « Publier un problème » et la liste des problèmes.

import { memo } from "react";
import { AFRICA, type AfricaCountry } from "../../content/africa-map";
import { countryByCode } from "../../content/countries";
import type { Tone } from "../../content/problem-form";

// Les noms affichés et enregistrés sont ceux du catalogue des pays de l'application (filtres,
// données existantes) ; la carte fournit tracés, régions et codes.
export const COUNTRIES: AfricaCountry[] = AFRICA.countries
  .map((c) => ({ ...c, name: countryByCode(c.id)?.name ?? c.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));
export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
export const REGION_KEY: Record<string, string> = {
  "Afrique du Nord": "n",
  "Afrique de l'Ouest": "w",
  "Afrique centrale": "c",
  "Afrique de l'Est": "e",
  "Afrique australe": "s",
};
export const REGION_TONE: Record<string, string> = {
  n: "#E8B86B",
  w: "#6FD8CC",
  c: "#86BDF5",
  e: "#F29A98",
  s: "#BDDD7E",
};

export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - k));
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
export const regionTone = (country: AfricaCountry): Tone => {
  const t = REGION_TONE[REGION_KEY[country.region]];
  return [t, shade(t, 0.28)];
};

export type Focus = { cx: number; cy: number; w: number; h: number };
export type View = { x: number; y: number; w: number; h: number };

export const VB = AFRICA.viewBox;
export const FULL_FOCUS: Focus = {
  cx: VB[0] + VB[2] / 2,
  cy: VB[1] + VB[3] / 2,
  w: VB[2],
  h: VB[3],
};
export const SMALL_ISLANDS = new Set(["CV", "KM", "MU", "ST", "SC"]);
export const rectFor = (list: AfricaCountry[]): Focus => {
  const b = list.reduce(
    (a, c) => [
      Math.min(a[0], c.b[0]),
      Math.min(a[1], c.b[1]),
      Math.max(a[2], c.b[2]),
      Math.max(a[3], c.b[3]),
    ],
    [1e9, 1e9, -1e9, -1e9],
  );
  const bw = b[2] - b[0];
  const bh = b[3] - b[1];
  return {
    cx: (b[0] + b[2]) / 2,
    cy: (b[1] + b[3]) / 2,
    w: Math.min(VB[2], Math.max(bw / 0.58, 120)),
    h: Math.min(VB[3], Math.max(bh / 0.58, 120)),
  };
};

/* Carte en points : une grille commune, chaque pays est un seul tracé « M x y h0 » en traits ronds
   (un point par segment nul). */
export const PITCH = AFRICA.pitch;
export const dotPath = (k: number[]) => {
  let d = "";
  for (let n = 0; n < k.length; n += 2) d += `M${k[n] * PITCH} ${k[n + 1] * PITCH}h0`;
  return d;
};
export const DOTS = Object.fromEntries(COUNTRIES.map((c) => [c.id, dotPath(c.k)]));
export const OFF_DOTS = AFRICA.other.map((o) => ({ id: o.id, d: dotPath(o.k) }));
export const ALL_DOTS =
  COUNTRIES.map((c) => DOTS[c.id]).join("") + OFF_DOTS.map((o) => o.d).join("");

export const CountryShape = memo(function CountryShape({
  c,
  sel,
  hot,
  dim,
  rgh,
}: {
  c: AfricaCountry;
  sel: boolean;
  hot: boolean;
  dim: boolean;
  rgh: boolean;
}) {
  const island = SMALL_ISLANDS.has(c.id);
  return (
    <g
      className="pp-cg"
      data-cid={c.id}
      data-rg={REGION_KEY[c.region]}
      data-sel={sel ? 1 : undefined}
      data-hot={hot ? 1 : undefined}
      data-dim={dim ? 1 : undefined}
      data-rgh={rgh ? 1 : undefined}
    >
      {island && <circle cx={c.c[0]} cy={c.c[1]} r="13" className="pp-ring" />}
      <path d={DOTS[c.id]} className="pp-dots" />
      <path d={c.d} className="pp-ct" />
    </g>
  );
});
