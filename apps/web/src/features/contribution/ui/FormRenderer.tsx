// Rendu du formulaire tel que le voit le contributeur. Utilisé par l'aperçu du concepteur
// (mode « preview » : rien n'est envoyé) et par la page du contributeur (mode « fill »).
// Les blocs liés à une même ancre forment UNE carte : la question reste visuellement attachée à
// son média, comme dans le tableau de réponses.

import type { ElementType } from "react";
import type { ReviewInput } from "../../../api/contribution";
import { blockDef, units, type Answer, type Block, type FormConfig } from "../model";
import { BlockBody, controlId, type Mode } from "./BlockBody";
import { ACCENT_TEXT, DISPLAY, INK, INK2, INK3 } from "./kit";

/** Dernier mot en lavande, comme le titre de l'accueil. */
export function AccentTitle({
  text,
  className = "",
  as: Tag = "h1",
}: {
  text: string;
  className?: string;
  as?: ElementType;
}) {
  const words = (text || "Sans titre").trim().split(/\s+/);
  const last = words.pop();
  return (
    <Tag className={`leading-[.95] ${DISPLAY} ${INK} ${className}`}>
      {words.length > 0 && <>{words.join(" ")} </>}
      <span className="text-[color:var(--accent)]">{last}</span>
    </Tag>
  );
}

type FieldProps = {
  block: Block;
  mode: Mode;
  value?: Answer;
  review?: ReviewInput | null;
  onChange: (v: Answer) => void;
  onReviewChange: (v: ReviewInput | null) => void;
  error?: string;
  resourceUrl: (id: string) => string;
  problemId?: string;
};

function Field({ block, mode, error, ...rest }: FieldProps) {
  const def = blockDef(block.type);
  const id = controlId(block);
  const showLabel = def?.collects || def?.review || block.label;
  return (
    <div data-block={block.id}>
      {showLabel && (
        <label
          id={`${id}-label`}
          htmlFor={def?.review ? undefined : id}
          className={`pp-mono mb-2.5 block px-1 text-[12px] leading-snug ${INK2}`}
        >
          {block.label}
          {def?.collects && !block.required && (
            <span className={`ml-2 text-[10.5px] ${INK3}`}>Facultatif</span>
          )}
        </label>
      )}
      <BlockBody block={block} mode={mode} invalid={!!error} {...rest} />
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          className={`mt-2.5 px-1 text-[13px] leading-snug ${ACCENT_TEXT}`}
        >
          {error}
        </p>
      )}
      {block.help && !error && (
        <p className={`mt-2.5 px-1 text-[13px] leading-snug ${INK3}`}>{block.help}</p>
      )}
    </div>
  );
}

export function FormRenderer({
  form,
  mode = "fill",
  values = {},
  onChange = () => {},
  errors = {},
  reviews = {},
  onReviewChange = () => {},
  resourceUrl,
  problemId,
  titleClassName = "text-[clamp(46px,4.7vw,72px)]",
  showHeader = true,
}: {
  form: FormConfig;
  mode?: Mode;
  values?: Record<string, Answer>;
  onChange?: (key: string, v: Answer) => void;
  errors?: Record<string, string>;
  reviews?: Record<string, ReviewInput | null>;
  onReviewChange?: (blockId: string, v: ReviewInput | null) => void;
  resourceUrl: (id: string) => string;
  problemId?: string;
  titleClassName?: string;
  showHeader?: boolean;
}) {
  return (
    <div>
      {showHeader && (
        <div className="mb-8">
          <AccentTitle text={form.title} className={titleClassName} />
          {form.intro && (
            <p
              className={`mt-4 max-w-[52ch] text-[16.5px] leading-relaxed whitespace-pre-line ${INK2}`}
            >
              {form.intro}
            </p>
          )}
        </div>
      )}
      <div className="space-y-6">
        {units(form.blocks).map(({ anchor, members }) => {
          const fieldFor = (b: Block) => (
            <Field
              key={b.id}
              block={b}
              mode={mode}
              resourceUrl={resourceUrl}
              problemId={problemId}
              value={values[b.key]}
              review={reviews[b.id]}
              onChange={(v) => onChange(b.key, v)}
              onReviewChange={(v) => onReviewChange(b.id, v)}
              error={errors[b.key]}
            />
          );
          if (!members.length) return fieldFor(anchor);
          return (
            <div key={anchor.id} className="pp-card space-y-5 p-4 sm:p-5" data-group={anchor.id}>
              {fieldFor(anchor)}
              {members.map(fieldFor)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
