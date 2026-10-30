import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Trash2 } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAddOrgMember, useCreateOrg, useOrg, useRemoveOrgMember } from "../api/hooks";
import { RepoLink } from "../components/Lists";
import {
  Button,
  ErrorText,
  Field,
  Input,
  Query,
  Section,
  Select,
  Tag,
  Textarea,
  formValues,
} from "../components/ui";
import { repoTypeLabels } from "../content/site";

export function OrgNewPage() {
  usePageTitle("Nouvelle organisation");
  const create = useCreateOrg();
  const navigate = useNavigate();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    create.mutate(
      { slug: v.slug, name: v.name, description: v.description },
      { onSuccess: (o) => navigate(`/orgs/${o.slug}`) },
    );
  }
  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nouvelle organisation</h1>
      <Field
        label="Identifiant"
        hint="Minuscules, chiffres et tirets. Apparaît dans l'adresse des dépôts."
      >
        <Input name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,38}" />
      </Field>
      <Field label="Nom">
        <Input name="name" required />
      </Field>
      <Field label="Description">
        <Textarea name="description" />
      </Field>
      <ErrorText error={create.error} />
      <Button disabled={create.isPending}>Créer</Button>
    </form>
  );
}

export function OrgDetailPage() {
  const { slug = "" } = useParams();
  const org = useOrg(slug);
  usePageTitle(org.data?.name ?? slug);
  const add = useAddOrgMember(slug);
  const remove = useRemoveOrgMember(slug);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    add.mutate(
      { username: v.username, role: v.role === "admin" ? "admin" : "member" },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <Query query={org}>
      {(o) => (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
            <p className="font-mono text-sm text-neutral-500">@{o.slug}</p>
            {o.description && <p className="mt-1">{o.description}</p>}
          </div>

          <Section title="Dépôts">
            {o.repos.length ? (
              <ul className="space-y-1">
                {o.repos.map((r) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <RepoLink owner={r.ownerSlug} name={r.name} />
                    <Tag>{repoTypeLabels[r.type]}</Tag>
                    {r.visibility === "private" && <Tag>Privé</Tag>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Aucun dépôt.</p>
            )}
          </Section>

          <Section title="Membres">
            <ul className="space-y-1 text-sm">
              {o.members.map((m) => (
                <li key={m.username} className="flex items-center gap-2">
                  <Link to={`/u/${m.username}`}>{m.username}</Link>
                  {m.role === "admin" && <Tag>Admin</Tag>}
                  {o.myRole === "admin" && m.username && (
                    <button
                      className="text-red-700"
                      title="Retirer"
                      onClick={() => remove.mutate(m.username!)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {o.myRole === "admin" && (
              <form onSubmit={submit} className="flex max-w-md gap-2">
                <Input name="username" placeholder="Nom d'utilisateur" required />
                <Select name="role">
                  <option value="member">Membre</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button disabled={add.isPending}>Ajouter</Button>
              </form>
            )}
            <ErrorText error={add.error ?? remove.error} />
          </Section>
        </div>
      )}
    </Query>
  );
}
