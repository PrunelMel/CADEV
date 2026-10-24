import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Download, Heart, Lock, Trash2 } from "lucide-react";
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
import { LicenseWarning, confirmRestricted } from "../components/LicenseWarning";
import {
  Button,
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
import { repoTypeLabels, statusLabels } from "../content/site";

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

  const go = (next: Tab, extra: Record<string, string> = {}) => setParams({ tab: next, ...extra });

  return (
    <Query query={repo}>
      {(r) => (
        <div className="space-y-5">
          <Header repo={r} />
          <LicenseWarning license={r.license} />
          <nav className="flex gap-4 border-b border-neutral-200 text-sm">
            {tabs
              .filter(([key]) => key !== "parametres" || r.permissions.owner)
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className={`-mb-px border-b-2 pb-1 ${tab === key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-600"}`}
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
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-lg">
          <Link to={`/u/${r.owner}`} className="hover:underline">
            {r.owner}
          </Link>
          /{r.name}
        </h1>
        <Tag>{repoTypeLabels[r.type]}</Tag>
        {r.visibility === "private" && (
          <Tag>
            <Lock size={10} className="inline" /> Privé
          </Tag>
        )}
        <Tag tone={r.license.restrictions.length ? "amber" : "neutral"}>{r.license.name}</Tag>
        <button
          disabled={!session || like.isPending}
          onClick={() => like.mutate(!r.liked)}
          className="ml-auto inline-flex items-center gap-1 text-sm disabled:opacity-60"
          title={session ? "J'aime" : "Connectez-vous pour aimer"}
        >
          <Heart size={14} fill={r.liked ? "currentColor" : "none"} /> {r.likes}
        </button>
      </div>
      {r.description && <p className="text-neutral-700">{r.description}</p>}
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
    <div className="space-y-6">
      <Section title="Documentation">
        {r.readme ? (
          <pre className="whitespace-pre-wrap font-sans text-sm">{r.readme}</pre>
        ) : (
          <p className="text-sm text-neutral-500">Pas encore de documentation.</p>
        )}
      </Section>
      <Section title="Limites">
        <p className="whitespace-pre-wrap text-sm">{r.limitations || "Non renseignées."}</p>
      </Section>
      <Section title="Licence">
        <p className="text-sm">
          {r.license.name}. {r.license.summary}{" "}
          {r.license.url && (
            <a href={r.license.url} target="_blank" rel="noreferrer" className="underline">
              Texte officiel
            </a>
          )}
        </p>
      </Section>
      {r.solves.length > 0 && (
        <Section title="Problèmes auxquels ce dépôt répond">
          <ul className="space-y-1 text-sm">
            {r.solves.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Link to={`/problemes/${p.id}`} className="hover:underline">
                  {p.title}
                </Link>
                <Tag tone={statusTone[p.status]}>{statusLabels[p.status]}</Tag>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Files({ repo: r, version }: { repo: RepoDetail; version?: number }) {
  const upload = useUploadFile(r);
  const remove = useDeleteFile(r);
  const latest = version === undefined;
  return (
    <div className="space-y-4">
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
      {r.files.length > 0 && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-neutral-200">
            {r.files.map((f) => (
              <tr key={f.path}>
                <td className="py-1.5 font-mono">{f.path}</td>
                <td className="text-right text-neutral-500">{formatSize(f.size)}</td>
                <td className="w-20 text-right">
                  <a
                    href={fileUrl(r.owner, r.name, f.path, version)}
                    onClick={(e) => !confirmRestricted(r.license) && e.preventDefault()}
                    title="Télécharger"
                    className="inline-block p-1"
                  >
                    <Download size={14} />
                  </a>
                  {r.permissions.write && latest && (
                    <button
                      title="Supprimer"
                      className="p-1 text-red-700"
                      onClick={() =>
                        window.confirm(`Supprimer ${f.path} ?`) && remove.mutate(f.path)
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ErrorText error={remove.error} />
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
  const statusText = { open: "Ouverte", merged: "Fusionnée", closed: "Fermée" };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    create.mutate(
      { title: v.title, description: v.description },
      { onSuccess: (p) => navigate(`/${repo.owner}/${repo.name}/pulls/${p.number}`) },
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
                    {statusText[p.status]}
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
              <Input name="provenanceCountry" defaultValue={r.provenanceCountry ?? ""} />
            </Field>
          </div>
        )}
        <Field label="Fiche">
          <Textarea name="readme" rows={8} defaultValue={r.readme} />
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
                  <Link to={`/u/${c.username}`}>{c.username}</Link>
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
