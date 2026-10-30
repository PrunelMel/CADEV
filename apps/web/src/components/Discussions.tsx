import type { FormEvent } from "react";
import { useAddDiscussion, useDiscussions } from "../api/hooks";
import { useSession } from "../api/auth";
import { Button, ErrorText, Query, Section, Textarea, formatDate } from "./ui";

/** `path` : chemin API de la ressource, par exemple /repos/ivy/manioc ou /problems/<id>. */
export function Discussions({ path }: { path: string }) {
  const { data: session } = useSession();
  const list = useDiscussions(path);
  const add = useAddDiscussion(path);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (body) add.mutate(body, { onSuccess: () => form.reset() });
  }

  return (
    <Section title="Discussion">
      <Query query={list}>
        {(items) =>
          items.length ? (
            <ul className="space-y-3">
              {items.map((d) => (
                <li key={d.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
                  <p className="mb-1 text-xs text-neutral-500">
                    <span className="font-medium text-ink">{d.author}</span> ·{" "}
                    {formatDate(d.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{d.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Aucun message. Posez la première question.</p>
          )
        }
      </Query>
      {session && (
        <form onSubmit={submit} className="space-y-2">
          <Textarea name="body" placeholder="Votre message" required />
          <ErrorText error={add.error} />
          <Button disabled={add.isPending}>Publier</Button>
        </form>
      )}
    </Section>
  );
}
