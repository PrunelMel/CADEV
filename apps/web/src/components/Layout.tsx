import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { LayoutDashboard, LogOut, Orbit, Plus, Search } from "lucide-react";
import { authClient, useSession } from "../api/auth";
import { site } from "../content/site";
import { Avatar } from "./ui";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2.5 py-1.5 text-sm ${
    isActive ? "bg-white/10 font-medium text-white" : "text-[#8a95ab] hover:text-white"
  }`;

export function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const username = session?.user.username;

  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) navigate(`/recherche?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only z-30 rounded bg-white px-3 py-2 text-ink focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Aller au contenu
      </a>
      <header className="sticky top-0 z-20 border-b border-night-line bg-night text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to="/accueil" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-lilac text-night">
              <Orbit size={16} />
            </span>
            <span className="hidden sm:inline">{site.name}</span>
          </Link>
          <nav className="flex gap-0.5" aria-label="Navigation principale">
            <NavLink to="/problemes" className={navClass}>
              Problèmes
            </NavLink>
            <NavLink to="/hub" className={navClass}>
              Hub
            </NavLink>
            <NavLink to="/faq" className={navClass}>
              FAQ
            </NavLink>
          </nav>
          <form
            onSubmit={search}
            role="search"
            className="order-last flex w-full items-center gap-2 rounded-md border border-night-line bg-white/5 px-2.5 focus-within:border-lilac md:order-none md:w-auto md:flex-1"
          >
            <Search size={14} className="text-[#8a95ab]" />
            <input
              name="q"
              aria-label="Rechercher"
              placeholder="Décrivez un problème"
              className="w-full bg-transparent py-1.5 text-sm text-white placeholder:text-[#8a95ab] focus:outline-none"
            />
          </form>
          {session ? (
            <div className="ml-auto flex items-center gap-1 text-sm md:ml-0">
              <NavLink to="/tableau-de-bord" className={navClass} title="Tableau de bord">
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard size={15} />
                  <span className="hidden lg:inline">Tableau de bord</span>
                </span>
              </NavLink>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md bg-lilac px-2.5 py-1.5 font-medium text-night hover:bg-[#b5abf9]">
                  <Plus size={15} /> <span className="hidden sm:inline">Nouveau</span>
                </summary>
                <div className="absolute right-0 mt-1 w-52 rounded-md border border-neutral-200 bg-white p-1 text-sm text-ink">
                  <Link to="/problemes/nouveau" className="block rounded px-3 py-2 hover:bg-paper">
                    Publier un problème
                  </Link>
                  <Link to="/nouveau-depot" className="block rounded px-3 py-2 hover:bg-paper">
                    Créer un dépôt
                  </Link>
                  <Link to="/orgs/nouvelle" className="block rounded px-3 py-2 hover:bg-paper">
                    Créer une organisation
                  </Link>
                </div>
              </details>
              {username && (
                <Link
                  to={`/u/${username}`}
                  title="Mon profil"
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 font-medium hover:bg-white/10"
                >
                  <Avatar name={session.user.name || username} size={26} />
                  <span className="hidden lg:inline">{username}</span>
                </Link>
              )}
              <button
                title="Déconnexion"
                aria-label="Déconnexion"
                className="rounded-md p-2 text-[#8a95ab] hover:bg-white/10 hover:text-white"
                onClick={() => authClient.signOut().then(() => navigate("/accueil"))}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2 text-sm md:ml-0">
              <Link
                to="/connexion"
                className="rounded-md px-2.5 py-1.5 text-[#c9d1e0] hover:text-white"
              >
                Connexion
              </Link>
              <Link
                to="/inscription"
                className="rounded-md bg-lilac px-3 py-1.5 font-medium text-night hover:bg-[#b5abf9]"
              >
                Inscription
              </Link>
            </div>
          )}
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
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
    </div>
  );
}
