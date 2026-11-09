/**
 * Page d'un dépôt, charte « Liquid Glass » : bandeau (type, nom, statut, problème, licence,
 * likes), puis une barre d'onglets collante comme sur la fiche d'un problème :
 *  - README.md : le README (ou le modèle généré depuis la fiche s'il est vide) et la fiche ;
 *  - Fichiers : navigation par dossiers dans une version, historique des versions ;
 *  - Communauté : messages et pull requests dans un même fil ;
 *  - Paramètres : propriétaire seulement.
 * Un dépôt en construction n'ouvre que le README hors de son équipe (`permissions.full`).
 */
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  Construction,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  GitPullRequest,
  Heart,
  History,
  Languages,
  Lock,
  MapPin,
  MessageSquare,
  Scale,
  Settings,
  Star,
  Target,
  Terminal,
  Trash2,
  TriangleAlert,
  Upload,
  UserPlus,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useSession } from "../../api/auth";
import { fileUrl } from "../../api/client";
import {
  useAddCollaborator,
  useCollaborators,
  useCreatePull,
  useDeleteFile,
  useDiscussions,
  useLicenses,
  useLike,
  useProblems,
  usePulls,
  useRemoveCollaborator,
  useRepo,
  useUpdateRepo,
  useUploadFile,
  useVersions,
} from "../../api/hooks";
import type { License, RepoDetail, RepoFile } from "../../api/types";
import { FilePreview, canPreview } from "../../components/FilePreview";
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
import { formatDate } from "../../components/glass/problemBits";
import {
  Expandable,
  FIELD,
  GlassButton,
  Heading,
  Labelled,
  MessageCard,
  MessageForm,
  Reveal,
  TabbedContent,
  useTab,
} from "../../components/glass/sections";
import { Markdown } from "../../components/Markdown";
import { CopyButton, ErrorText, formatSize } from "../../components/ui";
import { PAL } from "../../content/problem-form";
import { readmeTemplate } from "../../content/readme-template";
import { typeOptions } from "../../content/repo-form";
import {
  countries,
  problemStatusLabels,
  pullStatusLabels,
  repoStageLabels,
  repoTypeLabels,
} from "../../content/site";
import { usePageTitle } from "../../hooks/usePageTitle";

const TAB_IDS = ["readme", "fichiers", "communaute", "parametres"] as const;
type TabId = (typeof TAB_IDS)[number];
/** Anciennes adresses (`?tab=versions`, `?tab=pulls`…) vers les nouveaux onglets. */
const LEGACY: Record<string, TabId> = {
  fiche: "readme",
  versions: "fichiers",
  pulls: "communaute",
  discussion: "communaute",
};
const TYPE_BY_ID = Object.fromEntries(typeOptions.map((t) => [t.id, t]));
const AMBER = PAL.amber[0];
const STAGE_ICON = { under_construction: Construction, solution: BadgeCheck } as const;

/** Modèle de README construit depuis la fiche d'un dépôt enregistré. */
export function templateFor(r: RepoDetail) {
  return readmeTemplate({
    name: r.name,
    description: r.description,
    type: r.type,
    problem: r.problem,
    task: r.task,
    languages: r.languages,
    worksOffline: r.worksOffline,
    targetHardware: r.targetHardware,
    license: r.license.name,
    provenance: [r.provenanceCommunity, r.provenanceCountry].filter(Boolean).join(", ") || null,
  });
}

export function RepoView() {
  const { owner = "", name = "" } = useParams();
  const [params] = useSearchParams();
  const version = params.get("version") ? Number(params.get("version")) : undefined;
  const repo = useRepo({ owner, name }, version);
  usePageTitle(`${owner}/${name}`);
  const { tab, setTab, anchor } = useTab(TAB_IDS, (v) => LEGACY[v] ?? null);
  const r = repo.data;

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      {!r ? (
        <ListMessage>
          {repo.isError ? "Ce dépôt est introuvable." : "Chargement du dépôt…"}
        </ListMessage>
      ) : (
        <Loaded repo={r} tab={tab} setTab={setTab} anchor={anchor} version={version} />
      )}
    </PageShell>
  );
}

function Loaded({
  repo: r,
  tab,
  setTab,
  anchor,
  version,
}: {
  repo: RepoDetail;
  tab: TabId;
  setTab: (t: TabId, extra?: Record<string, string | null>) => void;
  anchor: React.RefObject<HTMLDivElement>;
  version?: number;
}) {
  const full = r.permissions.full;
  const discussions = useDiscussions(`/repos/${r.owner}/${r.name}`);
  const pulls = usePulls(r);
  // Hors de l'équipe, un dépôt en construction n'a que son README.
  const shown: TabId = !full && tab !== "readme" ? "readme" : tab;
  const tabs = [
    { id: "readme" as const, label: "README.md", icon: BookOpen },
    ...(full
      ? [
          { id: "fichiers" as const, label: "Fichiers", icon: Folder, count: r.files.length },
          {
            id: "communaute" as const,
            label: "Communauté",
            icon: Users,
            count:
              discussions.data && pulls.data
                ? discussions.data.length + pulls.data.length
                : undefined,
          },
        ]
      : []),
    ...(r.permissions.owner
      ? [{ id: "parametres" as const, label: "Paramètres", icon: Settings }]
      : []),
  ];
  return (
    <>
      <Hero repo={r} />
      <Notice repo={r} onRelink={() => setTab("parametres")} />
      <TabbedContent
        label="Sections du dépôt"
        tabs={tabs}
        tab={shown}
        onTab={setTab}
        anchor={anchor}
      >
        {shown === "readme" && <ReadmeTab repo={r} onEdit={() => setTab("parametres")} />}
        {shown === "fichiers" && <FilesTab repo={r} version={version} />}
        {shown === "communaute" && <CommunityTab repo={r} />}
        {shown === "parametres" && r.permissions.owner && <SettingsTab repo={r} />}
      </TabbedContent>
    </>
  );
}

/* ───────────── Bandeau ───────────── */

function Hero({ repo: r }: { repo: RepoDetail }) {
  const { data: session } = useSession();
  const like = useLike(r);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.35]);
  const t = TYPE_BY_ID[r.type];
  const StageIcon = STAGE_ICON[r.stage];
  const ownerHref = r.ownerKind === "org" ? `/orgs/${r.owner}` : `/u/${r.owner}`;
  const restricted = r.license.restrictions.length > 0;

  return (
    <motion.section
      ref={ref}
      style={{ opacity: fade }}
      aria-labelledby="rd-title"
      className="lg lg-stage relative grid gap-6 overflow-hidden rounded-[30px] p-5 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center"
    >
      <motion.div
        style={{ y }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SOFT_SPRING}
        className="min-w-0 space-y-5"
      >
        <div className="flex items-center gap-3.5">
          {t && <Tile c={t.c} size={52} icon={t.icon} />}
          <div className="min-w-0">
            <Link
              to={ownerHref}
              className={`font-[family-name:var(--font-mono)] text-[15px] hover:underline ${INK3}`}
            >
              {r.owner} /
            </Link>
            <h1
              id="rd-title"
              className={`text-[clamp(36px,4.2vw,64px)] leading-[.95] break-words ${DISPLAY} ${INK}`}
            >
              {r.name}
            </h1>
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] ${INK2}`}>
          <span>{repoTypeLabels[r.type]}</span>
          <span className="inline-flex items-center gap-1.5">
            <StageIcon
              size={16}
              style={{ color: r.stage === "solution" ? "var(--ok)" : AMBER }}
              aria-hidden
            />
            {repoStageLabels[r.stage]}
          </span>
          {r.visibility === "private" && <Meta icon={Lock}>Privé</Meta>}
          {r.featured && (
            <span className={`inline-flex items-center gap-1.5 ${ACCENT_TEXT}`}>
              <Star size={15} /> Mise en avant par le problème
            </span>
          )}
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] font-medium"
            style={
              restricted
                ? { color: AMBER, background: hexA(AMBER, 0.12) }
                : { background: "var(--chip)" }
            }
          >
            {r.license.name}
          </span>
          {r.version && (
            <span className={INK3}>
              Version {r.version.number}, {formatDate(r.version.createdAt)}
            </span>
          )}
        </div>
        {r.description && (
          <p className={`max-w-[62ch] text-[16px] leading-relaxed ${INK2}`}>{r.description}</p>
        )}
        <div className="flex flex-wrap gap-2.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={SPRING}
            disabled={!session || like.isPending}
            onClick={() => like.mutate(!r.liked)}
            aria-pressed={r.liked}
            title={session ? "J’aime" : "Connectez-vous pour aimer"}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold ${r.liked ? `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}` : `pp-field ${INK}`}`}
          >
            <Heart size={16} fill={r.liked ? "currentColor" : "none"} /> {r.likes}
          </motion.button>
          <CopyLink />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SOFT_SPRING, delay: 0.08 }}
        className="space-y-3"
      >
        <Link to={`/problemes/${r.problem.id}`} className="pp-card flex items-start gap-3.5 p-4">
          <Tile c={r.problem.status === "closed" ? PAL.amber : PAL.lav} size={40} icon={Target} />
          <span className="min-w-0 flex-1">
            <span className={`block text-[11px] ${MONO} ${INK3}`}>Répond au problème</span>
            <span className={`mt-1 block text-[15.5px] leading-snug font-semibold ${INK}`}>
              {r.problem.title}
            </span>
            <span className={`mt-1 block text-[12.5px] ${INK3}`}>
              {problemStatusLabels[r.problem.status]}
            </span>
          </span>
          <ArrowRight size={16} className={`mt-1 shrink-0 ${INK3}`} />
        </Link>
        {r.type === "dataset" && (
          <p className={`flex items-center gap-2 px-1 text-[13.5px] ${INK2}`}>
            <MapPin size={15} className={INK3} />
            Provenance :{" "}
            {[r.provenanceCommunity, r.provenanceCountry].filter(Boolean).join(", ") ||
              "non renseignée"}
          </p>
        )}
      </motion.div>
    </motion.section>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        })
      }
      className={`pp-field inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold ${INK2}`}
    >
      {copied ? "Lien copié" : "Copier le lien"}
    </button>
  );
}

/**
 * Problème fermé : le propriétaire est invité à lier son dépôt à un autre problème ou à en publier
 * un nouveau. Dépôt en construction vu de l'extérieur : seul le README est visible.
 */
function Notice({ repo: r, onRelink }: { repo: RepoDetail; onRelink: () => void }) {
  if (r.problem.status === "closed" && r.permissions.owner) {
    return (
      <div
        role="note"
        className="flex flex-wrap items-start gap-3 rounded-[22px] px-5 py-4 text-[14px] leading-snug"
        style={{ color: AMBER, background: hexA(AMBER, 0.1) }}
      >
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">Le problème auquel ce dépôt répond est fermé.</p>
          <p>
            Son auteur n’en voit plus l’intérêt : votre dépôt passe derrière les autres dans le hub
            et la recherche. Si le sujet reste d’actualité pour vous, liez-le à un autre problème ou
            publiez-en un nouveau qui explique pourquoi le travail continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlassButton type="button" onClick={onRelink}>
            Lier à un autre problème
          </GlassButton>
          <Link
            to="/problemes/nouveau"
            style={CTA_FILL}
            className="inline-flex h-11 items-center rounded-full px-5 text-[14.5px] font-semibold"
          >
            Publier un nouveau problème
          </Link>
        </div>
      </div>
    );
  }
  if (!r.permissions.full) {
    return (
      <p
        className={`flex items-start gap-2.5 rounded-[22px] bg-[color:var(--chip)] px-5 py-4 text-[14px] leading-snug ${INK2}`}
      >
        <Construction size={18} className="mt-0.5 shrink-0" style={{ color: AMBER }} />
        Dépôt en construction : seul son README est visible. Fichiers, versions et communauté
        s’ouvriront quand son auteur le déclarera solution.
      </p>
    );
  }
  return null;
}

/* ───────────── README.md ───────────── */

function ReadmeTab({ repo: r, onEdit }: { repo: RepoDetail; onEdit: () => void }) {
  const generated = !r.readme.trim();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Glass className="min-w-0 overflow-hidden rounded-[26px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--hair)] px-5 py-3">
          <BookOpen size={16} className={INK2} />
          <span className={`font-[family-name:var(--font-mono)] text-[14px] ${INK}`}>
            README.md
          </span>
          {generated && (
            <span className={`text-[12.5px] ${INK3}`}>Modèle généré à partir de la fiche</span>
          )}
          {r.permissions.owner && (
            <button
              type="button"
              onClick={onEdit}
              className={`ml-auto text-[13px] font-semibold hover:underline ${ACCENT_TEXT}`}
            >
              {generated ? "Compléter le README" : "Modifier"}
            </button>
          )}
        </div>
        <div className="px-5 py-6 sm:px-8">
          <Markdown glass>{generated ? templateFor(r) : r.readme}</Markdown>
        </div>
      </Glass>
      <aside className="space-y-3 lg:sticky lg:top-[156px] lg:self-start">
        <Fact icon={Target} label="Tâche" values={[r.task]} />
        <Fact icon={Languages} label="Langues" values={r.languages} />
        <Fact
          icon={WifiOff}
          label="Hors ligne"
          values={r.worksOffline ? ["Fonctionne sans connexion"] : []}
          empty="Connexion nécessaire"
        />
        <Fact icon={Cpu} label="Matériel" values={[r.targetHardware]} />
        <LicenseCard license={r.license} />
        {r.limitations && (
          <div className="pp-card space-y-1.5 p-4">
            <p className={`text-[11px] ${MONO} ${INK2}`}>Limites connues</p>
            <p className={`text-[14px] leading-snug whitespace-pre-line ${INK}`}>{r.limitations}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function LicenseCard({ license }: { license: License }) {
  return (
    <div className="pp-card space-y-2 p-4">
      <p className={`flex items-center gap-2 text-[11px] ${MONO} ${INK2}`}>
        <Scale size={13} /> Licence
      </p>
      <p className={`text-[15.5px] font-semibold ${INK}`}>{license.name}</p>
      {license.summary && <p className={`text-[13.5px] leading-snug ${INK2}`}>{license.summary}</p>}
      {/* Avertissement de souveraineté : seulement si la licence restreint l'usage. */}
      {license.restrictions.length > 0 && (
        <ul className="space-y-1 pt-0.5" style={{ color: AMBER }}>
          {license.restrictions.map((x) => (
            <li key={x} className="flex items-center gap-1.5 text-[13px] font-medium">
              <TriangleAlert size={13} className="shrink-0" /> {x}
            </li>
          ))}
        </ul>
      )}
      {license.url && (
        <a
          href={license.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-block text-[13px] underline ${ACCENT_TEXT}`}
        >
          Texte officiel
        </a>
      )}
    </div>
  );
}

/* ───────────── Fichiers et versions ───────────── */

function FilesTab({ repo: r, version }: { repo: RepoDetail; version?: number }) {
  const [params, setParams] = useSearchParams();
  const versions = useVersions(r);
  const dir = params.get("dossier") ?? "";
  const history = params.get("vue") === "historique";
  const latest = version === undefined;
  const current = versions.data?.find((v) => v.number === r.version?.number);
  const update = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) n.delete(k);
          else n.set(k, v);
        }
        return n;
      },
      { replace: true },
    );

  return (
    <div className="space-y-5">
      {/* Barre de version, comme la dernière modification sur GitHub ou Hugging Face. */}
      <Glass className="flex flex-wrap items-center gap-3 rounded-[22px] px-3 py-2.5">
        <label className="pp-field relative flex h-10 items-center rounded-full">
          <span className="sr-only">Version</span>
          <select
            value={version ?? ""}
            onChange={(e) => update({ version: e.target.value || null, vue: null })}
            className={`h-full cursor-pointer appearance-none rounded-full bg-transparent pr-9 pl-4 text-[13.5px] font-semibold outline-none ${INK}`}
          >
            <option value="" className="bg-[#0D121F]">
              Dernière version
            </option>
            {versions.data?.map((v) => (
              <option key={v.number} value={v.number} className="bg-[#0D121F]">
                v{v.number}
              </option>
            ))}
          </select>
          <ChevronRight
            size={14}
            className={`pointer-events-none absolute right-3 rotate-90 ${INK3}`}
          />
        </label>
        <p className={`min-w-0 flex-1 truncate text-[13.5px] ${INK2}`}>
          {r.version ? (
            <>
              <span className={`font-semibold ${INK}`}>{current?.author ?? r.owner}</span>
              {" · "}
              {r.version.message || `Version ${r.version.number}`}
              {" · "}
              {formatDate(r.version.createdAt)}
            </>
          ) : (
            "Aucune version pour l’instant."
          )}
        </p>
        <button
          type="button"
          onClick={() => update({ vue: history ? null : "historique" })}
          aria-pressed={history}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold ${history ? `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}` : `pp-field ${INK}`}`}
        >
          <History size={15} /> Historique
          {versions.data && <span className={MONO}>{versions.data.length}</span>}
        </button>
      </Glass>

      {history ? (
        <VersionList
          repo={r}
          onPick={(n) => update({ version: String(n), vue: null, dossier: null })}
        />
      ) : (
        <>
          <Browser
            repo={r}
            version={version}
            dir={dir}
            onDir={(d) => update({ dossier: d || null })}
          />
          {r.permissions.write && latest && <UploadPanel repo={r} dir={dir} />}
          {!latest && (
            <button
              type="button"
              onClick={() => update({ version: null })}
              className={`px-1 text-[13.5px] font-semibold underline ${ACCENT_TEXT}`}
            >
              Revenir à la dernière version
            </button>
          )}
          {r.files.length > 0 && <Usage repo={r} version={version} />}
        </>
      )}
    </div>
  );
}

/** Contenu d'un dossier : sous-dossiers d'abord, puis fichiers. */
function entriesOf(files: RepoFile[], dir: string) {
  const folders = new Set<string>();
  const here: RepoFile[] = [];
  for (const f of files) {
    if (!f.path.startsWith(dir)) continue;
    const rest = f.path.slice(dir.length);
    const slash = rest.indexOf("/");
    if (slash >= 0) folders.add(rest.slice(0, slash));
    else here.push(f);
  }
  return { folders: [...folders].sort(), files: here };
}

function Browser({
  repo: r,
  version,
  dir,
  onDir,
}: {
  repo: RepoDetail;
  version?: number;
  dir: string;
  onDir: (d: string) => void;
}) {
  const remove = useDeleteFile(r);
  const [shown, setShown] = useState<string | null>(null);
  const { folders, files } = useMemo(() => entriesOf(r.files, dir), [r.files, dir]);
  const crumbs = dir.split("/").filter(Boolean);
  const canDelete = r.permissions.write && version === undefined;

  return (
    <Glass className="overflow-hidden rounded-[24px]">
      <nav
        aria-label="Dossier"
        className={`flex flex-wrap items-center gap-1 border-b border-[color:var(--hair)] px-4 py-3 font-[family-name:var(--font-mono)] text-[14px] ${INK2}`}
      >
        <button type="button" onClick={() => onDir("")} className={`hover:underline ${INK}`}>
          {r.name}
        </button>
        {crumbs.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <ChevronRight size={14} className={INK3} />
            <button
              type="button"
              onClick={() => onDir(`${crumbs.slice(0, i + 1).join("/")}/`)}
              className={`hover:underline ${i === crumbs.length - 1 ? INK : ""}`}
            >
              {c}
            </button>
          </span>
        ))}
      </nav>
      {folders.length + files.length === 0 ? (
        <p className={`px-5 py-10 text-center text-[14.5px] ${INK3}`}>
          {r.files.length ? "Ce dossier est vide." : "Aucun fichier dans cette version."}
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--hair)]">
          {dir && (
            <li>
              <button
                type="button"
                onClick={() =>
                  onDir(`${crumbs.slice(0, -1).join("/")}${crumbs.length > 1 ? "/" : ""}`)
                }
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-[color:var(--accent-soft)] ${INK2}`}
              >
                <FolderOpen size={16} className={INK3} /> ..
              </button>
            </li>
          )}
          {folders.map((f) => (
            <li key={`d-${f}`}>
              <button
                type="button"
                onClick={() => onDir(`${dir}${f}/`)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-[color:var(--accent-soft)] ${INK}`}
              >
                <Folder size={16} style={{ color: PAL.sky[0] }} />
                <span className="font-[family-name:var(--font-mono)]">{f}/</span>
              </button>
            </li>
          ))}
          {files.map((f) => {
            const url = fileUrl(r.owner, r.name, f.path, version);
            const open = shown === f.path;
            return (
              <li key={f.path} className="px-4 py-2.5">
                <div className="flex items-center gap-3 text-[14px]">
                  <FileText size={16} className={INK3} />
                  <span
                    className={`min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] ${INK}`}
                  >
                    {f.path.slice(dir.length)}
                  </span>
                  <span
                    className={`hidden text-[12px] sm:inline ${MONO} ${INK3}`}
                    title={`SHA-256 ${f.sha256}`}
                  >
                    {f.sha256.slice(0, 8)}
                  </span>
                  <span className={`w-16 text-right text-[13px] ${INK3}`}>
                    {formatSize(f.size)}
                  </span>
                  {canPreview(f) && (
                    <IconButton
                      label={open ? "Masquer l’aperçu" : "Aperçu"}
                      onClick={() => setShown(open ? null : f.path)}
                    >
                      {open ? <EyeOff size={15} /> : <Eye size={15} />}
                    </IconButton>
                  )}
                  <DownloadButton url={url} license={r.license} filename={f.path} />
                  {canDelete && (
                    <IconButton
                      label="Supprimer"
                      danger
                      onClick={() =>
                        window.confirm(`Supprimer ${f.path} ?`) && remove.mutate(f.path)
                      }
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  )}
                </div>
                {open && (
                  <div className="mt-2.5 overflow-hidden rounded-[14px] bg-white">
                    <FilePreview url={url} file={f} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-4">
        <ErrorText error={remove.error} />
      </div>
    </Glass>
  );
}

function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-full hover:bg-[color:var(--accent-soft)] ${danger ? "text-[color:var(--danger)]" : INK2}`}
    >
      {children}
    </button>
  );
}

/**
 * Téléchargement. Sur une ressource restreinte, une fenêtre rappelle d'abord ce que la licence
 * interdit ; sans restriction, le lien part directement.
 */
function DownloadButton({
  url,
  license,
  filename,
}: {
  url: string;
  license: License;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  if (!license.restrictions.length) {
    return (
      <a
        href={url}
        title={`Télécharger ${filename}`}
        aria-label={`Télécharger ${filename}`}
        className={`grid size-8 place-items-center rounded-full hover:bg-[color:var(--accent-soft)] ${INK2}`}
      >
        <Download size={15} />
      </a>
    );
  }
  return (
    <>
      <IconButton label={`Télécharger ${filename}`} onClick={() => setOpen(true)}>
        <Download size={15} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              aria-hidden
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-md"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Télécharger ${filename}`}
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="lg lg-strong relative w-full max-w-[460px] space-y-4 rounded-[26px] p-6"
            >
              <p className={`text-[17px] font-semibold ${INK}`}>Licence {license.name}</p>
              <ul className="space-y-1.5" style={{ color: AMBER }}>
                {license.restrictions.map((x) => (
                  <li key={x} className="flex items-center gap-2 text-[14.5px] font-medium">
                    <TriangleAlert size={15} className="shrink-0" /> {x}
                  </li>
                ))}
              </ul>
              <p className={`text-[14px] leading-snug ${INK2}`}>
                En téléchargeant {filename}, vous vous engagez à respecter ces conditions.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <GlassButton type="button" onClick={() => setOpen(false)}>
                  Annuler
                </GlassButton>
                <a
                  href={url}
                  onClick={() => setOpen(false)}
                  style={CTA_FILL}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
                >
                  <Download size={15} /> J’ai compris, télécharger
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function UploadPanel({ repo: r, dir }: { repo: RepoDetail; dir: string }) {
  const upload = useUploadFile(r);
  function submit(e: FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.name) return;
    const path = String(data.get("path") ?? "").trim() || `${dir}${file.name}`;
    upload.mutate(
      { path, file, message: String(data.get("message") ?? "") },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
      },
    );
  }
  return (
    <Expandable label="Ajouter un fichier (nouvelle version)" icon={Upload}>
      {(close) => (
        <Glass
          as="form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => submit(e, close)}
          className="space-y-4 rounded-[24px] p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className={`text-[17px] font-semibold ${INK}`}>Ajouter un fichier</h3>
            <IconButton label="Fermer" onClick={close}>
              <X size={16} />
            </IconButton>
          </div>
          <Labelled label="Fichier">
            <input
              type="file"
              name="file"
              required
              className={`block w-full text-[14px] file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--accent-soft)] file:px-4 file:py-2 file:text-[13.5px] file:font-semibold file:text-[color:var(--accent-text)] ${INK2}`}
            />
          </Labelled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Chemin dans le dépôt" hint={`Par défaut : ${dir || ""}nom du fichier`}>
              <input
                name="path"
                placeholder={`${dir}poids/modele.onnx`}
                className={`${FIELD} h-12 ${INK}`}
              />
            </Labelled>
            <Labelled label="Message de version">
              <input
                name="message"
                placeholder="Ajout des poids quantifiés"
                className={`${FIELD} h-12 ${INK}`}
              />
            </Labelled>
          </div>
          <ErrorText error={upload.error} />
          <GlassButton primary disabled={upload.isPending}>
            <Upload size={15} /> {upload.isPending ? "Envoi…" : "Envoyer"}
          </GlassButton>
        </Glass>
      )}
    </Expandable>
  );
}

function VersionList({ repo, onPick }: { repo: RepoDetail; onPick: (n: number) => void }) {
  const versions = useVersions(repo);
  const items = versions.data ?? [];
  if (versions.isPending) return <ListMessage>Chargement…</ListMessage>;
  if (!items.length) return <ListMessage>Aucune version.</ListMessage>;
  return (
    <Glass className="overflow-hidden rounded-[24px]">
      <ul className="divide-y divide-[color:var(--hair)]">
        {items.map((v) => (
          <li key={v.number}>
            <button
              type="button"
              onClick={() => onPick(v.number)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-[color:var(--accent-soft)]"
            >
              <span
                className={`grid h-8 min-w-12 place-items-center rounded-full bg-[color:var(--chip)] px-2 text-[12.5px] ${MONO} ${INK}`}
              >
                v{v.number}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[14.5px] ${INK}`}>{v.message}</span>
              <span className={`shrink-0 text-[12.5px] ${INK3}`}>
                {v.author} · {formatDate(v.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Glass>
  );
}

/** Commandes prêtes à copier : téléchargement de chaque fichier et vérification d'empreinte. */
function Usage({ repo: r, version }: { repo: RepoDetail; version?: number }) {
  const origin = window.location.origin;
  const lines = [
    `mkdir -p ${r.name} && cd ${r.name}`,
    ...r.files.map(
      (f) =>
        `curl -fL --create-dirs -o "${f.path}" "${origin}${fileUrl(r.owner, r.name, f.path, version)}"`,
    ),
    "",
    "# Vérification des empreintes SHA-256",
    `cat > SHA256SUMS <<'EOF'`,
    ...r.files.map((f) => `${f.sha256}  ${f.path}`),
    "EOF",
    "sha256sum -c SHA256SUMS",
  ];
  const script = lines.join("\n");
  return (
    <Glass className="overflow-hidden rounded-[24px]">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--hair)] px-4 py-2.5">
        <p className={`flex items-center gap-2 text-[14px] font-semibold ${INK}`}>
          <Terminal size={15} /> Utiliser ce dépôt
        </p>
        <CopyButton text={script} />
      </div>
      <pre
        className={`overflow-x-auto bg-[#0A0F1D] p-4 font-[family-name:var(--font-mono)] text-[12.5px] leading-relaxed ${INK2}`}
      >
        {script}
      </pre>
      {r.license.restrictions.length > 0 && (
        <p className="px-4 py-2.5 text-[13px]" style={{ color: AMBER }}>
          Licence {r.license.name} : {r.license.restrictions.join(", ").toLowerCase()}.
        </p>
      )}
    </Glass>
  );
}

/* ───────────── Communauté : messages et pull requests ───────────── */

type Filter = "all" | "messages" | "pulls";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "messages", label: "Messages" },
  { id: "pulls", label: "Pull requests" },
];

function CommunityTab({ repo: r }: { repo: RepoDetail }) {
  const { data: session } = useSession();
  const path = `/repos/${r.owner}/${r.name}`;
  const discussions = useDiscussions(path);
  const pulls = usePulls(r);
  const [filter, setFilter] = useState<Filter>("all");
  const [composer, setComposer] = useState<"message" | "pull" | null>(null);

  // Un seul fil, du plus récent au plus ancien, comme l'onglet Community de Hugging Face.
  const feed = useMemo(() => {
    const messages = (discussions.data ?? []).map((d) => ({
      kind: "message" as const,
      at: d.createdAt,
      d,
    }));
    const prs = (pulls.data ?? []).map((p) => ({ kind: "pull" as const, at: p.createdAt, p }));
    return [...messages, ...prs]
      .filter((x) => filter === "all" || (filter === "messages") === (x.kind === "message"))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [discussions.data, pulls.data, filter]);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Heading
        title="Communauté"
        note="Questions, retours de terrain et propositions de fichiers. Le propriétaire ou un collaborateur fusionne les pull requests."
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          role="radiogroup"
          aria-label="Filtrer"
          className="inline-flex rounded-full bg-[color:var(--chip)] p-1"
        >
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFilter(f.id)}
                className={`relative h-9 rounded-full px-3.5 text-[13.5px] font-semibold ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
              >
                {on && (
                  <motion.span
                    layoutId="rd-community-lens"
                    className="pp-lens absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  />
                )}
                <span className="relative">{f.label}</span>
              </button>
            );
          })}
        </div>
        {session && (
          <div className="ml-auto flex flex-wrap gap-2">
            <GlassButton
              type="button"
              onClick={() => setComposer(composer === "message" ? null : "message")}
            >
              <MessageSquare size={15} /> Nouveau message
            </GlassButton>
            <GlassButton
              primary
              type="button"
              onClick={() => setComposer(composer === "pull" ? null : "pull")}
            >
              <GitPullRequest size={15} /> Proposer des fichiers
            </GlassButton>
          </div>
        )}
      </div>

      {composer === "message" && <MessageForm path={path} onSent={() => setComposer(null)} />}
      {composer === "pull" && <PullForm repo={r} onClose={() => setComposer(null)} />}

      {discussions.isPending || pulls.isPending ? (
        <ListMessage>Chargement…</ListMessage>
      ) : feed.length === 0 ? (
        <ListMessage>
          {filter === "pulls"
            ? "Aucune pull request pour l’instant."
            : "Rien pour l’instant. Posez une question ou proposez des fichiers."}
        </ListMessage>
      ) : (
        <ul className="space-y-3">
          {feed.map((x, i) => (
            <Reveal key={x.kind === "message" ? x.d.id : `pr-${x.p.number}`} i={i}>
              {x.kind === "message" ? (
                <MessageCard message={x.d} />
              ) : (
                <Link
                  to={`/${r.owner}/${r.name}/pulls/${x.p.number}`}
                  className="pp-card flex items-start gap-3.5 p-4"
                >
                  <Tile
                    c={
                      x.p.status === "merged"
                        ? PAL.mint
                        : x.p.status === "closed"
                          ? PAL.slate
                          : PAL.lav
                    }
                    size={36}
                    icon={GitPullRequest}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[12.5px] ${INK3}`}>
                      Pull request #{x.p.number} · {x.p.author} · {formatDate(x.p.createdAt)}
                    </span>
                    <span className={`mt-1 block text-[15px] font-semibold ${INK}`}>
                      {x.p.title}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[12.5px] ${INK2}`}>
                    {pullStatusLabels[x.p.status]}
                  </span>
                </Link>
              )}
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}

function PullForm({ repo, onClose }: { repo: RepoDetail; onClose: () => void }) {
  const create = useCreatePull(repo);
  const navigate = useNavigate();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    create.mutate(
      { title: v.title, description: v.description },
      { onSuccess: (p) => navigate(`/${repo.owner}/${repo.name}/pulls/${p.number}`) },
    );
  }
  return (
    <Glass as="form" onSubmit={submit} className="space-y-4 rounded-[24px] p-5">
      <div className="flex items-center justify-between">
        <h3 className={`text-[17px] font-semibold ${INK}`}>Proposer des fichiers</h3>
        <IconButton label="Fermer" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <p className={`text-[13.5px] leading-snug ${INK3}`}>
        Décrivez votre proposition ; vous ajouterez les fichiers sur la page de la pull request.
      </p>
      <Labelled label="Titre">
        <input name="title" required maxLength={200} className={`${FIELD} h-12 ${INK}`} />
      </Labelled>
      <Labelled label="Description">
        <textarea name="description" rows={3} className={`${FIELD} resize-y py-3 ${INK}`} />
      </Labelled>
      <ErrorText error={create.error} />
      <GlassButton primary disabled={create.isPending}>
        Créer, puis ajouter les fichiers <ArrowRight size={16} />
      </GlassButton>
    </Glass>
  );
}

/* ───────────── Paramètres ───────────── */

function SettingsTab({ repo: r }: { repo: RepoDetail }) {
  const update = useUpdateRepo(r);
  const licenses = useLicenses();
  const problems = useProblems({ status: "" });
  const [saved, setSaved] = useState(false);
  const [problemId, setProblemId] = useState(r.problemId);
  const [readme, setReadme] = useState(r.readme || templateFor(r));
  const chosen = problems.data?.find((p) => p.id === problemId);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setSaved(false);
    update.mutate(
      {
        problemId: v.problemId,
        stage: v.stage === "solution" ? "solution" : "under_construction",
        visibility: v.visibility === "private" ? "private" : "public",
        licenseId: v.licenseId,
        description: v.description,
        readme,
        limitations: v.limitations,
        provenanceCommunity: v.provenanceCommunity || null,
        provenanceCountry: v.provenanceCountry || null,
        task: v.task ?? "",
        languages: (v.languages ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        worksOffline: v.worksOffline === "on",
        targetHardware: v.targetHardware ?? "",
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  const select = (
    name: string,
    value: string,
    children: ReactNode,
    onChange?: (v: string) => void,
  ) => (
    <select
      name={name}
      {...(onChange
        ? { value, onChange: (e) => onChange(e.target.value) }
        : { defaultValue: value })}
      className={`${FIELD} h-12 cursor-pointer ${INK}`}
    >
      {children}
    </select>
  );
  const opt = (value: string, label: string) => (
    <option key={value} value={value} className="bg-[#0D121F]">
      {label}
    </option>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Glass as="form" onSubmit={submit} className="min-w-0 space-y-6 rounded-[26px] p-5 sm:p-7">
        <Heading title="Paramètres" />
        <Labelled
          label="Problème auquel le dépôt répond"
          hint="Changer de problème retire le dépôt de la mise en avant de l’ancien."
        >
          {select(
            "problemId",
            problemId,
            <>
              {!problems.data?.some((p) => p.id === r.problemId) &&
                opt(r.problemId, r.problem.title)}
              {problems.data?.map((p) =>
                opt(p.id, `${p.title}${p.status === "closed" ? " (fermé)" : ""}`),
              )}
            </>,
            setProblemId,
          )}
        </Labelled>
        {chosen?.status === "closed" && (
          <p
            className="flex items-start gap-2 rounded-[16px] px-4 py-3 text-[13.5px] leading-snug"
            style={{ color: AMBER, background: hexA(AMBER, 0.1) }}
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              Ce problème est fermé : un dépôt qui y est lié passe derrière les autres.{" "}
              <Link to="/problemes/nouveau" className="font-semibold underline">
                Publier un nouveau problème
              </Link>
            </span>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Statut">
            {select(
              "stage",
              r.stage,
              <>
                {opt("under_construction", "En construction")}
                {opt("solution", "Solution")}
              </>,
            )}
          </Labelled>
          <Labelled label="Visibilité">
            {select(
              "visibility",
              r.visibility,
              <>
                {opt("public", "Public")}
                {opt("private", "Privé")}
              </>,
            )}
          </Labelled>
          <Labelled label="Licence">
            {/* Rendue une fois le catalogue chargé : sinon le menu prendrait la première licence
                et l'enregistrement changerait la licence du dépôt sans le vouloir. */}
            {licenses.data ? (
              select("licenseId", r.licenseId, <>{licenses.data.map((l) => opt(l.id, l.name))}</>)
            ) : (
              <input type="hidden" name="licenseId" value={r.licenseId} />
            )}
          </Labelled>
        </div>
        <Labelled label="Description courte">
          <input
            name="description"
            defaultValue={r.description}
            maxLength={500}
            className={`${FIELD} h-12 ${INK}`}
          />
        </Labelled>
        {r.type === "dataset" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Labelled label="Communauté d’origine">
              <input
                name="provenanceCommunity"
                defaultValue={r.provenanceCommunity ?? ""}
                className={`${FIELD} h-12 ${INK}`}
              />
            </Labelled>
            <Labelled label="Pays d’origine">
              {select(
                "provenanceCountry",
                r.provenanceCountry ?? "",
                <>
                  {opt("", "Non renseigné")}
                  {countries.map((c) => opt(c, c))}
                </>,
              )}
            </Labelled>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Tâche">
            <input
              name="task"
              defaultValue={r.task}
              maxLength={200}
              className={`${FIELD} h-12 ${INK}`}
            />
          </Labelled>
          <Labelled label="Langues" hint="Séparées par des virgules : Fon, Français">
            <input
              name="languages"
              defaultValue={r.languages.join(", ")}
              className={`${FIELD} h-12 ${INK}`}
            />
          </Labelled>
          <Labelled label="Matériel cible">
            <input
              name="targetHardware"
              defaultValue={r.targetHardware}
              maxLength={300}
              className={`${FIELD} h-12 ${INK}`}
            />
          </Labelled>
          <label
            className={`pp-field flex h-12 cursor-pointer items-center gap-3 self-end rounded-full px-4 text-[14.5px] ${INK}`}
          >
            <input
              type="checkbox"
              name="worksOffline"
              defaultChecked={r.worksOffline}
              className="size-4 accent-[color:var(--accent)]"
            />
            <WifiOff size={15} className={INK2} /> Fonctionne sans connexion
          </label>
        </div>
        <Labelled label="README.md" hint="Markdown : titres, listes, tableaux, blocs de code.">
          <textarea
            value={readme}
            onChange={(e) => setReadme(e.target.value)}
            rows={16}
            className={`${FIELD} resize-y py-3 font-[family-name:var(--font-mono)] text-[13.5px] leading-relaxed ${INK}`}
          />
        </Labelled>
        <button
          type="button"
          onClick={() =>
            window.confirm("Remplacer le README par le modèle généré depuis la fiche ?") &&
            setReadme(templateFor(r))
          }
          className={`-mt-3 px-1 text-[13px] font-semibold underline ${ACCENT_TEXT}`}
        >
          Repartir du modèle
        </button>
        <Labelled label="Limites connues">
          <textarea
            name="limitations"
            defaultValue={r.limitations}
            rows={3}
            className={`${FIELD} resize-y py-3 ${INK}`}
          />
        </Labelled>
        <ErrorText error={update.error} />
        <div className="flex items-center gap-3">
          <GlassButton primary disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
          {saved && <span className="text-[14px] text-[color:var(--ok)]">Enregistré.</span>}
        </div>
      </Glass>
      <Collaborators repo={r} />
    </div>
  );
}

function Collaborators({ repo }: { repo: RepoDetail }) {
  const list = useCollaborators(repo);
  const add = useAddCollaborator(repo);
  const remove = useRemoveCollaborator(repo);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const username = String(new FormData(form).get("username") ?? "").trim();
    if (username) add.mutate(username, { onSuccess: () => form.reset() });
  }
  return (
    <Glass className="space-y-4 self-start rounded-[26px] p-5 lg:sticky lg:top-[156px]">
      <p className={`flex items-center gap-2 text-[16px] font-semibold ${INK}`}>
        <Users size={17} /> Collaborateurs
      </p>
      {(list.data ?? []).length === 0 ? (
        <p className={`text-[14px] ${INK3}`}>Aucun collaborateur.</p>
      ) : (
        <ul className="space-y-1.5">
          {list.data?.map((c) => (
            <li key={c.username} className="flex items-center gap-3">
              <Tile c={PAL.sky} size={30} code={(c.username ?? "?").charAt(0)} />
              <Link
                to={`/u/${c.username}`}
                className={`min-w-0 flex-1 truncate text-[14.5px] hover:underline ${INK}`}
              >
                {c.username}
              </Link>
              <IconButton
                label="Retirer"
                danger
                onClick={() => c.username && remove.mutate(c.username)}
              >
                <Trash2 size={15} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          name="username"
          required
          placeholder="Nom d’utilisateur"
          aria-label="Nom d’utilisateur"
          className={`${FIELD} h-11 min-w-0 flex-1 placeholder:text-[color:var(--ink3)] ${INK}`}
        />
        <GlassButton primary disabled={add.isPending} aria-label="Ajouter">
          <UserPlus size={15} />
        </GlassButton>
      </form>
      <ErrorText error={add.error ?? remove.error} />
      <p className={`text-[12.5px] leading-snug ${INK3}`}>
        Un collaborateur écrit dans le dépôt et fusionne les pull requests.
      </p>
    </Glass>
  );
}
