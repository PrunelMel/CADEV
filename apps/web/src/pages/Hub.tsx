import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useSession } from "../api/auth";
import { useCreateRepo, useLicenses, useNamespaces, useRepos, type RepoInput } from "../api/hooks";
import type { RepoType } from "../api/types";
import { RepoList } from "../components/Lists";
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
import { countries, repoTypeLabels } from "../content/site";

export function HubPage() {
  const [type, setType] = useState<RepoType | "">("");
  const [q, setQ] = useState("");
  const repos = useRepos({ type: type || undefined, q: q || undefined });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hub de solutions</h1>
      <div className="flex gap-3">
        <Select value={type} onChange={(e) => setType(e.target.value as RepoType | "")}>
          <option value="">Tous les types</option>
          {Object.entries(repoTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filtrer par nom ou description"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Query query={repos}>{(items) => <RepoList items={items} />}</Query>
    </div>
  );
}

export function RepoNewPage() {
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
    };
    create.mutate(input, { onSuccess: (r) => navigate(`/${r.owner}/${r.name}`) });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Nouveau dépôt</h1>
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
        <Field label="Nom">
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
        <Field label="Licence" hint="Vous gardez tous vos droits : seule cette licence s'applique.">
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
      <Field label="Fiche (documentation, Markdown)">
        <Textarea name="readme" rows={8} />
      </Field>
      <Field label="Limites connues">
        <Textarea name="limitations" />
      </Field>
      <ErrorText error={create.error} />
      <Button disabled={create.isPending}>Créer</Button>
    </form>
  );
}
