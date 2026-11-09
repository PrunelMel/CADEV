import { Link, useSearchParams } from "react-router";
import { useSearch } from "../api/hooks";
import { usePageTitle } from "../hooks/usePageTitle";
import { RepoLink } from "../components/Lists";
import {
  EmptyState,
  PageHeader,
  Query,
  Section,
  Tag,
  problemStatusTone,
  repoStageTone,
} from "../components/ui";
import { problemStatusLabels, repoStageLabels, repoTypeLabels } from "../content/site";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const result = useSearch(q);
  usePageTitle(q ? `Recherche : ${q}` : "Recherche");
  if (q.trim().length < 2) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recherche" />
        <EmptyState>Saisissez au moins deux caractères, par exemple « manioc ».</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Résultats pour « {q} »</>}
        intro="Les problèmes d'abord, avec les dépôts qui y répondent, puis les autres dépôts."
      />
      <Query query={result}>
        {({ problems, repos }) => (
          <>
            <Section title="Problèmes">
              {problems.length ? (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                  {problems.map((p) => (
                    <li key={p.id} className="space-y-1 px-4 py-3">
                      <Link to={`/problemes/${p.id}`} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      <p className="flex items-center gap-2 text-xs text-neutral-500">
                        <Tag tone={problemStatusTone[p.status]}>
                          {problemStatusLabels[p.status]}
                        </Tag>
                        {p.sector} · {p.country}
                      </p>
                      {p.solutions.length > 0 && (
                        <ul className="space-y-1 pl-4">
                          {p.solutions.map((s) => (
                            <li
                              key={`${s.owner}/${s.name}`}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <RepoLink owner={s.owner} name={s.name} />
                              <Tag>{repoTypeLabels[s.type]}</Tag>
                              <Tag tone={repoStageTone[s.stage]}>{repoStageLabels[s.stage]}</Tag>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  action={
                    <Link to="/problemes/nouveau" className="font-medium text-accent underline">
                      Publier ce problème
                    </Link>
                  }
                >
                  Personne n'a encore décrit ce problème.
                </EmptyState>
              )}
            </Section>
            {repos.length > 0 && (
              <Section title="Autres dépôts">
                <ul className="space-y-2">
                  {repos.map((r) => (
                    <li key={`${r.owner}/${r.name}`} className="text-sm">
                      <RepoLink owner={r.owner} name={r.name} /> <Tag>{repoTypeLabels[r.type]}</Tag>{" "}
                      <Tag tone={repoStageTone[r.stage]}>{repoStageLabels[r.stage]}</Tag>
                      {r.description && <p className="text-neutral-700">{r.description}</p>}
                      <p className="text-xs text-neutral-500">
                        Répond à{" "}
                        <Link to={`/problemes/${r.problem.id}`} className="hover:underline">
                          {r.problem.title}
                        </Link>
                        {r.problem.status === "closed" && " (problème fermé)"}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </Query>
    </div>
  );
}
