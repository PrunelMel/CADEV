import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { LogOut, Search } from "lucide-react";
import { authClient, useSession } from "../api/auth";
import { site } from "../content/site";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm ${isActive ? "font-semibold" : "text-neutral-600 hover:text-neutral-900"}`;

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
    <div className="min-h-screen">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="font-semibold">
            {site.name}
          </Link>
          <nav className="flex gap-4">
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
            className="flex flex-1 items-center gap-1 border border-neutral-300 rounded px-2 min-w-48"
          >
            <Search size={14} className="text-neutral-500" />
            <input
              name="q"
              placeholder="Décrivez un problème"
              className="w-full py-1 text-sm focus:outline-none"
            />
          </form>
          {session ? (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/nouveau-depot">Nouveau dépôt</Link>
              <Link to="/problemes/nouveau">Publier un problème</Link>
              {username && (
                <Link to={`/u/${username}`} className="font-medium">
                  {username}
                </Link>
              )}
              <button
                title="Déconnexion"
                onClick={() => authClient.signOut().then(() => navigate("/"))}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-3 text-sm">
              <Link to="/connexion">Connexion</Link>
              <Link to="/inscription" className="font-medium">
                Inscription
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
