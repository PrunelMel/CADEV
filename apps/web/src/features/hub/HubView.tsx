/**
 * Hub de solutions, charte « Liquid Glass » : bandeau avec le choix du type (modèles, datasets,
 * bibliothèques), barre de filtres, puis la liste des dépôts à gauche et la fiche du dépôt choisi
 * à droite, licence en tête. Sur téléphone, la fiche monte du bas.
 */
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Construction,
  ChevronDown,
  Cpu,
  Database,
  Heart,
  Languages,
  Library,
  Lock,
  MapPin,
  Plus,
  Scale,
  Search,
  Target,
  TriangleAlert,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "../../api/auth";
import { useLanguages, useRepo, useRepos, type RepoFilters } from "../../api/hooks";
import type { RepoStage, RepoSummary, RepoType } from "../../api/types";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  MONO,
  SOFT_SPRING,
  SPRING,
  Tile,
} from "../../components/glass/Glass";
import { Fact, ListMessage, MasterDetail } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import { PAL, type Tone } from "../../content/problem-form";
import { problemStatusLabels, repoStageLabels, repoTypeLabels } from "../../content/site";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageTitle } from "../../hooks/usePageTitle";

const TYPES: { id: RepoType; label: string; text: string; icon: LucideIcon; c: Tone }[] = [
  {
    id: "model",
    label: "Modèles",
    text: "Entraînés et prêts à intégrer, avec leurs limites connues.",
    icon: BrainCircuit,
    c: PAL.lav,
  },
  {
    id: "dataset",
    label: "Datasets",
    text: "Données collectées sur le terrain, avec leur provenance.",
    icon: Database,
    c: PAL.teal,
  },
  {
    id: "library",
    label: "Bibliothèques",
    text: "Code et outils réutilisables d’un projet à l’autre.",
    icon: Library,
    c: PAL.amber,
  },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t])) as Record<
  RepoType,
  (typeof TYPES)[number]
>;

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const keyOf = (r: Pick<RepoSummary, "owner" | "name">) => `${r.owner}/${r.name}`;

export function HubView() {
  usePageTitle("Hub de solutions");
  const { data: session } = useSession();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<RepoFilters>({});
  const repos = useRepos(filters);
  const languages = useLanguages();
  const items = useMemo(() => repos.data ?? [], [repos.data]);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [sheet, setSheet] = useState(false);
  const set = (patch: RepoFilters) => setFilters((f) => ({ ...f, ...patch }));

  // Dépôt choisi : celui de l'URL (?depot=owner/nom) s'il est dans la liste, sinon le premier.
  const wanted = params.get("depot");
  const selected = items.find((r) => keyOf(r) === wanted) ?? items[0] ?? null;
  const select = (r: RepoSummary) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("depot", keyOf(r));
        return next;
      },
      { replace: true },
    );
    if (!isWide) setSheet(true);
  };

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      <Hero
        signedIn={!!session}
        type={filters.type}
        onType={(type) => set({ type: type === filters.type ? undefined : type })}
      />

      <FilterBar
        q={filters.q ?? ""}
        onQ={(q) => set({ q: q || undefined })}
        type={filters.type}
        onClearType={() => set({ type: undefined })}
        language={filters.language ?? ""}
        languages={languages.data ?? []}
        onLanguage={(language) => set({ language: language || undefined })}
        offline={!!filters.offline}
        onOffline={() => set({ offline: filters.offline ? undefined : true })}
        count={repos.data?.length}
      />

      <MasterDetail
        wide={isWide}
        label="Dépôt sélectionné"
        sheetOpen={sheet}
        onCloseSheet={() => setSheet(false)}
        list={
          <RepoList
            items={items}
            loading={repos.isPending}
            error={repos.isError}
            selectedKey={selected ? keyOf(selected) : null}
            onSelect={select}
          />
        }
        detail={selected && <RepoPanel summary={selected} />}
      />
    </PageShell>
  );
}

/* ───────────── Bandeau : présentation et choix du type ───────────── */

function Hero({
  signedIn,
  type,
  onType,
}: {
  signedIn: boolean;
  type: RepoType | undefined;
  onType: (t: RepoType) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // En défilant, le bandeau s'efface doucement et les types glissent un peu moins vite que le texte.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const sideY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.35]);

  return (
    <motion.section
      ref={ref}
      style={{ opacity: fade }}
      aria-labelledby="hub-title"
      className="lg lg-stage relative grid gap-6 overflow-hidden rounded-[30px] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center"
    >
      <motion.div
        style={{ y: textY }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SOFT_SPRING}
        className="space-y-5"
      >
        <h1 id="hub-title" className={`text-[clamp(52px,6vw,96px)] leading-[.9] ${DISPLAY} ${INK}`}>
          Hub de <span className="text-[color:var(--accent)]">solutions</span>
        </h1>
        <p className={`max-w-[48ch] text-[16.5px] leading-relaxed ${INK2}`}>
          Chaque dépôt a sa fiche, sa licence et ses conditions d’usage sur le terrain : langues
          prises en charge, fonctionnement hors ligne, matériel cible.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {signedIn ? (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING}>
              <Link
                to="/nouveau-depot"
                style={CTA_FILL}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                <Plus size={17} strokeWidth={2.4} />
                Créer un dépôt
              </Link>
            </motion.div>
          ) : (
            <Link
              to="/connexion?suite=%2Fnouveau-depot"
              className={`inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-6 text-[15px] font-semibold ${ACCENT_TEXT}`}
            >
              Se connecter pour publier
            </Link>
          )}
        </div>
      </motion.div>

      <motion.div style={{ y: sideY }} className="space-y-3">
        <div role="group" aria-label="Type de dépôt" className="space-y-3">
          {TYPES.map((t, i) => {
            const on = type === t.id;
            return (
              <Glass
                key={t.id}
                as={motion.button}
                type="button"
                aria-pressed={on}
                onClick={() => onType(t.id)}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SOFT_SPRING, delay: 0.08 + i * 0.07 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                data-selected={on}
                className="pp-card flex w-full items-center gap-4 p-4 text-left"
              >
                <Tile c={t.c} size={50} icon={t.icon} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[26px] leading-none ${DISPLAY} ${INK}`}>
                    {t.label}
                  </span>
                  <span className={`mt-1.5 block text-[14px] leading-snug ${INK2}`}>{t.text}</span>
                </span>
              </Glass>
            );
          })}
        </div>
        <p className={`text-center text-[11px] ${MONO} ${INK3}`}>
          {type
            ? `Filtré sur ${TYPE_BY_ID[type].label.toLowerCase()} · touchez à nouveau pour tout voir`
            : "Touchez un type pour filtrer"}
        </p>
      </motion.div>
    </motion.section>
  );
}

/* ───────────── Filtres ───────────── */

function FilterBar({
  q,
  onQ,
  type,
  onClearType,
  language,
  languages,
  onLanguage,
  offline,
  onOffline,
  count,
}: {
  q: string;
  onQ: (q: string) => void;
  type: RepoType | undefined;
  onClearType: () => void;
  language: string;
  languages: string[];
  onLanguage: (l: string) => void;
  offline: boolean;
  onOffline: () => void;
  count: number | undefined;
}) {
  const t = type ? TYPE_BY_ID[type] : undefined;
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
          placeholder="Nom, description ou tâche"
          aria-label="Filtrer par nom, description ou tâche"
          className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[color:var(--ink3)] ${INK}`}
        />
      </label>
      <div className="pp-field relative h-11 rounded-full">
        <select
          value={language}
          onChange={(e) => onLanguage(e.target.value)}
          aria-label="Langue"
          className={`h-full cursor-pointer appearance-none rounded-full bg-transparent pr-10 pl-4 text-[14px] outline-none ${language ? INK : INK2}`}
        >
          <option value="" className="bg-[#0D121F]">
            Toutes les langues
          </option>
          {languages.map((l) => (
            <option key={l} className="bg-[#0D121F]">
              {l}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 ${INK3}`}
        />
      </div>
      <button
        type="button"
        aria-pressed={offline}
        onClick={onOffline}
        className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors ${offline ? `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}` : `pp-field ${INK2} hover:text-[color:var(--ink)]`}`}
      >
        <WifiOff size={16} />
        Hors ligne
      </button>
      {t && (
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] pr-1.5 pl-1.5 text-[14px] font-semibold">
          <Tile c={t.c} size={30} icon={t.icon} />
          <span className={ACCENT_TEXT}>{t.label}</span>
          <button
            type="button"
            aria-label={`Retirer le filtre ${t.label}`}
            onClick={onClearType}
            className="grid size-8 place-items-center rounded-full text-[color:var(--accent-text)] hover:bg-[color:var(--accent-soft2)]"
          >
            <X size={15} strokeWidth={2.4} />
          </button>
        </span>
      )}
      {count !== undefined && (
        <span className={`ml-auto px-2 text-[11.5px] ${MONO} ${INK3}`} aria-live="polite">
          {plural(count, "dépôt")}
        </span>
      )}
    </Glass>
  );
}

/* ───────────── Liste ───────────── */

function RepoList({
  items,
  loading,
  error,
  selectedKey,
  onSelect,
}: {
  items: RepoSummary[];
  loading: boolean;
  error: boolean;
  selectedKey: string | null;
  onSelect: (r: RepoSummary) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Flèches haut et bas : passer d'un dépôt à l'autre sans souris.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = items.findIndex((r) => keyOf(r) === selectedKey);
    const next =
      items[Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      onSelect(next);
      refs.current[keyOf(next)]?.focus();
    }
  };

  if (loading) return <ListMessage>Chargement des dépôts…</ListMessage>;
  if (error)
    return <ListMessage>Impossible de charger le hub. Réessayez dans un instant.</ListMessage>;
  if (!items.length) return <ListMessage>Aucun dépôt ne correspond à ces filtres.</ListMessage>;

  return (
    <ul className="space-y-3" onKeyDown={onKeyDown} aria-label="Dépôts">
      {items.map((r, i) => {
        const key = keyOf(r);
        const on = key === selectedKey;
        const t = TYPE_BY_ID[r.type];
        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ ...SOFT_SPRING, delay: Math.min(i, 6) * 0.04 }}
          >
            {/* Contenu de la carte du hub d'origine, passé en verre. */}
            <button
              ref={(el) => {
                refs.current[key] = el;
              }}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(r)}
              data-selected={on}
              className="pp-card flex w-full flex-col gap-2.5 p-4 text-left"
            >
              <span className="flex items-start gap-3">
                <Tile c={t.c} size={38} icon={t.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-[family-name:var(--font-mono)] text-[14px]">
                    <span className={INK3}>{r.owner}/</span>
                    <span className={INK}>{r.name}</span>
                  </span>
                  <span className={`block text-[12.5px] ${INK3}`}>{repoTypeLabels[r.type]}</span>
                </span>
                <span className={`flex shrink-0 items-center gap-2 text-[12.5px] ${INK3}`}>
                  {r.visibility === "private" && <Lock size={13} aria-label="Privé" />}
                  {r.likes !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <Heart size={13} /> {r.likes}
                    </span>
                  )}
                </span>
              </span>
              {r.description && (
                <span className={`text-[14px] leading-snug ${INK2}`}>{r.description}</span>
              )}
              <span className="flex flex-wrap gap-1.5 pt-0.5">
                {r.task && <Chip>{r.task}</Chip>}
                {r.worksOffline && (
                  <Chip>
                    <WifiOff size={12} /> Hors ligne
                  </Chip>
                )}
                {r.languages.map((l) => (
                  <Chip key={l} accent>
                    {l}
                  </Chip>
                ))}
                {r.license && (
                  <Chip warn={r.license.restrictions.length > 0}>{r.license.name}</Chip>
                )}
              </span>
              {r.provenanceCountry && (
                <span className={`text-[12.5px] ${INK3}`}>
                  Provenance : {r.provenanceCommunity ? `${r.provenanceCommunity}, ` : ""}
                  {r.provenanceCountry}
                </span>
              )}
              <span className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] ${INK3}`}>
                <Stage stage={r.stage} />
                {r.problem && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Target size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">
                      {r.problem.title}
                      {r.problem.status === "closed" && " (fermé)"}
                    </span>
                  </span>
                )}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

const STAGE_ICON = { under_construction: Construction, solution: BadgeCheck } as const;

/** Statut du dépôt : une icône et son nom, sans pastille. */
function Stage({ stage }: { stage: RepoStage }) {
  const Icon = STAGE_ICON[stage];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        size={14}
        aria-hidden
        style={{ color: stage === "solution" ? "var(--ok)" : PAL.amber[0] }}
      />
      {repoStageLabels[stage]}
    </span>
  );
}

function Chip({
  children,
  accent = false,
  warn = false,
}: {
  children: ReactNode;
  accent?: boolean;
  warn?: boolean;
}) {
  // Licence restrictive : en ambre, comme l'avertissement de la fiche.
  const tone = warn ? { color: PAL.amber[0], background: hexA(PAL.amber[0], 0.12) } : undefined;
  return (
    <span
      style={tone}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${warn ? "" : accent ? `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}` : `bg-[color:var(--chip)] ${INK2}`}`}
    >
      {children}
    </span>
  );
}

/* ───────────── Fiche du dépôt choisi ───────────── */

function RepoPanel({ summary }: { summary: RepoSummary }) {
  const repo = useRepo({ owner: summary.owner, name: summary.name });
  const r = repo.data;
  const t = TYPE_BY_ID[summary.type];
  const license = r?.license ?? summary.license;

  return (
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
              <Tile c={t.c} size={28} icon={t.icon} />
              {repoTypeLabels[summary.type]}
            </span>
            <span className={`text-[12.5px] ${INK2}`}>
              <Stage stage={summary.stage} />
            </span>
            {summary.visibility === "private" && (
              <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${INK3}`}>
                <Lock size={13} /> Privé
              </span>
            )}
          </div>
          <h2 className={`text-[clamp(32px,3vw,44px)] leading-[.98] break-words ${DISPLAY} ${INK}`}>
            {summary.name}
          </h2>
          <p className={`text-[12.5px] ${INK3}`}>
            Par {summary.owner}, mis à jour le {formatDate(summary.updatedAt)}
          </p>
          {summary.description && (
            <p className={`text-[15px] leading-relaxed ${INK2}`}>{summary.description}</p>
          )}
        </div>

        {summary.problem && (
          <Link
            to={`/problemes/${summary.problem.id}`}
            className="pp-card flex items-start gap-3 px-4 py-3.5"
          >
            <Target size={18} className={`mt-0.5 shrink-0 ${INK2}`} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[11px] ${MONO} ${INK3}`}>Répond au problème</span>
              <span className={`mt-1 block text-[15px] leading-snug font-semibold ${INK}`}>
                {summary.problem.title}
              </span>
              <span className={`mt-1 block text-[12.5px] ${INK3}`}>
                {problemStatusLabels[summary.problem.status]}
                {r?.featured && " · solution mise en avant"}
              </span>
              {summary.problem.status === "closed" && (
                <span className="mt-1.5 block text-[12.5px]" style={{ color: PAL.amber[0] }}>
                  Problème fermé : ce dépôt passe derrière les autres dans le hub.
                </span>
              )}
            </span>
            <ArrowRight size={16} className={`mt-1 shrink-0 ${INK3}`} />
          </Link>
        )}

        {summary.stage === "under_construction" && r && !r.permissions.full && (
          <p className={`flex items-start gap-2 text-[13.5px] leading-snug ${INK2}`}>
            <Construction size={16} className="mt-0.5 shrink-0" style={{ color: PAL.amber[0] }} />
            En construction : seul son README est visible tant que son auteur ne l’a pas déclaré
            solution.
          </p>
        )}

        {license && (
          <div className="pp-card space-y-2.5 p-4">
            <p className={`flex items-center gap-2 text-[11px] ${MONO} ${INK2}`}>
              <Scale size={13} /> Licence
            </p>
            <p className={`text-[16px] font-semibold ${INK}`}>{license.name}</p>
            {license.summary && (
              <p className={`text-[13.5px] leading-snug ${INK2}`}>{license.summary}</p>
            )}
            {/* Avertissement de souveraineté : seulement si la licence restreint l'usage. */}
            {license.restrictions.length > 0 && (
              <div role="note" className="space-y-1.5 pt-1" style={{ color: PAL.amber[0] }}>
                <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <TriangleAlert size={15} /> Conditions à respecter
                </p>
                <ul className="list-disc space-y-0.5 pl-6 text-[13.5px] leading-snug">
                  {license.restrictions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Fact icon={Target} label="Tâche" values={[summary.task]} />
          <Fact icon={Languages} label="Langues" values={summary.languages} />
          <Fact
            icon={WifiOff}
            label="Hors ligne"
            values={summary.worksOffline ? ["Fonctionne sans connexion"] : []}
            empty="Connexion nécessaire"
          />
          <Fact icon={Cpu} label="Matériel" values={[summary.targetHardware]} />
        </div>

        {summary.provenanceCountry && (
          <p className={`flex items-center gap-2 text-[13.5px] ${INK2}`}>
            <MapPin size={15} className={INK3} />
            Provenance des données :{" "}
            {summary.provenanceCommunity ? `${summary.provenanceCommunity}, ` : ""}
            {summary.provenanceCountry}
          </p>
        )}

        {!r ? (
          <p className={`text-[14px] ${INK3}`}>
            {repo.isError ? "Fiche indisponible." : "Chargement…"}
          </p>
        ) : (
          <>
            {r.limitations && (
              <div className="pp-card space-y-1.5 p-4">
                <p className={`text-[11px] ${MONO} ${INK2}`}>Limites connues</p>
                <p className={`text-[14px] leading-snug whitespace-pre-line ${INK}`}>
                  {r.limitations}
                </p>
              </div>
            )}
          </>
        )}

        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          className="inline-block"
        >
          <Link
            to={`/${summary.owner}/${summary.name}`}
            style={CTA_FILL}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
          >
            Voir le dépôt <ArrowRight size={16} strokeWidth={2.4} />
          </Link>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
