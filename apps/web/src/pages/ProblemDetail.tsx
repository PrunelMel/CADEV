import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useSession } from "../api/auth";
import { useProblem, useSubmitContribution, useSubmitSolution, useValidate } from "../api/hooks";
import type { ReviewStatus, Validation } from "../api/types";
import { Discussions } from "../components/Discussions";
import { LicenseWarning } from "../components/LicenseWarning";
import { RepoLink } from "../components/Lists";
import {
  Button,
  ErrorText,
  Field,
  Input,
  Query,
  Section,
  Tag,
  Textarea,
  formValues,
  formatDate,
  statusTone,
} from "../components/ui";
import { repoTypeLabels, statusLabels } from "../content/site";

export function ProblemDetailPage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  const { data: session } = useSession();

  return (
    <Query query={problem}>
      {(p) => (
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{p.title}</h1>
            <p className="text-xs text-neutral-500">
              {p.sector} · {p.country} · publié par{" "}
              <Link to={`/u/${p.author}`} className="underline">
                {p.author}
              </Link>{" "}
              le {formatDate(p.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{p.description}</p>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Connectivité", p.connectivityConstraint],
              ["Matériel", p.hardwareConstraint],
              ["Langue", p.languageConstraint],
              ["Critères d'évaluation", p.evaluationCriteria],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium">{k}</dt>
                  <dd className="whitespace-pre-wrap text-neutral-700">{v}</dd>
                </div>
              ))}
          </dl>

          <Section title={`Solutions proposées (${p.solutions.length})`}>
            <p className="text-xs text-neutral-500">
              Toutes les tentatives restent visibles, y compris celles rejetées.
            </p>
            {p.solutions.length === 0 && (
              <p className="text-sm text-neutral-500">Aucune solution pour l'instant.</p>
            )}
            <ul className="space-y-4">
              {p.solutions.map((s) => (
                <li key={s.id} className="space-y-2 border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RepoLink {...s.repo} />
                    <Tag>{repoTypeLabels[s.repo.type]}</Tag>
                    <Tag tone={statusTone[s.status]}>{statusLabels[s.status]}</Tag>
                    <span className="text-xs text-neutral-500">par {s.submittedBy}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.summary}</p>
                  {s.fieldResults && (
                    <p className="text-sm whitespace-pre-wrap">
                      <span className="font-medium">Résultats terrain : </span>
                      {s.fieldResults}
                    </p>
                  )}
                  <LicenseWarning license={s.license} />
                  <History items={s.validations} />
                  {p.isAuthor && (
                    <Review problemId={p.id} kind="solutions" id={s.id} status={s.status} />
                  )}
                </li>
              ))}
            </ul>
            {session && <SolutionForm problemId={p.id} />}
          </Section>

          <Section title={`Contributions de données (${p.contributions.length})`}>
            {p.contributions.length === 0 && (
              <p className="text-sm text-neutral-500">Aucune contribution.</p>
            )}
            <ul className="space-y-4">
              {p.contributions.map((c) => (
                <li key={c.id} className="space-y-2 border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={statusTone[c.status]}>{statusLabels[c.status]}</Tag>
                    <span className="text-xs text-neutral-500">
                      par {c.contributor} · provenance : {c.provenanceCommunity},{" "}
                      {c.provenanceCountry}
                    </span>
                    {c.dataset && <RepoLink {...c.dataset} />}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.description}</p>
                  <History items={c.validations} />
                  {p.isAuthor && (
                    <Review problemId={p.id} kind="contributions" id={c.id} status={c.status} />
                  )}
                </li>
              ))}
            </ul>
            {session && <ContributionForm problemId={p.id} />}
          </Section>

          <Discussions path={`/problems/${p.id}`} />
        </div>
      )}
    </Query>
  );
}

function History({ items }: { items: Validation[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1 text-xs text-neutral-600">
      {items.map((v) => (
        <li key={v.createdAt}>
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
}) {
  const validate = useValidate(props.problemId);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "rejected" ? "rejected" : "accepted";
    const { comment = "" } = formValues(e.currentTarget);
    validate.mutate({ kind: props.kind, id: props.id, decision, comment });
  }
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
      <div className="flex-1">
        <Input name="comment" placeholder="Commentaire (facultatif)" />
      </div>
      <Button value="accepted" disabled={validate.isPending || props.status === "accepted"}>
        Accepter
      </Button>
      <Button
        value="rejected"
        variant="danger"
        disabled={validate.isPending || props.status === "rejected"}
      >
        Rejeter
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
    <details className="border border-neutral-200 p-3">
      <summary className="cursor-pointer text-sm font-medium">Proposer une solution</summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <Field
          label="Dépôt public"
          hint="proprietaire/nom, un dépôt sur lequel vous pouvez écrire."
        >
          <Input name="repo" required placeholder="ivy/manioc-vit" />
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
    <details className="border border-neutral-200 p-3">
      <summary className="cursor-pointer text-sm font-medium">Contribuer des données</summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <Field label="Description des données">
          <Textarea name="description" required minLength={10} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Communauté d'origine">
            <Input name="provenanceCommunity" required />
          </Field>
          <Field label="Pays d'origine">
            <Input name="provenanceCountry" required />
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
