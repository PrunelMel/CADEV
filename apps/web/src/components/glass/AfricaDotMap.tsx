import { useCallback, useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "framer-motion";
import {
  COUNTRY_BY_ID,
  COUNTRIES,
  CountryShape,
  FULL_FOCUS,
  OFF_DOTS,
  rectFor,
  VB,
  type Focus,
  type View,
} from "./africaMap";

/** Cadre de la caméra : le pays (élargi de `spread`), ou tout le continent. */
function focusFor(code: string | null, spread: number): Focus {
  const c = code ? COUNTRY_BY_ID[code] : undefined;
  if (!c) return FULL_FOCUS;
  const r = rectFor([c]);
  return { ...r, w: Math.min(VB[2], r.w * spread), h: Math.min(VB[3], r.h * spread) };
}

export type CountryMarker = { total: number; open: number; label?: string };

/**
 * Carte de l'Afrique en points, en lecture : la caméra glisse jusqu'au pays `focus` (ou revient
 * au continent), le pays `selected` est surligné. `markers` place un cercle par pays, dont la taille
 * suit le nombre de problèmes ; un clic sur un pays appelle `onPick` avec son code. `spread`
 * élargit le cadrage autour du pays (1 : le pays seul ; 3 : le pays et ses voisins).
 */
export function AfricaDotMap({
  focus = null,
  selected = null,
  markers,
  onPick,
  className = "",
  label = "Carte de l’Afrique",
  spread = 1,
}: {
  focus?: string | null;
  selected?: string | null;
  markers?: Record<string, CountryMarker>;
  onPick?: (code: string) => void;
  className?: string;
  label?: string;
  spread?: number;
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef<View>({ x: VB[0], y: VB[1], w: VB[2], h: VB[3] });
  const target = useRef<Focus>(FULL_FOCUS);
  const size = useRef({ w: 1, h: 1 });
  const anim = useRef<AnimationPlaybackControls | null>(null);

  const apply = useCallback((v: View) => {
    view.current = v;
    svgRef.current?.setAttribute(
      "viewBox",
      `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`,
    );
  }, []);
  // Cadre qui contient `f` en gardant les proportions du conteneur.
  const fit = useCallback((f: Focus): View => {
    const ar = size.current.w / size.current.h;
    let { w, h } = f;
    if (w / h < ar) w = h * ar;
    else h = w / ar;
    return { x: f.cx - w / 2, y: f.cy - h / 2, w, h };
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { w: Math.max(r.width, 1), h: Math.max(r.height, 1) };
      apply(fit(target.current));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      anim.current?.stop();
    };
  }, [apply, fit]);

  // La caméra suit le pays choisi.
  useEffect(() => {
    target.current = focusFor(focus, spread);
    const to = fit(target.current);
    anim.current?.stop();
    if (reduce) {
      apply(to);
      return;
    }
    const from = { ...view.current };
    anim.current = animate(0, 1, {
      type: "spring",
      stiffness: 90,
      damping: 20,
      mass: 0.9,
      onUpdate: (t) =>
        apply({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          w: from.w + (to.w - from.w) * t,
          h: from.h + (to.h - from.h) * t,
        }),
    });
  }, [focus, spread, reduce, apply, fit]);

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const id = (e.target as Element).closest<SVGGElement>("[data-cid]")?.dataset.cid;
    if (id && onPick) onPick(id);
  };

  const sel = selected ? COUNTRY_BY_ID[selected] : undefined;
  const max = Math.max(1, ...Object.values(markers ?? {}).map((m) => m.total));
  // Les cercles gardent à peu près leur taille à l'écran quand la carte zoome.
  const scale = Math.min(1, Math.sqrt(focusFor(focus, spread).w / VB[2]) * 1.2);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        onClick={onClick}
        className={`absolute inset-0 h-full w-full select-none ${onPick ? "cursor-pointer" : ""}`}
      >
        <defs>
          <filter id="pp-map-glow" x="-60%" y="-60%" width="220%" height="230%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3.2"
              floodColor="#A29AF0"
              floodOpacity="0.6"
            />
          </filter>
        </defs>
        {OFF_DOTS.map((o) => (
          <path key={o.id} d={o.d} className="pp-off" />
        ))}
        {COUNTRIES.map((c) => (
          <CountryShape
            key={c.id}
            c={c}
            sel={c.id === selected}
            hot={!!markers?.[c.id]}
            dim={!!sel && c.id !== selected}
            rgh={false}
          />
        ))}
        {sel && <path key={sel.id} d={sel.d} className="pp-sel" filter="url(#pp-map-glow)" />}
        {markers &&
          Object.entries(markers).map(([code, m]) => {
            const c = COUNTRY_BY_ID[code];
            if (!c) return null;
            const r = (9 + 16 * Math.sqrt(m.total / max)) * scale;
            return (
              <g key={code} className="pointer-events-none">
                <title>{m.label ?? `${c.name} : ${m.total}`}</title>
                <circle
                  cx={c.c[0]}
                  cy={c.c[1]}
                  r={r}
                  fill="rgba(162,154,240,.18)"
                  stroke="#A29AF0"
                  strokeWidth={1.4}
                />
                <circle
                  cx={c.c[0]}
                  cy={c.c[1]}
                  r={3.6 * scale}
                  fill={m.open ? "#4ADE80" : "#A29AF0"}
                />
              </g>
            );
          })}
        {sel && (
          <g
            key={`node-${sel.id}`}
            className="pp-node"
            transform={`translate(${sel.c[0]} ${sel.c[1]})`}
          >
            <circle r="7" className="pp-node-ping" />
            <circle r="7.5" className="pp-node-ring" />
            <circle r="3.6" className="pp-node-core" />
          </g>
        )}
      </svg>
    </div>
  );
}
