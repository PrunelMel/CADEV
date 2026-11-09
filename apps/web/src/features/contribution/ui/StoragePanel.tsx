// Onglet « Stockage » : la plateforme liste les champs collectés ; le créateur choisit le format
// d'enregistrement. L'arborescence est générée automatiquement ; elle n'est ici qu'affichée.

import {
  AudioLines,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Lock,
  Table2,
} from "lucide-react";
import type { StorageSettings, TreeNode } from "../../../api/contribution";
import { deriveFields, type FormConfig, type StorageFormat } from "../model";
import { ACCENT_FILL, ACCENT_TEXT, Group, INK, INK2, INK3, MONO, PAL, Switch, Tile } from "./kit";
import { fmtSize } from "./ResourcePanel";

const FORMATS: {
  id: StorageFormat;
  icon: typeof Table2;
  title: string;
  ext: string;
  text: string;
}[] = [
  {
    id: "csv",
    icon: Table2,
    title: "Tableau CSV",
    ext: ".csv",
    text: "Une ligne par contribution dans un seul fichier. S’ouvre dans Excel, LibreOffice, Python.",
  },
  {
    id: "xlsx",
    icon: FileSpreadsheet,
    title: "Classeur Excel",
    ext: ".xlsx",
    text: "Le même tableau en classeur, avec une feuille « Dictionnaire » qui décrit chaque colonne.",
  },
  {
    id: "txt",
    icon: FileText,
    title: "Un fichier texte par réponse",
    ext: ".txt",
    text: "Chaque contribution devient un fichier .txt distinct, pratique pour des textes longs.",
  },
];

const TYPE_LABEL: Record<string, string> = {
  text: "Texte",
  textarea: "Texte long",
  email: "E-mail",
  radio: "Choix unique",
  checkbox: "Choix multiple",
  select: "Liste",
};

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const Icon = node.type === "dir" ? Folder : File;
  return (
    <li>
      <div
        className={`flex items-center gap-2 py-1 text-[13.5px] ${node.type === "dir" ? INK : INK2}`}
        style={{ paddingLeft: depth * 16 }}
      >
        <Icon size={14} className={node.type === "dir" ? ACCENT_TEXT : INK3} aria-hidden />
        <span
          className="min-w-0 flex-1 truncate"
          style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
        >
          {node.name}
          {node.type === "dir" ? "/" : ""}
        </span>
        {node.type === "file" && node.size != null && (
          <span className={`text-[11.5px] ${INK3}`}>{fmtSize(node.size)}</span>
        )}
      </div>
      {!!node.children?.length && (
        <ul>
          {node.children.map((c) => (
            <TreeItem key={c.name} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function StoragePanel({
  config,
  onStorage,
  tree,
  exportUrl,
  published,
  error,
  submissions,
}: {
  config: FormConfig;
  onStorage: (patch: Partial<StorageSettings>) => void;
  tree: TreeNode[] | undefined;
  exportUrl: string;
  published: boolean;
  error: Error | null;
  submissions: number | undefined;
}) {
  const fields = deriveFields(config);
  const { format, includeContributor } = config.storage;
  const exportable = published && format !== "txt";
  return (
    <div className="space-y-2">
      <Group title="Champs collectés" note={`${fields.length}`}>
        {fields.length === 0 ? (
          <p className={`px-1 text-[14px] leading-snug ${INK3}`}>
            Aucun champ pour l’instant. Ajoutez un bloc de saisie dans le formulaire : il apparaîtra
            ici comme une colonne.
          </p>
        ) : (
          <ul className="space-y-2">
            {fields.map((f) => (
              <li
                key={f.key}
                className="pp-card flex items-center gap-3 px-3 py-2.5"
                style={{ borderRadius: 16 }}
              >
                <Tile
                  c={f.kind === "media_ref" ? PAL.sky : f.pii ? PAL.amber : PAL.lav}
                  size={30}
                  icon={f.kind === "media_ref" ? AudioLines : f.pii ? Lock : undefined}
                  code={f.kind === "value" && !f.pii ? "ab" : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14.5px] font-semibold ${INK}`}>
                    {f.label || "Sans intitulé"}
                  </p>
                  <p
                    className={`truncate text-[12px] ${INK3}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {f.key}
                  </p>
                </div>
                <span className={`shrink-0 text-[10.5px] ${MONO} ${INK2}`}>
                  {f.kind === "media_ref"
                    ? "Fichier média"
                    : f.pii
                      ? "Personnel"
                      : TYPE_LABEL[f.type]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group title="Format d’enregistrement">
        <div
          role="radiogroup"
          aria-label="Format d’enregistrement"
          className="grid gap-3 sm:grid-cols-3"
        >
          {FORMATS.map((f) => {
            const on = format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onStorage({ format: f.id })}
                className="pp-card flex flex-col items-start gap-3 p-4 text-left"
                data-selected={on}
              >
                <span className="flex w-full items-center justify-between">
                  <Tile c={PAL.lav} size={38} icon={f.icon} />
                  <span className={`text-[11px] ${MONO} ${on ? ACCENT_TEXT : INK3}`}>{f.ext}</span>
                </span>
                <span className={`text-[15px] leading-tight font-semibold ${INK}`}>{f.title}</span>
                <span className={`text-[13px] leading-snug ${INK3}`}>{f.text}</span>
              </button>
            );
          })}
        </div>
        <div
          className="flex items-center justify-between gap-4 rounded-[14px] bg-[color:var(--field)] px-3.5 py-3"
          style={{ boxShadow: "inset 0 0 0 1px var(--field-line)" }}
        >
          <label htmlFor="cd-contrib" className="min-w-0">
            <span className={`block text-[14.5px] font-semibold ${INK}`}>
              Identifiant du contributeur
            </span>
            <span className={`block text-[12.5px] leading-snug ${INK3}`}>
              Ajoute une colonne avec l’identifiant (jamais le nom ni l’e-mail) de chaque
              contributeur.
            </span>
          </label>
          <Switch
            id="cd-contrib"
            checked={includeContributor !== false}
            onChange={(v) => onStorage({ includeContributor: v })}
            label="Inclure l’identifiant du contributeur"
          />
        </div>
        {error && (
          <p role="alert" className="px-1 text-[13px] text-[color:var(--danger)]">
            {error.message}
          </p>
        )}
        <p className={`px-1 text-[12.5px] leading-snug ${INK3}`}>
          Changer de format reporte toutes les réponses déjà collectées dans le nouveau format.
          L’ancien fichier est conservé dans{" "}
          <code style={{ fontFamily: "var(--font-mono)" }}>responses/_archive</code>.
        </p>
        {published && (
          <p className={`px-1 text-[13.5px] ${INK2}`}>
            {submissions ?? 0} contribution{(submissions ?? 0) > 1 ? "s" : ""} reçue
            {(submissions ?? 0) > 1 ? "s" : ""}.
          </p>
        )}
        {exportable && (
          <a
            href={exportUrl}
            download
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
            style={ACCENT_FILL}
          >
            <Download size={16} strokeWidth={2.4} />
            Télécharger les réponses
          </a>
        )}
      </Group>

      <Group title="Arborescence du problème" note="Générée automatiquement">
        {tree?.length ? (
          <ul className="pp-card px-3 py-2.5" style={{ borderRadius: 16 }}>
            {tree.map((n) => (
              <TreeItem key={n.name} node={n} />
            ))}
          </ul>
        ) : (
          <p className={`px-1 text-[14px] leading-snug ${INK3}`}>
            Le dossier est créé dès l’enregistrement du premier brouillon.
          </p>
        )}
      </Group>
    </div>
  );
}
