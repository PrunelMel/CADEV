import { Link, Outlet } from "react-router";
import { Orbit } from "lucide-react";
import { site } from "../content/site";
import { GlassHeader } from "./glass/GlassHeader";

/** `full` : page pleine largeur sans pied de page (publication d'un problème). */
export function Layout({ full = false }: { full?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only z-30 rounded bg-white px-3 py-2 text-ink focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Aller au contenu
      </a>
      <GlassHeader />
      {full ? (
        <div id="contenu">
          <Outlet />
        </div>
      ) : (
        <>
          {/* L'en-tête est fixe : le contenu commence sous les bulles. */}
          <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-[100px] pb-8">
            <Outlet />
          </main>
          <footer className="border-t border-night-line bg-night text-[#8a95ab]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs">
              <span className="flex items-center gap-2">
                <Orbit size={14} className="text-lilac" /> {site.name}. Données hébergées sur le
                continent.
              </span>
              <nav className="flex gap-4" aria-label="Pied de page">
                <Link to="/" className="hover:text-white">
                  Présentation
                </Link>
                <Link to="/faq" className="hover:text-white">
                  FAQ
                </Link>
                <Link to="/hub" className="hover:text-white">
                  Hub
                </Link>
              </nav>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
