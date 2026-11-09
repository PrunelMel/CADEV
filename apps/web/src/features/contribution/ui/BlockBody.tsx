// Rendu du CONTRÔLE de chaque type de bloc (sans libellé ni aide : l'appelant les affiche,
// éditables dans le concepteur, statiques dans le formulaire). Trois modes :
//   edit     le concepteur : les champs sont inertes (l'appelant pose `inert`), les médias se lisent
//   preview  l'aperçu : tout est interactif, rien n'est envoyé
//   fill     le contributeur : idem, les valeurs remontent au formulaire
//
// Ajouter un type de bloc = une entrée dans le modèle + un cas dans `BlockBody` ci-dessous.

import { useEffect, useState } from "react";
import {
  AudioLines,
  Check,
  ChevronDown,
  FolderOpen,
  ImageOff,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import { useReviewItem, type ReviewInput, type ReviewItem } from "../../../api/contribution";
import { blockDef, type Answer, type Block, type BlockType } from "../model";
import { ACCENT_FILL, ACCENT_TEXT, INK, INK2, INK3, MONO, PAL, Tile } from "./kit";

export type Mode = "edit" | "preview" | "fill";
export const controlId = (block: Pick<Block, "id">) => `cd-${block.id}`;
const BASE_INPUT =
  "block w-full bg-transparent px-4 text-[16px] leading-relaxed outline-none text-[color:var(--ink)]";

type ControlProps = {
  block: Block;
  value?: Answer;
  onChange: (v: Answer) => void;
  invalid?: boolean;
};

const describedBy = (block: Block, invalid?: boolean) =>
  invalid ? { "aria-invalid": true, "aria-describedby": `${controlId(block)}-err` } : {};

/* ───────────────────────── champs de saisie ───────────────────────── */

function TextControl({
  block,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete = "off",
  invalid,
}: ControlProps & { type?: string; inputMode?: "email" | "text"; autoComplete?: string }) {
  return (
    <div className="pp-field">
      <input
        id={controlId(block)}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={block.props.placeholder}
        maxLength={block.props.maxLength}
        {...describedBy(block, invalid)}
        className={`${BASE_INPUT} h-[54px]`}
      />
    </div>
  );
}

function TextAreaControl({ block, value, onChange, invalid }: ControlProps) {
  return (
    <div className="pp-field">
      <textarea
        id={controlId(block)}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={block.props.placeholder}
        maxLength={block.props.maxLength}
        autoComplete="off"
        {...describedBy(block, invalid)}
        className={`${BASE_INPUT} max-h-[340px] min-h-[132px] resize-none py-3.5 [field-sizing:content]`}
      />
    </div>
  );
}

/** Bouton radio (un choix) ou case à cocher (plusieurs) : même rendu, états lavande. */
function ChoiceControl({
  block,
  value,
  onChange,
  multiple = false,
}: ControlProps & { multiple?: boolean }) {
  const options = block.props.options ?? [];
  const selected = multiple ? (Array.isArray(value) ? value : []) : value;
  const toggle = (o: string) => {
    if (!multiple) return onChange(o);
    const list = selected as string[];
    onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
  };
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={`${controlId(block)}-label`}
      className="space-y-2"
    >
      {options.map((o, i) => {
        const checked = multiple ? (selected as string[]).includes(o) : selected === o;
        return (
          <label
            key={o}
            data-checked={checked}
            className="pp-field flex min-h-[48px] cursor-pointer items-center gap-3 px-3.5 py-2"
          >
            <input
              id={i === 0 ? controlId(block) : undefined}
              type={multiple ? "checkbox" : "radio"}
              name={block.id}
              checked={checked}
              onChange={() => toggle(o)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid size-5 shrink-0 place-items-center border transition-colors ${multiple ? "rounded-[6px]" : "rounded-full"} ${checked ? "border-[color:var(--accent)] bg-[color:var(--accent)]" : "border-[color:var(--field-line)]"}`}
            >
              {checked &&
                (multiple ? (
                  <Check size={13} strokeWidth={3} className="text-[color:var(--on-accent)]" />
                ) : (
                  <span className="size-2 rounded-full bg-[color:var(--on-accent)]" />
                ))}
            </span>
            <span className={`min-w-0 flex-1 text-[15.5px] leading-snug ${INK}`}>{o}</span>
          </label>
        );
      })}
    </div>
  );
}

function SelectControl({ block, value, onChange, invalid }: ControlProps) {
  const v = typeof value === "string" ? value : "";
  return (
    <div className="pp-field relative">
      <select
        id={controlId(block)}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        {...describedBy(block, invalid)}
        className={`${BASE_INPUT} h-[54px] cursor-pointer appearance-none pr-11 ${v ? "" : "text-[color:var(--ink3)]"}`}
      >
        <option value="" className="bg-[#0D121F]">
          {block.props.placeholder || "Choisir…"}
        </option>
        {(block.props.options ?? []).map((o) => (
          <option key={o} value={o} className="bg-[#0D121F] text-[color:var(--ink)]">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={18}
        aria-hidden
        className={`pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 ${INK3}`}
      />
    </div>
  );
}

/* ───────────────────────── médias ───────────────────────── */

const MEDIA_NAMES = {
  image: "une image",
  gif: "un GIF",
  audio: "un fichier audio",
  video: "une vidéo",
};

function MediaPlaceholder({ type, onPickMedia }: { type: BlockType; onPickMedia?: () => void }) {
  const kind = blockDef(type)?.mediaKind ?? "image";
  return (
    <div className="pp-slot flex min-h-[96px] flex-col items-center justify-center gap-2 px-4 py-5 text-center">
      <span className="text-[14px]">Aucun fichier associé</span>
      {onPickMedia && (
        <button
          type="button"
          onClick={onPickMedia}
          className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--accent-soft)] px-3 text-[13px] font-semibold ${ACCENT_TEXT}`}
        >
          <FolderOpen size={14} strokeWidth={2.4} />
          Choisir {MEDIA_NAMES[kind]}
        </button>
      )}
    </div>
  );
}

type MediaBlock = Pick<Block, "type" | "label" | "props">;

function MediaControl({
  block,
  resourceUrl,
  onPickMedia,
}: {
  block: MediaBlock;
  resourceUrl: (id: string) => string;
  onPickMedia?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const rid = block.props.resourceId;
  const kind = blockDef(block.type)?.mediaKind;
  useEffect(() => setFailed(false), [rid]);
  if (!rid) return <MediaPlaceholder type={block.type} onPickMedia={onPickMedia} />;
  const src = resourceUrl(rid);
  if (failed) {
    return (
      <div
        className={`pp-slot flex min-h-[96px] items-center justify-center gap-2 px-4 text-[14px] ${INK3}`}
      >
        <ImageOff size={16} />
        Fichier introuvable ou illisible
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className="pp-card flex items-center gap-3 p-3">
        <Tile c={PAL.sky} size={38} icon={AudioLines} />
        <audio
          controls
          preload="metadata"
          src={src}
          onError={() => setFailed(true)}
          className="h-10 min-w-0 flex-1"
          aria-label={block.label || "Enregistrement audio"}
        />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <video
        controls
        preload="metadata"
        playsInline
        src={src}
        onError={() => setFailed(true)}
        aria-label={block.label || "Vidéo"}
        className="pp-media max-h-[480px] w-full"
      />
    );
  }
  return (
    <img
      src={src}
      alt={block.props.alt || block.label || ""}
      loading="lazy"
      onError={() => setFailed(true)}
      className="pp-media max-h-[420px] w-full object-contain"
    />
  );
}

/* ───────────────────────── bloc « Validation de données » ───────────────────────── */

const SAMPLE_ITEM: ReviewItem = {
  blockId: "",
  submissionId: "exemple",
  target: {
    key: "transcription",
    label: "Transcription",
    type: "textarea",
    value: "Salam, kifach halek lyoum ?",
  },
  context: [],
  media: [],
};

function ReviewCard({
  blockId,
  item,
  value,
  onChange,
  onSkip,
  resourceUrl,
  interactive,
}: {
  blockId: string;
  item: ReviewItem;
  value: ReviewInput | null | undefined;
  onChange: (v: ReviewInput | null) => void;
  onSkip?: () => void;
  resourceUrl: (id: string) => string;
  interactive: boolean;
}) {
  const verdict = value?.verdict ?? null;
  const set = (patch: Partial<ReviewInput>) =>
    onChange({
      blockId,
      targetSubmissionId: item.submissionId,
      targetField: item.target.key,
      verdict,
      proposedValue: "",
      comment: "",
      ...value,
      ...patch,
    });
  const options = item.target.options;
  const chip = (active: boolean) =>
    `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition-colors ${active ? "" : `bg-[color:var(--chip)] hover:bg-[color:var(--accent-soft)] ${INK}`}`;
  const show = (v: Answer) => (Array.isArray(v) ? v.join(", ") : v);
  return (
    <div className="pp-card space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="pp-pill">
          <ShieldCheck size={13} />
          Contribution à relire
        </span>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${INK2} hover:bg-[color:var(--accent-soft)]`}
          >
            <SkipForward size={14} />
            Passer
          </button>
        )}
      </div>
      {item.media.map((m) => (
        <MediaControl
          key={m.key}
          resourceUrl={resourceUrl}
          block={{ type: m.kind, label: "", props: { resourceId: m.resourceId } }}
        />
      ))}
      {item.context.map((c) => (
        <div key={c.key}>
          <p className={`mb-1 px-1 text-[10.5px] ${MONO} ${INK3}`}>{c.label}</p>
          <p className={`px-1 text-[14.5px] leading-snug ${INK2}`}>{show(c.value)}</p>
        </div>
      ))}
      <div>
        <p className={`mb-1.5 px-1 text-[11px] ${MONO} ${INK2}`}>{item.target.label}</p>
        <p
          className={`rounded-[14px] bg-[color:var(--field)] px-4 py-3 text-[16px] leading-relaxed ${INK}`}
          style={{ boxShadow: "inset 0 0 0 1px var(--field-line)" }}
        >
          {show(item.target.value)}
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Votre avis">
        <button
          type="button"
          aria-pressed={verdict === "agree"}
          disabled={!interactive}
          onClick={() => set({ verdict: "agree", proposedValue: "" })}
          className={chip(verdict === "agree")}
          style={verdict === "agree" ? ACCENT_FILL : undefined}
        >
          <Check size={16} strokeWidth={2.6} />
          C’est correct
        </button>
        <button
          type="button"
          aria-pressed={verdict === "correct"}
          disabled={!interactive}
          onClick={() => set({ verdict: "correct" })}
          className={chip(verdict === "correct")}
          style={verdict === "correct" ? ACCENT_FILL : undefined}
        >
          Proposer une correction
        </button>
      </div>
      {verdict === "correct" && (
        <div className="space-y-3">
          {options ? (
            <div className="pp-field relative">
              <select
                aria-label="Valeur corrigée"
                value={value?.proposedValue ?? ""}
                onChange={(e) => set({ proposedValue: e.target.value })}
                className={`${BASE_INPUT} h-[54px] appearance-none pr-11`}
              >
                <option value="" className="bg-[#0D121F]">
                  Choisir la bonne valeur…
                </option>
                {options.map((o) => (
                  <option key={o} value={o} className="bg-[#0D121F]">
                    {o}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                aria-hidden
                className={`pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 ${INK3}`}
              />
            </div>
          ) : (
            <div className="pp-field">
              <textarea
                aria-label="Valeur corrigée"
                value={value?.proposedValue ?? ""}
                placeholder="Votre version corrigée"
                onChange={(e) => set({ proposedValue: e.target.value })}
                className={`${BASE_INPUT} max-h-[240px] min-h-[106px] resize-none py-3.5 [field-sizing:content]`}
              />
            </div>
          )}
          <div className="pp-field">
            <input
              aria-label="Commentaire (facultatif)"
              value={value?.comment ?? ""}
              maxLength={500}
              placeholder="Commentaire (facultatif)"
              onChange={(e) => set({ comment: e.target.value })}
              className={`${BASE_INPUT} h-[46px] text-[15px]`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationControl({
  block,
  mode,
  value,
  onChange,
  resourceUrl,
  problemId,
}: {
  block: Block;
  mode: Mode;
  value: ReviewInput | null | undefined;
  onChange: (v: ReviewInput | null) => void;
  resourceUrl: (id: string) => string;
  problemId?: string;
}) {
  const [round, setRound] = useState(0);
  const live = mode === "fill" && !!problemId;
  const item = useReviewItem(problemId ?? "", block.id, round, live);

  if (!live) {
    return (
      <ReviewCard
        blockId={block.id}
        item={SAMPLE_ITEM}
        value={null}
        onChange={() => {}}
        resourceUrl={resourceUrl}
        interactive={mode === "preview"}
      />
    );
  }
  if (item.isPending) {
    return (
      <div className={`pp-slot flex min-h-[96px] items-center justify-center text-[14px] ${INK3}`}>
        Chargement d’une contribution à relire…
      </div>
    );
  }
  if (!item.data) {
    return (
      <div
        className={`pp-slot flex min-h-[96px] items-center justify-center px-4 text-center text-[14px] ${INK3}`}
      >
        Aucune contribution à relire pour le moment
      </div>
    );
  }
  return (
    <ReviewCard
      blockId={block.id}
      item={item.data}
      value={value}
      onChange={onChange}
      resourceUrl={resourceUrl}
      interactive
      onSkip={() => {
        onChange(null);
        setRound((n) => n + 1);
      }}
    />
  );
}

/* ───────────────────────── aiguillage ───────────────────────── */

export function BlockBody({
  block,
  mode = "fill",
  value,
  review,
  onChange = () => {},
  onReviewChange = () => {},
  invalid = false,
  resourceUrl = () => "",
  onPickMedia,
  problemId,
}: {
  block: Block;
  mode?: Mode;
  value?: Answer;
  review?: ReviewInput | null;
  onChange?: (v: Answer) => void;
  onReviewChange?: (v: ReviewInput | null) => void;
  invalid?: boolean;
  resourceUrl?: (id: string) => string;
  onPickMedia?: () => void;
  /** Problème dont on relit les contributions (mode « fill » du bloc de validation). */
  problemId?: string;
}) {
  const common = { block, value, onChange, invalid };
  switch (block.type) {
    case "image":
    case "gif":
    case "audio":
    case "video":
      return (
        <MediaControl
          block={block}
          resourceUrl={resourceUrl}
          onPickMedia={mode === "edit" ? onPickMedia : undefined}
        />
      );
    case "text":
      return <TextControl {...common} />;
    case "textarea":
      return <TextAreaControl {...common} />;
    case "email":
      return <TextControl {...common} type="email" inputMode="email" autoComplete="email" />;
    case "radio":
      return <ChoiceControl {...common} />;
    case "checkbox":
      return <ChoiceControl {...common} multiple />;
    case "select":
      return <SelectControl {...common} />;
    case "validation":
      return (
        <ValidationControl
          block={block}
          mode={mode}
          value={review}
          onChange={onReviewChange}
          resourceUrl={resourceUrl}
          problemId={problemId}
        />
      );
    default:
      return null;
  }
}
