import { Activity, ArrowRight, ChevronDown, Radio } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  closing,
  HERO_VH,
  heroCopy,
  introEnd,
  sectionFade,
  sections,
  statusShow,
  statusSwitch,
  steps,
  type StorySection,
} from "../../content/landing";
import { AfricaRenderer, type Marker } from "./gl/AfricaRenderer";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Visibility 0..1 for a scroll window, fading in and out over `sectionFade`. */
type Counts = { online: number; offline: number };
const countRegion = (markers: Marker[], region: Marker["region"]): Counts => {
  const list = markers.filter((m) => m.region === region);
  const offline = list.filter((m) => m.offline).length;
  return { online: list.length - offline, offline };
};

const windowVisibility = (p: number, [start, end]: [number, number]) =>
  Math.min(clamp01((p - start) / sectionFade), clamp01((end - p) / sectionFade));

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepsRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(true);
  const [counts, setCounts] = useState<{ west: Counts; south: Counts }>({
    west: { online: 0, offline: 0 },
    south: { online: 0, offline: 0 },
  });

  // Overlays: every frame, set each element's visibility (--v) from the
  // smoothed scroll progress, and make hidden ones inert so their buttons
  // cannot be focused or clicked.
  const applyProgress = (p: number) => {
    stageRef.current?.style.setProperty("--p", p.toFixed(4));
    const set = (el: HTMLElement | null, v: number) => {
      if (!el) return;
      el.style.setProperty("--v", v.toFixed(3));
      el.inert = v < 0.5;
    };
    set(introRef.current, clamp01((introEnd - p) / sectionFade));
    set(statusRef.current, windowVisibility(p, statusShow));
    set(closingRef.current, windowVisibility(p, closing.show));
    statusRef.current?.style.setProperty("--s", clamp01((p - statusSwitch) / 0.04).toFixed(3));
    sections.forEach((s, i) => set(panelRefs.current[i], windowVisibility(p, s.show)));

    // Steps: visibility from the scroll, active step from the thresholds.
    const stepsEl = stepsRef.current;
    if (stepsEl) {
      set(stepsEl, windowVisibility(p, steps.show));
      const active = String(Math.max(0, steps.items.filter((it) => p >= it.at).length - 1));
      if (stepsEl.dataset.step !== active) stepsEl.dataset.step = active;
    }
  };

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      return total > 0 ? clamp01(-rect.top / total) : 0;
    };

    let renderer: AfricaRenderer | null = null;
    if (canvas) {
      try {
        renderer = new AfricaRenderer(canvas, {
          reducedMotion,
          onFrame: applyProgress,
        });
        setCounts({
          west: countRegion(renderer.markers, "west"),
          south: countRegion(renderer.markers, "south"),
        });
      } catch (err) {
        console.error("[hero] WebGL init failed, showing poster", err);
        setWebgl(false);
      }
    }

    const onScroll = () => {
      const p = readProgress();
      if (renderer) renderer.setProgress(p);
      else applyProgress(p); // poster fallback: overlays follow the scroll directly
    };
    onScroll();

    const io = renderer
      ? new IntersectionObserver(([e]) => (e.isIntersecting ? renderer!.play() : renderer!.pause()))
      : null;
    io?.observe(section);
    const ro = renderer ? new ResizeObserver(() => renderer!.resize()) : null;
    if (canvas) ro?.observe(canvas);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      renderer?.dispose();
    };
  }, [webgl]);

  /** Hero button: scroll down to where the final call to action is shown. */
  const goToJoin = (e: MouseEvent) => {
    e.preventDefault();
    const section = sectionRef.current;
    const join = sections.find((s) => s.id === "join");
    if (!section || !join) return;
    const total = section.offsetHeight - window.innerHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: section.offsetTop + total * Math.min(1, join.show[0] + 0.08),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section
      ref={sectionRef}
      className="hero"
      style={{ height: `${HERO_VH}vh` }}
      aria-label="Communauté africaine d'IA appliquée"
    >
      <div ref={stageRef} className={`hero__stage${webgl ? "" : " hero__stage--poster"}`}>
        {webgl ? (
          <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
        ) : (
          <img className="hero__poster" src="/assets/globe-poster.png" alt="" aria-hidden="true" />
        )}

        <div ref={introRef} className="hero__intro fade">
          <p className="hero__eyebrow">
            <Radio size={14} strokeWidth={2} />
            {heroCopy.eyebrow}
          </p>
          <Lockup as="h1" />
          <div className="hero__actions">
            <a className="btn btn--primary" href="#join" onClick={goToJoin}>
              {heroCopy.joinCta}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
            <a className="btn btn--ghost" href={heroCopy.exploreHref}>
              {heroCopy.exploreCta}
            </a>
          </div>
        </div>

        {sections.map((s, i) => (
          <div
            key={s.id}
            id={s.id}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className={`panel panel--${s.placement} fade`}
          >
            <Story section={s} />
          </div>
        ))}

        <div ref={stepsRef} className="panel panel--left steps-panel fade" data-step="0">
          <Steps />
        </div>

        <div ref={closingRef} className="hero__closing fade">
          <p className="story__label">{closing.label}</p>
          <Lockup as="h2" />
          <p className="story__text">{closing.text}</p>
          <div className="hero__actions">
            <a className="btn btn--primary" href={heroCopy.joinHref}>
              {heroCopy.joinCta}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
            <a className="btn btn--ghost" href={heroCopy.exploreHref}>
              {heroCopy.exploreCta}
            </a>
          </div>
        </div>

        <div className="hero__hint" aria-hidden="true">
          <span>{heroCopy.scrollHint}</span>
          <ChevronDown size={16} strokeWidth={2} />
        </div>

        {webgl && (
          <aside ref={statusRef} className="hero__status fade">
            {(["west", "south"] as const).map((r) => (
              <div key={r} className={`hero__status-layer hero__status-layer--${r}`}>
                <p className="hero__status-title">
                  <Activity size={14} strokeWidth={2} />
                  {heroCopy.statusTitle}
                  <span className="hero__status-region">
                    {r === "west" ? heroCopy.statusRegionWest : heroCopy.statusRegionSouth}
                  </span>
                </p>
                <div className="hero__status-row">
                  <span className="dot dot--online" />
                  <span>{heroCopy.onlineLabel}</span>
                  <strong>{counts[r].online}</strong>
                </div>
                <div className="hero__status-row">
                  <span className="dot dot--offline" />
                  <span>{heroCopy.offlineLabel}</span>
                  <strong>{counts[r].offline}</strong>
                </div>
              </div>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}

function Story({ section }: { section: StorySection }) {
  const { title } = section;
  return (
    <div className={`story story--${title.style}`}>
      <p className="story__label">{section.label}</p>
      <h2 className={`stitle stitle--${title.style}`} aria-label={section.titleText}>
        {title.style === "block" ? (
          title.lines.map((l) => (
            <span
              key={l.text}
              className={l.block ? "stitle__blk" : "stitle__pl"}
              aria-hidden="true"
            >
              {l.text}
            </span>
          ))
        ) : (
          <>
            <span className="stitle__kick" aria-hidden="true">
              {title.kicker}
            </span>
            <span className="stitle__main" aria-hidden="true">
              {title.main}
            </span>
          </>
        )}
      </h2>
      <p className="story__text">{section.text}</p>
      {section.cta && (
        <a className="btn btn--primary story__cta" href={heroCopy.joinHref}>
          {section.cta}
          <ArrowRight size={16} strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

/**
 * Sequential number reveal: 1, then 12, then 123. Numbers that are not active
 * yet wait faded at the right edge; each one slides left into its slot when
 * its step starts, and the step text beside the numbers changes with it.
 * Positions come from CSS (data-step on the panel), so React never re-renders.
 */
function Steps() {
  return (
    <div className="steps">
      <div className="steps__nums" aria-hidden="true">
        {steps.items.map((it, i) => (
          <span key={it.title} className="steps__num" style={{ "--i": i } as CSSProperties}>
            {i + 1}
          </span>
        ))}
      </div>
      <ol className="steps__copies">
        {steps.items.map((it, i) => (
          <li key={it.title} className="steps__copy" style={{ "--i": i } as CSSProperties}>
            <h3 className="steps__title">
              <span className="sr-only">Étape {i + 1} : </span>
              {it.title}
            </h3>
            <p className="steps__text">{it.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The title lockup, used at the start and again at the close.
 * "THE AI AFRICA" is sized to be exactly as wide as the row under it.
 */
function Lockup({ as: Tag }: { as: "h1" | "h2" }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const title = ref.current;
    if (!title) return;
    const top = title.querySelector<HTMLElement>(".lockup__top")!;
    const row = title.querySelector<HTMLElement>(".lockup__row")!;
    const fit = () => {
      top.style.fontSize = "";
      const ratio = row.getBoundingClientRect().width / top.getBoundingClientRect().width;
      if (Number.isFinite(ratio) && ratio > 0) top.style.fontSize = `${ratio}em`;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);
  const t = heroCopy.title;
  return (
    <Tag ref={ref} className="lockup" aria-label={t.full}>
      <span className="lockup__top" aria-hidden="true">
        {t.top}
      </span>
      <span className="lockup__row" aria-hidden="true">
        <span className="lockup__big">{t.big}</span>
        <span className="lockup__right">
          <span className="lockup__box">
            <span>{t.box}</span>
          </span>
          <span className="lockup__accent">{t.accent}</span>
        </span>
      </span>
    </Tag>
  );
}
