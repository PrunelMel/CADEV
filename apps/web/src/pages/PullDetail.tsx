import { Link, useParams } from "react-router";
import { GitMerge, X } from "lucide-react";
import { usePull, usePullAction, useUploadPullFile } from "../api/hooks";
import { Discussions } from "../components/Discussions";
import { FileUpload } from "../components/FileUpload";
import { Button, ErrorText, Query, Section, Tag, formatDate, formatSize } from "../components/ui";

const statusText = { open: "Ouverte", merged: "Fusionnée", closed: "Fermée" };

export function PullDetailPage() {
  const { owner = "", name = "", number: raw = "" } = useParams();
  const number = Number(raw);
  const ref = { owner, name };
  const pull = usePull(ref, number);
  const upload = useUploadPullFile(ref, number);
  const action = usePullAction(ref, number);

  return (
    <Query query={pull}>
      {(p) => (
        <div className="space-y-6">
          <div className="space-y-1">
            <Link to={`/${owner}/${name}?tab=pulls`} className="font-mono text-sm hover:underline">
              {owner}/{name}
            </Link>
            <h1 className="text-xl font-semibold">
              #{p.number} {p.title}
            </h1>
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Tag tone={p.status === "merged" ? "green" : p.status === "closed" ? "red" : "amber"}>
                {statusText[p.status]}
              </Tag>
              par {p.author} le {formatDate(p.createdAt)}, basée sur{" "}
              {p.baseVersion ? `la version ${p.baseVersion}` : "un dépôt vide"}
              {p.mergedVersion && `, fusionnée en version ${p.mergedVersion}`}
            </p>
            {p.description && <p className="whitespace-pre-wrap text-sm">{p.description}</p>}
          </div>

          <Section title={`Fichiers proposés (${p.files.length})`}>
            {p.files.length > 0 && (
              <ul className="divide-y divide-neutral-200 text-sm">
                {p.files.map((f) => (
                  <li key={f.path} className="flex justify-between py-1.5">
                    <span className="font-mono">
                      {f.path}
                      {p.conflicts.includes(f.path) && (
                        <span className="ml-2">
                          <Tag tone="red">Conflit</Tag>
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-500">{formatSize(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.conflicts.length > 0 && (
              <p className="text-sm text-red-700">
                Ces fichiers ont été modifiés dans le dépôt depuis l'ouverture de la PR. Fermez-la
                et ouvrez-en une nouvelle sur la dernière version.
              </p>
            )}
            {p.permissions.upload && (
              <FileUpload
                withMessage={false}
                pending={upload.isPending}
                error={upload.error}
                onUpload={({ path, file }, reset) =>
                  upload.mutate({ path, file }, { onSuccess: reset })
                }
              />
            )}
          </Section>

          {(p.permissions.merge || p.permissions.close) && (
            <div className="flex gap-2">
              {p.permissions.merge && (
                <Button
                  disabled={action.isPending || !p.files.length || p.conflicts.length > 0}
                  onClick={() => action.mutate("merge")}
                >
                  <GitMerge size={14} /> Fusionner
                </Button>
              )}
              {p.permissions.close && (
                <Button
                  variant="secondary"
                  disabled={action.isPending}
                  onClick={() => action.mutate("close")}
                >
                  <X size={14} /> Fermer
                </Button>
              )}
              <ErrorText error={action.error} />
            </div>
          )}

          <Discussions path={`/repos/${owner}/${name}/pulls/${number}`} />
        </div>
      )}
    </Query>
  );
}
