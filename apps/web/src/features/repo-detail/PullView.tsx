/**
 * Pull request d'un dépôt, charte « Liquid Glass » : bandeau (dépôt, numéro, titre, statut,
 * version de base), fichiers proposés avec les conflits, actions (fusionner, fermer) et
 * discussion. L'auteur de la PR ajoute ses fichiers ; le propriétaire ou un collaborateur fusionne.
 */
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  GitMerge,
  GitPullRequest,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { usePull, usePullAction, useUploadPullFile } from "../../api/hooks";
import type { PullDetail } from "../../api/types";
import {
  ACCENT_TEXT,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  SOFT_SPRING,
  Tile,
} from "../../components/glass/Glass";
import { ListMessage } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import { formatDate } from "../../components/glass/problemBits";
import {
  FIELD,
  GlassButton,
  GlassDiscussion,
  Heading,
  Labelled,
} from "../../components/glass/sections";
import { ErrorText, formatSize } from "../../components/ui";
import { PAL } from "../../content/problem-form";
import { pullStatusLabels } from "../../content/site";
import { usePageTitle } from "../../hooks/usePageTitle";

const AMBER = PAL.amber[0];
const STATUS_TONE = { open: PAL.lav, merged: PAL.mint, closed: PAL.slate } as const;

export function PullView() {
  const { owner = "", name = "", number: raw = "" } = useParams();
  const number = Number(raw);
  const ref = { owner, name };
  const pull = usePull(ref, number);
  usePageTitle(pull.data ? `#${pull.data.number} ${pull.data.title}` : `${owner}/${name}`);
  const p = pull.data;
  return (
    <PageShell mainClassName="space-y-6 pb-16">
      {!p ? (
        <ListMessage>
          {pull.isError ? "Cette pull request est introuvable." : "Chargement…"}
        </ListMessage>
      ) : (
        <>
          <Hero pull={p} owner={owner} name={name} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Files pull={p} owner={owner} name={name} />
            <GlassDiscussion
              path={`/repos/${owner}/${name}/pulls/${number}`}
              note="Échangez sur la proposition avant sa fusion."
            />
          </div>
        </>
      )}
    </PageShell>
  );
}

function Hero({ pull: p, owner, name }: { pull: PullDetail; owner: string; name: string }) {
  const action = usePullAction({ owner, name }, p.number);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SOFT_SPRING}
      aria-labelledby="pr-title"
      className="lg lg-stage space-y-5 rounded-[30px] p-5 sm:p-8"
    >
      <Link
        to={`/${owner}/${name}?onglet=communaute`}
        className={`inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[14px] hover:underline ${INK2}`}
      >
        <ArrowLeft size={15} /> {owner}/{name}
      </Link>
      <div className="flex items-start gap-4">
        <Tile c={STATUS_TONE[p.status]} size={48} icon={GitPullRequest} />
        <div className="min-w-0 space-y-2">
          <h1
            id="pr-title"
            className={`text-[clamp(32px,3.6vw,54px)] leading-[.95] [text-wrap:balance] ${DISPLAY} ${INK}`}
          >
            #{p.number} {p.title}
          </h1>
          <p className={`text-[14px] ${INK2}`}>
            <span className={`font-semibold ${INK}`}>{pullStatusLabels[p.status]}</span> · par{" "}
            {p.author} le {formatDate(p.createdAt)}, basée sur{" "}
            {p.baseVersion ? `la version ${p.baseVersion}` : "un dépôt vide"}
            {p.mergedVersion && `, fusionnée en version ${p.mergedVersion}`}
          </p>
        </div>
      </div>
      {p.description && (
        <p className={`max-w-[70ch] text-[15.5px] leading-relaxed whitespace-pre-wrap ${INK2}`}>
          {p.description}
        </p>
      )}
      {(p.permissions.merge || p.permissions.close) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {p.permissions.merge && (
            <GlassButton
              primary
              type="button"
              disabled={action.isPending || !p.files.length || p.conflicts.length > 0}
              onClick={() => action.mutate("merge")}
            >
              <GitMerge size={16} /> Fusionner
            </GlassButton>
          )}
          {p.permissions.close && (
            <GlassButton
              type="button"
              disabled={action.isPending}
              onClick={() => action.mutate("close")}
            >
              <X size={16} /> Fermer
            </GlassButton>
          )}
          {p.permissions.merge && !p.files.length && (
            <span className={`text-[13.5px] ${INK3}`}>
              Aucun fichier à fusionner pour l’instant.
            </span>
          )}
          <ErrorText error={action.error} />
        </div>
      )}
    </motion.section>
  );
}

function Files({ pull: p, owner, name }: { pull: PullDetail; owner: string; name: string }) {
  const upload = useUploadPullFile({ owner, name }, p.number);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.name) return;
    const path = String(data.get("path") ?? "").trim() || file.name;
    upload.mutate({ path, file }, { onSuccess: () => form.reset() });
  }
  return (
    <div className="space-y-5">
      <Heading title={`Fichiers proposés (${p.files.length})`} />
      <Glass className="overflow-hidden rounded-[24px]">
        {p.files.length === 0 ? (
          <p className={`px-5 py-8 text-center text-[14.5px] ${INK3}`}>
            Aucun fichier proposé pour l’instant.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--hair)]">
            {p.files.map((f) => {
              const conflict = p.conflicts.includes(f.path);
              return (
                <li key={f.path} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                  <FileText size={16} className={INK3} />
                  <span
                    className={`min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] ${INK}`}
                  >
                    {f.path}
                  </span>
                  {conflict && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                      style={{ color: "var(--danger)", background: hexA("#f87171", 0.12) }}
                    >
                      Conflit
                    </span>
                  )}
                  <span className={`text-[13px] ${INK3}`}>{formatSize(f.size)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Glass>
      {p.conflicts.length > 0 && (
        <p
          className="flex items-start gap-2 px-1 text-[13.5px] leading-snug"
          style={{ color: AMBER }}
        >
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          Ces fichiers ont changé dans le dépôt depuis l’ouverture de la pull request. Fermez-la et
          ouvrez-en une nouvelle sur la dernière version.
        </p>
      )}
      {p.permissions.upload && (
        <Glass as="form" onSubmit={submit} className="space-y-4 rounded-[24px] p-5">
          <p className={`flex items-center gap-2 text-[16px] font-semibold ${INK}`}>
            <Upload size={16} /> Ajouter un fichier à la proposition
          </p>
          <Labelled label="Fichier">
            <input
              type="file"
              name="file"
              required
              className={`block w-full text-[14px] file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--accent-soft)] file:px-4 file:py-2 file:text-[13.5px] file:font-semibold file:text-[color:var(--accent-text)] ${INK2}`}
            />
          </Labelled>
          <Labelled label="Chemin dans le dépôt" hint="Par défaut : le nom du fichier">
            <input name="path" placeholder="poids/modele.onnx" className={`${FIELD} h-12 ${INK}`} />
          </Labelled>
          <ErrorText error={upload.error} />
          <GlassButton primary disabled={upload.isPending}>
            <Upload size={15} /> {upload.isPending ? "Envoi…" : "Ajouter"}
          </GlassButton>
        </Glass>
      )}
      {p.status !== "open" && (
        <p className={`px-1 text-[13.5px] ${ACCENT_TEXT}`}>
          Pull request {pullStatusLabels[p.status].toLowerCase()} : elle n’accepte plus de fichiers.
        </p>
      )}
    </div>
  );
}
