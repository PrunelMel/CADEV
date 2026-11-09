/**
 * Créer un dépôt, charte « Liquid Glass » : même construction que la publication d'un problème.
 * Le formulaire à gauche ; à droite, un panneau qui suit le champ actif (types, propriétaire,
 * catalogue des licences, carte de provenance, langues, aides), et un aperçu de la carte du hub
 * quand aucun panneau de choix n'est ouvert. Les listes d'options sont dans content/repo-form.ts.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  Construction,
  Globe,
  Lock,
  MapPin,
  Plus,
  Scale,
  Tag,
  Target,
  TriangleAlert,
  User,
  WifiOff,
  X,
} from "lucide-react";
import { useSession } from "../../api/auth";
import {
  useCreateRepo,
  useLicenses,
  useNamespaces,
  useProblems,
  type RepoInput,
} from "../../api/hooks";
import type { License, ProblemStatus, ProblemSummary, RepoStage, RepoType } from "../../api/types";
import { COUNTRIES, COUNTRY_BY_ID, regionTone } from "../../components/glass/africaMap";
import {
  ACCENT_TEXT,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  MONO,
  SPRING,
  Tile,
} from "../../components/glass/Glass";
import {
  Backdrop,
  ChoiceBubble,
  CountryMap,
  DockBar,
  DockEmpty,
  FieldShell,
  Group,
  PanelHead,
  StageShell,
  SubmitBar,
  TagBubble,
  capital,
  itemVariants,
  norm,
  type ChoiceOption,
  type SearchResult,
} from "../../components/glass/formKit";
import { ErrorText } from "../../components/ui";
import { PAL, tagSets, type HelpMode } from "../../content/problem-form";
import { readmeTemplate } from "../../content/readme-template";
import { repoHelpSets, typeOptions } from "../../content/repo-form";
import { problemStatusLabels } from "../../content/site";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageTitle } from "../../hooks/usePageTitle";

/* ════════════════════════════════════════════════════════════════
   1. CHAMPS ET VALEURS
   ════════════════════════════════════════════════════════════════ */

type PanelKind = "help" | "problems" | "types" | "owners" | "licenses" | "map" | "langues";
type FieldDef = {
  label: string;
  panel: PanelKind;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  search?: string;
  /** Champ affiché seulement pour un dataset. */
  dataset?: boolean;
};

/* Registre des champs : l'ordre est celui du formulaire ; `panel` décide de ce qui s'affiche à droite */
const FIELDS = {
  probleme: {
    label: "Problème ciblé",
    panel: "problems",
    required: true,
    placeholder: "Choisir un problème",
    search: "Rechercher un problème…",
  },
  type: { label: "Type", panel: "types", required: true, placeholder: "Choisir un type" },
  proprietaire: { label: "Propriétaire", panel: "owners", placeholder: "Choisir" },
  nom: {
    label: "Nom du dépôt",
    panel: "help",
    required: true,
    placeholder: "Ex. manioc-lite",
  },
  description: {
    label: "Description courte",
    panel: "help",
    placeholder: "Ce que fait le dépôt, en une phrase",
  },
  visibilite: { label: "Visibilité", panel: "help" },
  statut: { label: "Statut", panel: "help" },
  licence: {
    label: "Licence",
    panel: "licenses",
    required: true,
    placeholder: "Choisir une licence",
    search: "Rechercher une licence…",
  },
  communaute: {
    label: "Communauté d’origine",
    panel: "help",
    placeholder: "Ex. Agriculteurs du Zou",
    dataset: true,
  },
  pays: {
    label: "Pays d’origine",
    panel: "map",
    placeholder: "Choisir un pays",
    search: "Rechercher un pays…",
    dataset: true,
  },
  tache: { label: "Tâche", panel: "help", placeholder: "Ex. Classification d’images" },
  langues: { label: "Langues prises en charge", panel: "langues" },
  materiel: { label: "Matériel cible", panel: "help", placeholder: "Ex. Android 2 Go de RAM" },
  horsLigne: { label: "Fonctionnement hors ligne", panel: "help" },
  fiche: {
    label: "README.md",
    panel: "help",
    placeholder: "Présentez le dépôt, son usage et ses résultats terrain.",
    hint: "Pré-rempli depuis le formulaire tant que vous ne le modifiez pas. Markdown : titres, listes, tableaux, blocs de code.",
  },
  limites: {
    label: "Limites connues",
    panel: "help",
    placeholder: "Ce que le dépôt ne sait pas encore faire.",
  },
} satisfies Record<string, FieldDef>;
type FieldKey = keyof typeof FIELDS;
const field = (k: FieldKey): FieldDef => FIELDS[k];
const ALL_KEYS = Object.keys(FIELDS) as FieldKey[];
const REQUIRED = ALL_KEYS.filter((k) => field(k).required);

type HelpKey = keyof typeof repoHelpSets;
const HELP_OF: Partial<Record<FieldKey, HelpKey>> = {
  nom: "nom",
  description: "description",
  tache: "tache",
  materiel: "materiel",
  communaute: "communaute",
  fiche: "fiche",
  limites: "limites",
};
type TextKey = "nom" | "description" | "communaute" | "tache" | "materiel" | "fiche" | "limites";

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const ME = "__me";
const TYPE_BY_ID = Object.fromEntries(typeOptions.map((t) => [t.id, t])) as Record<
  RepoType,
  (typeof typeOptions)[number]
>;
const LANG_LABELS = new Set(tagSets.langue.groups.flatMap((g) => g.tags.map((t) => t.label)));

type Values = {
  probleme: string | null;
  statut: RepoStage;
  type: RepoType | null;
  proprietaire: string;
  nom: string;
  description: string;
  visibilite: "public" | "private";
  licence: string | null;
  communaute: string;
  pays: string | null;
  tache: string;
  langues: string[];
  materiel: string;
  horsLigne: boolean;
  fiche: string;
  limites: string;
};
const INITIAL: Values = {
  probleme: null,
  statut: "under_construction",
  type: null,
  proprietaire: ME,
  nom: "",
  description: "",
  visibilite: "public",
  licence: null,
  communaute: "",
  pays: null,
  tache: "",
  langues: [],
  materiel: "",
  horsLigne: false,
  fiche: "",
  limites: "",
};

const missingOf = (v: Values) =>
  REQUIRED.filter((k) => {
    if (k === "nom") return !NAME_RE.test(v.nom);
    return !v[k as "probleme" | "type" | "licence"];
  });

const inputOf = (v: Values): RepoInput => ({
  problemId: v.probleme ?? "",
  stage: v.statut,
  type: v.type ?? "model",
  name: v.nom.trim(),
  org: v.proprietaire === ME ? undefined : v.proprietaire,
  visibility: v.visibilite,
  licenseId: v.licence ?? "",
  description: v.description.trim(),
  readme: v.fiche,
  limitations: v.limites.trim(),
  provenanceCommunity: v.type === "dataset" ? v.communaute.trim() || null : null,
  provenanceCountry: v.type === "dataset" && v.pays ? (COUNTRY_BY_ID[v.pays]?.name ?? null) : null,
  task: v.tache.trim(),
  languages: v.langues,
  worksOffline: v.horsLigne,
  targetHardware: v.materiel.trim(),
});

/* ════════════════════════════════════════════════════════════════
   2. CONTEXTE
   ════════════════════════════════════════════════════════════════ */

type Ctx = {
  values: Values;
  problems: ProblemSummary[];
  order: FieldKey[];
  ownLangs: string[];
  queries: Partial<Record<FieldKey | "idle", string>>;
  active: FieldKey | null;
  sheetOpen: boolean;
  shake: boolean;
  missing: FieldKey[];
  isMobile: boolean;
  owners: string[];
  me: string;
  licenses: License[];
  set: <K extends keyof Values>(key: K, v: Values[K]) => void;
  setQuery: (key: FieldKey | "idle", v: string) => void;
  toggleLang: (label: string) => void;
  commitLang: (force?: boolean) => void;
  applyHelp: (key: TextKey, text: string, mode: HelpMode) => void;
  activate: (key: FieldKey) => void;
  closeSheet: () => void;
  focusField: (key: FieldKey) => void;
  goNext: () => void;
  register: (key: FieldKey, el: HTMLElement | null) => void;
};

const FormCtx = createContext<Ctx | null>(null);
function useForm() {
  const ctx = useContext(FormCtx);
  if (!ctx) throw new Error("useForm hors de CreateRepo");
  return ctx;
}

const ownerOption = (name: string, me: string): ChoiceOption =>
  name === ME
    ? { id: ME, label: me, icon: User, c: PAL.lav }
    : { id: name, label: name, icon: Building2, c: PAL.teal };

/* ════════════════════════════════════════════════════════════════
   3. COLONNE DE GAUCHE : LE FORMULAIRE
   ════════════════════════════════════════════════════════════════ */

function TextField({
  fieldKey,
  multiline = false,
  rows = 4,
  hint,
}: {
  fieldKey: TextKey;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  const f = field(fieldKey);
  const { values, set, activate, register, active } = useForm();
  const id = `rf-${fieldKey}`;
  const isActive = active === fieldKey;
  const common = {
    id,
    ref: (el: HTMLElement | null) => register(fieldKey, el),
    value: values[fieldKey],
    onFocus: () => activate(fieldKey),
    placeholder: f.placeholder,
    autoComplete: "off",
  };
  return (
    <FieldShell id={id} label={f.label} hint={hint ?? f.hint} active={isActive}>
      <div className="pp-field" data-active={isActive}>
        {multiline ? (
          <textarea
            {...common}
            rows={rows}
            onChange={(e) => set(fieldKey, e.target.value)}
            className={`block max-h-[420px] min-h-[var(--min,0px)] w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-relaxed outline-none [field-sizing:content] ${INK}`}
            style={{ "--min": `${rows * 26 + 28}px` } as CSSProperties}
          />
        ) : (
          <input
            {...common}
            onChange={(e) => set(fieldKey, e.target.value)}
            className={`block h-[54px] w-full bg-transparent px-4 text-[16px] leading-relaxed outline-none ${INK}`}
          />
        )}
      </div>
    </FieldShell>
  );
}

function PickerField({
  fieldKey,
}: {
  fieldKey: "probleme" | "type" | "proprietaire" | "licence" | "pays";
}) {
  const f = field(fieldKey);
  const { values, activate, register, active, me, licenses, problems } = useForm();
  const id = `rf-${fieldKey}`;
  const isActive = active === fieldKey;
  let lead: ReactNode = null;
  let text: string | null = null;
  if (fieldKey === "probleme" && values.probleme) {
    const p = problems.find((x) => x.id === values.probleme);
    if (p) {
      lead = <Tile c={problemTone(p.status)} size={34} icon={Target} />;
      text = p.title;
    }
  } else if (fieldKey === "type" && values.type) {
    const t = TYPE_BY_ID[values.type];
    lead = <Tile c={t.c} size={34} icon={t.icon} />;
    text = t.label;
  } else if (fieldKey === "proprietaire") {
    const o = ownerOption(values.proprietaire, me);
    lead = <Tile c={o.c} size={34} icon={o.icon} />;
    text = o.label;
  } else if (fieldKey === "licence" && values.licence) {
    const l = licenses.find((x) => x.id === values.licence);
    if (l) {
      lead = <Tile c={l.restrictions.length ? PAL.amber : PAL.mint} size={34} icon={Scale} />;
      text = l.name;
    }
  } else if (fieldKey === "pays" && values.pays) {
    const c = COUNTRY_BY_ID[values.pays];
    if (c) {
      lead = <Tile c={regionTone(c)} size={34} code={c.id} />;
      text = c.name;
    }
  }
  return (
    <FieldShell id={id} label={f.label} active={isActive}>
      <button
        id={id}
        type="button"
        ref={(el) => register(fieldKey, el)}
        data-active={isActive}
        onClick={() => activate(fieldKey)}
        onFocus={() => activate(fieldKey)}
        className="pp-field flex h-[58px] w-full items-center gap-2 px-3 text-left"
      >
        <span className="min-w-0 flex-1">
          {text ? (
            <motion.span
              key={text}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex min-w-0 items-center gap-3"
            >
              {lead}
              <span className={`truncate text-[16px] font-semibold ${INK}`}>{text}</span>
            </motion.span>
          ) : (
            <span className={`pl-1 text-[16px] ${INK3}`}>{f.placeholder}</span>
          )}
        </span>
        <ChevronRight
          size={18}
          className={`shrink-0 transition-transform duration-300 max-lg:-rotate-90 ${isActive ? `translate-x-0.5 ${ACCENT_TEXT}` : INK3}`}
        />
      </button>
    </FieldShell>
  );
}

/** Choix à deux options en pastilles (visibilité, hors ligne). */
function Toggle<T extends string | boolean>({
  fieldKey,
  value,
  options,
  onChange,
  note,
}: {
  fieldKey: FieldKey;
  value: T;
  options: { id: T; label: string; icon: typeof Globe }[];
  onChange: (v: T) => void;
  note?: string;
}) {
  const { activate, register, active } = useForm();
  const isActive = active === fieldKey;
  return (
    <FieldShell id={`rf-${fieldKey}`} label={field(fieldKey).label} hint={note} active={isActive}>
      <div role="radiogroup" aria-label={field(fieldKey).label} className="flex flex-wrap gap-2.5">
        {options.map((o, i) => {
          const on = value === o.id;
          return (
            <button
              key={String(o.id)}
              id={i === 0 ? `rf-${fieldKey}` : undefined}
              ref={i === 0 ? (el) => register(fieldKey, el) : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              onFocus={() => activate(fieldKey)}
              onClick={() => {
                activate(fieldKey);
                onChange(o.id);
              }}
              data-active={on}
              className={`pp-field inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold ${on ? ACCENT_TEXT : INK2}`}
            >
              <o.icon size={16} />
              {o.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

function LanguagesField() {
  const f = field("langues");
  const {
    values,
    queries,
    setQuery,
    commitLang,
    toggleLang,
    activate,
    register,
    active,
    isMobile,
  } = useForm();
  const list = values.langues;
  const query = queries.langues ?? "";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isActive = active === "langues";

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitLang();
    } else if (e.key === "Backspace" && !query && list.length) toggleLang(list[list.length - 1]);
    else if (e.key === "Escape") setQuery("langues", "");
  };

  return (
    <FieldShell id="rf-langues" label={f.label} active={isActive}>
      <div
        className="pp-field flex min-h-[58px] cursor-text flex-wrap items-center gap-2 px-3 py-2.5"
        data-active={isActive}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {list.map((label) => (
            <motion.span
              key={label}
              layout="position"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={SPRING}
              className={`inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-[color:var(--accent-soft)] pr-1 pl-3 text-[14px] font-semibold ${ACCENT_TEXT}`}
            >
              <span className="truncate">{label}</span>
              <button
                type="button"
                aria-label={`Retirer ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLang(label);
                }}
                className="grid size-6 place-items-center rounded-full hover:bg-[color:var(--accent-soft2)]"
              >
                <X size={13} strokeWidth={2.6} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id="rf-langues"
          ref={(el) => {
            inputRef.current = el;
            register("langues", el);
          }}
          value={query}
          onChange={(e) => setQuery("langues", e.target.value)}
          onFocus={() => activate("langues")}
          onKeyDown={onKeyDown}
          placeholder={list.length ? "Ajouter…" : tagSets.langue.placeholder}
          autoComplete="off"
          readOnly={isMobile}
          className={`h-8 min-w-[9ch] flex-1 bg-transparent px-1 text-[16px] outline-none ${INK}`}
        />
      </div>
    </FieldShell>
  );
}

function FormColumn({ error }: { error: unknown }) {
  const { values, set, owners, me, problems } = useForm();
  const target = problems.find((p) => p.id === values.probleme);
  const dataset = values.type === "dataset";
  const owner = values.proprietaire === ME ? me : values.proprietaire;
  const nameHint =
    values.nom && !NAME_RE.test(values.nom)
      ? "Lettres, chiffres, points et tirets, sans espace ni accent."
      : `Adresse du dépôt : ${owner}/${values.nom || "nom"}`;
  return (
    <>
      <div className="mb-8">
        <h1 id="rf-h1" className={`text-[clamp(46px,4.7vw,72px)] leading-[.95] ${DISPLAY} ${INK}`}>
          Créer un <span className="text-[color:var(--accent)]">dépôt</span>
        </h1>
        <p className={`mt-4 max-w-[44ch] text-[16.5px] leading-relaxed ${INK2}`}>
          Un modèle, un dataset ou une bibliothèque, qui répond à un problème. Vous gardez tous vos
          droits : seule la licence choisie s’applique.
        </p>
      </div>
      <div className="space-y-6">
        <PickerField fieldKey="probleme" />
        {target?.status === "closed" && <ClosedWarning />}
        <div className={`grid gap-4 ${owners.length > 1 ? "sm:grid-cols-2" : ""}`}>
          <PickerField fieldKey="type" />
          {owners.length > 1 && <PickerField fieldKey="proprietaire" />}
        </div>
        <TextField fieldKey="nom" hint={nameHint} />
        <TextField fieldKey="description" />

        <Group title="Partage">
          <Toggle
            fieldKey="visibilite"
            value={values.visibilite}
            onChange={(v) => set("visibilite", v)}
            options={[
              { id: "public", label: "Public", icon: Globe },
              { id: "private", label: "Privé", icon: Lock },
            ]}
            note={
              values.visibilite === "private"
                ? "Visible par vous, vos collaborateurs et les membres de l’organisation."
                : "Visible par tous ; il peut être proposé comme solution à un problème."
            }
          />
          <PickerField fieldKey="licence" />
          <Toggle
            fieldKey="statut"
            value={values.statut}
            onChange={(v) => set("statut", v)}
            options={[
              { id: "under_construction", label: "En construction", icon: Construction },
              { id: "solution", label: "Solution", icon: BadgeCheck },
            ]}
            note={
              values.statut === "solution"
                ? "Tout le dépôt est visible, et il compte parmi les solutions de son problème (s’il est public)."
                : "Seul le README est visible hors de votre équipe, jusqu’à ce que vous le déclariez solution."
            }
          />
        </Group>

        <AnimatePresence initial={false}>
          {dataset && (
            <motion.div
              key="provenance"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
              className="overflow-hidden"
            >
              <Group title="Provenance">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField fieldKey="communaute" />
                  <PickerField fieldKey="pays" />
                </div>
              </Group>
            </motion.div>
          )}
        </AnimatePresence>

        <Group title="Fiche technique" note="Facultatif">
          <TextField fieldKey="tache" />
          <LanguagesField />
          <TextField fieldKey="materiel" />
          <Toggle
            fieldKey="horsLigne"
            value={values.horsLigne}
            onChange={(v) => set("horsLigne", v)}
            options={[
              { id: true, label: "Fonctionne sans connexion", icon: WifiOff },
              { id: false, label: "Connexion nécessaire", icon: Globe },
            ]}
          />
        </Group>

        <Group title="Documentation" note="Facultatif">
          <TextField fieldKey="fiche" multiline rows={8} />
          <TextField fieldKey="limites" multiline rows={3} />
        </Group>
        <ErrorText error={error} />
      </div>
    </>
  );
}

/** Problème fermé : le lien reste possible, mais le dépôt passera derrière les autres. */
function ClosedWarning() {
  return (
    <p
      role="note"
      className="flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-[14px] leading-snug"
      style={{ color: PAL.amber[0], background: hexA(PAL.amber[0], 0.1) }}
    >
      <TriangleAlert size={17} className="mt-0.5 shrink-0" />
      <span>
        Ce problème est fermé : son auteur n’en voit plus l’intérêt. Un dépôt qui y est lié passe
        derrière les autres dans le hub et la recherche. Si le sujet reste d’actualité pour vous,{" "}
        <Link to="/problemes/nouveau" className="font-semibold underline">
          publiez un nouveau problème
        </Link>{" "}
        qui explique pourquoi le travail continue.
      </span>
    </p>
  );
}

/* ════════════════════════════════════════════════════════════════
   4. COLONNE DE DROITE : PANNEAUX CONTEXTUELS
   ════════════════════════════════════════════════════════════════ */

function Dock({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const { goNext, active, order } = useForm();
  const last = active !== null && order.indexOf(active) === order.length - 1;
  return (
    <DockBar disabled={disabled} last={last} onNext={goNext}>
      {children}
    </DockBar>
  );
}

const DockChoice = ({ lead, label, sub }: { lead: ReactNode; label: string; sub?: string }) => (
  <span className="flex items-center gap-2.5">
    {lead}
    <span className="min-w-0 leading-tight">
      <span className={`block truncate text-[15px] font-semibold ${INK}`}>{label}</span>
      {sub && <span className={`block truncate text-[12px] ${INK3}`}>{sub}</span>}
    </span>
  </span>
);

const problemTone = (status: ProblemStatus) =>
  status === "closed" ? PAL.amber : status === "solved" ? PAL.mint : PAL.lav;

function ProblemsPanel() {
  const { values, set, queries, problems } = useForm();
  const q = norm(queries.probleme ?? "");
  const shown = problems.filter(
    (p) => !q || norm(`${p.title} ${p.country} ${p.sector}`).includes(q),
  );
  const live = shown.filter((p) => p.status !== "closed");
  const closed = shown.filter((p) => p.status === "closed");
  const sel = problems.find((p) => p.id === values.probleme);
  const item = (p: ProblemSummary) => {
    const on = values.probleme === p.id;
    return (
      <motion.div key={p.id} variants={itemVariants}>
        <Glass
          as={motion.button}
          type="button"
          aria-pressed={on}
          onClick={() => set("probleme", on ? null : p.id)}
          whileHover={{ scale: 1.015, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          style={
            on
              ? {
                  background: "linear-gradient(180deg, var(--accent-soft2), var(--accent-soft))",
                  boxShadow:
                    "inset 0 1px 0 var(--rim), 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-ring)",
                }
              : undefined
          }
          className="flex w-full items-start gap-3.5 rounded-[22px] p-4 text-left"
        >
          <Tile c={problemTone(p.status)} size={38} icon={Target} />
          <span className="min-w-0 flex-1">
            <span className={`block text-[15.5px] leading-snug font-semibold ${INK}`}>
              {p.title}
            </span>
            <span className={`mt-1 block text-[13px] ${INK3}`}>
              {p.country} · {p.sector} · {problemStatusLabels[p.status]}
            </span>
          </span>
          {on && (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--on-accent)]">
              <Check size={14} strokeWidth={3.2} />
            </span>
          )}
        </Glass>
      </motion.div>
    );
  };
  return (
    <>
      <PanelHead
        title="À quel problème répond-il ?"
        subtitle="Un dépôt répond toujours à un problème. Vous pourrez en changer plus tard, dans ses paramètres."
      />
      <div className="pp-scroll -mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1 pr-2">
        {live.map(item)}
        {!shown.length && (
          <p className={`px-1 text-[14.5px] ${INK3}`}>Aucun problème ne correspond.</p>
        )}
        <motion.div variants={itemVariants}>
          <Link
            to="/problemes/nouveau"
            className="flex items-center gap-3 rounded-full border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-2 pr-5 text-left"
          >
            <Tile c={PAL.lav} size={34} icon={Plus} />
            <span className={`text-[15px] ${INK}`}>
              Votre problème n’existe pas encore ? <b className="font-semibold">Publiez-le</b>
            </span>
          </Link>
        </motion.div>
        {closed.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-3 pt-4">
            <h3
              className="flex items-center gap-2 px-1 text-[13px] font-semibold"
              style={{ color: PAL.amber[0] }}
            >
              <TriangleAlert size={15} /> Problèmes fermés
            </h3>
            <p className={`px-1 text-[13.5px] leading-snug ${INK2}`}>
              Leur auteur n’en voit plus l’intérêt : un dépôt qui y est lié passe derrière les
              autres. Préférez un problème ouvert, ou publiez-en un nouveau.
            </p>
            {closed.map(item)}
          </motion.section>
        )}
      </div>
      <Dock disabled={!sel}>
        {sel ? (
          <DockChoice
            lead={<Tile c={problemTone(sel.status)} size={34} icon={Target} />}
            label={sel.title}
            sub={`${sel.country} · ${problemStatusLabels[sel.status]}`}
          />
        ) : (
          <DockEmpty>Aucun problème choisi</DockEmpty>
        )}
      </Dock>
    </>
  );
}

function TypesPanel() {
  const { values, set, queries } = useForm();
  const q = norm(queries.type ?? "");
  const sel = values.type ? TYPE_BY_ID[values.type] : undefined;
  return (
    <>
      <PanelHead
        title="Quel type de dépôt ?"
        subtitle="Le type range le dépôt dans le hub et décide des champs à remplir."
      />
      <div className="pp-scroll -mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
        {typeOptions.map((t) => (
          <motion.div key={t.id} variants={itemVariants} className="space-y-2">
            <div className="h-[76px]">
              <ChoiceBubble
                s={t}
                selected={values.type === t.id}
                dimmed={!!q && !norm(t.label).includes(q)}
                onPick={() => set("type", values.type === t.id ? null : t.id)}
              />
            </div>
            <p className={`px-5 text-[14px] leading-snug ${INK2}`}>{t.text}</p>
          </motion.div>
        ))}
      </div>
      <Dock disabled={!sel}>
        {sel ? (
          <DockChoice lead={<Tile c={sel.c} size={34} icon={sel.icon} />} label={sel.label} />
        ) : (
          <DockEmpty>Aucun type choisi</DockEmpty>
        )}
      </Dock>
    </>
  );
}

function OwnersPanel() {
  const { values, set, owners, me } = useForm();
  const sel = ownerOption(values.proprietaire, me);
  return (
    <>
      <PanelHead
        title="Qui publie le dépôt ?"
        subtitle="Vous-même, ou une organisation dont vous êtes administrateur."
      />
      <div className="pp-scroll -mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
        {owners.map((o) => {
          const opt = ownerOption(o, me);
          return (
            <motion.div key={o} variants={itemVariants} className="h-[76px]">
              <ChoiceBubble
                s={opt}
                selected={values.proprietaire === o}
                dimmed={false}
                onPick={() => set("proprietaire", o)}
              />
            </motion.div>
          );
        })}
      </div>
      <Dock>
        <DockChoice
          lead={<Tile c={sel.c} size={34} icon={sel.icon} />}
          label={sel.label}
          sub={values.proprietaire === ME ? "Compte personnel" : "Organisation"}
        />
      </Dock>
    </>
  );
}

function LicenseCard({
  l,
  selected,
  onPick,
}: {
  l: License;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <Glass
      as={motion.button}
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING}
      style={
        selected
          ? {
              background: "linear-gradient(180deg, var(--accent-soft2), var(--accent-soft))",
              boxShadow:
                "inset 0 1px 0 var(--rim), 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-ring), 0 14px 30px -14px rgba(162,154,240,.6)",
            }
          : undefined
      }
      className="flex w-full items-start gap-3.5 rounded-[22px] p-4 text-left"
    >
      <Tile c={l.restrictions.length ? PAL.amber : PAL.mint} size={40} icon={Scale} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className={`block text-[16px] font-semibold ${INK}`}>{l.name}</span>
        <span className={`block text-[13.5px] leading-snug ${INK2}`}>{l.summary}</span>
        {l.restrictions.length > 0 ? (
          <span className="block space-y-1 pt-0.5" style={{ color: PAL.amber[0] }}>
            {l.restrictions.map((r) => (
              <span key={r} className="flex items-center gap-1.5 text-[13px] font-medium">
                <TriangleAlert size={13} className="shrink-0" /> {r}
              </span>
            ))}
          </span>
        ) : (
          <span className={`block text-[13px] ${INK3}`}>Aucune restriction</span>
        )}
      </span>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={SPRING}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--on-accent)]"
          >
            <Check size={14} strokeWidth={3.2} />
          </motion.span>
        )}
      </AnimatePresence>
    </Glass>
  );
}

function LicensesPanel() {
  const { values, set, queries, licenses } = useForm();
  const q = norm(queries.licence ?? "");
  const shown = licenses.filter((l) => !q || norm(`${l.name} ${l.summary}`).includes(q));
  const sel = licenses.find((l) => l.id === values.licence);
  return (
    <>
      <PanelHead
        title="Sous quelle licence ?"
        subtitle="Vous gardez tous vos droits : seule la licence choisie s’applique. Ses restrictions sont rappelées à chaque consultation."
      />
      <div className="pp-scroll -mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1 pr-2">
        {shown.map((l) => (
          <motion.div key={l.id} variants={itemVariants}>
            <LicenseCard
              l={l}
              selected={values.licence === l.id}
              onPick={() => set("licence", values.licence === l.id ? null : l.id)}
            />
          </motion.div>
        ))}
        {!shown.length && (
          <p className={`px-1 text-[14.5px] ${INK3}`}>Aucune licence ne correspond.</p>
        )}
      </div>
      <Dock disabled={!sel}>
        {sel ? (
          <DockChoice
            lead={
              <Tile c={sel.restrictions.length ? PAL.amber : PAL.mint} size={34} icon={Scale} />
            }
            label={sel.name}
            sub={
              sel.restrictions.length
                ? `${sel.restrictions.length} restriction${sel.restrictions.length > 1 ? "s" : ""}`
                : "Aucune restriction"
            }
          />
        ) : (
          <DockEmpty>Aucune licence choisie</DockEmpty>
        )}
      </Dock>
    </>
  );
}

function MapPanel() {
  const { values, set, queries, setQuery } = useForm();
  const sel = values.pays ? COUNTRY_BY_ID[values.pays] : undefined;
  return (
    <>
      <PanelHead
        title="D’où viennent les données ?"
        subtitle="Le pays d’origine est affiché sur le dataset. Touchez un pays ou cherchez-le ci-dessus."
      />
      <CountryMap
        selected={values.pays}
        query={queries.pays}
        onPick={(id) => {
          set("pays", id);
          if (queries.pays) setQuery("pays", "");
        }}
      />
      <Dock disabled={!sel}>
        {sel ? (
          <DockChoice
            lead={<Tile c={regionTone(sel)} size={34} code={sel.id} />}
            label={sel.name}
            sub={sel.region}
          />
        ) : (
          <DockEmpty>Aucun pays choisi</DockEmpty>
        )}
      </Dock>
    </>
  );
}

function LanguagesPanel() {
  const { values, ownLangs, queries, toggleLang, commitLang } = useForm();
  const cfg = tagSets.langue;
  const raw = (queries.langues ?? "").trim();
  const q = norm(raw);
  const selected = values.langues;
  const known = [...LANG_LABELS, ...ownLangs];
  const exact = q !== "" && known.some((l) => norm(l) === q);
  const groups = cfg.groups
    .map((g) => ({ ...g, tags: g.tags.filter((t) => !q || norm(t.label).includes(q)) }))
    .filter((g) => g.tags.length);
  const ownShown = ownLangs.filter((l) => !q || norm(l).includes(q));
  const canCreate = q !== "" && !exact;

  return (
    <>
      <PanelHead
        title="Quelles langues ?"
        subtitle="Les langues que le dépôt comprend ou contient. Elles servent à le rapprocher des problèmes."
      />
      <div className="pp-scroll -mr-2 min-h-0 flex-1 space-y-7 overflow-x-hidden overflow-y-auto px-1 py-1 pr-2">
        {canCreate && (
          <button
            type="button"
            onClick={() => commitLang(true)}
            className="flex w-full items-center gap-3 rounded-full border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-2 pr-5 text-left"
          >
            <Tile c={PAL.lav} size={34} icon={Plus} />
            <span className={`min-w-0 flex-1 truncate text-[15px] ${INK}`}>
              Ajouter « <b className="font-semibold">{capital(raw)}</b> »
            </span>
          </button>
        )}
        {ownShown.length > 0 && (
          <motion.section variants={itemVariants}>
            <h3 className={`mb-3 flex items-center gap-2 px-1 text-[11.5px] ${MONO} ${INK2}`}>
              <Tag size={14} /> {cfg.groupOwn}
            </h3>
            <div className="flex flex-wrap gap-3">
              {ownShown.map((label) => (
                <TagBubble
                  key={label}
                  tag={{ label }}
                  tone={PAL.slate}
                  fresh
                  selected={selected.includes(label)}
                  onPick={() => toggleLang(label)}
                />
              ))}
            </div>
          </motion.section>
        )}
        {groups.map((g) => (
          <motion.section key={g.id} variants={itemVariants}>
            <h3 className={`mb-3 flex items-center gap-2 px-1 text-[11.5px] ${MONO} ${INK2}`}>
              <g.icon size={14} /> {g.label}
            </h3>
            <div className="flex flex-wrap gap-3">
              {g.tags.map((t) => (
                <TagBubble
                  key={t.label}
                  tag={t}
                  tone={g.tone}
                  selected={selected.includes(t.label)}
                  onPick={() => toggleLang(t.label)}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
      <Dock>
        {selected.length ? (
          <span className="flex items-center gap-1.5 overflow-hidden">
            {selected.slice(0, 3).map((l) => (
              <span
                key={l}
                className={`max-w-[11em] truncate rounded-full bg-[color:var(--accent-soft)] px-3 py-1.5 text-[13.5px] font-semibold ${ACCENT_TEXT}`}
              >
                {l}
              </span>
            ))}
            {selected.length > 3 && (
              <span className={`shrink-0 text-[13.5px] font-semibold ${INK2}`}>
                +{selected.length - 3}
              </span>
            )}
          </span>
        ) : (
          <DockEmpty>Aucune langue sélectionnée</DockEmpty>
        )}
      </Dock>
    </>
  );
}

/* ───────────── Champs texte : aperçu en direct + aides ───────────── */

/** Aperçu de la carte du dépôt telle qu'elle apparaîtra dans le hub. */
function PreviewCard() {
  const { values, active, me, licenses } = useForm();
  const t = values.type ? TYPE_BY_ID[values.type] : undefined;
  const c = t?.c ?? PAL.slate;
  const lic = licenses.find((l) => l.id === values.licence);
  const country = values.pays ? COUNTRY_BY_ID[values.pays] : undefined;
  const owner = values.proprietaire === ME ? me : values.proprietaire;
  const hot = (k: FieldKey) => active === k;
  const chip = (label: ReactNode, key: string, style?: CSSProperties, cls = "") => (
    <span
      key={key}
      style={style}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${cls || `bg-[color:var(--chip)] ${INK2}`}`}
    >
      {label}
    </span>
  );
  const chips = [
    values.tache.trim() && chip(values.tache.trim(), "task"),
    values.horsLigne &&
      chip(
        <>
          <WifiOff size={13} /> Hors ligne
        </>,
        "off",
      ),
    ...values.langues.map((l) =>
      chip(l, `l-${l}`, undefined, `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}`),
    ),
    lic &&
      chip(
        lic.name,
        "lic",
        lic.restrictions.length
          ? { color: PAL.amber[0], background: hexA(PAL.amber[0], 0.12) }
          : undefined,
      ),
  ].filter(Boolean);
  const dotMask = "linear-gradient(100deg, transparent 8%, #000 88%)";
  const Icon = t?.icon;
  return (
    <Glass variant="lg-strong" className="overflow-hidden rounded-[22px]">
      <div className="relative h-[96px] overflow-hidden bg-[#0A0F1D]">
        <motion.div
          key={t?.id ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 170% at 100% 0%, ${hexA(c[0], 0.36)}, transparent 62%), radial-gradient(90% 130% at 0% 100%, ${hexA(c[1], 0.18)}, transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(200,206,226,.55) 1.3px, transparent 1.8px)",
            backgroundSize: "11px 11px",
            WebkitMaskImage: dotMask,
            maskImage: dotMask,
          }}
        />
        {Icon && (
          <Icon
            aria-hidden
            size={124}
            strokeWidth={1.1}
            className="absolute -top-5 -right-2 rotate-[12deg]"
            style={{ color: hexA(c[0], 0.3) }}
          />
        )}
        <span
          className={`absolute top-3.5 left-4 text-[20px] leading-none tracking-[.02em] ${DISPLAY} ${INK2}`}
        >
          Aperçu dans le hub
        </span>
        {t && (
          <span
            className={`absolute bottom-3.5 left-4 text-[11.5px] ${MONO}`}
            style={{ color: c[0] }}
          >
            {t.label}
          </span>
        )}
      </div>
      <div className="space-y-2.5 p-5 pt-4">
        <p
          data-hot={hot("nom") || hot("proprietaire")}
          className="pp-hot -mx-2 truncate px-2 py-0.5 font-[family-name:var(--font-mono)] text-[17px]"
        >
          <span className={INK3}>{owner}/</span>
          <span className={values.nom ? INK : INK3}>{values.nom || "nom-du-depot"}</span>
          {values.visibilite === "private" && (
            <Lock size={14} className={`ml-2 inline ${INK3}`} aria-label="Privé" />
          )}
        </p>
        <p
          data-hot={hot("description")}
          className={`pp-hot -mx-2 line-clamp-2 px-2 py-0.5 text-[14.5px] leading-relaxed ${values.description ? INK2 : INK3}`}
        >
          {values.description || "La description courte s’affichera ici."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {chips.length ? (
            chips
          ) : (
            <span
              className={`inline-flex h-8 items-center rounded-full border border-dashed border-[color:var(--field-line)] px-3 text-[13px] ${INK3}`}
            >
              Fiche technique non renseignée
            </span>
          )}
        </div>
        {values.type === "dataset" && (
          <p
            data-hot={hot("communaute") || hot("pays")}
            className={`pp-hot -mx-2 flex items-center gap-1.5 px-2 py-0.5 text-[13px] ${INK3}`}
          >
            <MapPin size={14} />
            Provenance : {values.communaute.trim() ? `${values.communaute.trim()}, ` : ""}
            {country?.name ?? "non renseignée"}
          </p>
        )}
      </div>
    </Glass>
  );
}

function Suggestions({ fieldKey, helpKey }: { fieldKey: TextKey; helpKey: HelpKey }) {
  const { values, queries, applyHelp } = useForm();
  const help = repoHelpSets[helpKey];
  const q = norm(queries[fieldKey] ?? "");
  const items = help.items.filter((t) => !q || norm(t).includes(q));
  const used = (t: string) =>
    help.mode === "replace" ? values[fieldKey] === t : values[fieldKey].includes(t.trim());
  return (
    <>
      <PanelHead title={help.title} subtitle={help.subtitle} />
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap gap-2.5">
          {items.map((t) => {
            const done = used(t);
            return (
              <Glass
                key={t}
                as={motion.button}
                type="button"
                onClick={() => applyHelp(fieldKey, t, help.mode)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className={`flex min-h-[46px] items-center gap-2.5 rounded-full py-2 pr-5 pl-2.5 text-left text-[14.5px] leading-tight font-semibold ${INK}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-[color:var(--accent)] text-[color:var(--on-accent)]" : `bg-[color:var(--accent-soft)] ${ACCENT_TEXT}`}`}
                >
                  {done ? (
                    <Check size={15} strokeWidth={3} />
                  ) : (
                    <Plus size={15} strokeWidth={2.6} />
                  )}
                </span>
                {t.replace(/^#+\s*/, "").trim()}
              </Glass>
            );
          })}
          {items.length === 0 && (
            <p className={`px-1 text-[14.5px] ${INK3}`}>Aucune idée ne correspond.</p>
          )}
        </div>
      </motion.div>
    </>
  );
}

function Checklist() {
  const { values, focusField, missing, licenses, problems } = useForm();
  const summary = (k: FieldKey) => {
    if (missing.includes(k)) return undefined;
    if (k === "type") return values.type ? TYPE_BY_ID[values.type].label : undefined;
    if (k === "probleme") return problems.find((p) => p.id === values.probleme)?.title;
    if (k === "licence") return licenses.find((l) => l.id === values.licence)?.name;
    return k === "nom" ? values.nom : undefined;
  };
  return (
    <>
      <PanelHead
        title="Avant de créer"
        subtitle="Touchez un champ du formulaire : l’aide correspondante s’affiche ici."
      />
      <motion.ul variants={itemVariants} className="space-y-1.5">
        {REQUIRED.map((k) => {
          const s = summary(k);
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => focusField(k)}
                className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors hover:bg-[color:var(--accent-soft)]"
              >
                {s ? (
                  <CircleCheck size={22} className="shrink-0 text-[color:var(--ok)]" />
                ) : (
                  <Circle size={22} className={`shrink-0 ${INK3}`} />
                )}
                <span className={`text-[15px] font-semibold ${INK}`}>{field(k).label}</span>
                <span
                  className={`ml-auto max-w-[55%] min-w-0 truncate text-[13.5px] ${s ? INK2 : INK3}`}
                >
                  {s || "À remplir"}
                </span>
              </button>
            </li>
          );
        })}
      </motion.ul>
    </>
  );
}

function HelpPanel() {
  const { active } = useForm();
  const helpKey = active ? HELP_OF[active] : undefined;
  return (
    // Tout le panneau défile : sur un écran bas, l'aperçu ne doit pas écraser les aides.
    <div className="pp-scroll -mr-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
      <motion.div variants={itemVariants} className="shrink-0">
        <PreviewCard />
      </motion.div>
      <div className="mt-4 flex shrink-0 flex-col">
        {active && helpKey ? (
          <Suggestions key={active} fieldKey={active as TextKey} helpKey={helpKey} />
        ) : (
          <Checklist />
        )}
      </div>
    </div>
  );
}

/* ───────────── Colonne de droite : recherche + panneau animé ───────────── */

function useStageSearch(): Parameters<typeof StageShell>[0]["search"] {
  const { values, active, queries, setQuery, set, activate, commitLang, applyHelp, licenses } =
    useForm();
  const key = active ?? "idle";
  const f = active ? field(active) : null;
  const value = queries[key] ?? "";
  const n = norm(value);
  let placeholder = "Une licence, un pays, une langue…";
  let results: SearchResult[] = [];
  let onEnter: (() => void) | undefined;
  const licenseResult = (l: License, after?: () => void): SearchResult => ({
    key: `lic-${l.id}`,
    label: l.name,
    sub: l.restrictions.length ? l.restrictions.join(", ") : "Aucune restriction",
    lead: <Tile c={l.restrictions.length ? PAL.amber : PAL.mint} size={34} icon={Scale} />,
    pick: () => {
      set("licence", l.id);
      setQuery(key, "");
      after?.();
    },
  });

  if (f?.panel === "problems") {
    placeholder = f.search ?? placeholder;
  } else if (f?.panel === "types") {
    placeholder = "Rechercher un type…";
    onEnter = () => {
      const m = typeOptions.find((t) => norm(t.label).includes(n));
      if (m) set("type", m.id);
    };
  } else if (f?.panel === "licenses") {
    placeholder = f.search ?? placeholder;
    results = licenses.filter((l) => n && norm(l.name).includes(n)).map((l) => licenseResult(l));
  } else if (f?.panel === "map") {
    placeholder = f.search ?? placeholder;
    results = COUNTRIES.filter((c) => n && norm(c.name).includes(n))
      .slice(0, 8)
      .map((c) => ({
        key: c.id,
        label: c.name,
        sub: c.region,
        lead: <Tile c={regionTone(c)} size={34} code={c.id} />,
        pick: () => {
          set("pays", c.id);
          setQuery("pays", "");
        },
      }));
  } else if (f?.panel === "langues") {
    placeholder = tagSets.langue.search;
    onEnter = () => commitLang();
  } else if (active && HELP_OF[active]) {
    const help = repoHelpSets[HELP_OF[active]];
    placeholder = "Rechercher une idée…";
    onEnter = () => {
      const m = help.items.find((t) => norm(t).includes(n));
      if (m) applyHelp(active as TextKey, m, help.mode);
    };
  } else if (n) {
    results = licenses
      .filter((l) => norm(l.name).includes(n))
      .slice(0, 4)
      .map((l) => licenseResult(l, () => activate("licence")));
    tagSets.langue.groups.forEach((g) =>
      g.tags
        .filter((t) => norm(t.label).includes(n))
        .forEach((t) =>
          results.push({
            key: `lang-${t.label}`,
            label: t.label,
            sub: "Langue",
            lead: <Tile c={g.tone} size={34} icon={t.icon} code={t.code} />,
            pick: () => {
              if (!values.langues.includes(t.label)) set("langues", [...values.langues, t.label]);
              setQuery("idle", "");
              activate("langues");
            },
          }),
        ),
    );
    results = results.slice(0, 8);
  }
  return { value, onChange: (v: string) => setQuery(key, v), placeholder, results, onEnter };
}

function Stage() {
  const { active, sheetOpen, closeSheet } = useForm();
  const search = useStageSearch();
  const f = active ? field(active) : null;
  const panelKey = f?.panel ?? "help";

  let panel: ReactNode;
  if (f?.panel === "problems") panel = <ProblemsPanel />;
  else if (f?.panel === "types") panel = <TypesPanel />;
  else if (f?.panel === "owners") panel = <OwnersPanel />;
  else if (f?.panel === "licenses") panel = <LicensesPanel />;
  else if (f?.panel === "map") panel = <MapPanel />;
  else if (f?.panel === "langues") panel = <LanguagesPanel />;
  else panel = <HelpPanel />;

  return (
    <StageShell sheetOpen={sheetOpen} onClose={closeSheet} search={search} panelKey={panelKey}>
      {panel}
    </StageShell>
  );
}

/* ════════════════════════════════════════════════════════════════
   5. ASSEMBLAGE
   ════════════════════════════════════════════════════════════════ */

export function CreateRepo() {
  usePageTitle("Créer un dépôt");
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const { data: session } = useSession();
  const namespaces = useNamespaces(!!session);
  const licensesQ = useLicenses();
  const create = useCreateRepo();
  const problemsQ = useProblems({ status: "" });
  // Depuis la page d'un problème : « Créer un dépôt pour ce problème » le présélectionne.
  const [params] = useSearchParams();
  const [values, setValues] = useState<Values>(() => ({
    ...INITIAL,
    probleme: params.get("probleme"),
  }));
  const [ownLangs, setOwnLangs] = useState<string[]>([]);
  const [queries, setQueries] = useState<Ctx["queries"]>({});
  const [active, setActive] = useState<FieldKey | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const refs = useRef<Partial<Record<FieldKey, HTMLElement>>>({});

  const me = namespaces.data?.username ?? session?.user.name ?? "moi";
  const owners = useMemo(() => [ME, ...(namespaces.data?.adminOrgs ?? [])], [namespaces.data]);
  const licenses = useMemo(() => licensesQ.data ?? [], [licensesQ.data]);
  // Ouverts et résolus d'abord : un problème fermé reste possible, mais en dernier.
  const problems = useMemo(
    () =>
      [...(problemsQ.data ?? [])].sort(
        (a, b) => Number(a.status === "closed") - Number(b.status === "closed"),
      ),
    [problemsQ.data],
  );
  const order = useMemo(
    () =>
      ALL_KEYS.filter(
        (k) =>
          (values.type === "dataset" || !field(k).dataset) &&
          (k !== "proprietaire" || owners.length > 1),
      ),
    [values.type, owners.length],
  );

  const register = useCallback((key: FieldKey, el: HTMLElement | null) => {
    if (el) refs.current[key] = el;
  }, []);
  // Le README suit le formulaire (modèle généré) jusqu'à ce que l'auteur y écrive lui-même.
  const ficheTouched = useRef(false);
  const set = useCallback(<K extends keyof Values>(key: K, v: Values[K]) => {
    if (key === "fiche") ficheTouched.current = true;
    setValues((p) => ({ ...p, [key]: v }));
  }, []);
  const setQuery = useCallback(
    (key: FieldKey | "idle", v: string) => setQueries((p) => ({ ...p, [key]: v })),
    [],
  );
  const toggleLang = useCallback(
    (label: string) =>
      setValues((p) => ({
        ...p,
        langues: p.langues.includes(label)
          ? p.langues.filter((l) => l !== label)
          : [...p.langues, label],
      })),
    [],
  );
  const commitLang = useCallback(
    (force = false) => {
      const raw = (queries.langues ?? "").trim();
      if (!raw) return;
      const all = [...LANG_LABELS, ...ownLangs];
      const n = norm(raw);
      let label = all.find((l) => norm(l) === n);
      if (!label && !force) label = all.find((l) => norm(l).includes(n));
      if (!label) {
        const created = capital(raw.replace(/\s+/g, " "));
        label = created;
        setOwnLangs((o) => [...o, created]);
      }
      const picked = label;
      setValues((p) =>
        p.langues.includes(picked) ? p : { ...p, langues: [...p.langues, picked] },
      );
      setQuery("langues", "");
    },
    [queries.langues, ownLangs, setQuery],
  );

  const activate = useCallback((key: FieldKey) => {
    setActive(key);
    setSheetOpen(field(key).panel !== "help");
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const focusField = useCallback(
    (key: FieldKey) => {
      const el = refs.current[key];
      if (!el) return;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      el.focus({ preventScroll: true });
    },
    [reduce],
  );
  const goNext = useCallback(() => {
    const next = active ? order[order.indexOf(active) + 1] : undefined;
    if (next) focusField(next);
    else {
      setSheetOpen(false);
      document
        .getElementById("pp-publish")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, order, focusField]);

  const applyHelp = useCallback((key: TextKey, text: string, mode: HelpMode) => {
    if (key === "fiche") ficheTouched.current = true;
    setValues((p) => {
      let v = p[key];
      if (mode === "replace") v = text;
      else if (mode === "append") v = v.trim() ? `${v.replace(/\s*$/, "")}\n\n${text}` : text;
      else {
        const lines = v.split("\n").filter(Boolean);
        if (!lines.includes(text)) lines.push(text);
        v = lines.join("\n");
      }
      return { ...p, [key]: v };
    });
    requestAnimationFrame(() => {
      const el = refs.current[key];
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  const missing = useMemo(() => missingOf(values), [values]);

  const template = useMemo(() => {
    const problem = problems.find((p) => p.id === values.probleme);
    return readmeTemplate({
      name: values.nom,
      description: values.description,
      type: values.type,
      problem: problem ? { id: problem.id, title: problem.title } : null,
      task: values.tache,
      languages: values.langues,
      worksOffline: values.horsLigne,
      targetHardware: values.materiel,
      license: licenses.find((l) => l.id === values.licence)?.name ?? null,
      provenance:
        [values.communaute.trim(), values.pays ? COUNTRY_BY_ID[values.pays]?.name : ""]
          .filter(Boolean)
          .join(", ") || null,
    });
  }, [values, problems, licenses]);
  useEffect(() => {
    if (!ficheTouched.current && values.fiche !== template) {
      setValues((p) => ({ ...p, fiche: template }));
    }
  }, [template, values.fiche]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    if (missing.length) {
      setShake(true);
      setTimeout(() => setShake(false), 520);
      focusField(missing[0]);
      return;
    }
    create.mutate(inputOf(values), { onSuccess: (r) => navigate(`/${r.owner}/${r.name}`) });
  };

  const ctx: Ctx = {
    values,
    problems,
    order,
    ownLangs,
    queries,
    active,
    sheetOpen,
    shake,
    missing,
    isMobile,
    owners,
    me,
    licenses,
    set,
    setQuery,
    toggleLang,
    commitLang,
    applyHelp,
    activate,
    closeSheet,
    focusField,
    goNext,
    register,
  };

  return (
    <FormCtx.Provider value={ctx}>
      <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
        <Backdrop dim={active === "pays"} />
        <main className="mx-auto grid max-w-[1440px] gap-8 pt-[76px] pr-[max(16px,env(safe-area-inset-right,0px))] pb-4 pl-[max(16px,env(safe-area-inset-left,0px))] lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:gap-12">
          <form
            onSubmit={submit}
            noValidate
            aria-labelledby="rf-h1"
            className="min-w-0 pt-7 pb-28 lg:pb-24"
          >
            <FormColumn error={create.error} />
            <SubmitBar
              total={REQUIRED.length}
              missing={missing.map((k) => field(k).label)}
              sending={create.isPending}
              shake={shake}
              readyTitle="Prêt à créer"
              readyText="Relisez l’aperçu, puis créez le dépôt."
              action="Créer le dépôt"
              sendingLabel="Création…"
            />
          </form>
          <Stage />
        </main>
      </div>
    </FormCtx.Provider>
  );
}
