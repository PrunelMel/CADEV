import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  Check,
  CircleCheckBig,
  Cpu,
  Hammer,
  Languages,
  Lightbulb,
  MapPin,
  Pencil,
  Target,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useSession } from "../api/auth";
import {
  useProblem,
  useSubmitContribution,
  useSubmitSolution,
  useSuggestions,
  useUpdateProblem,
  useValidate,
  useWork,
} from "../api/hooks";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ProblemDetail, ReviewStatus, Suggestion, Validation } from "../api/types";
import { Discussions } from "../components/Discussions";
import { LicenseWarning } from "../components/LicenseWarning";
import { RepoLink, TechBadges } from "../components/Lists";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
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
  problemStatusTone,
  statusTone,
} from "../components/ui";
import { countries, problemStatusLabels, repoTypeLabels, statusLabels } from "../content/site";

export function ProblemDetailPage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  const { data: session } = useSession();
  usePageTitle(problem.data?.title);
  const [askSolved, setAskSolved] = useState(false);

  return (
    <Query query={problem}>
      {(p) => {
        const open = p.status !== "closed";
        return (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-10">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <Tag tone={problemStatusTone[p.status]}>{problemStatusLabels[p.status]}</Tag>
                  <span>{p.sector}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {p.country}
                  </span>
                  <span>
                    publié par{" "}
                    <Link to={`/u/${p.author}`} className="font-medium text-ink hover:underline">
                      {p.author}
                    </Link>{" "}
                    le {formatDate(p.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
                  {p.isAuthor && (
                    <ButtonLink to={`/problemes/${p.id}/modifier`} variant="secondary" size="sm">
                      <Pencil size={13} /> Modifier
                    </ButtonLink>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{p.description}</p>
                <CopyButton text={window.location.href} label="Copier le lien" />
              </header>

              {askSolved && p.status === "open" && (
                <MarkSolved problemId={p.id} onDone={() => setAskSolved(false)} />
              )}

              <Section title={`Solutions proposées (${p.solutions.length})`}>
                <p className="text-xs text-neutral-500">
                  Toutes les tentatives restent visibles, y compris celles rejetées : le suivant
                  part de là.
                </p>
                {p.solutions.length === 0 && (
                  <EmptyState>
                    Aucune solution pour l'instant. Soyez le premier à proposer un dépôt.
                  </EmptyState>
                )}
                <ul className="space-y-3">
                  {p.solutions.map((s) => (
                    <li key={s.id}>
                      <Card className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <RepoLink {...s.repo} />
                          <Tag tone="ink">{repoTypeLabels[s.repo.type]}</Tag>
                          <Tag tone={statusTone[s.status]}>{statusLabels[s.status]}</Tag>
                          <span className="ml-auto text-xs text-neutral-500">
                            par {s.submittedBy}, {formatDate(s.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{s.summary}</p>
                        {s.fieldResults && (
                          <div className="rounded-md bg-paper p-3 text-sm">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              Résultats terrain
                            </p>
                            <p className="whitespace-pre-wrap">{s.fieldResults}</p>
                          </div>
                        )}
                        <LicenseWarning license={s.license} />
                        <History items={s.validations} />
                        {p.isAuthor && (
                          <Review
                            problemId={p.id}
                            kind="solutions"
                            id={s.id}
                            status={s.status}
                            onAccepted={() => setAskSolved(true)}
                          />
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
                {session && open && <SolutionForm problemId={p.id} />}
              </Section>

              <Section title={`Contributions de données (${p.contributions.length})`}>
                {p.contributions.length === 0 && (
                  <EmptyState>Aucune contribution de données.</EmptyState>
                )}
                <ul className="space-y-3">
                  {p.contributions.map((c) => (
                    <li key={c.id}>
                      <Card className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag tone={statusTone[c.status]}>{statusLabels[c.status]}</Tag>
                          {c.dataset && <RepoLink {...c.dataset} />}
                          <span className="ml-auto text-xs text-neutral-500">
                            par {c.contributor}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{c.description}</p>
                        <p className="text-xs text-neutral-600">
                          <span className="font-medium">Provenance :</span> {c.provenanceCommunity},{" "}
                          {c.provenanceCountry}
                        </p>
                        <History items={c.validations} />
                        {p.isAuthor && (
                          <Review
                            problemId={p.id}
                            kind="contributions"
                            id={c.id}
                            status={c.status}
                          />
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
                {session && open && <ContributionForm problemId={p.id} />}
              </Section>

              {!open && (
                <p className="text-sm text-neutral-500">
                  Ce problème est fermé : il n'accepte plus de nouvelles solutions ni contributions.
                </p>
              )}

              <Discussions path={`/problems/${p.id}`} />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
              <Constraints problem={p} />
              <Workers problem={p} signedIn={!!session} me={session?.user.username ?? null} />
              {open && <Suggestions problemId={p.id} />}
            </aside>
          </div>
        );
      }}
    </Query>
  );
}

function Constraints({ problem: p }: { problem: ProblemDetail }) {
  const rows = [
    [Wifi, "Connectivité", p.connectivityConstraint],
    [Cpu, "Matériel", p.hardwareConstraint],
    [Languages, "Langue", p.languageConstraint],
    [Target, "Critères d'évaluation", p.evaluationCriteria],
  ] as const;
  return (
    <Card className="divide-y divide-neutral-200">
      <p className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Contraintes terrain
      </p>
      {rows.map(([Icon, label, value]) => (
        <div key={label} className="flex gap-3 px-4 py-3 text-sm">
          <Icon size={15} className="mt-0.5 shrink-0 text-neutral-400" />
          <div>
            <p className="font-medium">{label}</p>
            <p className="whitespace-pre-wrap text-neutral-600">{value || "Non précisée"}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

/** Dépôts du hub qui pourraient répondre, avec leur compatibilité aux contraintes. */
function Suggestions({ problemId }: { problemId: string }) {
  const list = useSuggestions(problemId);
  return (
    <Card>
      <p className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <Lightbulb size={13} /> Dépôts à essayer
      </p>
      <Query query={list}>
        {(items) =>
          items.length ? (
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
              {items.map((r) => (
                <SuggestionItem key={r.id} repo={r} />
              ))}
            </ul>
          ) : (
            <p className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500">
              Aucun dépôt du hub ne semble correspondre pour l'instant.
            </p>
          )
        }
      </Query>
    </Card>
  );
}

function SuggestionItem({ repo: r }: { repo: Suggestion }) {
  return (
    <li className="space-y-1.5 px-4 py-3">
      <RepoLink owner={r.owner} name={r.name} />
      {r.description && <p className="text-xs text-neutral-600">{r.description}</p>}
      <div className="flex flex-wrap gap-1">
        <TechBadges repo={{ ...r, worksOffline: false }} />
      </div>
      <ul className="space-y-0.5 text-xs">
        {r.fits.offline !== null && (
          <Fit ok={r.fits.offline}>
            {r.fits.offline ? (
              <>
                <WifiOff size={11} className="inline" /> Fonctionne hors ligne
              </>
            ) : (
              "Demande une connexion"
            )}
          </Fit>
        )}
        {r.fits.languages !== null && (
          <Fit ok={r.fits.languages.length > 0}>
            {r.fits.languages.length
              ? `Langue : ${r.fits.languages.join(", ")}`
              : "Langue demandée non déclarée"}
          </Fit>
        )}
      </ul>
    </li>
  );
}

function Fit({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? "text-green-800" : "text-neutral-500"}`}>
      {ok ? <Check size={12} /> : <X size={12} />} {children}
    </li>
  );
}

function History({ items }: { items: Validation[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1 border-l-2 border-neutral-200 pl-3 text-xs text-neutral-600">
      {items.map((v, i) => (
        <li key={`${v.createdAt}-${i}`}>
          {formatDate(v.createdAt)} : {v.decision === "accepted" ? "acceptée" : "rejetée"}
          {v.comment && `, « ${v.comment} »`}
        </li>
      ))}
    </ul>
  );
}

function Review(props: {
  problemId: string;
  kind: "solutions" | "contributions";
  id: string;
  status: ReviewStatus;
  onAccepted?: () => void;
}) {
  const validate = useValidate(props.problemId);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "rejected" ? "rejected" : "accepted";
    const form = e.currentTarget;
    const { comment = "" } = formValues(form);
    validate.mutate(
      { kind: props.kind, id: props.id, decision, comment },
      {
        onSuccess: () => {
          form.reset();
          if (decision === "accepted") props.onAccepted?.();
        },
      },
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3"
      onSubmit={onSubmit}
    >
      <div className="min-w-48 flex-1">
        <Input name="comment" placeholder="Votre retour (facultatif)" />
      </div>
      <Button
        value="accepted"
        size="sm"
        disabled={validate.isPending || props.status === "accepted"}
      >
        <Check size={13} /> Accepter
      </Button>
      <Button
        value="rejected"
        size="sm"
        variant="danger"
        disabled={validate.isPending || props.status === "rejected"}
      >
        <X size={13} /> Rejeter
      </Button>
      <ErrorText error={validate.error} />
    </form>
  );
}

function SolutionForm({ problemId }: { problemId: string }) {
  const submit = useSubmitSolution(problemId);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    submit.mutate(
      { repo: v.repo, summary: v.summary, fieldResults: v.fieldResults },
      { onSuccess: () => form.reset() },
    );
  }
  return (
    <details className="group rounded-lg border border-neutral-200 p-4 open:bg-paper">
      <summary className="cursor-pointer text-sm font-medium">Proposer une solution</summary>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Field
          label="Dépôt public"
          hint="proprietaire/nom, un dépôt sur lequel vous pouvez écrire."
        >
          <Input name="repo" required placeholder="koffi/manioc-mobilenet" />
        </Field>
        <Field label="Résumé de l'approche">
          <Textarea name="summary" required minLength={10} />
        </Field>
        <Field
          label="Résultats terrain"
          hint="Ce qui a marché, ce qui a échoué, dans quelles conditions."
        >
          <Textarea name="fieldResults" />
        </Field>
        <ErrorText error={submit.error} />
        <Button disabled={submit.isPending}>Proposer</Button>
      </form>
    </details>
  );
}

function ContributionForm({ problemId }: { problemId: string }) {
  const submit = useSubmitContribution(problemId);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { dataset, ...v } = formValues(form);
    submit.mutate(
      {
        description: v.description,
        provenanceCommunity: v.provenanceCommunity,
        provenanceCountry: v.provenanceCountry,
        dataset: dataset || undefined,
      },
      { onSuccess: () => form.reset() },
    );
  }
  return (
    <details className="rounded-lg border border-neutral-200 p-4 open:bg-paper">
      <summary className="cursor-pointer text-sm font-medium">Contribuer des données</summary>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Field label="Description des données">
          <Textarea name="description" required minLength={10} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Communauté d'origine">
            <Input name="provenanceCommunity" required />
          </Field>
          <Field label="Pays d'origine">
            <Select name="provenanceCountry" required defaultValue="">
              <option value="" disabled>
                Choisir un pays
              </option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Dataset lié (facultatif)" hint="proprietaire/nom d'un dataset public.">
          <Input name="dataset" />
        </Field>
        <ErrorText error={submit.error} />
        <Button disabled={submit.isPending}>Contribuer</Button>
      </form>
    </details>
  );
}

/** Après l'acceptation d'une solution, proposer de marquer le problème comme résolu. */
function MarkSolved({ problemId, onDone }: { problemId: string; onDone: () => void }) {
  const update = useUpdateProblem(problemId);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
      <CircleCheckBig size={18} className="text-green-700" />
      <p className="flex-1">Solution acceptée. Ce problème est-il résolu ?</p>
      <Button
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate({ status: "solved" }, { onSuccess: onDone })}
      >
        Marquer comme résolu
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        Plus tard
      </Button>
      <ErrorText error={update.error} />
    </div>
  );
}

/**
 * Qui travaille sur ce problème en ce moment. Se déclarer évite que deux équipes partent
 * en parallèle sans le savoir : c'est le pendant des tentatives visibles.
 */
function Workers({
  problem: p,
  signedIn,
  me,
}: {
  problem: ProblemDetail;
  signedIn: boolean;
  me: string | null;
}) {
  const work = useWork(p.id);
  const mine = p.workers.find((w) => w.username === me);
  const [editing, setEditing] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { note = "" } = formValues(e.currentTarget);
    work.mutate(note, { onSuccess: () => setEditing(false) });
  }

  return (
    <Card>
      <p className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <Hammer size={13} /> En cours ({p.workers.length})
      </p>
      {p.workers.length > 0 ? (
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
          {p.workers.map((w) => (
            <li key={w.username} className="flex gap-3 px-4 py-3 text-sm">
              <Avatar name={w.name || w.username || "?"} size={28} />
              <div className="min-w-0">
                <Link to={`/u/${w.username}`} className="font-medium hover:underline">
                  {w.username}
                </Link>
                {w.note && <p className="text-neutral-600">{w.note}</p>}
                <p className="text-xs text-neutral-400">depuis le {formatDate(w.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500">
          Personne ne s'est encore déclaré sur ce problème.
        </p>
      )}
      {signedIn && p.status !== "closed" && (
        <div className="space-y-2 border-t border-neutral-200 p-4">
          {editing ? (
            <form onSubmit={submit} className="space-y-2">
              <Input
                name="note"
                defaultValue={mine?.note}
                placeholder="Votre piste en une phrase (facultatif)"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={work.isPending}>
                  {mine ? "Mettre à jour" : "Je m'y mets"}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          ) : mine ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Modifier ma note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={work.isPending}
                onClick={() => work.mutate(null)}
              >
                Je me retire
              </Button>
            </div>
          ) : (
            <Button size="sm" className="w-full" onClick={() => setEditing(true)}>
              <Hammer size={13} /> Je travaille dessus
            </Button>
          )}
          <ErrorText error={work.error} />
        </div>
      )}
    </Card>
  );
}
