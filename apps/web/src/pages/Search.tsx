import { Link, useSearchParams } from "react-router";
import { useSearch } from "../api/hooks";
import { RepoLink } from "../components/Lists";
import { Query, Section, Tag, statusTone } from "../components/ui";
import { repoTypeLabels, statusLabels } from "../content/site";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const result = useSearch(q);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Résultats pour « {q} »</h1>
      <Query query={result}>
        {({ problems, repos }) => (
          <>
            <Section title="Problèmes">
              {problems.length ? (
                <ul className="space-y-4">
                  {problems.map((p) => (
                    <li key={p.id} className="space-y-1">
                      <Link to={`/problemes/${p.id}`} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {p.sector} · {p.country}
                      </p>
                      {p.solutions.length > 0 && (
                        <ul className="space-y-1 pl-4">
                          {p.solutions.map((s) => (
                            <li
                              key={`${s.repo.owner}/${s.repo.name}`}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <RepoLink {...s.repo} />
                              <Tag>{repoTypeLabels[s.repo.type]}</Tag>
                              <Tag tone={statusTone[s.status]}>{statusLabels[s.status]}</Tag>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">
                  Aucun problème trouvé.{" "}
                  <Link to="/problemes/nouveau" className="underline">
                    Publier ce problème
                  </Link>
                </p>
              )}
            </Section>
            {repos.length > 0 && (
              <Section title="Autres dépôts">
                <ul className="space-y-2">
                  {repos.map((r) => (
                    <li key={`${r.owner}/${r.name}`} className="text-sm">
                      <RepoLink {...r} /> <Tag>{repoTypeLabels[r.type]}</Tag>
                      {r.description && <p className="text-neutral-700">{r.description}</p>}
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
