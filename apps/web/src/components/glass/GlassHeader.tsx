import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  FolderPlus,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  SquarePen,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { authClient, useSession } from "../../api/auth";
import { site } from "../../content/site";
import { PAL } from "../../content/problem-form";
import { ACCENT_FILL, DISPLAY, Glass, INK, INK2, Logo, SPRING, Tile } from "./Glass";
import { InboxBubble, InboxPanel } from "./Notifications";

const MotionLink = motion.create(Link);

const NAV = [
  { label: "Problèmes", to: "/problemes" },
  { label: "Hub", to: "/hub" },
  { label: "FAQ", to: "/faq" },
];

/** Une bulle de verre isolée : lien si `to`, bouton sinon. */
function Bubble({
  icon: Icon,
  children,
  current = false,
  round = false,
  label,
  className = "",
  to,
  onClick,
}: {
  icon?: LucideIcon;
  children?: ReactNode;
  current?: boolean;
  round?: boolean;
  label?: string;
  className?: string;
  to?: string;
  onClick?: () => void;
}) {
  const common = {
    lens: true,
    "aria-label": label,
    "aria-current": current ? ("page" as const) : undefined,
    whileHover: { y: -2, scale: 1.04 },
    whileTap: { scale: 0.93 },
    transition: SPRING,
    style: current ? ACCENT_FILL : undefined,
    className: `pointer-events-auto flex h-12 shrink-0 items-center justify-center gap-2 rounded-full text-[15px] font-semibold ${round ? "w-12" : "px-5"} ${current ? "" : INK} ${className}`,
  };
  const content = (
    <>
      {Icon && <Icon size={17} strokeWidth={2.2} />}
      {children}
    </>
  );
  return to ? (
    <Glass as={MotionLink} to={to} {...common}>
      {content}
    </Glass>
  ) : (
    <Glass as={motion.button} type="button" onClick={onClick} {...common}>
      {content}
    </Glass>
  );
}

const menuItem = `flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-semibold ${INK} hover:bg-[color:var(--accent-soft)]`;

/** En-tête de toutes les pages : bulles de verre disjointes et un conteneur fusionné. */
export function GlassHeader() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hover, setHover] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [inbox, setInbox] = useState(false);
  const username = session?.user.username ?? null;
  const publishing = pathname === "/problemes/nouveau";

  useEffect(() => {
    setMenu(false);
    setInbox(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu && !inbox) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setInbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, inbox]);
  const toggleInbox = () => {
    setMenu(false);
    setInbox((v) => !v);
  };

  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q) navigate(`/recherche?q=${encodeURIComponent(q)}`);
  }
  const signOut = () => authClient.signOut().then(() => navigate("/accueil"));
  const initial = (session?.user.name || username || "?").charAt(0).toUpperCase();

  return (
    <header
      className="pp-theme pointer-events-none fixed inset-x-0 top-0 z-50 pt-[calc(env(safe-area-inset-top,0px)+12px)] pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 sm:gap-2.5">
        {/* Bulle : marque */}
        <Glass
          lens
          as={MotionLink}
          to="/accueil"
          aria-label={`${site.name}, accueil`}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          className="pointer-events-auto flex h-12 shrink-0 items-center gap-2.5 rounded-full pr-2 pl-2 sm:pr-5"
        >
          <Logo />
          <span
            style={{ letterSpacing: ".05em" }}
            className={`hidden pt-0.5 text-[23px] leading-none whitespace-nowrap sm:block ${DISPLAY} ${INK}`}
          >
            {site.name}
          </span>
        </Glass>

        {/* Conteneur fusionné : navigation + recherche */}
        <Glass
          lens
          className="pointer-events-auto flex h-12 min-w-0 flex-1 items-center rounded-full px-1.5 focus-within:shadow-[0_0_0_4px_var(--accent-ring),0_14px_34px_-14px_var(--shade)] min-[1400px]:w-[clamp(440px,38vw,650px)] min-[1400px]:flex-none"
        >
          <nav
            className="hidden items-center md:flex"
            onPointerLeave={() => setHover(null)}
            aria-label="Navigation principale"
          >
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onPointerEnter={() => setHover(n.to)}
                onFocus={() => setHover(n.to)}
                onBlur={() => setHover(null)}
                className={`relative grid h-9 place-items-center rounded-full px-4 text-[15px] font-semibold ${INK}`}
              >
                {hover === n.to && (
                  <motion.span
                    layoutId="pp-nav-lens"
                    className="pp-lens absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  />
                )}
                <span className="relative">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <span aria-hidden className="mx-1.5 hidden h-6 w-px bg-[color:var(--hair)] md:block" />
          <form
            role="search"
            onSubmit={search}
            className="flex min-w-0 flex-1 items-center gap-2.5 pr-2 pl-3 md:pl-2"
          >
            <Search size={17} className={`shrink-0 ${INK2}`} strokeWidth={2.2} />
            <input
              name="q"
              placeholder="Décrivez un problème"
              aria-label="Décrivez un problème"
              className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-[color:var(--ink3)] ${INK}`}
            />
          </form>
        </Glass>

        {/* Bulles individuelles (grands écrans) */}
        <div className="pointer-events-none ml-auto hidden items-center gap-2.5 min-[1400px]:flex">
          {session ? (
            <>
              {/* Icône seule sous 1600 px : la cloche des notifications a pris sa place. */}
              <Bubble
                icon={FolderPlus}
                to="/nouveau-depot"
                label="Nouveau dépôt"
                className="w-12 !px-0 min-[1600px]:w-auto min-[1600px]:!px-5"
              >
                <span className="hidden min-[1600px]:inline">Nouveau dépôt</span>
              </Bubble>
              <Bubble icon={SquarePen} to="/problemes/nouveau" current={publishing}>
                Publier un problème
              </Bubble>
              <InboxBubble open={inbox} onToggle={toggleInbox} />
              <Bubble
                round
                icon={LayoutDashboard}
                to="/tableau-de-bord"
                label="Tableau de bord"
                current={pathname === "/tableau-de-bord"}
              />
              {username && (
                <Glass
                  lens
                  as={MotionLink}
                  to={`/u/${username}`}
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING}
                  className={`pointer-events-auto flex h-12 items-center gap-2 rounded-full pr-1.5 pl-1.5 min-[1536px]:pr-4 ${INK}`}
                  aria-label={`Mon compte : ${username}`}
                >
                  <Tile c={PAL.amber} size={36} code={initial} />
                  <span className="hidden text-[15px] font-semibold min-[1536px]:block">
                    {username}
                  </span>
                </Glass>
              )}
              <Bubble round icon={LogOut} label="Se déconnecter" onClick={signOut} />
            </>
          ) : (
            <>
              <Bubble icon={LogIn} to="/connexion">
                Connexion
              </Bubble>
              <Bubble icon={UserPlus} to="/inscription" current>
                Inscription
              </Bubble>
            </>
          )}
        </div>

        {/* Notifications et menu (écrans < 1400 px) */}
        {session && (
          <InboxBubble open={inbox} onToggle={toggleInbox} className="min-[1400px]:hidden" />
        )}
        <Bubble
          round
          icon={menu ? X : Menu}
          label={menu ? "Fermer le menu" : "Ouvrir le menu"}
          className="min-[1400px]:hidden"
          onClick={() => {
            setInbox(false);
            setMenu((m) => !m);
          }}
        />
      </div>

      <AnimatePresence>
        {inbox && session && (
          <div className="mx-auto mt-2 flex max-w-[1440px] justify-end">
            <InboxPanel onClose={() => setInbox(false)} />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && (
          <div className="mx-auto mt-2 flex max-w-[1440px] justify-end">
            <motion.nav
              aria-label="Menu"
              initial={{ opacity: 0, y: -12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              style={{ transformOrigin: "top right" }}
              className="lg lg-strong pointer-events-auto w-[min(100%,320px)] rounded-[26px] p-2"
            >
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className={`${menuItem} md:hidden`}>
                  {n.label}
                </Link>
              ))}
              {session ? (
                <>
                  <Link to="/nouveau-depot" className={menuItem}>
                    <FolderPlus size={17} /> Nouveau dépôt
                  </Link>
                  <Link
                    to="/problemes/nouveau"
                    aria-current={publishing ? "page" : undefined}
                    className={publishing ? `${menuItem} my-1` : menuItem}
                    style={publishing ? ACCENT_FILL : undefined}
                  >
                    <SquarePen size={17} /> Publier un problème
                  </Link>
                  <Link to="/orgs/nouvelle" className={menuItem}>
                    <Building2 size={17} /> Créer une organisation
                  </Link>
                  <Link to="/tableau-de-bord" className={menuItem}>
                    <LayoutDashboard size={17} /> Tableau de bord
                  </Link>
                  <div className="my-1.5 h-px bg-[color:var(--hair)]" />
                  {username && (
                    <Link to={`/u/${username}`} className={`${menuItem} px-2`}>
                      <Tile c={PAL.amber} size={30} code={initial} /> {username}
                    </Link>
                  )}
                  <button type="button" onClick={signOut} className={`${menuItem} w-full ${INK2}`}>
                    <LogOut size={17} /> Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Link to="/connexion" className={menuItem}>
                    <LogIn size={17} /> Connexion
                  </Link>
                  <Link to="/inscription" className={`${menuItem} my-1`} style={ACCENT_FILL}>
                    <UserPlus size={17} /> Inscription
                  </Link>
                </>
              )}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
