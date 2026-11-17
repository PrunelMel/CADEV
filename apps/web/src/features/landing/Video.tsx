import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { video } from "../../content/landing";

/**
 * Vidéo de présentation, après l'animation du globe : titre à gauche, vidéo à droite, comme le
 * globe à côté de « Rejoignez la communauté ». Cadre éclairé à la lavande, grille de points du
 * pied de page en fond. Seule la première image est chargée avant le clic sur « Regarder ».
 * Fichier absent (public/video/) : la section ne s'affiche pas.
 */
export function Video() {
  const ref = useRef<HTMLElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const [started, setStarted] = useState(false);
  const [shown, setShown] = useState(false);

  // Apparition en douceur quand la section entre à l'écran.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (missing) return null;

  const start = () => {
    setStarted(true);
    void player.current?.play();
  };

  return (
    <section
      ref={ref}
      className={`vid${shown ? " vid--in" : ""}${started ? "" : " glow"}`}
      aria-labelledby="vid-title"
    >
      <div className="vid__inner">
        <div className="vid__copy">
          <h2 id="vid-title" className="stitle stitle--block" aria-label={video.titleText}>
            {video.lines.map((l) => (
              <span
                key={l.text}
                className={l.block ? "stitle__blk" : "stitle__pl"}
                aria-hidden="true"
              >
                {l.text}
              </span>
            ))}
          </h2>
          <p className="story__text">{video.text}</p>
        </div>

        <div className="vid__frame">
          <video
            ref={player}
            className="vid__player"
            src={video.src}
            poster={video.poster ?? undefined}
            preload="metadata"
            playsInline
            controls={started}
            onError={() => setMissing(true)}
            onEnded={() => setStarted(false)}
          >
            {video.captions && (
              <track kind="captions" src={video.captions} srcLang="fr" label="Français" default />
            )}
          </video>
          {!started && (
            <button type="button" className="vid__play" onClick={start}>
              <span className="vid__play-dot" aria-hidden="true">
                <Play size={22} strokeWidth={2.2} fill="currentColor" />
              </span>
              <span className="btn btn--primary vid__play-label">{video.playLabel}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
