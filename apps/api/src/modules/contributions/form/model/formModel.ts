// Modèle de la page-formulaire : fonctions pures, sans état, sans dépendance.
//
// La même logique tourne dans le navigateur (concepteur, aperçu, pré-validation du contributeur)
// et dans l'API (validation de la configuration à la publication, validation des soumissions).
// L'API ne fait jamais confiance au client : elle rejoue exactement ces fonctions.

import {
  BLOCK_TYPES,
  LIMITS,
  STORAGE_FORMATS,
  SYSTEM_COLUMNS,
  blockDef,
  isMediaType,
  type BlockProps,
  type BlockType,
  type StorageFormat,
} from "./blockTypes.js";

export const FORM_VERSION = 1;
export const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
export const BLOCK_ID_RE = /^b_[a-z0-9]{6,24}$/;
export const RESOURCE_ID_RE = /^r_[a-z0-9]{6,24}$/;
const RESERVED_KEYS = new Set<string>(SYSTEM_COLUMNS);

export type Block = {
  id: string;
  type: BlockType;
  /** Nom de la colonne dans le fichier de réponses. */
  key: string;
  /** Vrai après la première publication : la clé ne change plus. */
  keyLocked?: boolean;
  label: string;
  help?: string;
  required?: boolean;
  /** Identifiant de l'ancre du groupe, pour un bloc lié. */
  linkedTo?: string;
  props: BlockProps;
};

export type CodeFieldType = "text" | "textarea" | "email" | "radio" | "checkbox" | "select";
export type CodeField = {
  key: string;
  label: string;
  type: CodeFieldType;
  required?: boolean;
  options?: string[];
  maxLength?: number;
  pii?: boolean;
};

export type FormConfig = {
  version: number;
  mode: "visual" | "code";
  problemId: string;
  revision: number;
  title: string;
  intro: string;
  thanks?: { title: string; message: string };
  blocks: Block[];
  storage: { format: StorageFormat; includeContributor: boolean };
  code?: { entry: "index.html"; fields: CodeField[] };
  publishedAt?: string;
};

export type Unit = { anchor: Block; members: Block[] };

export type Field = {
  key: string;
  label: string;
  type: string;
  kind: "value" | "media_ref";
  blockId: string | null;
  required: boolean;
  pii: boolean;
  valueType: "string" | "string[]";
  props: BlockProps;
  linkedTo?: string | null;
};

export type Answer = string | string[];
export type Answers = Record<string, Answer>;
export type ConfigIssue = { path: string; code: string; message: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ───────────────────────── identifiants ───────────────────────── */

function randomChars(n: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
export const newBlockId = () => `b_${randomChars(10)}`;
export const newResourceId = () => `r_${randomChars(12)}`;

/**
 * Clé de colonne stable : « Transcrivez ce que vous entendez » → transcrivez_ce_que_vous_entendez.
 * Unique parmi `taken`, jamais égale à une colonne système.
 */
export function slugKey(text: string, taken = new Set<string>(), fallback = "champ") {
  let base = String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32)
    .replace(/_+$/, "");
  if (!base) base = fallback;
  if (!/^[a-z]/.test(base)) base = `f_${base}`.slice(0, 32);
  let key = base;
  let n = 2;
  while (taken.has(key) || RESERVED_KEYS.has(key)) {
    const suffix = `_${n}`;
    key = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    n += 1;
  }
  return key;
}

/* ───────────────────────── structure : unités et liens ─────────────────────────
 *
 * Les blocs sont stockés à plat dans `blocks`. Un bloc lié porte `linkedTo` (l'id de son ancre).
 * Invariant : les blocs liés suivent immédiatement leur ancre. Une « unité » = une ancre + ses
 * blocs liés ; c'est ce qu'on déplace par glisser-déposer. Un bloc lié n'est jamais une ancre. */

export function units(blocks: Block[]): Unit[] {
  const members = new Map<string, Block[]>();
  for (const b of blocks) {
    if (b.linkedTo) {
      if (!members.has(b.linkedTo)) members.set(b.linkedTo, []);
      members.get(b.linkedTo)!.push(b);
    }
  }
  return blocks
    .filter((b) => !b.linkedTo)
    .map((anchor) => ({ anchor, members: members.get(anchor.id) ?? [] }));
}

const flatten = (us: Unit[]) => us.flatMap((u) => [u.anchor, ...u.members]);

const withoutLink = (b: Block): Block => {
  const { linkedTo: _linkedTo, ...rest } = b;
  return rest;
};

/** Rétablit l'invariant : détache les liens orphelins, regroupe les membres derrière leur ancre. */
export function normalize(config: FormConfig): FormConfig {
  const top = new Set(config.blocks.filter((b) => !b.linkedTo).map((b) => b.id));
  const blocks = config.blocks.map((b) =>
    b.linkedTo && !top.has(b.linkedTo) ? withoutLink(b) : b,
  );
  return { ...config, blocks: flatten(units(blocks)) };
}

export const findBlock = (config: FormConfig, id: string) =>
  config.blocks.find((b) => b.id === id) ?? null;
export const membersOf = (config: FormConfig, anchorId: string) =>
  config.blocks.filter((b) => b.linkedTo === anchorId);

/* ───────────────────────── construction et mutations ───────────────────────── */

export function emptyForm({ problemId = "", title = "" } = {}): FormConfig {
  return {
    version: FORM_VERSION,
    mode: "visual",
    problemId,
    revision: 0,
    title,
    intro: "",
    thanks: {
      title: "Merci pour votre contribution",
      message: "Vos réponses ont bien été enregistrées.",
    },
    blocks: [],
    storage: { format: "csv", includeContributor: true },
  };
}

export function createBlock(type: BlockType, blocks: Block[] = [], { id = newBlockId() } = {}) {
  const def = BLOCK_TYPES[type];
  const taken = new Set(blocks.map((b) => b.key));
  return {
    id,
    type,
    key: slugKey(def.defaults.label, taken, type),
    label: def.defaults.label,
    help: "",
    required: false,
    props: structuredClone(def.defaults.props) as BlockProps,
  } satisfies Block;
}

/**
 * Ajoute un bloc. `unitIndex` = position parmi les unités (fin par défaut).
 * `linkedTo` = id d'une ancre : le bloc rejoint son groupe.
 * Renvoie { config, block } ; block vaut null si le groupe est plein.
 */
export function addBlock(
  config: FormConfig,
  type: BlockType,
  { unitIndex, linkedTo, id }: { unitIndex?: number; linkedTo?: string; id?: string } = {},
): { config: FormConfig; block: Block | null } {
  if (config.blocks.length >= LIMITS.blocks) return { config, block: null };
  const block: Block = createBlock(type, config.blocks, id ? { id } : {});
  const us = units(config.blocks);
  if (linkedTo) {
    const group = us.find((u) => u.anchor.id === linkedTo);
    if (!group || group.members.length + 1 >= LIMITS.linkGroup) return { config, block: null };
    block.linkedTo = linkedTo;
    group.members.push(block);
  } else {
    const at = unitIndex == null ? us.length : clamp(unitIndex, 0, us.length);
    us.splice(at, 0, { anchor: block, members: [] });
  }
  return { config: { ...config, blocks: flatten(us) }, block };
}

/** Déplace une unité (ancre + blocs liés) d'une position à une autre. */
export function moveUnit(config: FormConfig, from: number, to: number): FormConfig {
  const us = units(config.blocks);
  if (from < 0 || from >= us.length) return config;
  const [moved] = us.splice(from, 1);
  us.splice(clamp(to, 0, us.length), 0, moved);
  return { ...config, blocks: flatten(us) };
}

export type BlockPatch = Partial<Omit<Block, "id" | "key" | "props">> & {
  props?: Partial<BlockProps>;
};

/**
 * Modifie un bloc. `patch.props` est fusionné. Tant que le formulaire n'a pas été publié
 * (`keyLocked` faux), la clé de colonne suit le libellé ; après la première publication elle est
 * figée : renommer un libellé ne casse jamais les colonnes des données déjà collectées.
 */
export function updateBlock(config: FormConfig, id: string, patch: BlockPatch): FormConfig {
  const blocks = config.blocks.map((b) => {
    if (b.id !== id) return b;
    const next: Block = { ...b, ...patch, props: { ...b.props, ...(patch.props ?? {}) } };
    next.id = b.id; // l'id ne change jamais
    next.key = b.key; // la clé ne change que via le libellé (ci-dessous)
    if (patch.label !== undefined && !b.keyLocked && blockDef(b.type)) {
      const taken = new Set(config.blocks.filter((o) => o.id !== id).map((o) => o.key));
      next.key = slugKey(patch.label, taken, b.type);
    }
    return next;
  });
  return { ...config, blocks };
}

/** Supprime un bloc ; si c'est une ancre, ses blocs liés deviennent autonomes. */
export function removeBlock(config: FormConfig, id: string): FormConfig {
  const blocks = config.blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.linkedTo === id ? withoutLink(b) : b));
  return normalize({ ...config, blocks });
}

export function duplicateBlock(
  config: FormConfig,
  id: string,
): { config: FormConfig; block: Block | null } {
  const src = findBlock(config, id);
  if (!src || config.blocks.length >= LIMITS.blocks) return { config, block: null };
  const clone: Block = structuredClone(src);
  clone.id = newBlockId();
  delete clone.keyLocked;
  clone.key = slugKey(`${src.label} copie`, new Set(config.blocks.map((b) => b.key)), src.type);
  clone.label = src.label ? `${src.label} (copie)`.slice(0, LIMITS.label) : "";
  if (src.linkedTo) {
    const group = units(config.blocks).find((u) => u.anchor.id === src.linkedTo);
    if (!group || group.members.length + 1 >= LIMITS.linkGroup) return { config, block: null };
  }
  const idx = config.blocks.findIndex((b) => b.id === id);
  // une ancre dupliquée se place après tout son groupe, sans emporter ses blocs liés
  let insertAt = idx + 1;
  if (!src.linkedTo) while (config.blocks[insertAt]?.linkedTo === id) insertAt += 1;
  delete clone.linkedTo;
  if (src.linkedTo) clone.linkedTo = src.linkedTo;
  const blocks = [...config.blocks.slice(0, insertAt), clone, ...config.blocks.slice(insertAt)];
  return { config: normalize({ ...config, blocks }), block: clone };
}

/** Lie `id` à l'ancre `anchorId`. Refuse (renvoie la config inchangée) si le lien est invalide. */
export function linkBlock(config: FormConfig, id: string, anchorId: string): FormConfig {
  const block = findBlock(config, id);
  const anchor = findBlock(config, anchorId);
  if (!block || !anchor || id === anchorId) return config;
  if (anchor.linkedTo) return config; // pas de lien imbriqué
  if (membersOf(config, id).length > 0) return config; // une ancre ne devient pas membre
  const group = units(config.blocks).find((u) => u.anchor.id === anchorId);
  if (!group) return config;
  if (block.linkedTo !== anchorId && group.members.length + 1 >= LIMITS.linkGroup) return config;
  const blocks = config.blocks.map((b) => (b.id === id ? { ...b, linkedTo: anchorId } : b));
  // le bloc rejoint la fin du groupe
  const us = units(blocks);
  const g = us.find((u) => u.anchor.id === anchorId)!;
  g.members = [...g.members.filter((m) => m.id !== id), blocks.find((b) => b.id === id)!];
  return { ...config, blocks: flatten(us) };
}

export function unlinkBlock(config: FormConfig, id: string): FormConfig {
  const blocks = config.blocks.map((b) => (b.id === id && b.linkedTo ? withoutLink(b) : b));
  return normalize({ ...config, blocks });
}

/* ───────────────────────── champs collectés ───────────────────────── */

/**
 * Liste des champs collectés par le formulaire, dans l'ordre d'affichage.
 *  - kind 'value'     : saisi par le contributeur
 *  - kind 'media_ref' : fichier média associé à des blocs liés ; renseigné par l'API depuis la
 *                       configuration, jamais par le client
 * Un formulaire en mode « code » déclare ses champs dans code.fields.
 */
export function deriveFields(config: FormConfig | null | undefined): Field[] {
  if (config?.mode === "code") {
    return (config.code?.fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      kind: "value",
      blockId: null,
      required: !!f.required,
      pii: f.type === "email" || !!f.pii,
      valueType: blockDef(f.type)?.valueType ?? "string",
      props: { options: f.options, maxLength: f.maxLength },
    }));
  }
  const blocks = config?.blocks ?? [];
  const out: Field[] = [];
  for (const b of blocks) {
    const def = blockDef(b.type);
    if (!def) continue;
    if (def.collects) {
      out.push({
        key: b.key,
        label: b.label,
        type: b.type,
        kind: "value",
        blockId: b.id,
        required: !!b.required,
        pii: !!def.pii,
        valueType: def.valueType ?? "string",
        props: b.props,
        linkedTo: b.linkedTo ?? null,
      });
    } else if (isMediaType(b.type) && blocks.some((m) => m.linkedTo === b.id)) {
      out.push({
        key: b.key,
        label: b.label,
        type: b.type,
        kind: "media_ref",
        blockId: b.id,
        required: false,
        pii: false,
        valueType: "string",
        props: {},
      });
    }
  }
  return out;
}

/** Blocs de validation du formulaire (flux séparé : les retours ne sont pas des réponses). */
export const reviewBlocks = (config: FormConfig | null | undefined) =>
  (config?.blocks ?? []).filter((b) => blockDef(b.type)?.review);

/* ───────────────────────── validation d'une soumission ───────────────────────── */

export const MESSAGES = {
  required: "Ce champ est obligatoire",
  invalidType: "Valeur invalide",
  unknown: "Champ inconnu",
  email: "Adresse e-mail invalide",
  choice: "Ce choix n’est pas proposé",
  duplicate: "Choix en double",
  // séparateur explicite : toLocaleString varie selon l'ICU du navigateur ou de Node
  tooLong: (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} caractères maximum`,
  form: "Format de réponse invalide",
  tooBig: "Réponse trop volumineuse",
};

const EMAIL_RE = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]{2,}$/;
const MAX_LENGTH: Record<string, number> = LIMITS.maxLength;

/** Valide la valeur d'un seul champ (réutilisé par la validation des retours de relecture). */
export function validateFieldValue(
  field: Pick<Field, "type" | "required" | "valueType" | "props">,
  raw: unknown,
): { value: Answer; error?: undefined } | { error: string; value?: undefined } {
  const isEmpty =
    raw == null ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0);
  if (isEmpty) {
    return field.required
      ? { error: MESSAGES.required }
      : { value: field.valueType === "string[]" ? [] : "" };
  }
  const options = field.props?.options ?? [];
  switch (field.type) {
    case "text":
    case "textarea":
    case "email": {
      if (typeof raw !== "string") return { error: MESSAGES.invalidType };
      const value = raw.replace(/\r\n/g, "\n").trim();
      const max = Math.min(
        field.props?.maxLength ?? MAX_LENGTH[field.type],
        MAX_LENGTH[field.type],
      );
      if ([...value].length > max) return { error: MESSAGES.tooLong(max) };
      if (field.type === "email" && !EMAIL_RE.test(value)) return { error: MESSAGES.email };
      return { value };
    }
    case "radio":
    case "select":
      if (typeof raw !== "string") return { error: MESSAGES.invalidType };
      return options.includes(raw) ? { value: raw } : { error: MESSAGES.choice };
    case "checkbox": {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
        return { error: MESSAGES.invalidType };
      }
      const list = raw as string[];
      if (new Set(list).size !== list.length) return { error: MESSAGES.duplicate };
      if (!list.every((v) => options.includes(v))) return { error: MESSAGES.choice };
      return { value: options.filter((o) => list.includes(o)) }; // ordre canonique
    }
    default:
      return { error: MESSAGES.invalidType };
  }
}

/**
 * Valide les réponses d'un contributeur contre la configuration.
 * Renvoie { ok, errors: { [clé]: message }, clean } ; `clean` contient toutes les clés attendues
 * (valeurs normalisées), prêt à être écrit.
 */
export function validateAnswers(config: FormConfig, answers: unknown) {
  const errors: Record<string, string> = {};
  const clean: Answers = {};
  if (!isObj(answers)) return { ok: false, errors: { _form: MESSAGES.form }, clean };
  const fields = deriveFields(config).filter((f) => f.kind === "value");
  const known = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(answers)) if (!known.has(key)) errors[key] = MESSAGES.unknown;
  for (const field of fields) {
    const res = validateFieldValue(field, answers[field.key]);
    if (res.error !== undefined) errors[field.key] = res.error;
    else clean[field.key] = res.value;
  }
  if (JSON.stringify(clean).length > LIMITS.answerBytes) errors._form = MESSAGES.tooBig;
  return { ok: Object.keys(errors).length === 0, errors, clean };
}

/* ───────────────────────── validation de la configuration ───────────────────────── */

const OPTION_TYPES = ["radio", "checkbox", "select"];
const PROP_KEYS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(BLOCK_TYPES).map(([t, d]) => [t, new Set(Object.keys(d.defaults.props))]),
);
const CODE_FIELD_TYPES = ["text", "textarea", "email", "radio", "checkbox", "select"];

type Err = (path: string, code: string, message: string) => void;

/**
 * Valide une configuration reçue (donnée non fiable).
 *  stage 'draft'   : contrôles structurels et de sécurité (l'enregistrement automatique accepte
 *                    un travail en cours)
 *  stage 'publish' : exige en plus un formulaire complet et utilisable
 */
export function validateConfig(
  input: unknown,
  { stage = "draft" }: { stage?: "draft" | "publish" } = {},
): { ok: boolean; errors: ConfigIssue[] } {
  const errors: ConfigIssue[] = [];
  const err: Err = (path, code, message) => errors.push({ path, code, message });
  const publish = stage === "publish";
  const str = (v: unknown, path: string, max: number, { required = false } = {}) => {
    if (typeof v !== "string") {
      err(path, "type", "Doit être un texte");
      return false;
    }
    if ([...v].length > max) {
      err(path, "too_long", `${max} caractères maximum`);
      return false;
    }
    if (required && !v.trim()) {
      err(path, "required", "Obligatoire");
      return false;
    }
    return true;
  };

  if (!isObj(input)) {
    return { ok: false, errors: [{ path: "", code: "type", message: "Configuration invalide" }] };
  }
  const config = input as Partial<FormConfig> & Record<string, unknown>;
  if (config.version !== FORM_VERSION) {
    err("version", "unsupported_version", `Version ${FORM_VERSION} attendue`);
  }
  if (config.mode !== "visual" && config.mode !== "code") {
    err("mode", "enum", "Mode « visual » ou « code » attendu");
  }
  str(config.title ?? "", "title", LIMITS.title, { required: publish });
  str(config.intro ?? "", "intro", LIMITS.intro);
  if (config.thanks !== undefined) {
    if (!isObj(config.thanks)) err("thanks", "type", "Objet attendu");
    else {
      str(config.thanks.title ?? "", "thanks.title", LIMITS.title);
      str(config.thanks.message ?? "", "thanks.message", LIMITS.help);
    }
  }
  const storage = config.storage as unknown;
  if (
    !isObj(storage) ||
    !STORAGE_FORMATS.includes(storage.format as StorageFormat) ||
    (storage.includeContributor !== undefined && typeof storage.includeContributor !== "boolean")
  ) {
    err("storage.format", "enum", `Format attendu : ${STORAGE_FORMATS.join(", ")}`);
  }

  if (config.mode === "code") validateCodeMode(config, err, publish);
  else if (!Array.isArray(config.blocks)) err("blocks", "type", "Liste attendue");
  else validateBlocks(config as FormConfig, err, publish, str, errors);
  return { ok: errors.length === 0, errors };
}

function validateCodeMode(config: Partial<FormConfig>, err: Err, publish: boolean) {
  const code = config.code as unknown;
  if (!isObj(code)) {
    err("code", "required", "Bloc « code » attendu en mode code");
    return;
  }
  if (code.entry !== "index.html") {
    err("code.entry", "enum", "Le point d’entrée doit être index.html");
  }
  const fields = code.fields;
  if (!Array.isArray(fields)) {
    err("code.fields", "type", "Liste de champs attendue");
    return;
  }
  if (publish && fields.length === 0) err("code.fields", "empty", "Déclarez au moins un champ");
  const seen = new Set<string>();
  fields.forEach((f: unknown, i) => {
    const p = `code.fields[${i}]`;
    if (!isObj(f)) {
      err(p, "type", "Objet attendu");
      return;
    }
    if (typeof f.key !== "string" || !KEY_RE.test(f.key) || RESERVED_KEYS.has(f.key)) {
      err(`${p}.key`, "key", "Clé invalide");
    } else if (seen.has(f.key)) err(`${p}.key`, "duplicate", "Clé en double");
    else seen.add(f.key);
    if (typeof f.label !== "string" || !f.label.trim() || f.label.length > LIMITS.label) {
      err(`${p}.label`, "required", "Libellé obligatoire");
    }
    if (typeof f.type !== "string" || !CODE_FIELD_TYPES.includes(f.type)) {
      err(`${p}.type`, "enum", `Type attendu : ${CODE_FIELD_TYPES.join(", ")}`);
    } else if (OPTION_TYPES.includes(f.type)) {
      checkOptions(f.options, `${p}.options`, blockDef(f.type)?.minOptions ?? 0, err);
    }
    if (f.required !== undefined && typeof f.required !== "boolean") {
      err(`${p}.required`, "type", "Booléen attendu");
    }
    if (
      f.maxLength !== undefined &&
      (!Number.isInteger(f.maxLength) || (f.maxLength as number) < 1)
    ) {
      err(`${p}.maxLength`, "range", "Entier positif attendu");
    }
  });
}

function checkOptions(options: unknown, path: string, min: number, err: Err) {
  if (!Array.isArray(options)) {
    err(path, "type", "Liste de choix attendue");
    return;
  }
  if (options.length > LIMITS.options) err(path, "too_many", `${LIMITS.options} choix maximum`);
  if (options.length < min) err(path, "too_few", `${min} choix minimum`);
  const seen = new Set<string>();
  options.forEach((o: unknown, i) => {
    if (typeof o !== "string" || !o.trim() || o.length > LIMITS.optionLength) {
      err(`${path}[${i}]`, "option", "Choix invalide");
      return;
    }
    const k = o.trim().toLowerCase();
    if (seen.has(k)) err(`${path}[${i}]`, "duplicate", "Choix en double");
    seen.add(k);
  });
}

function validateBlocks(
  config: FormConfig,
  err: Err,
  publish: boolean,
  str: (v: unknown, path: string, max: number, o?: { required?: boolean }) => boolean,
  errors: ConfigIssue[],
) {
  const blocks = config.blocks as unknown[];
  if (blocks.length > LIMITS.blocks) err("blocks", "too_many", `${LIMITS.blocks} blocs maximum`);
  const ids = new Set<string>();
  const keys = new Set<string>();
  const topIds = new Set(
    blocks.filter((b): b is Block => isObj(b) && !b.linkedTo).map((b) => b.id),
  );
  const groupSize = new Map<string, number>();

  blocks.forEach((raw, i) => {
    const p = `blocks[${i}]`;
    if (!isObj(raw)) {
      err(p, "type", "Objet attendu");
      return;
    }
    const b = raw as Partial<Block> & Record<string, unknown>;
    const def = typeof b.type === "string" ? blockDef(b.type) : undefined;
    if (typeof b.id !== "string" || !BLOCK_ID_RE.test(b.id))
      err(`${p}.id`, "id", "Identifiant invalide");
    else if (ids.has(b.id)) err(`${p}.id`, "duplicate", "Identifiant en double");
    else ids.add(b.id);
    if (!def) {
      err(`${p}.type`, "enum", "Type de bloc inconnu");
      return;
    }

    const labelRequired = publish && (def.collects || !!def.review);
    str(b.label ?? "", `${p}.label`, LIMITS.label, { required: labelRequired });
    str(b.help ?? "", `${p}.help`, LIMITS.help);
    if (b.required !== undefined && typeof b.required !== "boolean") {
      err(`${p}.required`, "type", "Booléen attendu");
    }
    if (b.keyLocked !== undefined && typeof b.keyLocked !== "boolean") {
      err(`${p}.keyLocked`, "type", "Booléen attendu");
    }
    if (typeof b.key !== "string" || !KEY_RE.test(b.key) || RESERVED_KEYS.has(b.key)) {
      err(`${p}.key`, "key", "Clé invalide");
    } else if (keys.has(b.key)) err(`${p}.key`, "duplicate", "Clé en double");
    else keys.add(b.key);

    const props = b.props as unknown;
    if (!isObj(props)) {
      err(`${p}.props`, "type", "Objet attendu");
      return;
    }
    for (const k of Object.keys(props)) {
      if (!PROP_KEYS[b.type as string].has(k))
        err(`${p}.props.${k}`, "unknown", "Propriété inconnue");
    }

    if (def.options) {
      checkOptions(props.options, `${p}.props.options`, publish ? (def.minOptions ?? 0) : 0, err);
    }
    if (props.placeholder !== undefined) str(props.placeholder, `${p}.props.placeholder`, 200);
    if (def.mediaKind) {
      const rid = props.resourceId;
      if (rid != null && (typeof rid !== "string" || !RESOURCE_ID_RE.test(rid))) {
        err(`${p}.props.resourceId`, "id", "Identifiant de ressource invalide");
      }
      if (publish && rid == null)
        err(`${p}.props.resourceId`, "unbound", "Associez un fichier à ce bloc");
      if (props.alt !== undefined) str(props.alt, `${p}.props.alt`, LIMITS.label);
    }
    if (b.type === "text" || b.type === "textarea") {
      const max = props.maxLength;
      const limit = LIMITS.maxLength[b.type];
      if (!Number.isInteger(max) || (max as number) < 1 || (max as number) > limit) {
        err(`${p}.props.maxLength`, "range", `Entier entre 1 et ${limit}`);
      }
    }
    if (def.review) {
      const { targetKeys, minAgreements } = props;
      if (
        targetKeys !== null &&
        (!Array.isArray(targetKeys) || targetKeys.some((k) => typeof k !== "string"))
      ) {
        err(`${p}.props.targetKeys`, "type", "Liste de clés ou null");
      }
      if (
        !Number.isInteger(minAgreements) ||
        (minAgreements as number) < 1 ||
        (minAgreements as number) > 10
      ) {
        err(`${p}.props.minAgreements`, "range", "Entier entre 1 et 10");
      }
    }

    if (b.linkedTo !== undefined) {
      if (typeof b.linkedTo !== "string" || b.linkedTo === b.id || !topIds.has(b.linkedTo)) {
        err(`${p}.linkedTo`, "link", "Le lien doit pointer vers un bloc autonome");
      } else groupSize.set(b.linkedTo, (groupSize.get(b.linkedTo) ?? 1) + 1);
    }
  });

  for (const [anchor, size] of groupSize) {
    if (size > LIMITS.linkGroup) {
      err(
        "blocks",
        "link_group_too_big",
        `Groupe de ${anchor} trop grand (${LIMITS.linkGroup} blocs maximum)`,
      );
    }
  }
  const typed = blocks as Block[];
  if (ids.size === typed.length && errors.length === 0) {
    const flat = flatten(units(typed)).map((b) => b.id);
    if (flat.some((id, i) => id !== typed[i].id)) {
      err("blocks", "links_not_contiguous", "Les blocs liés doivent suivre leur ancre");
    }
  }
  if (publish) {
    const fields = deriveFields(config).filter((f) => f.kind === "value");
    if (fields.length === 0 && reviewBlocks(config).length === 0) {
      err("blocks", "empty", "Ajoutez au moins un champ à remplir");
    }
  }
}
