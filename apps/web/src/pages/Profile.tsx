import { Link, useParams } from "react-router";
import { CircleCheckBig, MapPin } from "lucide-react";
import { useSession } from "../api/auth";
import { useProfile } from "../api/hooks";
import { RepoLink, TypeMark } from "../components/Lists";
import { Avatar, Band, EmptyState, Query, Section, formatDate } from "../components/ui";
import { countryInfo } from "../content/countries";
import { repoTypeLabels } from "../content/site";
import { usePageTitle } from "../hooks/usePageTitle";

export function ProfilePage() {
  const { username = "" } = useParams();
  const profile = useProfile(username);
  const { data: session } = useSession();
  usePageTitle(profile.data?.name ?? username);

  return (
    <Query query={profile}>
      {(u) => {
        const countries = [...new Set(u.solved.map((s) => s.problem.country))];
        return (
          <div className="space-y-10">
            <Band>
              <div className="flex flex-wrap items-center gap-6">
                <Avatar name={u.name || u.username} size={88} />
                <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="font-display text-5xl uppercase leading-none tracking-wide">
                    {u.name}
                  </h1>
                  <p className="font-mono text-sm text-[#8a95ab]">
                    @{u.username} · membre depuis le {formatDate(u.createdAt)}
                  </p>
                  {u.orgs.length > 0 && (
                    <p className="flex flex-wrap gap-2 text-sm">
                      {u.orgs.map((o) => (
                        <Link
                          key={o.slug}
                          to={`/orgs/${o.slug}`}
                          className="rounded-full border border-night-line px-3 py-0.5 text-[#e6ebf4] hover:border-lilac hover:text-lilac"
                        >
                          {o.name}
                        </Link>
                      ))}
                    </p>
                  )}
                  {session?.user.username === u.username && (
                    <Link to="/orgs/nouvelle" className="text-sm text-lilac underline">
                      Créer une organisation
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-display text-7xl leading-none text-lilac">{u.solved.length}</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a95ab]">
                    problème{u.solved.length > 1 ? "s" : ""} résolu{u.solved.length > 1 ? "s" : ""}
                  </p>
                  {countries.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-[#c9d1e0]">
                      {countries.map((c) => countryInfo(c)?.code ?? c).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </Band>

            <Section title="Problèmes résolus">
              {u.solved.length ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {u.solved.map((s) => (
                    <li
                      key={`${s.problem.id}-${s.repo.name}`}
                      className="space-y-2 rounded-lg border border-l-4 border-neutral-200 border-l-green-600 p-4 text-sm"
                    >
                      <p className="flex items-center gap-1.5 text-xs font-medium text-green-800">
                        <CircleCheckBig size={13} /> Solution acceptée
                      </p>
                      <Link
                        to={`/problemes/${s.problem.id}`}
                        className="block font-medium hover:text-accent hover:underline"
                      >
                        {s.problem.title}
                      </Link>
                      <p className="flex items-center gap-1 text-xs text-neutral-500">
                        <MapPin size={12} /> {s.problem.country}
                      </p>
                      <p className="text-neutral-700">{s.summary}</p>
                      <RepoLink {...s.repo} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>Aucune solution validée pour l'instant.</EmptyState>
              )}
            </Section>

            {u.posted.length > 0 && (
              <Section title={`Problèmes publiés (${u.posted.length})`}>
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
                  {u.posted.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <Link to={`/problemes/${p.id}`} className="hover:text-accent hover:underline">
                        {p.title}
                      </Link>
                      <span className="text-xs text-neutral-500">{p.country}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {u.repos.length > 0 && (
              <Section title={`Dépôts publics (${u.repos.length})`}>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {u.repos.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                    >
                      <TypeMark type={r.type} size={32} />
                      <div className="min-w-0">
                        <RepoLink {...r} />
                        <p className="text-xs text-neutral-500">{repoTypeLabels[r.type]}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        );
      }}
    </Query>
  );
}
