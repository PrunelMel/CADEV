import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent,
  type RefObject,
} from "react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "../../content/problem-form";
import "./glass.css";

/* Constantes de classes Tailwind (couleurs liées aux jetons CSS de glass.css) */
export const INK = "text-[color:var(--ink)]";
export const INK2 = "text-[color:var(--ink2)]";
export const INK3 = "text-[color:var(--ink3)]";
export const ACCENT_TEXT = "text-[color:var(--accent-text)]";
export const DISPLAY = "pp-display";
export const WIDE = "pp-wide";
export const MONO = "pp-mono";
export const SOFT_BTN =
  "grid size-8 place-items-center rounded-full text-[color:var(--ink2)] transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent-text)]";

export const SPRING = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 } as const;
export const SOFT_SPRING = { type: "spring", stiffness: 220, damping: 26, mass: 0.9 } as const;

/* Boutons pleins de la charte : lavande (page courante) et blanc cassé (action principale). */
export const ACCENT_FILL: CSSProperties = {
  color: "var(--on-accent)",
  background: "linear-gradient(180deg,#B7B0F7,#9A91EC)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), 0 10px 26px -12px rgba(162,154,240,.75)",
};
export const CTA_FILL: CSSProperties = {
  color: "var(--on-accent)",
  background: "linear-gradient(180deg,#F5F6FA,#E1E4EC)",
  boxShadow: "inset 0 1px 0 #fff, 0 10px 28px -14px rgba(233,234,239,.6)",
};

export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* Réfraction « Liquid Glass » : une carte de déplacement SVG (calculée aux dimensions réelles de la
   bulle) est branchée sur le backdrop-filter. Chromium uniquement ; ailleurs, flou givré seul. */
const SUPPORTS_LENS =
  typeof navigator !== "undefined" &&
  "userAgentData" in navigator &&
  /Chrom/.test(navigator.userAgent || "");
const SVG_NS = "http://www.w3.org/2000/svg";
let lensDefs: SVGSVGElement | null = null;
let lensUid = 0;

function ensureLensDefs() {
  if (!lensDefs) {
    lensDefs = document.createElementNS(SVG_NS, "svg");
    lensDefs.setAttribute("aria-hidden", "true");
    lensDefs.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    document.body.appendChild(lensDefs);
  }
  return lensDefs;
}

function lensMap(w: number, h: number, r: number, bezel: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  if (!g) return "";
  const img = g.createImageData(w, h);
  const d = img.data;
  const hw = w / 2;
  const hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cx = x + 0.5 - hw;
      const cy = y + 0.5 - hh;
      const qx = Math.abs(cx) - (hw - r);
      const qy = Math.abs(cy) - (hh - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const dist = r - (Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0)); // distance au bord, positive à l'intérieur
      let R = 128;
      let G = 128;
      if (dist > 0 && dist < bezel) {
        const m = (1 - dist / bezel) ** 2.4; // fort sur le liseré, nul au centre
        let nx: number;
        let ny: number;
        if (ox > 0 || oy > 0) {
          const l = Math.hypot(ox, oy) || 1;
          nx = (ox / l) * Math.sign(cx);
          ny = (oy / l) * Math.sign(cy);
        } else if (qx > qy) {
          nx = Math.sign(cx);
          ny = 0;
        } else {
          nx = 0;
          ny = Math.sign(cy);
        }
        R = Math.round(127.5 - nx * m * 127.5); // on échantillonne vers l'intérieur : le bord grossit le décor
        G = Math.round(127.5 - ny * m * 127.5);
      }
      d[i] = R;
      d[i + 1] = G;
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

export type LensOptions = boolean | { bezel?: number; scale?: number; blur?: number };

function useLens(ref: RefObject<HTMLElement | null>, enabled: LensOptions) {
  useEffect(() => {
    if (!SUPPORTS_LENS || !enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const { bezel = 14, scale = 28, blur = 6 } = typeof enabled === "object" ? enabled : {};
    const id = `pp-lens-${++lensUid}`;
    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const feImg = document.createElementNS(SVG_NS, "feImage");
    feImg.setAttribute("preserveAspectRatio", "none");
    feImg.setAttribute("result", "map");
    const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "map");
    disp.setAttribute("scale", String(scale));
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "G");
    filter.append(feImg, disp);
    ensureLensDefs().appendChild(filter);
    let last = "";
    const update = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (!w || !h || last === `${w}x${h}`) return;
      last = `${w}x${h}`;
      const r = Math.min(
        parseFloat(getComputedStyle(el).borderTopLeftRadius) || h / 2,
        w / 2,
        h / 2,
      );
      for (const n of [filter, feImg]) {
        n.setAttribute("x", "0");
        n.setAttribute("y", "0");
        n.setAttribute("width", String(w));
        n.setAttribute("height", String(h));
      }
      feImg.setAttribute("href", lensMap(w, h, r, bezel));
      el.style.backdropFilter = `url(#${id}) blur(${blur}px) saturate(1.8) brightness(1.04)`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      filter.remove();
      el.style.backdropFilter = "";
    };
  }, [ref, enabled]);
}

type GlassProps<T extends ElementType> = {
  as?: T;
  variant?: string;
  className?: string;
  lens?: LensOptions;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/** Surface de verre : le reflet spéculaire suit le pointeur (variables --mx / --my). */
export const Glass = forwardRef(function Glass<T extends ElementType = "div">(
  { as, variant = "", className = "", lens = false, ...rest }: GlassProps<T>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const Tag: ElementType = as ?? "div";
  const inner = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useLens(inner, lens);
  const onMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);
  return (
    <Tag ref={setRef} onPointerMove={onMove} className={`lg ${variant} ${className}`} {...rest} />
  );
}) as <T extends ElementType = "div">(
  props: GlassProps<T> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement;

/** Pastille ronde teintée (verre sombre + liseré de la teinte) avec une icône ou un code mono. */
export function Tile({
  c,
  size = 36,
  icon: Icon,
  code,
  className = "",
  style,
}: {
  c: Tone;
  size?: number;
  icon?: LucideIcon;
  code?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        color: c[0],
        background: `linear-gradient(150deg, ${hexA(c[0], 0.22)}, ${hexA(c[1], 0.1)})`,
        boxShadow: `inset 0 0 0 1px ${hexA(c[0], 0.34)}, inset 0 1px 0 rgba(255,255,255,.12)`,
        ...style,
      }}
    >
      {Icon ? (
        <Icon size={Math.round(size * 0.52)} strokeWidth={2} />
      ) : (
        <span
          className="leading-none font-medium"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: ".02em",
            fontSize: Math.max(9, Math.round(size * (String(code).length > 2 ? 0.27 : 0.33))),
          }}
        >
          {code}
        </span>
      )}
    </span>
  );
}

/* Marque : globe en points avec un nœud vert, comme la carte de la page d'accueil */
const LOGO_DOTS = (() => {
  const out: [number, number][] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const dx = x - 2;
      const dy = y - 2;
      if (dx * dx + dy * dy <= 5 && !(x === 3 && y === 1)) out.push([x, y]);
    }
  return out;
})();

export function Logo() {
  return (
    <span
      aria-hidden
      className="relative grid size-8 shrink-0 place-items-center rounded-full"
      style={{
        background: "radial-gradient(circle at 30% 22%, #1D2547, #0A0E1B 72%)",
        boxShadow: "inset 0 0 0 1px rgba(162,154,240,.5), 0 0 18px -4px rgba(162,154,240,.55)",
      }}
    >
      <svg viewBox="0 0 20 20" className="size-5">
        {LOGO_DOTS.map(([x, y]) => (
          <circle
            key={`${x}${y}`}
            cx={2 + x * 4}
            cy={2 + y * 4}
            r="1.1"
            fill="#C9CDDB"
            fillOpacity=".8"
          />
        ))}
        <circle cx="14" cy="6" r="2.4" fill="#4ADE80" fillOpacity=".25" />
        <circle cx="14" cy="6" r="1.5" fill="#4ADE80" />
      </svg>
    </span>
  );
}
