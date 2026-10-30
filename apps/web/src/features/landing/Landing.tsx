import { Footer } from "./Footer";
import { Hero } from "./Hero";
import "./landing.css";

// Rendue hors du Layout : le hero lit le défilement de la fenêtre et doit commencer en haut de page.
export function Landing() {
  return (
    <div className="landing" lang="fr">
      <Hero />
      <Footer />
    </div>
  );
}
