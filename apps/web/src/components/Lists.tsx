import { Link } from "react-router";
import { BrainCircuit, Database, Heart, Library, Lock, MapPin, WifiOff } from "lucide-react";
import type { ProblemSummary, RepoSummary } from "../api/types";
import { countryInfo } from "../content/countries";
import { problemStatusLabels, repoTypeLabels } from "../content/site";
import { EmptyState, Tag, formatDate, problemStatusTone } from "./ui";

const stripe = {
  open: "border-l-accent",
  solved: "border-l-green-600",
  closed: "border-l-neutral-300",
} as const;

export function ProblemList({ items }: { items: ProblemSummary[] }) {
  if (!items.length) return <EmptyState>Aucun problème ne correspond.</EmptyState>;
  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
      {items.map((p) => {
        const code = countryInfo(p.country)?.code;
        return (
          <li key={p.id} className={`border-l-4 px-4 py-3.5 hover:bg-paper ${stripe[p.status]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link
                to={`/problemes/${p.id}`}
                className="font-medium text-ink hover:text-accent hover:underline"
              >
                {p.title}
              </Link>
              <Tag tone={problemStatusTone[p.status]}>{problemStatusLabels[p.status]}</Tag>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {code && <span className="font-mono font-semibold text-ink">{code}</span>}
                {p.country}
              </span>
              <span>{p.sector}</span>
              {p.solutionCount !== undefined && (
                <span>
                  {p.solutionCount} solution{p.solutionCount > 1 ? "s" : ""}
                  {p.acceptedCount
                    ? `, ${p.acceptedCount} acceptée${p.acceptedCount > 1 ? "s" : ""}`
                    : ""}
                </span>
              )}
              <span>
                {p.author} · {formatDate(p.createdAt)}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const typeIcons = { model: BrainCircuit, dataset: Database, library: Library } as const;

/** Pastille du type de dépôt, avec son icône. */
export function TypeMark({ type, size = 36 }: { type: RepoSummary["type"]; size?: number }) {
  const Icon = typeIcons[type];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-night text-lilac"
      style={{ width: size, height: size }}
      title={repoTypeLabels[type]}
    >
      <Icon size={size * 0.48} />
    </span>
  );
}

export function RepoLink({ owner, name }: { owner: string; name: string }) {
  return (
    <Link
      to={`/${owner}/${name}`}
      className="font-mono text-sm text-ink hover:text-accent hover:underline"
    >
      <span className="text-neutral-500">{owner}/</span>
      {name}
    </Link>
  );
}

/** Badges de la fiche technique : ce qui compte pour juger l'adéquation au terrain. */
export function TechBadges({
  repo,
}: {
  repo: Pick<RepoSummary, "task" | "languages" | "worksOffline">;
}) {
  return (
    <>
      {repo.task && <Tag>{repo.task}</Tag>}
      {repo.worksOffline && (
        <Tag tone="green">
          <WifiOff size={11} /> Hors ligne
        </Tag>
      )}
      {repo.languages.map((l) => (
        <Tag key={l} tone="accent">
          {l}
        </Tag>
      ))}
    </>
  );
}

export function RepoList({ items }: { items: RepoSummary[] }) {
  if (!items.length) return <EmptyState>Aucun dépôt ne correspond.</EmptyState>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-2.5 rounded-lg border border-neutral-200 p-4 hover:border-ink"
        >
          <div className="flex items-start gap-3">
            <TypeMark type={r.type} />
            <div className="min-w-0 flex-1">
              <RepoLink owner={r.owner} name={r.name} />
              <p className="text-xs text-neutral-500">{repoTypeLabels[r.type]}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">
              {r.visibility === "private" && <Lock size={12} />}
              {r.likes !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <Heart size={12} /> {r.likes}
                </span>
              )}
            </span>
          </div>
          {r.description && <p className="text-sm text-neutral-700">{r.description}</p>}
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            <TechBadges repo={r} />
            {r.license && (
              <Tag tone={r.license.restrictions.length ? "amber" : "neutral"}>{r.license.name}</Tag>
            )}
          </div>
          {r.provenanceCountry && (
            <p className="text-xs text-neutral-500">
              Provenance : {r.provenanceCommunity ? `${r.provenanceCommunity}, ` : ""}
              {r.provenanceCountry}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
