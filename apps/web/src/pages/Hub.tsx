import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle";
import { Plus } from "lucide-react";
import { useSession } from "../api/auth";
import {
  useCreateRepo,
  useLanguages,
  useLicenses,
  useNamespaces,
  useRepos,
  type RepoFilters,
  type RepoInput,
} from "../api/hooks";
import type { RepoType } from "../api/types";
import { RepoList } from "../components/Lists";
import {
  Band,
  Button,
  DisplayTitle,
  Eyebrow,
  Card,
  Checkbox,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Query,
  Select,
  Textarea,
  formValues,
  splitList,
} from "../components/ui";
import { countries, repoTypeLabels } from "../content/site";

export function HubPage() {
  usePageTitle("Hub de solutions");
  const { data: session } = useSession();
  const [filters, setFilters] = useState<RepoFilters>({});
  const repos = useRepos(filters);
  const languages = useLanguages();
  const set = (patch: RepoFilters) => setFilters({ ...filters, ...patch });

  return (
    <div className="space-y-6">
      <Band>
        <div className="space-y-4">
          <Eyebrow>Modèles, datasets, bibliothèques</Eyebrow>
          <DisplayTitle>Hub de solutions</DisplayTitle>
          <p className="max-w-2xl text-[#c9d1e0]">
            Chaque dépôt a sa fiche, sa licence et ses conditions d'usage sur le terrain : langues
            prises en charge, fonctionnement hors ligne, matériel cible.
          </p>
          {session && (
            <Link
              to="/nouveau-depot"
              className="inline-flex items-center gap-1.5 rounded-md bg-lilac px-4 py-2 text-sm font-medium text-night hover:bg-[#b5abf9]"
            >
              <Plus size={15} /> Créer un dépôt
            </Link>
          )}
        </div>
      </Band>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            placeholder="Filtrer par nom, description ou tâche"
            aria-label="Filtrer"
            value={filters.q ?? ""}
            onChange={(e) => set({ q: e.target.value || undefined })}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Type"
            value={filters.type ?? ""}
            onChange={(e) =>
              set({
                type: (e.target.value || undefined) as RepoType | undefined,
              })
            }
          >
            <option value="">Tous les types</option>
            {Object.entries(repoTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            aria-label="Langue"
            value={filters.language ?? ""}
            onChange={(e) => set({ language: e.target.value || undefined })}
          >
            <option value="">Toutes les langues</option>
            {languages.data?.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </div>
        <Checkbox
          label="Fonctionne hors ligne"
          checked={!!filters.offline}
          onChange={(e) => set({ offline: e.target.checked || undefined })}
        />
      </div>
      <Query query={repos}>{(items) => <RepoList items={items} />}</Query>
    </div>
  );
}

/** Champs de la fiche technique, communs à la création et aux paramètres. */
export function TechFields({
  initial,
}: {
  initial?: {
    task: string;
    languages: string[];
    worksOffline: boolean;
    targetHardware: string;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tâche" hint="Classification d'images, reconnaissance vocale, géocodage">
        <Input name="task" maxLength={200} defaultValue={initial?.task} />
      </Field>
      <Field label="Langues prises en charge" hint="Séparées par des virgules : Fon, Français">
        <Input name="languages" defaultValue={initial?.languages.join(", ")} />
      </Field>
      <Field label="Matériel cible" hint="Android 2 Go de RAM, serveur avec GPU">
        <Input name="targetHardware" maxLength={300} defaultValue={initial?.targetHardware} />
      </Field>
      <div className="flex items-end pb-2">
        <Checkbox
          name="worksOffline"
          label="Fonctionne sans connexion"
          defaultChecked={initial?.worksOffline}
        />
      </div>
    </div>
  );
}

/** Lit les champs de la fiche technique d'un formulaire. */
export const techValues = (v: Record<string, string>) => ({
  task: v.task ?? "",
  languages: splitList(v.languages),
  worksOffline: v.worksOffline === "on",
  targetHardware: v.targetHardware ?? "",
});

export function RepoNewPage() {
  usePageTitle("Créer un dépôt");
  const { data: session } = useSession();
  const namespaces = useNamespaces(!!session);
  const licenses = useLicenses();
  const create = useCreateRepo();
  const navigate = useNavigate();
  const [type, setType] = useState<RepoType>("model");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const input: RepoInput = {
      type,
      name: v.name,
      org: v.owner === "__me" ? undefined : v.owner,
      visibility: v.visibility === "private" ? "private" : "public",
      licenseId: v.licenseId,
      description: v.description,
      readme: v.readme,
      limitations: v.limitations,
      provenanceCommunity: v.provenanceCommunity || null,
      provenanceCountry: v.provenanceCountry || null,
      ...techValues(v),
    };
    create.mutate(input, {
      onSuccess: (r) => navigate(`/${r.owner}/${r.name}`),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créer un dépôt"
        intro="Un modèle, un dataset ou une bibliothèque. Vous gardez tous vos droits : seule la licence choisie s'applique."
      />
      <form onSubmit={submit} className="max-w-3xl space-y-6">
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value as RepoType)}>
                {Object.entries(repoTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Propriétaire">
              <Select name="owner">
                <option value="__me">{namespaces.data?.username ?? "moi"}</option>
                {namespaces.data?.adminOrgs.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nom" hint="Lettres, chiffres, points, tirets">
              <Input name="name" required pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{0,99}" />
            </Field>
          </div>
          <Field label="Description courte">
            <Input name="description" maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibilité">
              <Select name="visibility">
                <option value="public">Public</option>
                <option value="private">Privé</option>
              </Select>
            </Field>
            <Field label="Licence">
              <Select name="licenseId" required>
                {licenses.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.restrictions.length ? " (restrictions)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {type === "dataset" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Communauté d'origine des données">
                <Input name="provenanceCommunity" />
              </Field>
              <Field label="Pays d'origine">
                <Select name="provenanceCountry">
                  <option value="">Non renseigné</option>
                  {countries.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-medium">Fiche technique</h2>
            <p className="text-xs text-neutral-500">
              Elle permet de filtrer le hub et de suggérer votre dépôt aux problèmes compatibles.
            </p>
          </div>
          <TechFields />
        </Card>

        <Card className="space-y-4 p-5">
          <Field
            label="Fiche (documentation)"
            hint="Markdown : titres, listes, tableaux, blocs de code."
          >
            <Textarea name="readme" rows={10} />
          </Field>
          <Field label="Limites connues">
            <Textarea name="limitations" />
          </Field>
        </Card>
        <ErrorText error={create.error} />
        <Button disabled={create.isPending}>Créer le dépôt</Button>
      </form>
    </div>
  );
}
