import type { PointerEvent } from "react";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Video } from "./Video";
import "./landing.css";

// Rendue hors du Layout : le hero lit le défilement de la fenêtre et doit commencer en haut de page.
export function Landing() {
  return (
    <div className="landing" lang="fr" onPointerMove={trackGlow}>
      <Hero />
      <Video />
      <Footer />
    </div>
  );
}

/**
 * Lueur qui suit le pointeur, comme sur les pages en verre : le bouton ou la zone (.glow) survolé
 * reçoit la position du pointeur (--mx / --my), lue par son dégradé dans landing.css.
 */
function trackGlow(e: PointerEvent<HTMLElement>) {
  // Toutes les zones sous le pointeur (un bouton dans la scène du globe, par exemple) le suivent.
  let el = (e.target as Element).closest<HTMLElement>(".btn, .glow");
  while (el) {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el = el.parentElement?.closest<HTMLElement>(".btn, .glow") ?? null;
  }
}
