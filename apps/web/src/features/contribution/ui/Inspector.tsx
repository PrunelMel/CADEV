// Inspecteur du bloc sélectionné : libellé, aide, obligatoire, choix, fichier média, lien, relecture.
// C'est ici que le créateur associe un média importé à un bloc d'affichage : la plateforme lui
// propose les fichiers compatibles du dossier de ressources, un clic suffit.

import { useEffect, useRef, type Dispatch, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  FileAudio2,
  Film,
  Link2,
  Lock,
  Minus,
  Plus,
  Upload,
  X,
} from "lucide-react";
import type { Resource } from "../../../api/contribution";
import {
  BLOCK_TYPES,
  LIMITS,
  MIME_BY_KIND,
  blockDef,
  deriveFields,
  membersOf,
  type Block,
  type BlockPatch,
  type FormConfig,
  type MediaKind,
} from "../model";
import type { BuilderAction } from "../state/builderReducer";
import {
  ACCENT_TEXT,
  ICONS,
  INK,
  INK2,
  INK3,
  MONO,
  PAL,
  SOFT_BTN,
  Switch,
  Tile,
  toneOf,
} from "./kit";

type Dispatcher = Dispatch<BuilderAction>;
export type UploadError = (Error & { fileName?: string }) | null;

const FIELD_INPUT =
  "block w-full bg-transparent px-3.5 text-[15px] leading-relaxed outline-none text-[color:var(--ink)]";

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className={`mb-2 block px-1 text-[11px] leading-none ${MONO} ${INK2}`}
      >
        {label}
      </label>
      {children}
      {hint && <p className={`mt-2 px-1 text-[12.5px] leading-snug ${INK3}`}>{hint}</p>}
    </div>
  );
}

function OptionsEditor({
  options,
  min,
  onChange,
}: {
  options: string[];
  min: number;
  onChange: (o: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focusLast = useRef(false);
  useEffect(() => {
    if (focusLast.current) {
      refs.current[options.length - 1]?.focus();
      focusLast.current = false;
    }
  }, [options.length]);
  const lower = options.map((o) => o.trim().toLowerCase());
  const set = (i: number, v: string) => onChange(options.map((o, j) => (j === i ? v : o)));
  const add = () => {
    focusLast.current = true;
    onChange([...options, `Option ${options.length + 1}`]);
  };
  return (
    <div className="space-y-2">
      {options.map((o, i) => {
        const dup = !!o.trim() && lower.indexOf(o.trim().toLowerCase()) !== i;
        return (
          <div key={i} className="pp-field flex items-center gap-1 pr-1">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={o}
              maxLength={LIMITS.optionLength}
              aria-label={`Choix ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
                if (e.key === "Backspace" && !o && options.length > 1) {
                  e.preventDefault();
                  onChange(options.filter((_, j) => j !== i));
                  refs.current[Math.max(0, i - 1)]?.focus();
                }
              }}
              className={`${FIELD_INPUT} h-[44px]`}
            />
            {dup && <span className={`shrink-0 text-[11px] ${ACCENT_TEXT} ${MONO}`}>Doublon</span>}
            <button
              type="button"
              aria-label={`Retirer le choix ${i + 1}`}
              disabled={options.length <= 1}
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className={SOFT_BTN}
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={options.length >= LIMITS.options}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--accent-soft)] px-3.5 text-[13.5px] font-semibold ${ACCENT_TEXT} disabled:opacity-40`}
        >
          <Plus size={14} strokeWidth={2.6} />
          Ajouter un choix
        </button>
        {options.length < min && (
          <span className={`text-[12.5px] ${INK3}`}>{min} choix minimum pour publier</span>
        )}
      </div>
    </div>
  );
}

function MediaPicker({
  block,
  kind,
  resources,
  resourceUrl,
  onUpload,
  uploading,
  uploadError,
  dispatch,
}: {
  block: Block;
  kind: MediaKind;
  resources: Resource[];
  resourceUrl: (id: string) => string;
  onUpload: (files: FileList, kind?: MediaKind) => Promise<Resource[]>;
  uploading: boolean;
  uploadError: UploadError;
  dispatch: Dispatcher;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const compatible = resources.filter((r) => r.kind === kind);
  const bind = (id: string | null) =>
    dispatch({
      type: "UPDATE",
      id: block.id,
      patch: { props: { resourceId: id } },
      at: Date.now(),
    });
  const onFiles = async (files: FileList) => {
    const [first] = await onUpload(files, kind);
    if (first) bind(first.id); // le fichier importé est lié tout de suite
  };
  const selected = block.props.resourceId;
  return (
    <div className="space-y-3">
      {compatible.length === 0 && (
        <p className={`px-1 text-[13.5px] leading-snug ${INK3}`}>
          Aucun fichier compatible dans le dossier de ressources. Importez-en un : il sera rangé et
          lié automatiquement.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {compatible.map((r) => {
          const on = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => bind(on ? null : r.id)}
              title={r.name}
              className="pp-card relative overflow-hidden p-0 text-left"
              data-selected={on}
              style={{ borderRadius: 14 }}
            >
              <span className="block h-[68px] bg-[#0A0F1D]">
                {kind === "image" || kind === "gif" ? (
                  <img
                    src={resourceUrl(r.id)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center">
                    <Tile c={PAL.sky} size={36} icon={kind === "audio" ? FileAudio2 : Film} />
                  </span>
                )}
              </span>
              <span className={`block truncate px-2.5 py-2 text-[12.5px] font-semibold ${INK}`}>
                {r.name}
              </span>
              {on && (
                <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--on-accent)]">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={MIME_BY_KIND[kind].join(",")}
        onChange={(e) => {
          if (e.target.files?.length) void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="pp-slot flex h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold disabled:opacity-60"
      >
        <Upload size={15} />
        {uploading ? "Import en cours…" : "Importer un fichier"}
      </button>
      {uploadError && (
        <p role="alert" className="px-1 text-[13px] leading-snug text-[color:var(--danger)]">
          {uploadError.fileName ? `${uploadError.fileName} : ` : ""}
          {uploadError.message}
        </p>
      )}
      {(block.type === "image" || block.type === "gif") && (
        <Row
          label="Texte alternatif"
          htmlFor={`alt-${block.id}`}
          hint="Décrit l’image pour les lecteurs d’écran."
        >
          <div className="pp-field">
            <input
              id={`alt-${block.id}`}
              value={block.props.alt ?? ""}
              maxLength={LIMITS.label}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE",
                  id: block.id,
                  patch: { props: { alt: e.target.value } },
                  at: Date.now(),
                })
              }
              className={`${FIELD_INPUT} h-[46px]`}
            />
          </div>
        </Row>
      )}
    </div>
  );
}

function LinkSection({
  block,
  config,
  dispatch,
}: {
  block: Block;
  config: FormConfig;
  dispatch: Dispatcher;
}) {
  const members = membersOf(config, block.id);
  const candidates = config.blocks.filter((b) => !b.linkedTo && b.id !== block.id);
  const anchor = block.linkedTo ? config.blocks.find((b) => b.id === block.linkedTo) : null;
  const change = (anchorId: string) =>
    dispatch(
      anchorId ? { type: "LINK", id: block.id, anchorId } : { type: "UNLINK", id: block.id },
    );
  if (members.length) {
    return (
      <p
        className={`rounded-[14px] bg-[color:var(--field)] px-3.5 py-3 text-[13.5px] leading-snug ${INK2}`}
        style={{ boxShadow: "inset 0 0 0 1px var(--field-line)" }}
      >
        <Link2 size={14} className="mr-1.5 inline -translate-y-px" />
        Ce bloc porte {members.length} bloc{members.length > 1 ? "s" : ""} lié
        {members.length > 1 ? "s" : ""}.
        {blockDef(block.type)?.mediaKind &&
          " Dans le tableau, chaque réponse reçoit le nom du fichier affiché ici."}
      </p>
    );
  }
  return (
    <Row
      label="Lié au bloc"
      htmlFor={`link-${block.id}`}
      hint={
        anchor && blockDef(anchor.type)?.mediaKind
          ? "La réponse est enregistrée avec le nom du fichier de ce média."
          : "Les blocs liés s’affichent ensemble, dans une même carte."
      }
    >
      <div className="pp-field relative">
        <select
          id={`link-${block.id}`}
          value={block.linkedTo ?? ""}
          onChange={(e) => change(e.target.value)}
          disabled={!candidates.length}
          className={`${FIELD_INPUT} h-[46px] appearance-none pr-10`}
        >
          <option value="" className="bg-[#0D121F]">
            Aucun (bloc autonome)
          </option>
          {candidates.map((b) => (
            <option key={b.id} value={b.id} className="bg-[#0D121F]">
              {BLOCK_TYPES[b.type].label} · {b.label || "sans intitulé"}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className={`pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 ${INK3}`}
        />
      </div>
    </Row>
  );
}

function ReviewProps({
  block,
  config,
  dispatch,
}: {
  block: Block;
  config: FormConfig;
  dispatch: Dispatcher;
}) {
  const targets = deriveFields(config).filter(
    (f) => f.kind === "value" && !f.pii && ["text", "textarea", "radio", "select"].includes(f.type),
  );
  const keys = block.props.targetKeys ?? null;
  const all = keys == null;
  const set = (patch: BlockPatch["props"]) =>
    dispatch({ type: "UPDATE", id: block.id, patch: { props: patch }, at: Date.now() });
  const min = block.props.minAgreements ?? 2;
  return (
    <>
      <Row
        label="Champs relisibles"
        hint="Les champs personnels (e-mail) ne sont jamais montrés aux relecteurs."
      >
        {targets.length === 0 ? (
          <p className={`px-1 text-[13.5px] ${INK3}`}>
            Ajoutez d’abord un champ texte ou de choix.
          </p>
        ) : (
          <div className="space-y-2">
            <label
              className="pp-field flex min-h-[44px] cursor-pointer items-center gap-3 px-3.5"
              data-checked={all}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={all}
                onChange={() => set({ targetKeys: all ? targets.map((t) => t.key) : null })}
              />
              <span className={`text-[14.5px] font-semibold ${INK}`}>Tous les champs</span>
            </label>
            {!all &&
              targets.map((t) => {
                const on = keys.includes(t.key);
                return (
                  <label
                    key={t.key}
                    className="pp-field flex min-h-[44px] cursor-pointer items-center gap-3 px-3.5"
                    data-checked={on}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() =>
                        set({ targetKeys: on ? keys.filter((k) => k !== t.key) : [...keys, t.key] })
                      }
                    />
                    <span className={`min-w-0 flex-1 truncate text-[14.5px] ${INK}`}>
                      {t.label}
                    </span>
                  </label>
                );
              })}
          </div>
        )}
      </Row>
      <Row
        label="Seuil d’accord signalé"
        hint={`Une correction proposée par ${min} contributeur${min > 1 ? "s" : ""} distinct${min > 1 ? "s" : ""} vous est signalée. Vous seul la validez ou la rejetez.`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Moins"
            disabled={min <= 1}
            onClick={() => set({ minAgreements: min - 1 })}
            className={`${SOFT_BTN} bg-[color:var(--chip)]`}
          >
            <Minus size={15} />
          </button>
          <span className={`w-8 text-center text-[18px] font-semibold ${INK}`} aria-live="polite">
            {min}
          </span>
          <button
            type="button"
            aria-label="Plus"
            disabled={min >= 10}
            onClick={() => set({ minAgreements: min + 1 })}
            className={`${SOFT_BTN} bg-[color:var(--chip)]`}
          >
            <Plus size={15} />
          </button>
        </div>
      </Row>
    </>
  );
}

export function Inspector({
  block,
  config,
  dispatch,
  resources,
  resourceUrl,
  onUpload,
  uploading,
  uploadError,
  onClose,
}: {
  block: Block;
  config: FormConfig;
  dispatch: Dispatcher;
  resources: Resource[];
  resourceUrl: (id: string) => string;
  onUpload: (files: FileList, kind?: MediaKind) => Promise<Resource[]>;
  uploading: boolean;
  uploadError: UploadError;
  onClose: () => void;
}) {
  const def = blockDef(block.type)!;
  const Icon = ICONS[def.icon];
  const upd = (patch: BlockPatch) =>
    dispatch({ type: "UPDATE", id: block.id, patch, at: Date.now() });
  const maxLimit =
    block.type === "text" || block.type === "textarea" ? LIMITS.maxLength[block.type] : null;
  return (
    <div className="flex h-full min-h-0 flex-col" data-inspector={block.id}>
      <div className="flex shrink-0 items-center gap-3 pb-4">
        <Tile c={toneOf(def.tone)} size={38} icon={Icon} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] ${MONO} ${INK3}`}>Inspection</p>
          <h3 className={`truncate text-[17px] leading-tight font-semibold ${INK}`}>{def.label}</h3>
        </div>
        <button
          type="button"
          aria-label="Fermer l’inspecteur"
          onClick={onClose}
          className={SOFT_BTN}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
      <div className="pp-scroll -mr-2 min-h-0 flex-1 space-y-5 overflow-y-auto pr-2 pb-3">
        <Row label="Intitulé" htmlFor={`lbl-${block.id}`}>
          <div className="pp-field">
            <input
              id={`lbl-${block.id}`}
              value={block.label}
              maxLength={LIMITS.label}
              onChange={(e) => upd({ label: e.target.value })}
              className={`${FIELD_INPUT} h-[46px]`}
            />
          </div>
        </Row>
        <Row
          label="Aide (facultatif)"
          htmlFor={`help-${block.id}`}
          hint="Une phrase sous le champ pour guider le contributeur."
        >
          <div className="pp-field">
            <textarea
              id={`help-${block.id}`}
              value={block.help ?? ""}
              maxLength={LIMITS.help}
              onChange={(e) => upd({ help: e.target.value })}
              className={`${FIELD_INPUT} max-h-[160px] min-h-[76px] resize-none py-3 [field-sizing:content]`}
            />
          </div>
        </Row>

        {def.collects && (
          <div
            className="flex items-center justify-between gap-4 rounded-[14px] bg-[color:var(--field)] px-3.5 py-3"
            style={{ boxShadow: "inset 0 0 0 1px var(--field-line)" }}
          >
            <label htmlFor={`req-${block.id}`} className={`text-[14.5px] font-semibold ${INK}`}>
              Réponse obligatoire
            </label>
            <Switch
              id={`req-${block.id}`}
              checked={!!block.required}
              onChange={(v) => upd({ required: v })}
              label="Réponse obligatoire"
            />
          </div>
        )}

        {def.options && (
          <Row label="Choix proposés">
            <OptionsEditor
              options={block.props.options ?? []}
              min={def.minOptions ?? 0}
              onChange={(options) => upd({ props: { options } })}
            />
          </Row>
        )}

        {["text", "textarea", "email", "select"].includes(block.type) && (
          <Row
            label={block.type === "select" ? "Texte par défaut" : "Texte indicatif"}
            htmlFor={`ph-${block.id}`}
          >
            <div className="pp-field">
              <input
                id={`ph-${block.id}`}
                value={block.props.placeholder ?? ""}
                maxLength={200}
                onChange={(e) => upd({ props: { placeholder: e.target.value } })}
                className={`${FIELD_INPUT} h-[46px]`}
              />
            </div>
          </Row>
        )}
        {maxLimit && (
          <Row
            label="Longueur maximale"
            htmlFor={`max-${block.id}`}
            hint={`Entre 1 et ${maxLimit.toLocaleString("fr-FR")} caractères.`}
          >
            <div className="pp-field">
              <input
                id={`max-${block.id}`}
                type="number"
                min={1}
                max={maxLimit}
                value={block.props.maxLength ?? maxLimit}
                onChange={(e) =>
                  upd({
                    props: {
                      maxLength: Math.min(
                        maxLimit,
                        Math.max(1, Math.round(Number(e.target.value)) || 1),
                      ),
                    },
                  })
                }
                className={`${FIELD_INPUT} h-[46px]`}
              />
            </div>
          </Row>
        )}

        {def.mediaKind && (
          <Row label="Fichier affiché">
            <MediaPicker
              block={block}
              kind={def.mediaKind}
              resources={resources}
              resourceUrl={resourceUrl}
              onUpload={onUpload}
              uploading={uploading}
              uploadError={uploadError}
              dispatch={dispatch}
            />
          </Row>
        )}
        {def.review && <ReviewProps block={block} config={config} dispatch={dispatch} />}

        {config.blocks.length > 1 && (
          <LinkSection block={block} config={config} dispatch={dispatch} />
        )}

        {(def.collects || membersOf(config, block.id).length > 0) && (
          <div className="flex items-start gap-2.5 px-1">
            {block.keyLocked && (
              <Lock size={14} className={`mt-0.5 shrink-0 ${INK3}`} aria-hidden />
            )}
            <p className={`text-[12.5px] leading-snug ${INK3}`}>
              Colonne du tableau :{" "}
              <code className={`${MONO} tracking-normal normal-case ${INK2}`}>{block.key}</code>.{" "}
              {block.keyLocked
                ? "Figée depuis la publication : renommer l’intitulé ne la change plus."
                : "Elle suit l’intitulé jusqu’à la première publication."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
