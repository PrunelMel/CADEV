import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { useSession } from "../api/auth";
import {
  useCountryCounts,
  useCreateProblem,
  useProblem,
  useProblems,
  useUpdateProblem,
  type ProblemFilters,
  type ProblemInput,
} from "../api/hooks";
import type { ProblemDetail, ProblemStatus } from "../api/types";
import { AfricaMap } from "../components/AfricaMap";
import { ProblemList } from "../components/Lists";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  Band,
  Button,
  Card,
  DisplayTitle,
  Eyebrow,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Query,
  Select,
  Textarea,
  formValues,
} from "../components/ui";
import { countries, problemStatusLabels, sectors } from "../content/site";

export function ProblemsPage() {
  usePageTitle("Problèmes");
  const { data: session } = useSession();
  const [params, setParams] = useSearchParams();
  // Le pays vient de l'URL : la carte de l'accueil y renvoie directement.
  const country = params.get("pays") ?? "";
  const [filters, setFilters] = useState<Omit<ProblemFilters, "country">>({
    status: country ? "" : "open",
  });
  const problems = useProblems({ ...filters, country });
  const countryCounts = useCountryCounts();
  const set = (patch: Omit<ProblemFilters, "country">) => setFilters({ ...filters, ...patch });
  const setCountry = (c: string) => setParams(c ? { pays: c } : {}, { replace: true });

  return (
    <div className="space-y-6">
      <Band>
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <Eyebrow>Des besoins réels</Eyebrow>
            <DisplayTitle>Problèmes</DisplayTitle>
            <p className="max-w-2xl text-[#c9d1e0]">
              Publiés par des entreprises, des ONG et des institutions. Chaque problème rassemble
              toutes les tentatives, réussies ou non, et qui travaille dessus en ce moment.
            </p>
            {session && (
              <Link
                to="/problemes/nouveau"
                className="inline-flex items-center gap-1.5 rounded-md bg-lilac px-4 py-2 text-sm font-medium text-night hover:bg-[#b5abf9]"
              >
                <Plus size={15} /> Publier un problème
              </Link>
            )}
          </div>
          {countryCounts.data && (
            <AfricaMap
              counts={countryCounts.data}
              variant="dark"
              className="hidden w-full md:block"
            />
          )}
        </div>
      </Band>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Filtrer par mot-clé"
          aria-label="Filtrer par mot-clé"
          value={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
        />
        <Select
          aria-label="Statut"
          value={filters.status ?? ""}
          onChange={(e) => set({ status: e.target.value as ProblemStatus | "" })}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(problemStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Secteur"
          value={filters.sector ?? ""}
          onChange={(e) => set({ sector: e.target.value })}
        >
          <option value="">Tous les secteurs</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select aria-label="Pays" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>
      <Query query={problems}>{(items) => <ProblemList items={items} />}</Query>
    </div>
  );
}

/** Formulaire commun à la publication et à la modification d'un problème. */
function ProblemForm({
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
}: {
  initial?: ProblemDetail;
  pending: boolean;
  error: unknown;
  submitLabel: string;
  onSubmit: (v: ProblemInput & { status?: ProblemStatus }) => void;
}) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(formValues(e.currentTarget) as ProblemInput & { status?: ProblemStatus });
  }
  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <Card className="space-y-4 p-5">
        <Field
          label="Titre"
          hint="En langage courant, par exemple « Détecter les maladies du manioc »."
        >
          <Input name="title" required minLength={5} defaultValue={initial?.title} />
        </Field>
        <Field
          label="Description du besoin"
          hint="Ce qui ne marche pas aujourd'hui, pour qui, et ce que ça coûte."
        >
          <Textarea
            name="description"
            required
            minLength={20}
            rows={5}
            defaultValue={initial?.description}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Secteur">
            <Select name="sector" required defaultValue={initial?.sector ?? ""}>
              <option value="" disabled>
                Choisir un secteur
              </option>
              {sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Pays">
            <Select name="country" required defaultValue={initial?.country ?? ""}>
              <option value="" disabled>
                Choisir un pays
              </option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-medium">Contraintes terrain</h2>
          <p className="text-xs text-neutral-500">
            Elles servent à suggérer les dépôts compatibles (hors ligne, langues).
          </p>
        </div>
        <Field
          label="Connectivité"
          hint="Renseignez ce champ si la solution doit fonctionner sans réseau fiable."
        >
          <Input
            name="connectivityConstraint"
            placeholder="Hors ligne, 2G, réseau intermittent"
            defaultValue={initial?.connectivityConstraint}
          />
        </Field>
        <Field label="Matériel">
          <Input
            name="hardwareConstraint"
            placeholder="Téléphone Android d'entrée de gamme"
            defaultValue={initial?.hardwareConstraint}
          />
        </Field>
        <Field label="Langue">
          <Input
            name="languageConstraint"
            placeholder="Fon, Darija, Wolof"
            defaultValue={initial?.languageConstraint}
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <Field label="Critères d'évaluation" hint="Comment vous jugerez les solutions proposées.">
          <Textarea
            name="evaluationCriteria"
            required
            minLength={10}
            defaultValue={initial?.evaluationCriteria}
          />
        </Field>
        {initial && (
          <Field label="Statut" hint="Un problème fermé n'accepte plus de nouvelles propositions.">
            <Select name="status" defaultValue={initial.status}>
              {Object.entries(problemStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Card>
      <ErrorText error={error} />
      <Button disabled={pending}>{submitLabel}</Button>
    </form>
  );
}

export function ProblemNewPage() {
  usePageTitle("Publier un problème");
  const create = useCreateProblem();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publier un problème"
        intro="Décrivez le besoin tel que vous le vivez. La communauté s'en charge."
      />
      <ProblemForm
        pending={create.isPending}
        error={create.error}
        submitLabel="Publier"
        onSubmit={(v) => create.mutate(v, { onSuccess: (p) => navigate(`/problemes/${p.id}`) })}
      />
    </div>
  );
}

export function ProblemEditPage() {
  const { id = "" } = useParams();
  const problem = useProblem(id);
  const update = useUpdateProblem(id);
  const navigate = useNavigate();
  return (
    <Query query={problem}>
      {(p) =>
        p.isAuthor ? (
          <div className="space-y-6">
            <PageHeader title="Modifier le problème" intro={p.title} />
            <ProblemForm
              initial={p}
              pending={update.isPending}
              error={update.error}
              submitLabel="Enregistrer"
              onSubmit={(v) =>
                update.mutate(v, {
                  onSuccess: () => navigate(`/problemes/${id}`),
                })
              }
            />
          </div>
        ) : (
          <ErrorText error={new Error("Seul l'auteur peut modifier ce problème.")} />
        )
      }
    </Query>
  );
}
