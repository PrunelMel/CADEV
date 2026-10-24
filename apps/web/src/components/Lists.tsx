import { Link } from "react-router";
import type { ProblemSummary, RepoSummary } from "../api/types";
import { repoTypeLabels } from "../content/site";
import { Tag, formatDate } from "./ui";

export function ProblemList({ items }: { items: ProblemSummary[] }) {
  if (!items.length) return <p className="text-sm text-neutral-500">Aucun problème.</p>;
  return (
    <ul className="divide-y divide-neutral-200">
      {items.map((p) => (
        <li key={p.id} className="py-2">
          <Link to={`/problemes/${p.id}`} className="font-medium hover:underline">
            {p.title}
          </Link>
          <p className="text-xs text-neutral-500">
            {p.sector} · {p.country} · {p.author} · {formatDate(p.createdAt)}
            {p.solutionCount !== undefined && ` · ${p.solutionCount} solution(s) proposée(s)`}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function RepoLink({ owner, name }: { owner: string; name: string }) {
  return (
    <Link to={`/${owner}/${name}`} className="font-mono text-sm hover:underline">
      {owner}/{name}
    </Link>
  );
}

export function RepoList({ items }: { items: RepoSummary[] }) {
  if (!items.length) return <p className="text-sm text-neutral-500">Aucun dépôt.</p>;
  return (
    <ul className="divide-y divide-neutral-200">
      {items.map((r) => (
        <li key={r.id} className="space-y-0.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <RepoLink owner={r.owner} name={r.name} />
            <Tag>{repoTypeLabels[r.type]}</Tag>
            {r.license && (
              <Tag tone={r.license.restrictions.length ? "amber" : "neutral"}>{r.license.name}</Tag>
            )}
          </div>
          {r.description && <p className="text-sm text-neutral-700">{r.description}</p>}
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
