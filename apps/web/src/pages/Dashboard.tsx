import type { ReactNode } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Link } from "react-router";
import { Database, GitPullRequest, Inbox, Plus } from "lucide-react";
import { useSession } from "../api/auth";
import { useDashboard } from "../api/hooks";
import { RepoList, RepoLink } from "../components/Lists";
import {
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Query,
  Section,
  Tag,
  formatDate,
  problemStatusTone,
  statusTone,
} from "../components/ui";
import { problemStatusLabels, statusLabels } from "../content/site";

export function DashboardPage() {
  usePageTitle("Tableau de bord");
  const { data: session } = useSession();
  const dashboard = useDashboard(!!session);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        intro="Ce qui attend votre décision, le suivi de vos propositions et tous vos dépôts, privés compris."
        actions={
          <>
            <ButtonLink to="/problemes/nouveau" variant="secondary">
              <Plus size={15} /> Problème
            </ButtonLink>
            <ButtonLink to="/nouveau-depot">
              <Plus size={15} /> Dépôt
            </ButtonLink>
          </>
        }
      />
      <Query query={dashboard}>
        {(d) => {
          const pending =
            d.toReview.solutions.length + d.toReview.contributions.length + d.toReview.pulls.length;
          return (
            <div className="grid gap-8 lg:grid-cols-2">
              <Section title={`À traiter (${pending})`}>
                {pending === 0 ? (
                  <EmptyState icon={Inbox}>Rien n'attend votre décision.</EmptyState>
                ) : (
                  <Card className="divide-y divide-neutral-200">
                    {d.toReview.solutions.map((s) => (
                      <Row
                        key={s.id}
                        to={`/problemes/${s.problemId}`}
                        kind="Solution à valider"
                        title={s.problemTitle}
                        meta={
                          <>
                            {s.repo.owner}/{s.repo.name} par {s.submittedBy},{" "}
                            {formatDate(s.createdAt)}
                          </>
                        }
                      />
                    ))}
                    {d.toReview.contributions.map((c) => (
                      <Row
                        key={c.id}
                        to={`/problemes/${c.problemId}`}
                        kind="Données à valider"
                        icon={<Database size={14} />}
                        title={c.problemTitle}
                        meta={
                          <>
                            par {c.contributor}, {formatDate(c.createdAt)}
                          </>
                        }
                      />
                    ))}
                    {d.toReview.pulls.map((p) => (
                      <Row
                        key={`${p.repo.owner}/${p.repo.name}#${p.number}`}
                        to={`/${p.repo.owner}/${p.repo.name}/pulls/${p.number}`}
                        kind="Pull request"
                        icon={<GitPullRequest size={14} />}
                        title={`#${p.number} ${p.title}`}
                        meta={
                          <>
                            {p.repo.owner}/{p.repo.name} par {p.author}
                          </>
                        }
                      />
                    ))}
                  </Card>
                )}
              </Section>

              <Section title={`Mes problèmes (${d.problems.length})`}>
                {d.problems.length ? (
                  <Card className="divide-y divide-neutral-200">
                    {d.problems.map((p) => (
                      <Link
                        key={p.id}
                        to={`/problemes/${p.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-paper"
                      >
                        <span>{p.title}</span>
                        <Tag tone={problemStatusTone[p.status]}>
                          {problemStatusLabels[p.status]}
                        </Tag>
                      </Link>
                    ))}
                  </Card>
                ) : (
                  <EmptyState>Vous n'avez pas encore publié de problème.</EmptyState>
                )}
              </Section>

              <Section title={`Sur quoi je travaille (${d.working.length})`}>
                {d.working.length ? (
                  <Card className="divide-y divide-neutral-200">
                    {d.working.map((w) => (
                      <Link
                        key={w.problemId}
                        to={`/problemes/${w.problemId}`}
                        className="block px-4 py-3 text-sm hover:bg-paper"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-medium">{w.problemTitle}</span>
                          <Tag tone={problemStatusTone[w.status]}>
                            {problemStatusLabels[w.status]}
                          </Tag>
                        </span>
                        {w.note && <span className="block text-xs text-neutral-500">{w.note}</span>}
                      </Link>
                    ))}
                  </Card>
                ) : (
                  <EmptyState>
                    Déclarez-vous sur un problème avec « Je travaille dessus » pour le retrouver
                    ici.
                  </EmptyState>
                )}
              </Section>

              <Section title="Mes propositions">
                {d.mine.solutions.length + d.mine.contributions.length ? (
                  <Card className="divide-y divide-neutral-200">
                    {d.mine.solutions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            to={`/problemes/${s.problemId}`}
                            className="hover:text-accent hover:underline"
                          >
                            {s.problemTitle}
                          </Link>
                          <div>
                            <RepoLink {...s.repo} />
                          </div>
                        </div>
                        <Tag tone={statusTone[s.status]}>{statusLabels[s.status]}</Tag>
                      </div>
                    ))}
                    {d.mine.contributions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <Link
                            to={`/problemes/${c.problemId}`}
                            className="hover:text-accent hover:underline"
                          >
                            {c.problemTitle}
                          </Link>
                          <p className="text-xs text-neutral-500">Contribution de données</p>
                        </div>
                        <Tag tone={statusTone[c.status]}>{statusLabels[c.status]}</Tag>
                      </div>
                    ))}
                  </Card>
                ) : (
                  <EmptyState>Aucune solution ni contribution proposée pour l'instant.</EmptyState>
                )}
              </Section>

              <div className="lg:col-span-2">
                <Section title={`Mes dépôts (${d.repos.length})`}>
                  <RepoList items={d.repos} />
                </Section>
              </div>
            </div>
          );
        }}
      </Query>
    </div>
  );
}

function Row({
  to,
  kind,
  title,
  meta,
  icon,
}: {
  to: string;
  kind: string;
  title: string;
  meta: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link to={to} className="block px-4 py-3 text-sm hover:bg-paper">
      <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
        {icon} {kind}
      </p>
      <p className="font-medium text-ink">{title}</p>
      <p className="text-xs text-neutral-500">{meta}</p>
    </Link>
  );
}
