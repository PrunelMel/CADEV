import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useCreateProblem, useProblems, type ProblemInput } from "../api/hooks";
import { ProblemList } from "../components/Lists";
import {
  Button,
  ErrorText,
  Field,
  Input,
  Query,
  Select,
  Textarea,
  formValues,
} from "../components/ui";
import { countries, sectors } from "../content/site";

export function ProblemsPage() {
  const [filters, setFilters] = useState({ sector: "", country: "" });
  const problems = useProblems(filters);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Problèmes</h1>
      <div className="flex gap-3">
        <Select
          value={filters.sector}
          onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
        >
          <option value="">Tous les secteurs</option>
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value })}
        >
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

export function ProblemNewPage() {
  const create = useCreateProblem();
  const navigate = useNavigate();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget) as ProblemInput;
    create.mutate(v, { onSuccess: (p) => navigate(`/problemes/${p.id}`) });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Publier un problème</h1>
      <Field
        label="Titre"
        hint="En langage courant, par exemple « Détecter les maladies du manioc »."
      >
        <Input name="title" required minLength={5} />
      </Field>
      <Field label="Description du besoin">
        <Textarea name="description" required minLength={20} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Secteur">
          <Select name="sector" required>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pays">
          <Select name="country" required>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Contraintes terrain</legend>
        <Field label="Connectivité">
          <Input name="connectivityConstraint" placeholder="Hors ligne, 2G, réseau intermittent…" />
        </Field>
        <Field label="Matériel">
          <Input name="hardwareConstraint" placeholder="Téléphone Android d'entrée de gamme…" />
        </Field>
        <Field label="Langue">
          <Input name="languageConstraint" placeholder="Fon, Darija, Wolof…" />
        </Field>
      </fieldset>
      <Field label="Critères d'évaluation" hint="Comment vous jugerez les solutions proposées.">
        <Textarea name="evaluationCriteria" required minLength={10} />
      </Field>
      <ErrorText error={create.error} />
      <Button disabled={create.isPending}>Publier</Button>
    </form>
  );
}
