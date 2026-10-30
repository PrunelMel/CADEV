import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  Cpu,
  Download,
  Eye,
  EyeOff,
  Heart,
  Languages,
  Lock,
  Terminal,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useSession } from "../api/auth";
import { fileUrl } from "../api/client";
import {
  useAddCollaborator,
  useCollaborators,
  useCreatePull,
  useDeleteFile,
  useLicenses,
  useLike,
  usePulls,
  useRemoveCollaborator,
  useRepo,
  useUpdateRepo,
  useUploadFile,
  useVersions,
} from "../api/hooks";
import type { RepoDetail } from "../api/types";
import { Discussions } from "../components/Discussions";
import { FileUpload } from "../components/FileUpload";
import { LicenseWarning, RestrictedDownload } from "../components/LicenseWarning";
import { FilePreview, canPreview } from "../components/FilePreview";
import { TypeMark } from "../components/Lists";
import { Markdown } from "../components/Markdown";
import { TechFields, techValues } from "./Hub";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Button,
  Card as UiCard,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Query,
  Section,
  Select,
  Tag,
  Textarea,
  formValues,
  formatDate,
  formatSize,
  statusTone,
} from "../components/ui";
import { countries, pullStatusLabels, repoTypeLabels, statusLabels } from "../content/site";

const tabs = [
  ["fiche", "Fiche"],
  ["fichiers", "Fichiers"],
  ["versions", "Versions"],
  ["pulls", "Pull requests"],
  ["discussion", "Discussion"],
  ["parametres", "Paramètres"],
] as const;
type Tab = (typeof tabs)[number][0];

export function RepoDetailPage() {
  const { owner = "", name = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") ?? "fiche") as Tab;
  const version = params.get("version") ? Number(params.get("version")) : undefined;
  const repo = useRepo({ owner, name }, version);
  usePageTitle(`${owner}/${name}`);

  const go = (next: Tab, extra: Record<string, string> = {}) => setParams({ tab: next, ...extra });

  return (
    <Query query={repo}>
      {(r) => (
        <div className="space-y-5">
          <Header repo={r} />
          <LicenseWarning license={r.license} />
          <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 text-sm">
            {tabs
              .filter(([key]) => key !== "parametres" || r.permissions.owner)
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-2 pb-2 ${tab === key ? "border-accent font-medium text-ink" : "border-transparent text-neutral-600 hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
          </nav>
          {tab === "fiche" && <Card repo={r} />}
          {tab === "fichiers" && <Files repo={r} version={version} />}
          {tab === "versions" && (
            <Versions repo={r} onPick={(n) => go("fichiers", { version: String(n) })} />
          )}
          {tab === "pulls" && <Pulls repo={r} />}
          {tab === "discussion" && <Discussions path={`/repos/${r.owner}/${r.name}`} />}
          {tab === "parametres" && r.permissions.owner && <Settings repo={r} />}
        </div>
      )}
    </Query>
  );
}

function Header({ repo: r }: { repo: RepoDetail }) {
  const { data: session } = useSession();
  const like = useLike(r);
  const ownerHref = r.ownerKind === "org" ? `/orgs/${r.owner}` : `/u/${r.owner}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <TypeMark type={r.type} size={44} />
        <h1 className="font-mono text-xl">
          <Link to={ownerHref} className="text-neutral-500 hover:text-accent hover:underline">
            {r.owner}
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="font-semibold text-ink">{r.name}</span>
        </h1>
        <Tag tone="ink">{repoTypeLabels[r.type]}</Tag>
        {r.visibility === "private" && (
          <Tag>
            <Lock size={10} /> Privé
          </Tag>
        )}
        <Tag tone={r.license.restrictions.length ? "amber" : "neutral"}>{r.license.name}</Tag>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          disabled={!session || like.isPending}
          onClick={() => like.mutate(!r.liked)}
          title={session ? "J'aime" : "Connectez-vous pour aimer"}
          aria-pressed={r.liked}
        >
          <Heart
            size={13}
            fill={r.liked ? "currentColor" : "none"}
            className={r.liked ? "text-red-600" : ""}
          />{" "}
          {r.likes}
        </Button>
      </div>
      {r.description && <p className="text-ink-soft">{r.description}</p>}
      {r.type === "dataset" && (
        <p className="text-sm">
          <span className="font-medium">Provenance : </span>
          {r.provenanceCommunity || r.provenanceCountry
            ? [r.provenanceCommunity, r.provenanceCountry].filter(Boolean).join(", ")
            : "non renseignée"}
        </p>
      )}
    </div>
  );
}

function Card({ repo: r }: { repo: RepoDetail }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-8">
        {r.readme ? (
          <Markdown>{r.readme}</Markdown>
        ) : (
          <EmptyState>Pas encore de documentation.</EmptyState>
        )}
        <Section title="Limites connues">
          <p className="whitespace-pre-wrap text-sm">{r.limitations || "Non renseignées."}</p>
        </Section>
      </div>
      <aside className="space-y-4">
        <TechCard repo={r} />
        <UiCard className="space-y-1 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Licence</p>
          <p className="font-medium">{r.license.name}</p>
          <p className="text-neutral-600">{r.license.summary}</p>
          {r.license.url && (
            <a
              href={r.license.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Texte officiel
            </a>
          )}
        </UiCard>
        {r.solves.length > 0 && (
          <UiCard className="space-y-2 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Répond à
            </p>
            <ul className="space-y-2">
              {r.solves.map((p) => (
                <li key={p.id} className="space-y-1">
                  <Link to={`/problemes/${p.id}`} className="hover:text-accent hover:underline">
                    {p.title}
                  </Link>
                  <div>
                    <Tag tone={statusTone[p.status]}>{statusLabels[p.status]}</Tag>
                  </div>
                </li>
              ))}
            </ul>
          </UiCard>
        )}
      </aside>
    </div>
  );
}

function TechCard({ repo: r }: { repo: RepoDetail }) {
  const rows = [
    [Cpu, "Matériel cible", r.targetHardware || "Non précisé"],
    [Languages, "Langues", r.languages.length ? r.languages.join(", ") : "Non précisées"],
    [
      WifiOff,
      "Hors ligne",
      r.worksOffline ? "Oui, fonctionne sans connexion" : "Non, connexion requise",
    ],
  ] as const;
  return (
    <UiCard className="divide-y divide-neutral-200 text-sm">
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Fiche technique
        </p>
        {r.task && <p className="mt-1 font-medium">{r.task}</p>}
      </div>
      {rows.map(([Icon, label, value]) => (
        <div key={label} className="flex gap-3 px-4 py-2.5">
          <Icon size={14} className="mt-0.5 shrink-0 text-neutral-400" />
          <div>
            <p className="text-xs text-neutral-500">{label}</p>
            <p>{value}</p>
          </div>
        </div>
      ))}
    </UiCard>
  );
}

function Files({ repo: r, version }: { repo: RepoDetail; version?: number }) {
  const upload = useUploadFile(r);
  const remove = useDeleteFile(r);
  const latest = version === undefined;
  const [shown, setShown] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-600">
        {r.version
          ? `Version ${r.version.number}${r.version.message ? ` : ${r.version.message}` : ""}, ${formatDate(r.version.createdAt)}`
          : "Aucune version pour l'instant."}
        {!latest && (
          <>
            {" "}
            <Link to="?tab=fichiers" className="underline">
              Revenir à la dernière version
            </Link>
          </>
        )}
      </p>
      {r.files.length === 0 && <EmptyState>Aucun fichier dans cette version.</EmptyState>}
      {r.files.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
          {r.files.map((f) => {
            const url = fileUrl(r.owner, r.name, f.path, version);
            const open = shown === f.path;
            return (
              <li key={f.path} className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono">{f.path}</span>
                  <span
                    className="font-mono text-xs text-neutral-400"
                    title={`SHA-256 ${f.sha256}`}
                  >
                    {f.sha256.slice(0, 8)}
                  </span>
                  <span className="w-16 text-right text-neutral-500">{formatSize(f.size)}</span>
                  {canPreview(f) && (
                    <button
                      title={open ? "Masquer l'aperçu" : "Aperçu"}
                      aria-expanded={open}
                      className="rounded p-1 text-neutral-600 hover:bg-paper hover:text-ink"
                      onClick={() => setShown(open ? null : f.path)}
                    >
                      {open ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <RestrictedDownload
                    href={url}
                    license={r.license}
                    filename={f.path}
                    className="rounded p-1 text-neutral-600 hover:bg-paper hover:text-ink"
                  >
                    <Download size={14} />
                  </RestrictedDownload>
                  {r.permissions.write && latest && (
                    <button
                      title="Supprimer"
                      className="rounded p-1 text-red-700 hover:bg-red-50"
                      onClick={() =>
                        window.confirm(`Supprimer ${f.path} ?`) && remove.mutate(f.path)
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {open && (
                  <div className="mt-2">
                    <FilePreview url={url} file={f} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ErrorText error={remove.error} />
      {r.files.length > 0 && <Usage repo={r} version={version} />}
      {r.permissions.write && latest && (
        <FileUpload
          pending={upload.isPending}
          error={upload.error}
          onUpload={(input, reset) => upload.mutate(input, { onSuccess: reset })}
        />
      )}
    </div>
  );
}

/** Commandes prêtes à copier : téléchargement de chaque fichier et vérification d'empreinte. */
function Usage({ repo: r, version }: { repo: RepoDetail; version?: number }) {
  const origin = window.location.origin;
  const dir = r.name;
  const lines = [
    `mkdir -p ${dir} && cd ${dir}`,
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
    <UiCard>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Terminal size={15} /> Utiliser ce dépôt
        </p>
        <CopyButton text={script} />
      </div>
      <pre className="overflow-x-auto bg-night p-4 font-mono text-xs leading-relaxed text-[#e6ebf4]">
        {script}
      </pre>
      {r.license.restrictions.length > 0 && (
        <p className="border-t border-neutral-200 px-4 py-2 text-xs text-amber-900">
          Ressource sous licence {r.license.name} :{" "}
          {r.license.restrictions.join(", ").toLowerCase()}.
        </p>
      )}
    </UiCard>
  );
}

function Versions({ repo, onPick }: { repo: RepoDetail; onPick: (n: number) => void }) {
  const versions = useVersions(repo);
  return (
    <Query query={versions}>
      {(items) =>
        items.length ? (
          <ul className="divide-y divide-neutral-200 text-sm">
            {items.map((v) => (
              <li key={v.number} className="flex items-center gap-3 py-1.5">
                <button onClick={() => onPick(v.number)} className="font-mono underline">
                  v{v.number}
                </button>
                <span className="flex-1">{v.message}</span>
                <span className="text-xs text-neutral-500">
                  {v.author} · {formatDate(v.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Aucune version.</p>
        )
      }
    </Query>
  );
}

function Pulls({ repo }: { repo: RepoDetail }) {
  const { data: session } = useSession();
  const pulls = usePulls(repo);
  const create = useCreatePull(repo);
  const navigate = useNavigate();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    create.mutate(
      { title: v.title, description: v.description },
      {
        onSuccess: (p) => navigate(`/${repo.owner}/${repo.name}/pulls/${p.number}`),
      },
    );
  }

  return (
    <div className="space-y-4">
      <Query query={pulls}>
        {(items) =>
          items.length ? (
            <ul className="divide-y divide-neutral-200 text-sm">
              {items.map((p) => (
                <li key={p.number} className="flex items-center gap-3 py-1.5">
                  <Link
                    to={`/${repo.owner}/${repo.name}/pulls/${p.number}`}
                    className="hover:underline"
                  >
                    #{p.number} {p.title}
                  </Link>
                  <Tag
                    tone={p.status === "merged" ? "green" : p.status === "closed" ? "red" : "amber"}
                  >
                    {pullStatusLabels[p.status]}
                  </Tag>
                  <span className="ml-auto text-xs text-neutral-500">
                    {p.author} · {formatDate(p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Aucune pull request.</p>
          )
        }
      </Query>
      {session && (
        <details className="border border-neutral-200 p-3">
          <summary className="cursor-pointer text-sm font-medium">Ouvrir une pull request</summary>
          <form onSubmit={submit} className="mt-3 space-y-3">
            <Field label="Titre">
              <Input name="title" required />
            </Field>
            <Field label="Description">
              <Textarea name="description" />
            </Field>
            <ErrorText error={create.error} />
            <Button disabled={create.isPending}>Créer, puis ajouter les fichiers</Button>
          </form>
        </details>
      )}
    </div>
  );
}

function Settings({ repo: r }: { repo: RepoDetail }) {
  const update = useUpdateRepo(r);
  const licenses = useLicenses();
  const [saved, setSaved] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    setSaved(false);
    update.mutate(
      {
        visibility: v.visibility === "private" ? "private" : "public",
        licenseId: v.licenseId,
        description: v.description,
        readme: v.readme,
        limitations: v.limitations,
        provenanceCommunity: v.provenanceCommunity || null,
        provenanceCountry: v.provenanceCountry || null,
        ...techValues(v),
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visibilité">
            <Select name="visibility" defaultValue={r.visibility}>
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </Select>
          </Field>
          <Field label="Licence">
            <Select name="licenseId" defaultValue={r.licenseId}>
              {licenses.data?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description courte">
          <Input name="description" defaultValue={r.description} />
        </Field>
        {r.type === "dataset" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Communauté d'origine">
              <Input name="provenanceCommunity" defaultValue={r.provenanceCommunity ?? ""} />
            </Field>
            <Field label="Pays d'origine">
              <Select name="provenanceCountry" defaultValue={r.provenanceCountry ?? ""}>
                <option value="">Non renseigné</option>
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <TechFields initial={r} />
        <Field label="Fiche (Markdown)">
          <Textarea name="readme" rows={10} defaultValue={r.readme} />
        </Field>
        <Field label="Limites connues">
          <Textarea name="limitations" defaultValue={r.limitations} />
        </Field>
        <ErrorText error={update.error} />
        <div className="flex items-center gap-3">
          <Button disabled={update.isPending}>Enregistrer</Button>
          {saved && <span className="text-sm text-green-800">Enregistré.</span>}
        </div>
      </form>
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
    add.mutate(formValues(form).username, { onSuccess: () => form.reset() });
  }

  return (
    <Section title="Collaborateurs">
      <Query query={list}>
        {(items) =>
          items.length ? (
            <ul className="space-y-1 text-sm">
              {items.map((c) => (
                <li key={c.username} className="flex items-center gap-2">
                  <Link to={`/u/${c.username}`} className="hover:underline">
                    {c.username}
                  </Link>
                  <button
                    className="text-red-700"
                    title="Retirer"
                    onClick={() => c.username && remove.mutate(c.username)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Aucun collaborateur.</p>
          )
        }
      </Query>
      <form onSubmit={submit} className="flex max-w-sm gap-2">
        <Input name="username" placeholder="Nom d'utilisateur" required />
        <Button disabled={add.isPending}>Ajouter</Button>
      </form>
      <ErrorText error={add.error ?? remove.error} />
    </Section>
  );
}
