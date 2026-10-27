import { Footer } from "./Footer";
import { Hero } from "./Hero";
import "./landing.css";

// Rendered outside Layout: the hero reads the window scroll and must start at the top of the page.
export function Landing() {
  return (
    <div className="landing" lang="en">
      <Hero />
      <Footer />
    </div>
  );
}
