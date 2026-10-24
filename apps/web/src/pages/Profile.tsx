import { Link, useParams } from "react-router";
import { useSession } from "../api/auth";
import { useProfile } from "../api/hooks";
import { RepoLink } from "../components/Lists";
import { Query, Section, Tag, formatDate } from "../components/ui";
import { repoTypeLabels } from "../content/site";

export function ProfilePage() {
  const { username = "" } = useParams();
  const profile = useProfile(username);
  const { data: session } = useSession();
  return (
    <Query query={profile}>
      {(u) => (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">{u.name}</h1>
            <p className="text-sm text-neutral-500">
              @{u.username} · membre depuis le {formatDate(u.createdAt)}
            </p>
            {session?.user.username === u.username && (
              <Link to="/orgs/nouvelle" className="text-sm underline">
                Créer une organisation
              </Link>
            )}
            {u.orgs.length > 0 && (
              <p className="text-sm">
                Organisations :{" "}
                {u.orgs.map((o, i) => (
                  <span key={o.slug}>
                    {i > 0 && ", "}
                    <Link to={`/orgs/${o.slug}`} className="underline">
                      {o.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <Section title={`Problèmes résolus (${u.solved.length})`}>
            {u.solved.length ? (
              <ul className="space-y-3">
                {u.solved.map((s) => (
                  <li key={`${s.problem.id}-${s.repo.name}`} className="text-sm">
                    <Link to={`/problemes/${s.problem.id}`} className="font-medium hover:underline">
                      {s.problem.title}
                    </Link>{" "}
                    <span className="text-neutral-500">({s.problem.country})</span>
                    <p className="text-neutral-700">{s.summary}</p>
                    <RepoLink {...s.repo} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Aucune solution validée pour l'instant.</p>
            )}
          </Section>

          {u.posted.length > 0 && (
            <Section title="Problèmes publiés">
              <ul className="space-y-1 text-sm">
                {u.posted.map((p) => (
                  <li key={p.id}>
                    <Link to={`/problemes/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>{" "}
                    <span className="text-neutral-500">({p.country})</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {u.repos.length > 0 && (
            <Section title="Dépôts publics">
              <ul className="space-y-1">
                {u.repos.map((r) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <RepoLink {...r} />
                    <Tag>{repoTypeLabels[r.type]}</Tag>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </Query>
  );
}
