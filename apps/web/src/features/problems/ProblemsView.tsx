/**
 * Liste des problèmes, charte « Liquid Glass » : bandeau avec la carte des problèmes par pays,
 * barre de filtres, puis la liste à gauche et la fiche du problème choisi à droite. La carte de
 * la fiche zoome sur le pays du problème. Sur téléphone, la fiche monte du bas.
 */
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Construction,
  Cpu,
  Hammer,
  Languages,
  Layers,
  MapPin,
  Plus,
  Search,
  Send,
  Target,
  Wifi,
  X,
} from "lucide-react";
import { useSession } from "../../api/auth";
import { useContributionSummary } from "../../api/contribution";
import { useCountryCounts, useProblem, useProblems, type ProblemFilters } from "../../api/hooks";
import type { ProblemStatus, ProblemSummary } from "../../api/types";
import { AfricaDotMap, type CountryMarker } from "../../components/glass/AfricaDotMap";
import { COUNTRY_BY_ID, regionTone } from "../../components/glass/africaMap";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  INK,
  INK2,
  INK3,
  MONO,
  SOFT_SPRING,
  SPRING,
  Tile,
} from "../../components/glass/Glass";
import { Fact, ListMessage, MasterDetail, Meta } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import {
  StatusIcon,
  codeOf,
  formatDate,
  plural,
  sectorIcon,
} from "../../components/glass/problemBits";
import { problemStatusLabels, sectors } from "../../content/site";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageTitle } from "../../hooks/usePageTitle";

const STATUS_FILTERS: { id: ProblemStatus | ""; label: string }[] = [
  { id: "open", label: "Ouverts" },
  { id: "solved", label: "Résolus" },
  { id: "closed", label: "Fermés" },
  { id: "", label: "Tous" },
];

export function ProblemsView() {
  usePageTitle("Problèmes");
  const { data: session } = useSession();
  const [params, setParams] = useSearchParams();
  // Le pays vient de l'URL : la carte de l'accueil y renvoie directement.
  const country = params.get("pays") ?? "";
  const [filters, setFilters] = useState<Omit<ProblemFilters, "country">>({
    status: country ? "" : "open",
  });
  const problems = useProblems({ ...filters, country });
  const counts = useCountryCounts();
  const items = useMemo(() => problems.data ?? [], [problems.data]);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [sheet, setSheet] = useState(false);

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const set = (patch: Omit<ProblemFilters, "country">) => setFilters((f) => ({ ...f, ...patch }));
  const setCountry = (name: string) => setParam("pays", name || null);

  // Problème choisi : celui de l'URL s'il est dans la liste, sinon le premier.
  const wanted = params.get("probleme");
  const selected = items.find((p) => p.id === wanted) ?? items[0] ?? null;
  const select = (p: ProblemSummary) => {
    setParam("probleme", p.id);
    if (!isWide) setSheet(true);
  };

  const markers = useMemo(() => {
    const out: Record<string, CountryMarker> = {};
    for (const c of counts.data ?? []) {
      const code = codeOf(c.country);
      if (code) {
        out[code] = {
          total: c.total,
          open: c.open,
          label: `${c.country} : ${plural(c.total, "problème")}, dont ${c.open} ouvert${c.open > 1 ? "s" : ""}`,
        };
      }
    }
    return out;
  }, [counts.data]);
  const totals = (counts.data ?? []).reduce(
    (a, c) => ({ total: a.total + c.total, open: a.open + c.open, countries: a.countries + 1 }),
    { total: 0, open: 0, countries: 0 },
  );

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      <Hero
        signedIn={!!session}
        markers={markers}
        country={country}
        onCountry={(name) => setCountry(name === country ? "" : name)}
        summary={
          counts.data
            ? `${plural(totals.open, "problème")} ouvert${totals.open > 1 ? "s" : ""} dans ${totals.countries} pays.`
            : null
        }
      />

      <FilterBar
        q={filters.q ?? ""}
        onQ={(q) => set({ q })}
        status={filters.status ?? ""}
        onStatus={(status) => set({ status })}
        sector={filters.sector ?? ""}
        onSector={(sector) => set({ sector })}
        country={country}
        onClearCountry={() => setCountry("")}
        count={problems.data?.length}
      />

      <MasterDetail
        wide={isWide}
        label="Problème sélectionné"
        sheetOpen={sheet}
        onCloseSheet={() => setSheet(false)}
        list={
          <ProblemList
            items={items}
            loading={problems.isPending}
            error={problems.isError}
            selectedId={selected?.id ?? null}
            onSelect={select}
          />
        }
        detail={selected && <ProblemPanel summary={selected} />}
      />
    </PageShell>
  );
}

/* ───────────── Bandeau : présentation et carte des problèmes ───────────── */

function Hero({
  signedIn,
  markers,
  country,
  onCountry,
  summary,
}: {
  signedIn: boolean;
  markers: Record<string, CountryMarker>;
  country: string;
  onCountry: (name: string) => void;
  summary: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // En défilant, le bandeau s'efface doucement et la carte glisse un peu moins vite que le texte.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const mapY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.35]);
  const code = country ? codeOf(country) : null;

  return (
    <motion.section
      ref={ref}
      style={{ opacity: fade }}
      aria-labelledby="pb-title"
      className="lg lg-stage relative grid gap-6 overflow-hidden rounded-[30px] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center"
    >
      <motion.div
        style={{ y: textY }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SOFT_SPRING}
        className="space-y-5"
      >
        <h1 id="pb-title" className={`text-[clamp(52px,6vw,96px)] leading-[.9] ${DISPLAY} ${INK}`}>
          Les <span className="text-[color:var(--accent)]">problèmes</span>
        </h1>
        <p className={`max-w-[48ch] text-[16.5px] leading-relaxed ${INK2}`}>
          Publiés par des entreprises, des ONG et des institutions. Chaque problème rassemble toutes
          les tentatives, réussies ou non, et qui travaille dessus en ce moment.
        </p>
        {summary && <p className={`text-[12px] ${MONO} ${INK3}`}>{summary}</p>}
        <div className="flex flex-wrap gap-2.5">
          {signedIn ? (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING}>
              <Link
                to="/problemes/nouveau"
                style={CTA_FILL}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                <Plus size={17} strokeWidth={2.4} />
                Publier un problème
              </Link>
            </motion.div>
          ) : (
            <Link
              to="/connexion?suite=%2Fproblemes%2Fnouveau"
              className={`inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-6 text-[15px] font-semibold ${ACCENT_TEXT}`}
            >
              Se connecter pour publier
            </Link>
          )}
        </div>
      </motion.div>

      <motion.div
        style={{ y: mapY }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SOFT_SPRING, delay: 0.1 }}
        className="relative"
      >
        <AfricaDotMap
          markers={markers}
          focus={code}
          selected={code}
          onPick={(c) => {
            const name = COUNTRY_BY_ID[c]?.name;
            if (name && markers[c]) onCountry(name);
          }}
          label="Carte des problèmes par pays : touchez un pays marqué pour filtrer la liste"
          spread={3.2}
          className="h-[300px] sm:h-[380px]"
        />
        <p className={`mt-2 text-center text-[11px] ${MONO} ${INK3}`}>
          {country
            ? `Filtré sur ${country} · touchez à nouveau pour tout voir`
            : "Touchez un pays marqué pour filtrer"}
        </p>
      </motion.div>
    </motion.section>
  );
}

/* ───────────── Filtres ───────────── */

function FilterBar({
  q,
  onQ,
  status,
  onStatus,
  sector,
  onSector,
  country,
  onClearCountry,
  count,
}: {
  q: string;
  onQ: (q: string) => void;
  status: ProblemStatus | "";
  onStatus: (s: ProblemStatus | "") => void;
  sector: string;
  onSector: (s: string) => void;
  country: string;
  onClearCountry: () => void;
  count: number | undefined;
}) {
  const code = country ? codeOf(country) : null;
  const c = code ? COUNTRY_BY_ID[code] : undefined;
  return (
    <Glass
      variant="lg-strong"
      className="sticky top-[76px] z-30 flex flex-wrap items-center gap-2.5 rounded-[26px] p-2.5"
    >
      <label className="pp-field flex h-11 min-w-[200px] flex-1 items-center gap-2.5 rounded-full px-4">
        <Search size={17} className={`shrink-0 ${INK2}`} />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Mot-clé : manioc, darija, crues…"
          aria-label="Filtrer par mot-clé"
          className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[color:var(--ink3)] ${INK}`}
        />
      </label>
      <div
        role="radiogroup"
        aria-label="Statut"
        className="inline-flex rounded-full bg-[color:var(--chip)] p-1"
      >
        {STATUS_FILTERS.map((s) => {
          const on = status === s.id;
          return (
            <button
              key={s.id || "all"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onStatus(s.id)}
              className={`relative h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
            >
              {on && (
                <motion.span
                  layoutId="pb-status-lens"
                  className="pp-lens absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 460, damping: 34 }}
                />
              )}
              <span className="relative">{s.label}</span>
            </button>
          );
        })}
      </div>
      <div className="pp-field relative h-11 rounded-full">
        <select
          value={sector}
          onChange={(e) => onSector(e.target.value)}
          aria-label="Secteur"
          className={`h-full cursor-pointer appearance-none rounded-full bg-transparent pr-10 pl-4 text-[14px] outline-none ${sector ? INK : INK2}`}
        >
          <option value="" className="bg-[#0D121F]">
            Tous les secteurs
          </option>
          {sectors.map((s) => (
            <option key={s} className="bg-[#0D121F]">
              {s}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 ${INK3}`}
        />
      </div>
      {c && (
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] pr-1.5 pl-1.5 text-[14px] font-semibold">
          <Tile c={regionTone(c)} size={30} code={c.id} />
          <span className={ACCENT_TEXT}>{country}</span>
          <button
            type="button"
            aria-label={`Retirer le filtre ${country}`}
            onClick={onClearCountry}
            className="grid size-8 place-items-center rounded-full text-[color:var(--accent-text)] hover:bg-[color:var(--accent-soft2)]"
          >
            <X size={15} strokeWidth={2.4} />
          </button>
        </span>
      )}
      {count !== undefined && (
        <span className={`ml-auto px-2 text-[11.5px] ${MONO} ${INK3}`} aria-live="polite">
          {plural(count, "problème")}
        </span>
      )}
    </Glass>
  );
}

/* ───────────── Liste ───────────── */

function ProblemList({
  items,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  items: ProblemSummary[];
  loading: boolean;
  error: boolean;
  selectedId: string | null;
  onSelect: (p: ProblemSummary) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Flèches haut et bas : passer d'un problème à l'autre sans souris.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = items.findIndex((p) => p.id === selectedId);
    const next =
      items[Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      onSelect(next);
      refs.current[next.id]?.focus();
    }
  };

  if (loading) return <ListMessage>Chargement des problèmes…</ListMessage>;
  if (error)
    return (
      <ListMessage>Impossible de charger les problèmes. Réessayez dans un instant.</ListMessage>
    );
  if (!items.length) return <ListMessage>Aucun problème ne correspond à ces filtres.</ListMessage>;

  return (
    <ul className="space-y-3" onKeyDown={onKeyDown} aria-label="Problèmes">
      {items.map((p, i) => {
        const on = p.id === selectedId;
        return (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ ...SOFT_SPRING, delay: Math.min(i, 6) * 0.04 }}
          >
            <button
              ref={(el) => {
                refs.current[p.id] = el;
              }}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(p)}
              data-selected={on}
              className="pp-card group w-full px-6 py-5 text-left"
            >
              <span className="flex items-start gap-4">
                <span
                  className={`min-w-0 flex-1 text-[16px] leading-snug font-semibold ${p.status === "closed" ? INK2 : INK}`}
                >
                  {p.title}
                </span>
                <StatusIcon status={p.status} />
              </span>
              <span
                className={`mt-3 flex flex-col gap-x-5 gap-y-1.5 text-[13px] sm:flex-row sm:items-end ${INK3}`}
              >
                {/* Les informations passent à la ligne entre elles ; l'auteur et la date restent
                    d'un bloc, à droite de la dernière ligne (sur téléphone, sur leur propre ligne). */}
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
                  <Meta icon={MapPin}>{p.country}</Meta>
                  <Meta icon={sectorIcon(p.sector)}>{p.sector}</Meta>
                  {p.solutionCount !== undefined && (
                    <>
                      <Meta icon={Layers}>{plural(p.solutionCount, "solution")}</Meta>
                      <Meta icon={Construction}>{p.inProgressCount ?? 0} en construction</Meta>
                    </>
                  )}
                </span>
                <span className="truncate whitespace-nowrap sm:max-w-[45%] sm:shrink-0">
                  {p.author}
                  {", "}
                  {p.status === "closed" && p.closedAt
                    ? `fermé le ${formatDate(p.closedAt)}`
                    : formatDate(p.createdAt)}
                </span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/* ───────────── Fiche du problème choisi ───────────── */

function ProblemPanel({ summary }: { summary: ProblemSummary }) {
  const problem = useProblem(summary.id);
  const contribution = useContributionSummary(summary.id);
  const p = problem.data;
  const code = codeOf(summary.country);
  const c = code ? COUNTRY_BY_ID[code] : undefined;
  const open = summary.status !== "closed";

  return (
    <div className="space-y-5">
      <div
        className="overflow-hidden rounded-[22px] bg-[#0A0F1D]/70"
        style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
      >
        <AfricaDotMap
          focus={code}
          selected={code}
          label={`Carte : ${summary.country}`}
          className="h-[230px] sm:h-[260px]"
        />
        {c && (
          <div className="flex items-center gap-2.5 border-t border-[color:var(--hair)] px-4 py-2.5">
            <Tile c={regionTone(c)} size={28} code={c.id} />
            <span className={`text-[14px] font-semibold ${INK}`}>{summary.country}</span>
            <span className={`text-[12px] ${INK3}`}>{c.region}</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={summary.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
          className="space-y-5"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className={`inline-flex items-center gap-2 text-[12.5px] ${INK2}`}>
                <StatusIcon status={summary.status} />
                {problemStatusLabels[summary.status]}
              </span>
              <Meta icon={sectorIcon(summary.sector)}>
                <span className={`text-[12.5px] ${INK3}`}>{summary.sector}</span>
              </Meta>
            </div>
            <h2 className={`text-[clamp(32px,3vw,44px)] leading-[.98] ${DISPLAY} ${INK}`}>
              {summary.title}
            </h2>
            <p className={`text-[12.5px] ${INK3}`}>
              Publié par {summary.author} le {formatDate(summary.createdAt)}
            </p>
          </div>

          {!p ? (
            <p className={`text-[14px] ${INK3}`}>
              {problem.isError ? "Fiche indisponible." : "Chargement…"}
            </p>
          ) : (
            <>
              <p className={`text-[15px] leading-relaxed whitespace-pre-line ${INK2}`}>
                {p.description}
              </p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <Fact icon={Wifi} label="Connectivité" values={p.connectivityConstraint} />
                <Fact icon={Cpu} label="Matériel" values={p.hardwareConstraint} />
                <Fact icon={Languages} label="Langues" values={p.languageConstraint} />
                <Fact
                  icon={Hammer}
                  label="En cours"
                  values={p.workers.map((w) => w.username ?? "")}
                  empty="Personne pour l’instant"
                />
              </div>
              {p.evaluationCriteria && (
                <div className="pp-card space-y-1.5 p-4">
                  <p className={`flex items-center gap-2 text-[11px] ${MONO} ${INK2}`}>
                    <Target size={13} /> Critères de réussite
                  </p>
                  <p className={`text-[14px] leading-snug whitespace-pre-line ${INK}`}>
                    {p.evaluationCriteria}
                  </p>
                </div>
              )}

              <p className={`text-[13px] ${INK2}`}>
                {plural(p.solutions.solutions.length, "solution")}
                {p.solutions.inProgress.length
                  ? `, ${p.solutions.inProgress.length} en construction`
                  : ""}
                {" · "}
                {contribution.data?.published
                  ? `${plural(contribution.data.submissions, "contribution")} de données`
                  : `${p.contributions.length} jeu${p.contributions.length > 1 ? "x" : ""} de données proposé${p.contributions.length > 1 ? "s" : ""}`}
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-2.5">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING}>
              <Link
                to={`/problemes/${summary.id}`}
                style={CTA_FILL}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
              >
                Voir le problème <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </motion.div>
            {open && contribution.data?.published && (
              <Link
                to={`/problemes/${summary.id}/contribuer`}
                className={`inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[14.5px] font-semibold ${ACCENT_TEXT}`}
              >
                <Send size={15} />
                Contribuer
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
