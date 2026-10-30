import { Link } from "react-router";
import { africaDots, AFRICA_STEP } from "../content/africa-dots";
import { countryInfo } from "../content/countries";

// Projection équirectangulaire. Les bornes incluent Cabo Verde, Maurice et les Seychelles.
const BOUNDS = { minLon: -26, maxLon: 60, maxLat: 38, minLat: -36 };
const K = 10;
const W = (BOUNDS.maxLon - BOUNDS.minLon) * K;
const H = (BOUNDS.maxLat - BOUNDS.minLat) * K;
const x = (lon: number) => (lon - BOUNDS.minLon) * K;
const y = (lat: number) => (BOUNDS.maxLat - lat) * K;

export type CountryCount = { country: string; total: number; open: number };

const palettes = {
  dark: { dot: "#26304a", hit: "#a397f7", open: "#45e085", label: "#e6ebf4", ring: "#0b1020" },
  light: { dot: "#dfe3ea", hit: "#5847d1", open: "#15803d", label: "#0b1020", ring: "#ffffff" },
};

/**
 * Carte des problèmes publiés, pays par pays. Chaque cercle est un pays qui a au moins un
 * problème ; sa taille suit le nombre de problèmes. Un clic filtre la liste des problèmes.
 */
export function AfricaMap({
  counts,
  variant = "light",
  className = "",
}: {
  counts: CountryCount[];
  variant?: keyof typeof palettes;
  className?: string;
}) {
  const p = palettes[variant];
  const placed = counts
    .map((c) => ({ ...c, info: countryInfo(c.country) }))
    .filter((c): c is typeof c & { info: NonNullable<typeof c.info> } => !!c.info);
  const max = Math.max(1, ...placed.map((c) => c.total));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={`Carte des problèmes publiés : ${placed
        .map((c) => `${c.country}, ${c.total}`)
        .join(" ; ")}`}
    >
      {africaDots.map(([lon, lat]) => (
        <circle
          key={`${lon},${lat}`}
          cx={x(lon)}
          cy={y(lat)}
          r={AFRICA_STEP * K * 0.32}
          fill={p.dot}
        />
      ))}
      {placed.map((c) => {
        const r = 10 + 20 * Math.sqrt(c.total / max);
        const [lon, lat] = c.info.at;
        // Voisin marqué juste à l'est (Bénin et Togo, par exemple) : étiquette à gauche.
        const left = placed.some(
          (o) =>
            o !== c &&
            o.info.at[0] > lon &&
            o.info.at[0] - lon < 6 &&
            Math.abs(o.info.at[1] - lat) < 4,
        );
        return (
          <Link key={c.country} to={`/problemes?pays=${encodeURIComponent(c.country)}`}>
            <title>
              {c.country} : {c.total} problème{c.total > 1 ? "s" : ""}, dont {c.open} ouvert
              {c.open > 1 ? "s" : ""}
            </title>
            <circle
              cx={x(lon)}
              cy={y(lat)}
              r={r}
              fill={p.hit}
              fillOpacity={0.22}
              stroke={p.hit}
              strokeWidth={2}
            />
            <circle
              cx={x(lon)}
              cy={y(lat)}
              r={5}
              fill={c.open ? p.open : p.hit}
              stroke={p.ring}
              strokeWidth={2}
            />
            <text
              x={left ? x(lon) - r - 6 : x(lon) + r + 6}
              y={y(lat) + 5}
              textAnchor={left ? "end" : "start"}
              fill={p.label}
              fontSize={17}
              fontFamily="Geist Mono, ui-monospace, monospace"
              fontWeight={600}
            >
              {c.info.code} {c.total}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}
