/**
 * Fiche d'un problème, charte « Liquid Glass » : bandeau (statut, titre, description, actions,
 * carte zoomée sur le pays), puis une barre d'onglets collante (Solutions, Contributions,
 * Discussion, Terrain) qui affiche un contenu à la fois. L'onglet est dans l'URL (`?onglet=`).
 */
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Construction,
  Copy,
  Cpu,
  Database,
  Hammer,
  Heart,
  Languages,
  MapPin,
  MessageSquare,
  Pencil,
  PencilRuler,
  Plus,
  Send,
  Star,
  Target,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "../../api/auth";
import { useContributionSummary } from "../../api/contribution";
import {
  useDiscussions,
  useProblem,
  useSetFeatured,
  useSubmitContribution,
  useSuggestions,
  useWork,
} from "../../api/hooks";
import type { LinkedRepo, ProblemDetail, Suggestion } from "../../api/types";
import { AfricaDotMap } from "../../components/glass/AfricaDotMap";
import { COUNTRY_BY_ID } from "../../components/glass/africaMap";
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
import { Fact, ListMessage, Meta } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import {
  FIELD,
  GlassDiscussion,
  Heading,
  Labelled,
  Reveal,
  TabbedContent,
  useTab,
} from "../../components/glass/sections";
import {
  StatusIcon,
  codeOf,
  formatDate,
  plural,
  sectorIcon,
} from "../../components/glass/problemBits";
import { ErrorText } from "../../components/ui";
import { countries, problemStatusLabels, repoTypeLabels } from "../../content/site";
import { PAL } from "../../content/problem-form";
import { typeOptions } from "../../content/repo-form";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = [
  { id: "solutions", label: "Solutions", icon: Star },
  { id: "contributions", label: "Contributions", icon: Database },
  { id: "discussion", label: "Discussion", icon: MessageSquare },
  { id: "terrain", label: "Terrain", icon: Target },
] as const;
const TAB_IDS = TABS.map((t) => t.id);

const TYPE_BY_ID = Object.fromEntries(typeOptions.map((t) => [t.id, t]));
const AMBER = PAL.amber[0];

export function ProblemDetailView() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  usePageTitle(problem.data?.title);
  const { tab, setTab, anchor } = useTab(TAB_IDS);
  const discussions = useDiscussions(`/problems/${id}`);

  const p = problem.data;
  return (
    <PageShell mainClassName="space-y-6 pb-16">
      {!p ? (
        <ListMessage>
          {problem.isError ? "Ce problème est introuvable." : "Chargement du problème…"}
        </ListMessage>
      ) : (
        <>
          <Hero problem={p} />
          <TabbedContent
            label="Sections du problème"
            tabs={TABS.map((t) => ({
              ...t,
              count:
                t.id === "solutions"
                  ? p.solutions.solutions.length + p.solutions.inProgress.length
                  : t.id === "contributions"
                    ? p.contributions.length
                    : t.id === "discussion"
                      ? discussions.data?.length
                      : undefined,
            }))}
            tab={tab}
            onTab={setTab}
            anchor={anchor}
          >
            {tab === "solutions" && <SolutionsTab problem={p} />}
            {tab === "contributions" && <ContributionsTab problem={p} />}
            {tab === "discussion" && (
              <div className="mx-auto max-w-[860px]">
                <GlassDiscussion
                  path={`/problems/${p.id}`}
                  note="Questions, retours de terrain, pistes à partager."
                />
              </div>
            )}
            {tab === "terrain" && <TerrainTab problem={p} />}
          </TabbedContent>
        </>
      )}
    </PageShell>
  );
}

/* ───────────── Bandeau ───────────── */

function Hero({ problem: p }: { problem: ProblemDetail }) {
  const { data: session } = useSession();
  const contribution = useContributionSummary(p.id);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);
  const mapY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 36]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.35]);
  const [copied, setCopied] = useState(false);
  const code = codeOf(p.country);
  const c = code ? COUNTRY_BY_ID[code] : undefined;
  const closed = p.status === "closed";

  const copy = () =>
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });

  return (
    <motion.section
      ref={ref}
      style={{ opacity: fade }}
      aria-labelledby="pd-title"
      className="lg lg-stage relative grid gap-6 overflow-hidden rounded-[30px] p-5 sm:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center"
    >
      <motion.div
        style={{ y: textY }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SOFT_SPRING}
        className="min-w-0 space-y-5"
      >
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] ${INK2}`}>
          <span className="inline-flex items-center gap-1.5">
            <StatusIcon status={p.status} size={17} />
            {problemStatusLabels[p.status]}
          </span>
          <Meta icon={sectorIcon(p.sector)}>{p.sector}</Meta>
          <Meta icon={MapPin}>{p.country}</Meta>
          <span className={INK3}>
            Publié par{" "}
            <Link to={`/u/${p.author}`} className={`font-semibold hover:underline ${INK2}`}>
              {p.author}
            </Link>{" "}
            le {formatDate(p.createdAt)}
          </span>
        </div>
        <h1
          id="pd-title"
          className={`text-[clamp(40px,4.6vw,72px)] leading-[.95] [text-wrap:balance] ${DISPLAY} ${INK}`}
        >
          {p.title}
        </h1>
        <p className={`max-w-[62ch] text-[16px] leading-relaxed whitespace-pre-line ${INK2}`}>
          {p.description}
        </p>

        {closed && (
          <p
            role="note"
            className="flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-[14px] leading-snug"
            style={{ color: AMBER, background: hexA(AMBER, 0.1) }}
          >
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            <span>
              Ce problème est fermé : son auteur n’en voit plus l’intérêt, et il n’accepte plus de
              contributions de données. Si le sujet reste d’actualité pour vous,{" "}
              <Link to="/problemes/nouveau" className="font-semibold underline">
                publiez un nouveau problème
              </Link>
              .
            </span>
          </p>
        )}

        <div className="flex flex-wrap gap-2.5">
          {session ? (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING}>
              <Link
                to={`/nouveau-depot?probleme=${p.id}`}
                style={CTA_FILL}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                <Plus size={17} strokeWidth={2.4} />
                Créer un dépôt pour ce problème
              </Link>
            </motion.div>
          ) : (
            <Link
              to={`/connexion?suite=${encodeURIComponent(`/problemes/${p.id}`)}`}
              className={`inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-6 text-[15px] font-semibold ${ACCENT_TEXT}`}
            >
              Se connecter pour proposer un dépôt
            </Link>
          )}
          {contribution.data?.published && !closed && (
            <Link
              to={`/problemes/${p.id}/contribuer`}
              className={`inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[15px] font-semibold ${ACCENT_TEXT}`}
            >
              <Send size={16} /> Contribuer
            </Link>
          )}
          {p.isAuthor && (
            <Link
              to={`/problemes/${p.id}/modifier`}
              className={`pp-field inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold ${INK}`}
            >
              <Pencil size={15} /> Modifier
            </Link>
          )}
          <button
            type="button"
            onClick={copy}
            className={`pp-field inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold ${INK2}`}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      </motion.div>

      <motion.div
        style={{ y: mapY }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SOFT_SPRING, delay: 0.1 }}
        className="overflow-hidden rounded-[22px] bg-[#0A0F1D]/70"
      >
        <AfricaDotMap
          focus={code}
          selected={code}
          spread={2.2}
          label={`Carte : ${p.country}`}
          className="h-[260px] sm:h-[340px]"
        />
        {c && (
          <div className="flex items-center gap-2.5 border-t border-[color:var(--hair)] px-4 py-2.5">
            <Tile c={PAL.lav} size={28} code={c.id} />
            <span className={`text-[14px] font-semibold ${INK}`}>{p.country}</span>
            <span className={`text-[12px] ${INK3}`}>{c.region}</span>
          </div>
        )}
      </motion.div>
    </motion.section>
  );
}

/* ───────────── Onglet Solutions ───────────── */

function SolutionsTab({ problem: p }: { problem: ProblemDetail }) {
  const { data: session } = useSession();
  const { featured, solutions, inProgress } = p.solutions;
  const feature = useSetFeatured(p.id);
  const top = solutions.find((r) => r.id === featured?.id);
  const others = solutions.filter((r) => r.id !== featured?.id);

  const authorAction = (r: LinkedRepo) =>
    p.isAuthor ? (
      r.id === featured?.id && featured.by === "author" ? (
        <button
          type="button"
          disabled={feature.isPending}
          onClick={() => feature.mutate(null)}
          className={`pp-field inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold ${INK2}`}
        >
          Laisser la communauté choisir
        </button>
      ) : (
        <button
          type="button"
          disabled={feature.isPending}
          onClick={() => feature.mutate(`${r.owner}/${r.name}`)}
          className={`inline-flex h-10 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-4 text-[13.5px] font-semibold ${ACCENT_TEXT}`}
        >
          <Star size={14} /> Mettre en avant
        </button>
      )
    ) : null;

  return (
    <div className="space-y-10">
      {top && (
        <section className="space-y-4">
          <Heading
            title="Solution mise en avant"
            note={
              featured?.by === "author"
                ? "Choisie par l’auteur du problème."
                : "La plus appréciée par la communauté, faute de choix de l’auteur du problème."
            }
          />
          <RepoCard repo={top} featured action={authorAction(top)} />
        </section>
      )}

      <section className="space-y-4">
        <Heading
          title={`Solutions (${solutions.length})`}
          note={
            p.isAuthor
              ? "Dépôts publics déclarés solution par leur auteur. Choisissez celle à mettre en avant ; sans choix de votre part, c’est la plus appréciée."
              : "Dépôts publics déclarés solution par leur auteur. Personne ne les accepte ni ne les rejette."
          }
        />
        {solutions.length === 0 ? (
          <ListMessage>Aucune solution pour l’instant.</ListMessage>
        ) : (
          others.length > 0 && (
            <ul className="grid gap-3 md:grid-cols-2">
              {others.map((r, i) => (
                <Reveal key={r.id} i={i}>
                  <RepoCard repo={r} action={authorAction(r)} />
                </Reveal>
              ))}
            </ul>
          )
        )}
        <ErrorText error={feature.error} />
      </section>

      {inProgress.length > 0 && (
        <section className="space-y-4">
          <Heading
            title={`En construction (${inProgress.length})`}
            note="Dépôts publics pas encore déclarés solution : seul leur README est visible. Ils montrent qui travaille déjà sur quoi."
          />
          <ul className="grid gap-3 md:grid-cols-2">
            {inProgress.map((r, i) => (
              <Reveal key={r.id} i={i}>
                <RepoCard repo={r} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {session && (
        <Glass className="flex flex-wrap items-center gap-4 rounded-[24px] p-5">
          <Tile c={PAL.lav} size={44} icon={Plus} />
          <div className="min-w-0 flex-1">
            <p className={`text-[16px] font-semibold ${INK}`}>Vous avez une piste ?</p>
            <p className={`text-[13.5px] leading-snug ${INK3}`}>
              Créez un dépôt lié à ce problème. Il reste en construction (README seul) jusqu’à ce
              que vous le déclariez solution.
            </p>
          </div>
          <Link
            to={`/nouveau-depot?probleme=${p.id}`}
            style={CTA_FILL}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
          >
            Créer un dépôt <ArrowRight size={16} strokeWidth={2.4} />
          </Link>
        </Glass>
      )}
    </div>
  );
}

function RepoCard({
  repo: r,
  featured = false,
  action,
}: {
  repo: LinkedRepo;
  featured?: boolean;
  action?: ReactNode;
}) {
  const t = TYPE_BY_ID[r.type];
  const restricted = r.license.restrictions.length > 0;
  return (
    <div className="pp-card space-y-3 p-5" data-selected={featured}>
      <div className="flex items-start gap-3">
        {t && <Tile c={t.c} size={featured ? 46 : 40} icon={t.icon} />}
        <div className="min-w-0 flex-1">
          <Link
            to={`/${r.owner}/${r.name}`}
            className="block truncate font-[family-name:var(--font-mono)] text-[15px] hover:underline"
          >
            <span className={INK3}>{r.owner}/</span>
            <span className={INK}>{r.name}</span>
          </Link>
          <p className={`text-[12.5px] ${INK3}`}>{repoTypeLabels[r.type]}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 text-[13px] ${INK3}`}>
          <Heart size={14} /> {r.likes}
        </span>
      </div>
      {r.description && (
        <p className={`text-[14.5px] leading-snug ${featured ? INK : INK2}`}>{r.description}</p>
      )}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] ${INK3}`}>
        {r.stage === "under_construction" && (
          <span className="inline-flex items-center gap-1.5">
            <Construction size={14} style={{ color: AMBER }} /> En construction
          </span>
        )}
        {r.task && <Meta icon={Target}>{r.task}</Meta>}
        {r.worksOffline && <Meta icon={WifiOff}>Hors ligne</Meta>}
        {r.languages.length > 0 && <Meta icon={Languages}>{r.languages.join(", ")}</Meta>}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={
            restricted
              ? { color: AMBER, background: hexA(AMBER, 0.12) }
              : { background: "var(--chip)" }
          }
        >
          {r.license.name}
        </span>
      </div>
      {/* Avertissement de souveraineté : seulement si la licence restreint l'usage. */}
      {restricted && (
        <p className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: AMBER }}>
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {r.license.restrictions.join(" · ")}
        </p>
      )}
      {action && <div className="border-t border-[color:var(--hair)] pt-3">{action}</div>}
    </div>
  );
}

/* ───────────── Onglet Contributions ───────────── */

function ContributionsTab({ problem: p }: { problem: ProblemDetail }) {
  const { data: session } = useSession();
  const summary = useContributionSummary(p.id);
  const s = summary.data;
  const open = p.status !== "closed";
  return (
    <div className="space-y-8">
      {s && (s.published || p.isAuthor) && (
        <Glass className="flex flex-wrap items-center gap-4 rounded-[24px] p-5">
          <Tile c={PAL.teal} size={44} icon={ClipboardList} />
          <div className="min-w-0 flex-1">
            {s.published ? (
              <>
                <p className={`text-[16px] font-semibold ${INK}`}>{s.title}</p>
                <p className={`text-[13.5px] ${INK3}`}>
                  {plural(s.fields, "champ")} à remplir · {plural(s.submissions, "contribution")}{" "}
                  reçue{s.submissions > 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <>
                <p className={`text-[16px] font-semibold ${INK}`}>
                  Récoltez des données auprès de la communauté
                </p>
                <p className={`text-[13.5px] leading-snug ${INK3}`}>
                  Concevez une page-formulaire (enregistrements audio, transcriptions, choix) : les
                  réponses sont rangées dans le format de votre choix.
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.isAuthor && (
              <Link
                to={`/problemes/${p.id}/concevoir`}
                className={`pp-field inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ${INK}`}
              >
                <PencilRuler size={15} />
                {s.published ? "Modifier la page" : "Concevoir la page"}
              </Link>
            )}
            {s.published && open && (
              <Link
                to={`/problemes/${p.id}/contribuer`}
                style={CTA_FILL}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
              >
                <Send size={15} /> Contribuer
              </Link>
            )}
          </div>
        </Glass>
      )}

      <section className="space-y-4">
        <Heading
          title={`Jeux de données proposés (${p.contributions.length})`}
          note="Des données apportées par la communauté, avec leur provenance."
        />
        {p.contributions.length === 0 ? (
          <ListMessage>Aucun jeu de données proposé.</ListMessage>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {p.contributions.map((c, i) => (
              <Reveal key={c.id} i={i}>
                <div className="pp-card space-y-2.5 p-5">
                  <p className={`text-[14.5px] leading-snug whitespace-pre-line ${INK}`}>
                    {c.description}
                  </p>
                  <p className={`flex items-center gap-1.5 text-[13px] ${INK2}`}>
                    <MapPin size={14} className={INK3} />
                    {c.provenanceCommunity}, {c.provenanceCountry}
                  </p>
                  <div className={`flex flex-wrap items-center gap-x-4 text-[12.5px] ${INK3}`}>
                    {c.dataset && (
                      <Link
                        to={`/${c.dataset.owner}/${c.dataset.name}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Database size={13} /> {c.dataset.owner}/{c.dataset.name}
                      </Link>
                    )}
                    <span>
                      {c.contributor}, {formatDate(c.createdAt)}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {session && open && <ContributionForm problemId={p.id} />}
    </div>
  );
}

function ContributionForm({ problemId }: { problemId: string }) {
  const submit = useSubmitContribution(problemId);
  const [open, setOpen] = useState(false);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    submit.mutate(
      {
        description: v.description,
        provenanceCommunity: v.provenanceCommunity,
        provenanceCountry: v.provenanceCountry,
        dataset: v.dataset || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      },
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 rounded-full border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-2 pr-5 text-left text-[15px] ${INK}`}
      >
        <Tile c={PAL.lav} size={34} icon={Plus} />
        Proposer un jeu de données
      </button>
    );
  }
  return (
    <Glass as="form" onSubmit={onSubmit} className="space-y-4 rounded-[24px] p-5">
      <div className="flex items-center justify-between">
        <h3 className={`text-[17px] font-semibold ${INK}`}>Proposer un jeu de données</h3>
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          className={`grid size-9 place-items-center rounded-full hover:bg-[color:var(--accent-soft)] ${INK2}`}
        >
          <X size={17} />
        </button>
      </div>
      <Labelled label="Description des données">
        <textarea
          name="description"
          required
          minLength={10}
          rows={4}
          className={`${FIELD} resize-y py-3 ${INK}`}
        />
      </Labelled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Communauté d’origine">
          <input name="provenanceCommunity" required className={`${FIELD} h-12 ${INK}`} />
        </Labelled>
        <Labelled label="Pays d’origine">
          <select
            name="provenanceCountry"
            required
            defaultValue=""
            className={`${FIELD} h-12 cursor-pointer ${INK}`}
          >
            <option value="" disabled className="bg-[#0D121F]">
              Choisir un pays
            </option>
            {countries.map((c) => (
              <option key={c} className="bg-[#0D121F]">
                {c}
              </option>
            ))}
          </select>
        </Labelled>
      </div>
      <Labelled label="Dataset lié (facultatif)" hint="proprietaire/nom d’un dataset public.">
        <input name="dataset" className={`${FIELD} h-12 ${INK}`} />
      </Labelled>
      <ErrorText error={submit.error} />
      <button
        disabled={submit.isPending}
        style={CTA_FILL}
        className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold disabled:opacity-60"
      >
        Proposer <ArrowRight size={16} strokeWidth={2.4} />
      </button>
    </Glass>
  );
}

/* ───────────── Onglet Terrain ───────────── */

function TerrainTab({ problem: p }: { problem: ProblemDetail }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <section className="space-y-4">
          <Heading
            title="Contraintes terrain"
            note="Ce que la solution doit supporter sur place."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact icon={Wifi} label="Connectivité" values={p.connectivityConstraint} />
            <Fact icon={Cpu} label="Matériel" values={p.hardwareConstraint} />
            <Fact icon={Languages} label="Langues" values={p.languageConstraint} />
          </div>
          <div className="pp-card space-y-1.5 p-4">
            <p className={`flex items-center gap-2 text-[11px] ${MONO} ${INK2}`}>
              <Target size={13} /> Critères de réussite
            </p>
            <p className={`text-[14.5px] leading-snug whitespace-pre-line ${INK}`}>
              {p.evaluationCriteria || "Non précisés"}
            </p>
          </div>
        </section>
        <Suggestions problem={p} />
      </div>
      <Workers problem={p} />
    </div>
  );
}

/** Dépôts liés à d'autres problèmes qui pourraient aussi répondre à celui-ci. */
function Suggestions({ problem: p }: { problem: ProblemDetail }) {
  const list = useSuggestions(p.id);
  const items = list.data ?? [];
  return (
    <section className="space-y-4">
      <Heading
        title="Dépôts à essayer"
        note="Des dépôts d’autres problèmes qui semblent proches, avec leur compatibilité terrain."
      />
      {list.isPending ? (
        <ListMessage>Chargement…</ListMessage>
      ) : items.length === 0 ? (
        <ListMessage>Aucun dépôt du hub ne semble correspondre pour l’instant.</ListMessage>
      ) : (
        <ul className="space-y-3">
          {items.map((r, i) => (
            <Reveal key={r.id} i={i}>
              <SuggestionCard repo={r} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function SuggestionCard({ repo: r }: { repo: Suggestion }) {
  const fit = (ok: boolean, Icon: LucideIcon, text: string) => (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ color: ok ? "var(--ok)" : undefined }}
    >
      {ok ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
      <span className="sr-only">{ok ? "Compatible : " : "Non compatible : "}</span>
      <Icon size={13} aria-hidden />
      {text}
    </span>
  );
  return (
    <Link to={`/${r.owner}/${r.name}`} className="pp-card block space-y-2 p-4">
      <p className="truncate font-[family-name:var(--font-mono)] text-[14.5px]">
        <span className={INK3}>{r.owner}/</span>
        <span className={INK}>{r.name}</span>
      </p>
      {r.description && <p className={`text-[13.5px] leading-snug ${INK2}`}>{r.description}</p>}
      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] ${INK3}`}>
        {r.fits.offline !== null &&
          fit(
            r.fits.offline,
            WifiOff,
            r.fits.offline ? "Fonctionne hors ligne" : "Demande une connexion",
          )}
        {r.fits.languages !== null &&
          fit(
            r.fits.languages.length > 0,
            Languages,
            r.fits.languages.length ? r.fits.languages.join(", ") : "Langue demandée non déclarée",
          )}
      </div>
    </Link>
  );
}

/**
 * Qui travaille sur ce problème en ce moment. Se déclarer évite que deux équipes partent en
 * parallèle sans le savoir.
 */
function Workers({ problem: p }: { problem: ProblemDetail }) {
  const { data: session } = useSession();
  const me = session?.user.username ?? null;
  const work = useWork(p.id);
  const mine = p.workers.find((w) => w.username === me);
  const [editing, setEditing] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const note = String(new FormData(e.currentTarget).get("note") ?? "");
    work.mutate(note, { onSuccess: () => setEditing(false) });
  }
  return (
    <section className="space-y-4">
      <Heading
        title={`En cours (${p.workers.length})`}
        note="Qui s’est déclaré sur ce problème, pour éviter le travail en double."
      />
      <Glass className="space-y-3 rounded-[24px] p-4">
        {p.workers.length === 0 ? (
          <p className={`px-1 py-2 text-[14px] ${INK3}`}>
            Personne ne s’est encore déclaré sur ce problème.
          </p>
        ) : (
          <ul className="space-y-2">
            {p.workers.map((w) => (
              <li key={w.username} className="flex gap-3 rounded-[16px] p-2">
                <Tile c={PAL.sky} size={34} code={(w.name || w.username || "?").charAt(0)} />
                <div className="min-w-0">
                  <Link
                    to={`/u/${w.username}`}
                    className={`text-[14.5px] font-semibold hover:underline ${INK}`}
                  >
                    {w.username}
                  </Link>
                  {w.note && <p className={`text-[13.5px] leading-snug ${INK2}`}>{w.note}</p>}
                  <p className={`text-[12px] ${INK3}`}>depuis le {formatDate(w.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {session && p.status !== "closed" && (
          <div className="border-t border-[color:var(--hair)] pt-3">
            {editing ? (
              <form onSubmit={submit} className="space-y-2.5">
                <input
                  name="note"
                  defaultValue={mine?.note}
                  maxLength={500}
                  placeholder="Votre piste en une phrase (facultatif)"
                  aria-label="Votre piste"
                  className={`${FIELD} h-11 placeholder:text-[color:var(--ink3)] ${INK}`}
                />
                <div className="flex gap-2">
                  <button
                    disabled={work.isPending}
                    style={CTA_FILL}
                    className="inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold"
                  >
                    {mine ? "Mettre à jour" : "Je m’y mets"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className={`h-10 rounded-full px-4 text-[13.5px] font-semibold ${INK2}`}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : mine ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className={`pp-field h-10 rounded-full px-4 text-[13.5px] font-semibold ${INK}`}
                >
                  Modifier ma note
                </button>
                <button
                  type="button"
                  disabled={work.isPending}
                  onClick={() => work.mutate(null)}
                  className={`h-10 rounded-full px-4 text-[13.5px] font-semibold ${INK2}`}
                >
                  Je me retire
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent-soft)] text-[14.5px] font-semibold ${ACCENT_TEXT}`}
              >
                <Hammer size={15} /> Je travaille dessus
              </button>
            )}
            <ErrorText error={work.error} />
          </div>
        )}
      </Glass>
    </section>
  );
}
