/**
 * Pièces des formulaires en verre (publication d'un problème, création d'un dépôt) : recherche
 * contextuelle, champs, groupes, panneaux, bulles, carte des pays, barre d'envoi, décor.
 * Extraites telles quelles de la page fournie par l'équipe (PublishProblem).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  LocateFixed,
  Minus,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { AFRICA } from "../../content/africa-map";
import type { TagOption, Tone } from "../../content/problem-form";
import {
  ALL_DOTS,
  COUNTRIES,
  COUNTRY_BY_ID,
  CountryShape,
  FULL_FOCUS,
  OFF_DOTS,
  REGION_KEY,
  REGION_TONE,
  VB,
  rectFor,
  type Focus,
  type View,
} from "./africaMap";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  MONO,
  SOFT_BTN,
  SOFT_SPRING,
  SPRING,
  Tile,
  WIDE,
} from "./Glass";

export type ChoiceOption = { id: string; label: string; icon: LucideIcon; c: Tone };

export const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type SearchResult = {
  key: string;
  label: string;
  sub?: string;
  lead: ReactNode;
  pick: () => void;
};

/** Barre de recherche contextuelle (colonne de droite, en haut à gauche). */
export function ContextSearch({
  value,
  onChange,
  placeholder,
  results = [],
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  results?: SearchResult[];
  onEnter?: (v: string) => void;
}) {
  const [focus, setFocus] = useState(false);
  const [idx, setIdx] = useState(0);
  const open = focus && value.trim() !== "" && results.length > 0;
  useEffect(() => setIdx(0), [value]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && results[idx]) results[idx].pick();
      else onEnter?.(value);
    } else if (e.key === "Escape") onChange("");
  };

  return (
    <div className="relative z-30 w-full max-w-[470px]">
      <Glass
        lens
        className="flex h-[52px] items-center gap-3 rounded-full pr-2 pl-4 focus-within:shadow-[0_0_0_4px_var(--accent-ring),0_14px_34px_-14px_var(--shade)]"
      >
        <Search size={18} className={`shrink-0 ${INK2}`} strokeWidth={2.2} />
        <input
          id="pp-context-search"
          aria-label={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent text-[15.5px] font-medium outline-none placeholder:font-normal placeholder:text-[color:var(--ink3)] ${INK}`}
        />
        <AnimatePresence initial={false}>
          {value && (
            <motion.button
              type="button"
              aria-label="Effacer la recherche"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={SPRING}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange("")}
              className={SOFT_BTN}
            >
              <X size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </Glass>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
            onMouseDown={(e) => e.preventDefault()}
            className="lg lg-strong pp-scroll absolute inset-x-0 top-[calc(100%+8px)] max-h-[330px] overflow-y-auto rounded-[22px] p-1.5"
          >
            {results.map((r, i) => (
              <li key={r.key} role="option" aria-selected={i === idx}>
                <button
                  type="button"
                  onClick={r.pick}
                  onPointerEnter={() => setIdx(i)}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left transition-colors ${i === idx ? "bg-[color:var(--accent-soft)]" : ""}`}
                >
                  {r.lead}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] font-semibold ${INK}`}>
                      {r.label}
                    </span>
                    {r.sub && (
                      <span className={`block truncate text-[12.5px] ${INK3}`}>{r.sub}</span>
                    )}
                  </span>
                  {i === idx && (
                    <span className={`hidden text-[10.5px] sm:block ${MONO} ${INK3}`}>Entrée</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FieldShell({
  id,
  label,
  hint,
  active,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`mb-2.5 block px-1 text-[12px] leading-none transition-colors duration-300 ${MONO} ${active ? ACCENT_TEXT : INK2}`}
      >
        {label}
      </label>
      {children}
      {hint && <p className={`mt-2.5 px-1 text-[13px] leading-snug ${INK3}`}>{hint}</p>}
    </div>
  );
}

export function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5 pt-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="pp-sq" />
        <h2
          className={`${WIDE} pp-silver text-[12.5px] leading-none`}
          style={{ letterSpacing: ".24em", fontWeight: 600 }}
        >
          {title}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[color:var(--hair)]" />
        {note && <span className={`text-[11px] ${MONO} ${INK3}`}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function ProgressRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 11;
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--hair)" strokeWidth="3.2" />
      <circle
        cx="14"
        cy="14"
        r="11"
        fill="none"
        stroke={pct >= 1 ? "var(--ok)" : "var(--accent)"}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.9,.3,1), stroke .3s" }}
      />
    </svg>
  );
}

export const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.2, 0.9, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: { opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.18 } },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: SOFT_SPRING },
};

export function PanelHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div variants={itemVariants} className="mb-4 shrink-0 px-1">
      <h2
        className={`text-[clamp(32px,3.4vh+12px,46px)] leading-[1] [text-wrap:balance] ${DISPLAY} ${INK}`}
      >
        {title}
      </h2>
      <p className={`mt-2 max-w-[56ch] text-[14.5px] leading-snug ${INK2}`}>{subtitle}</p>
    </motion.div>
  );
}

/** Barre flottante en bas du panneau : résumé du choix + passage au champ suivant. */
export function DockBar({
  children,
  disabled = false,
  last,
  onNext,
}: {
  children: ReactNode;
  disabled?: boolean;
  last: boolean;
  onNext: () => void;
}) {
  return (
    <motion.div variants={itemVariants} className="shrink-0 pt-3">
      <Glass
        variant="lg-strong"
        className="flex h-[64px] items-center gap-3 rounded-[22px] pr-2 pl-3"
      >
        <div className="min-w-0 flex-1 pl-1">{children}</div>
        <motion.button
          type="button"
          onClick={onNext}
          disabled={disabled}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          style={CTA_FILL}
          className="flex h-11 shrink-0 items-center gap-2 rounded-[12px] px-5 text-[15px] font-semibold disabled:opacity-50"
        >
          {last ? "Terminer" : "Suivant"} <ArrowRight size={16} strokeWidth={2.4} />
        </motion.button>
      </Glass>
    </motion.div>
  );
}

export const DockEmpty = ({ children }: { children: ReactNode }) => (
  <span className={`truncate text-[14.5px] ${INK3}`}>{children}</span>
);

export function ChoiceBubble({
  s,
  selected,
  dimmed,
  onPick,
}: {
  s: ChoiceOption;
  selected: boolean;
  dimmed: boolean;
  onPick: () => void;
}) {
  const Icon = s.icon;
  return (
    <Glass
      as={motion.button}
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      animate={{ opacity: dimmed ? 0.3 : 1, scale: dimmed ? 0.96 : 1 }}
      whileHover={{ scale: 1.035, y: -3 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRING}
      style={
        selected
          ? {
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.55), 0 0 0 1px var(--accent), 0 0 0 5px var(--accent-ring), 0 20px 44px -16px rgba(162,154,240,.75)",
            }
          : undefined
      }
      className="pp-sec relative flex h-full w-full items-center gap-2.5 overflow-hidden rounded-full p-2 pr-4 text-left sm:gap-3.5 sm:pr-6"
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            aria-hidden
            key="fill"
            initial={{ clipPath: "circle(0% at 44px 50%)" }}
            animate={{ clipPath: "circle(150% at 44px 50%)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 -z-[1] rounded-full"
            style={{ background: "linear-gradient(120deg,#C6C0FA,#A29AF0 58%,#968DEA)" }}
          />
        )}
      </AnimatePresence>
      <span
        aria-hidden
        className="pp-sec-tile relative grid shrink-0 place-items-center rounded-full transition-colors duration-500"
        style={
          selected
            ? {
                color: "var(--on-accent)",
                background: "rgba(10,13,22,.13)",
                boxShadow: "inset 0 0 0 1px rgba(10,13,22,.28)",
              }
            : {
                color: s.c[0],
                background: `linear-gradient(150deg, ${hexA(s.c[0], 0.22)}, ${hexA(s.c[1], 0.1)})`,
                boxShadow: `inset 0 0 0 1px ${hexA(s.c[0], 0.34)}, inset 0 1px 0 rgba(255,255,255,.12)`,
              }
        }
      >
        <Icon size="50%" strokeWidth={1.9} />
      </span>
      <span
        className={`pp-sec-label relative min-w-0 flex-1 leading-[1.08] font-semibold tracking-[-0.01em] [text-wrap:balance] transition-colors duration-500 ${selected ? "text-[color:var(--on-accent)]" : INK}`}
      >
        {s.label}
      </span>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={SPRING}
            className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-[color:var(--on-accent)] text-[color:var(--accent2)]"
          >
            <Check size={14} strokeWidth={3.2} />
          </motion.span>
        )}
      </AnimatePresence>
    </Glass>
  );
}

/**
 * Carte interactive de l'Afrique pour choisir un pays : glisser pour déplacer, molette de zoom,
 * infobulle, légende des régions. La caméra suit la sélection et la recherche `query`.
 */
export function CountryMap({
  selected,
  onPick,
  query = "",
  label = "Carte de l’Afrique. Utilisez la recherche pour choisir un pays au clavier.",
}: {
  selected: string | null;
  onPick: (id: string | null) => void;
  query?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef<View>({ x: VB[0], y: VB[1], w: VB[2], h: VB[3] });
  const focus = useRef<Focus>(FULL_FOCUS);
  const size = useRef({ w: 1, h: 1 });
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    cid: string | null;
    moved: boolean;
    cx: number;
    cy: number;
  } | null>(null);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const [hover, setHover] = useState<string | null>(null);
  const [rgHover, setRgHover] = useState<string | null>(null);

  const q = norm(query);
  const matches = useMemo(() => (q ? COUNTRIES.filter((c) => norm(c.name).includes(q)) : []), [q]);
  const matchIds = useMemo(() => new Set(matches.map((c) => c.id)), [matches]);
  const sel = selected ? COUNTRY_BY_ID[selected] : undefined;

  const applyView = useCallback((v: View) => {
    view.current = v;
    svgRef.current?.setAttribute(
      "viewBox",
      `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`,
    );
  }, []);
  const viewOf = useCallback((f: Focus): View => {
    const ar = size.current.w / size.current.h;
    let { w, h } = f;
    if (w / h < ar) w = h * ar;
    else h = w / ar;
    return { x: f.cx - w / 2, y: f.cy - h / 2, w, h };
  }, []);
  const go = useCallback(
    (f: Focus, instant = false) => {
      focus.current = f;
      const to = viewOf(f);
      anim.current?.stop();
      if (instant || reduce) {
        applyView(to);
        return;
      }
      const from = { ...view.current };
      anim.current = animate(0, 1, {
        type: "spring",
        stiffness: 105,
        damping: 19,
        mass: 0.85,
        onUpdate: (t) =>
          applyView({
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            w: from.w + (to.w - from.w) * t,
            h: from.h + (to.h - from.h) * t,
          }),
      });
    },
    [applyView, reduce, viewOf],
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { w: Math.max(r.width, 1), h: Math.max(r.height, 1) };
      applyView(viewOf(focus.current));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      anim.current?.stop();
    };
  }, [applyView, viewOf]);

  // La caméra suit la sélection et la recherche.
  useEffect(() => {
    if (matches.length > 0 && matches.length <= 8) go(rectFor(matches));
    else if (sel) go(rectFor([sel]));
    else go(FULL_FOCUS);
  }, [q, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (k: number) => {
    const f = focus.current;
    const w = f.w / k;
    const h = f.h / k;
    if (w > VB[2] || h > VB[3]) go(FULL_FOCUS);
    else if (w >= 50) go({ cx: f.cx, cy: f.cy, w, h });
  };
  const recenter = () => go(sel ? rectFor([sel]) : FULL_FOCUS);
  const idAt = (e: PointerEvent<SVGSVGElement>) =>
    (e.target as Element).closest<SVGGElement>("[data-cid]")?.dataset.cid ?? null;

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      cid: idAt(e),
      moved: false,
      cx: focus.current.cx,
      cy: focus.current.cy,
    };
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    tx.set(e.clientX - r.left);
    ty.set(e.clientY - r.top);
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 6) {
        d.moved = true;
        svgRef.current?.setPointerCapture(e.pointerId);
        setHover(null);
      }
      if (d.moved) {
        const k = size.current.w / view.current.w;
        go({ ...focus.current, cx: d.cx - dx / k, cy: d.cy - dy / k }, true);
      }
      return;
    }
    const id = idAt(e);
    setHover((h) => (h === id ? h : id));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && d.cid) onPick(d.cid === selected ? null : d.cid);
  };

  const hoverC = hover ? COUNTRY_BY_ID[hover] : null;
  const legend = [
    ["n", "Nord"],
    ["w", "Ouest"],
    ["c", "Centre"],
    ["e", "Est"],
    ["s", "Sud"],
  ];

  return (
    <motion.div
      variants={itemVariants}
      ref={wrapRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-[22px]"
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => setHover(null)}
        className="absolute inset-0 h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      >
        <defs>
          <filter id="pp-sel-glow" x="-60%" y="-60%" width="220%" height="230%">
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
            hot={matchIds.has(c.id)}
            dim={q !== "" && matches.length > 0 && !matchIds.has(c.id)}
            rgh={rgHover === REGION_KEY[c.region]}
          />
        ))}
        {sel && <path key={sel.id} d={sel.d} className="pp-sel" filter="url(#pp-sel-glow)" />}
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

      {/* infobulle qui suit le pointeur */}
      <AnimatePresence>
        {hoverC && (
          <motion.div
            key="tip"
            style={{ x: tx, y: ty }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none absolute top-0 left-0 z-10"
          >
            <div className="lg lg-strong translate-x-4 translate-y-4 rounded-[14px] px-3.5 py-2.5 whitespace-nowrap">
              <p className={`flex items-center gap-1.5 text-[10.5px] leading-none ${MONO} ${INK3}`}>
                <Activity size={11} /> {hoverC.region}
              </p>
              <p className={`mt-1.5 text-[15px] leading-tight font-semibold ${INK}`}>
                {hoverC.name}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* légende des régions */}
      <Glass
        className="absolute top-0 left-0 hidden items-center gap-1 rounded-full px-2 py-1 sm:flex"
        onPointerLeave={() => setRgHover(null)}
      >
        {legend.map(([k, label]) => (
          <button
            key={k}
            type="button"
            title={`Mettre en avant : ${label}`}
            onPointerEnter={() => setRgHover(k)}
            onFocus={() => setRgHover(k)}
            onBlur={() => setRgHover(null)}
            className={`flex h-7 items-center gap-2 rounded-full px-2 text-[10.5px] transition-colors hover:bg-[color:var(--chip)] ${MONO} ${INK2}`}
          >
            <i
              className="size-2 rounded-full"
              style={{ background: REGION_TONE[k], boxShadow: `0 0 8px ${REGION_TONE[k]}` }}
            />
            {label}
          </button>
        ))}
      </Glass>

      {/* zoom */}
      <Glass className="absolute right-0 bottom-0 flex flex-col items-center gap-0.5 rounded-full p-1">
        {(
          [
            [Plus, "Zoom avant", () => zoom(1.7)],
            [Minus, "Zoom arrière", () => zoom(1 / 1.7)],
            [LocateFixed, "Recentrer la carte", recenter],
          ] as const
        ).map(([Icon, label, fn]) => (
          <motion.button
            key={label}
            type="button"
            aria-label={label}
            onClick={fn}
            whileTap={{ scale: 0.86 }}
            transition={SPRING}
            className={`${SOFT_BTN} !size-10`}
          >
            <Icon size={18} strokeWidth={2.2} />
          </motion.button>
        ))}
      </Glass>
    </motion.div>
  );
}

export function TagBubble({
  tag,
  tone,
  selected,
  fresh = false,
  onPick,
}: {
  tag: TagOption;
  tone: Tone;
  selected: boolean;
  fresh?: boolean;
  onPick: () => void;
}) {
  return (
    <motion.div variants={itemVariants} transition={SOFT_SPRING}>
      <div>
        <Glass
          as={motion.button}
          type="button"
          aria-pressed={selected}
          onClick={onPick}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          style={
            selected
              ? {
                  background: "linear-gradient(180deg, var(--accent-soft2), var(--accent-soft))",
                  boxShadow:
                    "inset 0 1px 0 var(--rim), 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-ring), 0 14px 30px -14px rgba(162,154,240,.6)",
                }
              : undefined
          }
          className={`flex h-[58px] items-center gap-3 rounded-full pl-2.5 text-[16px] font-semibold ${INK} ${selected ? "pr-4" : "pr-6"}`}
        >
          <Tile
            c={tone}
            size={38}
            icon={tag.icon}
            code={tag.code ?? (tag.icon ? undefined : tag.label.slice(0, 2).toUpperCase())}
          />
          <span className="text-left leading-tight">{tag.label}</span>
          {fresh && (
            <span
              className={`rounded-full bg-[color:var(--accent-soft)] px-2 py-1 text-[10px] leading-none ${MONO} ${ACCENT_TEXT}`}
            >
              Nouveau
            </span>
          )}
          <AnimatePresence initial={false}>
            {selected && (
              <motion.span
                initial={{ scale: 0, width: 0 }}
                animate={{ scale: 1, width: 20 }}
                exit={{ scale: 0, width: 0 }}
                className="grid place-items-center overflow-hidden"
              >
                <Check size={17} strokeWidth={3} className={ACCENT_TEXT} />
              </motion.span>
            )}
          </AnimatePresence>
        </Glass>
      </div>
    </motion.div>
  );
}

/**
 * Colonne de droite : barre de recherche contextuelle et panneau animé (changé quand `panelKey`
 * change). Collante sur ordinateur, feuille montant du bas sur téléphone.
 */
export function StageShell({
  sheetOpen,
  onClose,
  search,
  panelKey,
  children,
}: {
  sheetOpen: boolean;
  onClose: () => void;
  search: Parameters<typeof ContextSearch>[0];
  panelKey: string;
  children: ReactNode;
}) {
  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[color:var(--scrim)] transition-opacity duration-500 lg:hidden ${sheetOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        aria-label="Aide contextuelle"
        data-open={sheetOpen}
        className="fixed inset-x-0 bottom-0 z-50 h-[min(82dvh,720px)] translate-y-[112%] px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] transition-transform duration-[600ms] ease-[cubic-bezier(.2,.9,.25,1)] data-[open=true]:translate-y-0 lg:sticky lg:inset-auto lg:top-[76px] lg:z-10 lg:h-[calc(100dvh-92px)] lg:translate-y-0 lg:self-start lg:px-0 lg:pb-0"
      >
        <div className="lg lg-stage relative flex h-full flex-col rounded-[30px] p-4 sm:p-5">
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-[color:var(--hair)] lg:hidden" />
          <div className="relative z-30 flex shrink-0 items-start gap-3">
            <ContextSearch {...search} />
            <button
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              className="lg ml-auto grid size-[52px] shrink-0 place-items-center rounded-full lg:hidden"
            >
              <X size={20} className={INK2} />
            </button>
          </div>
          <div className="relative z-0 mt-5 flex min-h-0 flex-1 flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={panelKey}
                variants={panelVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex min-h-0 flex-1 flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  );
}

/** Barre d'envoi collante : anneau de progression, champs manquants, bouton d'envoi. */
export function SubmitBar({
  total,
  missing,
  sending,
  shake,
  readyTitle,
  readyText,
  action,
  sendingLabel,
}: {
  total: number;
  /** Libellés des champs obligatoires encore vides. */
  missing: string[];
  sending: boolean;
  shake: boolean;
  readyTitle: string;
  readyText: string;
  action: string;
  sendingLabel: string;
}) {
  const done = total - missing.length;
  const ready = missing.length === 0;
  return (
    <Glass
      lens={{ bezel: 16, scale: 30, blur: 7 }}
      variant="lg-strong"
      className={`sticky bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-30 mt-12 flex items-center gap-3 rounded-[22px] p-2 pl-4 ${shake ? "pp-shake" : ""}`}
    >
      <ProgressRing pct={done / total} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className={`truncate text-[14.5px] font-semibold ${INK}`}>
          {ready ? readyTitle : `${done} sur ${total} obligatoires`}
        </p>
        <p className={`truncate text-[12.5px] ${INK3}`}>
          {ready ? readyText : `À compléter : ${missing.map((l) => l.toLowerCase()).join(", ")}`}
        </p>
      </div>
      <motion.button
        id="pp-publish"
        type="submit"
        disabled={sending}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING}
        style={
          ready
            ? CTA_FILL
            : {
                background: "var(--accent-soft)",
                boxShadow: "inset 0 0 0 1px rgba(162,154,240,.3)",
              }
        }
        className={`flex h-12 shrink-0 items-center gap-2 rounded-[14px] px-5 text-[15px] font-semibold transition-colors ${ready ? "" : ACCENT_TEXT}`}
      >
        {sending ? (
          sendingLabel
        ) : (
          <>
            {action} <ArrowRight size={17} strokeWidth={2.2} />
          </>
        )}
      </motion.button>
    </Glass>
  );
}

/* Fond de la page d'accueil : marine profond, halos bleutés, carte d'Afrique en points en filigrane */
export function Backdrop({ dim = false }: { dim?: boolean }) {
  const mask = "radial-gradient(closest-side, #000 38%, transparent 100%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(1100px 620px at 50% -10%, #0F1628 0%, transparent 72%), radial-gradient(900px 560px at 100% 100%, #0B1121 0%, transparent 70%), #070A11",
      }}
    >
      <i className="pp-blob pp-blob-a" />
      <i className="pp-blob pp-blob-b" />
      <i className="pp-blob pp-blob-c" />
      <i className="pp-blob pp-blob-d" />
      <i className="pp-blob pp-blob-e" />
      <div className="absolute inset-0 max-lg:opacity-60">
        <svg
          viewBox={AFRICA.viewBox.join(" ")}
          className="pp-watermark absolute top-1/2 left-1/2 h-[118vh] w-auto -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: dim ? 0.15 : 1, WebkitMaskImage: mask, maskImage: mask }}
        >
          <path
            d={ALL_DOTS}
            fill="none"
            stroke="#C8CEE2"
            strokeOpacity=".075"
            strokeWidth="5.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="pp-grain absolute inset-0" />
    </div>
  );
}
