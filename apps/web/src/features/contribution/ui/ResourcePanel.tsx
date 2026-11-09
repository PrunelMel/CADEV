// Onglet « Ressources » : le créateur importe ses médias, la plateforme les range toute seule dans
// le bon sous-dossier (images, audio, vidéos, GIF). Il n'a jamais à créer ni nommer un dossier.

import { useRef, useState } from "react";
import { FileAudio2, Film, FolderOpen, Trash2, Upload, X } from "lucide-react";
import type { Resource } from "../../../api/contribution";
import { MAX_BYTES, MEDIA_KINDS, MIME_BY_KIND, RESOURCE_FOLDER } from "../model";
import type { UploadError } from "./Inspector";
import { Group, INK, INK3, PAL, SOFT_BTN, Tile } from "./kit";

const KIND_LABEL = { image: "Images", audio: "Audio", video: "Vidéos", gif: "GIF" };
const ACCEPT = MEDIA_KINDS.flatMap((k) => MIME_BY_KIND[k]).join(",");

export const fmtSize = (n: number) =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(n / 1024))} Ko`;

export function ResourcePanel({
  resources,
  resourceUrl,
  usedIds,
  onUpload,
  onRemove,
  uploading,
  error,
  onClearError,
}: {
  resources: Resource[];
  resourceUrl: (id: string) => string;
  usedIds: Set<string>;
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  uploading: boolean;
  error: UploadError;
  onClearError: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (files: FileList | null | undefined) => {
    if (files?.length) onUpload(files);
  };
  const groups = MEDIA_KINDS.map((k) => ({
    kind: k,
    items: resources.filter((r) => r.kind === k),
  })).filter((g) => g.items.length);
  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        data-over={over}
        className="pp-slot grid min-h-[150px] place-items-center px-6 py-8 text-center"
      >
        <div className="space-y-3">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
            <Upload size={22} />
          </span>
          <p className={`text-[16px] font-semibold ${INK}`}>
            {uploading ? "Import en cours…" : "Déposez vos fichiers ici"}
          </p>
          <p className="mx-auto max-w-[44ch] text-[13.5px] leading-snug">
            Images, GIF, audio, vidéos. Ils sont rangés automatiquement dans le dossier du problème
            ; vous les associez ensuite aux blocs en quelques clics.
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-4 text-[14px] font-semibold text-[color:var(--accent-text)] disabled:opacity-60"
          >
            <FolderOpen size={15} />
            Choisir des fichiers
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] px-3.5 py-3 text-[13.5px] leading-snug"
          style={{
            background: "rgba(248,113,113,.08)",
            boxShadow: "inset 0 0 0 1px rgba(248,113,113,.3)",
          }}
        >
          <p className="min-w-0 flex-1 text-[color:var(--danger)]">
            {error.fileName ? <b className="font-semibold">{error.fileName} : </b> : null}
            {error.message}
          </p>
          <button
            type="button"
            aria-label="Fermer ce message"
            onClick={onClearError}
            className={SOFT_BTN}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {groups.map(({ kind, items }) => (
        <Group key={kind} title={KIND_LABEL[kind]} note={`resources/${RESOURCE_FOLDER[kind]}`}>
          <ul className="space-y-2">
            {items.map((r) => {
              const used = usedIds.has(r.id);
              return (
                <li
                  key={r.id}
                  className="pp-card flex items-center gap-3 p-2.5"
                  style={{ borderRadius: 16 }}
                >
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[#0A0F1D]">
                    {kind === "image" || kind === "gif" ? (
                      <img
                        src={resourceUrl(r.id)}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Tile c={PAL.sky} size={34} icon={kind === "audio" ? FileAudio2 : Film} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[14.5px] font-semibold ${INK}`}>{r.name}</p>
                    <p className={`text-[12.5px] ${INK3}`}>
                      {fmtSize(r.size)} · {r.mime.split("/")[1]}
                      {used && (
                        <span className="ml-2 text-[color:var(--accent-text)]">Utilisé</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={used}
                    onClick={() => onRemove(r.id)}
                    aria-label={
                      used ? `${r.name} est utilisé, impossible à supprimer` : `Supprimer ${r.name}`
                    }
                    title={used ? "Utilisé par un bloc ou par des réponses" : "Supprimer"}
                    className={SOFT_BTN}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      ))}
      <p className={`px-1 pt-2 text-[12.5px] leading-snug ${INK3}`}>
        Taille maximale :{" "}
        {MEDIA_KINDS.map(
          (k) => `${KIND_LABEL[k].toLowerCase()} ${Math.round(MAX_BYTES[k] / 1048576)} Mo`,
        ).join(" · ")}
        .
      </p>
    </div>
  );
}
