/**
 * Publier (ou modifier) un problème : charte « Plateforme IA appliquée » (fond marine, carte
 * d'Afrique en points, titres condensés, accent lavande), matériau « Liquid Glass ».
 *
 * Architecture : chaque champ du formulaire déclare le panneau contextuel qu'il ouvre dans la
 * colonne de droite (voir FIELDS). Les listes d'options sont dans content/problem-form.ts.
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
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Circle, CircleCheck, MapPin, Plus, Tag, X } from "lucide-react";
import { useCreateProblem, useUpdateProblem, type ProblemInput } from "../../api/hooks";
import type { ProblemDetail, ProblemStatus } from "../../api/types";
import { ErrorText } from "../../components/ui";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  hexA,
  INK,
  INK2,
  INK3,
  MONO,
  SPRING,
  Tile,
  WIDE,
} from "../../components/glass/Glass";
import { COUNTRIES, COUNTRY_BY_ID, regionTone } from "../../components/glass/africaMap";
import { countryInfo } from "../../content/countries";
import {
  helpSets,
  PAL,
  sectorOptions,
  sectorRows,
  tagSets,
  type HelpMode,
} from "../../content/problem-form";
import { problemStatusLabels } from "../../content/site";
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
  type SearchResult,
} from "../../components/glass/formKit";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageTitle } from "../../hooks/usePageTitle";

/* ════════════════════════════════════════════════════════════════
   1. UTILITAIRES ET DONNÉES
   ════════════════════════════════════════════════════════════════ */

const SECTOR_BY_ID = Object.fromEntries(sectorOptions.map((s) => [s.id, s]));

type TagKey = keyof typeof tagSets;
type HelpKey = keyof typeof helpSets;
type FieldDef = {
  label: string;
  panel: "help" | "sectors" | "map" | "tags";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  search?: string;
  tagset?: TagKey;
};

/* Registre des champs : l'ordre est celui du formulaire ; `panel` décide de ce qui s'affiche à droite */
const FIELDS = {
  titre: {
    label: "Titre du problème",
    panel: "help",
    required: true,
    placeholder: "Ex. Détecter les maladies du manioc",
    hint: "Une phrase simple, comme vous le diriez à voix haute.",
  },
  description: {
    label: "Description",
    panel: "help",
    required: true,
    placeholder: "Qui est concerné ? Où ? Que se passe-t-il aujourd’hui ?",
    hint: "Plus c’est concret, plus les équipes comprennent vite.",
  },
  secteur: {
    label: "Secteur",
    panel: "sectors",
    required: true,
    placeholder: "Choisir un secteur",
    search: "Rechercher un secteur…",
  },
  pays: {
    label: "Pays",
    panel: "map",
    required: true,
    placeholder: "Choisir un pays",
    search: "Rechercher un pays…",
  },
  connectivite: { label: "Connectivité", panel: "tags", tagset: "connectivite" },
  materiel: { label: "Matériel", panel: "tags", tagset: "materiel" },
  langue: { label: "Langues", panel: "tags", tagset: "langue" },
  criteres: {
    label: "Critères de réussite",
    panel: "help",
    placeholder: "Ex. Fonctionne hors ligne, 90 % de précision, réponse en moins de 3 secondes",
    hint: "Comment saura-t-on que la solution fonctionne ?",
  },
} satisfies Record<string, FieldDef>;
type FieldKey = keyof typeof FIELDS;
const field = (k: FieldKey): FieldDef => FIELDS[k];
const ORDER = Object.keys(FIELDS) as FieldKey[];
const REQUIRED = ORDER.filter((k) => field(k).required);
const isHelpKey = (k: FieldKey | null): k is HelpKey => !!k && k in helpSets;

type Values = {
  titre: string;
  description: string;
  secteur: string | null;
  pays: string | null;
  connectivite: string[];
  materiel: string[];
  langue: string[];
  criteres: string;
};
type TextKey = "titre" | "description" | "criteres";
type QueryKey = FieldKey | "idle";

const INITIAL: Values = {
  titre: "",
  description: "",
  secteur: null,
  pays: null,
  connectivite: [],
  materiel: [],
  langue: [],
  criteres: "",
};
const NO_CUSTOM: Record<TagKey, string[]> = { connectivite: [], materiel: [], langue: [] };

/** Champs obligatoires manquants, avec les longueurs minimales de l'API. */
const missingOf = (v: Values) =>
  REQUIRED.filter((k) => {
    if (k === "titre") return v.titre.trim().length < 5;
    if (k === "description") return v.description.trim().length < 20;
    return !v[k as "secteur" | "pays"];
  });

const knownLabels = (k: TagKey) =>
  new Set(tagSets[k].groups.flatMap((g) => g.tags.map((t) => t.label)));

/** Problème enregistré vers valeurs du formulaire (secteur et pays par identifiant). */
function valuesOf(p?: ProblemDetail): Values {
  if (!p) return INITIAL;
  return {
    titre: p.title,
    description: p.description,
    secteur: sectorOptions.find((s) => s.label === p.sector)?.id ?? null,
    pays: countryInfo(p.country)?.code ?? null,
    connectivite: p.connectivityConstraint,
    materiel: p.hardwareConstraint,
    langue: p.languageConstraint,
    criteres: p.evaluationCriteria,
  };
}

const customOf = (v: Values): Record<TagKey, string[]> => ({
  connectivite: v.connectivite.filter((l) => !knownLabels("connectivite").has(l)),
  materiel: v.materiel.filter((l) => !knownLabels("materiel").has(l)),
  langue: v.langue.filter((l) => !knownLabels("langue").has(l)),
});

const inputOf = (v: Values): ProblemInput => ({
  title: v.titre.trim(),
  description: v.description.trim(),
  sector: (v.secteur && SECTOR_BY_ID[v.secteur]?.label) || "",
  country: (v.pays && COUNTRY_BY_ID[v.pays]?.name) || "",
  connectivityConstraint: v.connectivite,
  hardwareConstraint: v.materiel,
  languageConstraint: v.langue,
  evaluationCriteria: v.criteres.trim(),
});

/* ════════════════════════════════════════════════════════════════
   2. CONTEXTE ET PRIMITIVES
   ════════════════════════════════════════════════════════════════ */

type Ctx = {
  values: Values;
  custom: Record<TagKey, string[]>;
  queries: Partial<Record<QueryKey, string>>;
  active: FieldKey | null;
  sheetOpen: boolean;
  status: "idle" | "sending" | "done";
  shake: boolean;
  missing: FieldKey[];
  isMobile: boolean;
  editing: boolean;
  problemStatus: ProblemStatus | null;
  setProblemStatus: (s: ProblemStatus) => void;
  set: <K extends keyof Values>(key: K, v: Values[K]) => void;
  setQuery: (key: QueryKey, v: string) => void;
  toggleTag: (key: TagKey, label: string) => void;
  addTag: (key: TagKey, label: string) => void;
  commitQuery: (key: TagKey, force?: boolean) => void;
  applyHelp: (key: TextKey, text: string, mode: HelpMode) => void;
  activate: (key: FieldKey) => void;
  closeSheet: () => void;
  focusField: (key: FieldKey) => void;
  goNext: () => void;
  register: (key: FieldKey, el: HTMLElement | null) => void;
  submit: (e: FormEvent) => void;
  closeDone: () => void;
  reset: () => void;
};

const FormCtx = createContext<Ctx | null>(null);
function useForm() {
  const ctx = useContext(FormCtx);
  if (!ctx) throw new Error("useForm hors de PublishProblem");
  return ctx;
}

/* ════════════════════════════════════════════════════════════════
   3. COLONNE DE GAUCHE : LE FORMULAIRE
   ════════════════════════════════════════════════════════════════ */

function TextField({
  fieldKey,
  multiline = false,
  rows = 4,
}: {
  fieldKey: TextKey;
  multiline?: boolean;
  rows?: number;
}) {
  const f = field(fieldKey);
  const { values, set, activate, register, active } = useForm();
  const id = `pp-${fieldKey}`;
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
    <FieldShell id={id} label={f.label} hint={f.hint} active={isActive}>
      <div className="pp-field" data-active={isActive}>
        {multiline ? (
          <textarea
            {...common}
            rows={rows}
            onChange={(e) => set(fieldKey, e.target.value)}
            className={`block max-h-[340px] min-h-[var(--min,0px)] w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-relaxed outline-none [field-sizing:content] ${INK}`}
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

function PickerField({ fieldKey }: { fieldKey: "secteur" | "pays" }) {
  const f = field(fieldKey);
  const { values, activate, register, active } = useForm();
  const id = `pp-${fieldKey}`;
  const isActive = active === fieldKey;
  let content = <span className={`pl-1 text-[16px] ${INK3}`}>{f.placeholder}</span>;
  const s = fieldKey === "secteur" && values.secteur ? SECTOR_BY_ID[values.secteur] : null;
  const c = fieldKey === "pays" && values.pays ? COUNTRY_BY_ID[values.pays] : null;
  if (s) {
    content = (
      <motion.span
        key={s.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-w-0 items-center gap-3"
      >
        <Tile c={s.c} size={34} icon={s.icon} />
        <span className={`truncate text-[16px] font-semibold ${INK}`}>{s.label}</span>
      </motion.span>
    );
  }
  if (c) {
    content = (
      <motion.span
        key={c.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-w-0 items-center gap-3"
      >
        <Tile c={regionTone(c)} size={34} code={c.id} />
        <span className={`truncate text-[16px] font-semibold ${INK}`}>{c.name}</span>
      </motion.span>
    );
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
        <span className="min-w-0 flex-1">{content}</span>
        <ChevronRight
          size={18}
          className={`shrink-0 transition-transform duration-300 max-lg:-rotate-90 ${isActive ? `translate-x-0.5 ${ACCENT_TEXT}` : INK3}`}
        />
      </button>
    </FieldShell>
  );
}

function TagsField({ fieldKey }: { fieldKey: TagKey }) {
  const f = field(fieldKey);
  const cfg = tagSets[fieldKey];
  const {
    values,
    queries,
    setQuery,
    commitQuery,
    toggleTag,
    activate,
    register,
    active,
    isMobile,
  } = useForm();
  const list = values[fieldKey];
  const query = queries[fieldKey] ?? "";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const id = `pp-${fieldKey}`;
  const isActive = active === fieldKey;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitQuery(fieldKey);
    } else if (e.key === "Backspace" && !query && list.length)
      toggleTag(fieldKey, list[list.length - 1]);
    else if (e.key === "Escape") setQuery(fieldKey, "");
  };

  return (
    <FieldShell id={id} label={f.label} active={isActive}>
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
                  toggleTag(fieldKey, label);
                }}
                className="grid size-6 place-items-center rounded-full hover:bg-[color:var(--accent-soft2)]"
              >
                <X size={13} strokeWidth={2.6} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          ref={(el) => {
            inputRef.current = el;
            register(fieldKey, el);
          }}
          value={query}
          onChange={(e) => setQuery(fieldKey, e.target.value)}
          onFocus={() => activate(fieldKey)}
          onKeyDown={onKeyDown}
          placeholder={list.length ? "Ajouter…" : cfg.placeholder}
          autoComplete="off"
          readOnly={isMobile}
          className={`h-8 min-w-[9ch] flex-1 bg-transparent px-1 text-[16px] outline-none ${INK}`}
        />
      </div>
    </FieldShell>
  );
}

function PublishBar() {
  const { missing, status, shake, editing } = useForm();
  return (
    <SubmitBar
      total={REQUIRED.length}
      missing={missing.map((k) => field(k).label)}
      sending={status === "sending"}
      shake={shake}
      readyTitle={editing ? "Prêt à enregistrer" : "Prêt à publier"}
      readyText={
        editing ? "Relisez l’aperçu, puis enregistrez." : "Relisez l’aperçu, puis publiez."
      }
      action={editing ? "Enregistrer" : "Publier le problème"}
      sendingLabel={editing ? "Enregistrement…" : "Publication…"}
    />
  );
}

/** Statut du problème, en modification seulement. */
function StatusField() {
  const { problemStatus, setProblemStatus } = useForm();
  if (!problemStatus) return null;
  return (
    <Group title="Statut">
      <div className="flex flex-wrap gap-2.5">
        {(Object.entries(problemStatusLabels) as [ProblemStatus, string][]).map(([k, v]) => (
          <button
            key={k}
            type="button"
            aria-pressed={problemStatus === k}
            onClick={() => setProblemStatus(k)}
            className={`pp-field h-11 rounded-full px-5 text-[15px] font-semibold ${problemStatus === k ? ACCENT_TEXT : INK2}`}
            data-active={problemStatus === k}
          >
            {v}
          </button>
        ))}
      </div>
      <p className={`px-1 text-[13px] leading-snug ${INK3}`}>
        Un problème fermé n’accepte plus de contributions de données. Les dépôts qui y sont liés
        passent derrière les autres, et leurs propriétaires sont prévenus.
      </p>
    </Group>
  );
}

function FormColumn({ error }: { error: unknown }) {
  const { submit, editing } = useForm();
  return (
    <form onSubmit={submit} noValidate aria-labelledby="pp-h1">
      <div className="mb-8">
        <h1 id="pp-h1" className={`text-[clamp(46px,4.7vw,72px)] leading-[.95] ${DISPLAY} ${INK}`}>
          {editing ? "Modifier le" : "Publier un"}{" "}
          <span className="text-[color:var(--accent)]">problème</span>
        </h1>
        <p className={`mt-4 max-w-[44ch] text-[16.5px] leading-relaxed ${INK2}`}>
          Décrivez un besoin concret du terrain. Des équipes IA pourront y répondre.
        </p>
      </div>
      <div className="space-y-6">
        <TextField fieldKey="titre" />
        <TextField fieldKey="description" multiline rows={5} />
        <Group title="Contexte">
          <div className="grid gap-4 sm:grid-cols-2">
            <PickerField fieldKey="secteur" />
            <PickerField fieldKey="pays" />
          </div>
        </Group>
        <Group title="Sur le terrain" note="Facultatif">
          <TagsField fieldKey="connectivite" />
          <TagsField fieldKey="materiel" />
          <TagsField fieldKey="langue" />
        </Group>
        <TextField fieldKey="criteres" multiline rows={3} />
        <StatusField />
        <ErrorText error={error} />
      </div>
      <PublishBar />
    </form>
  );
}

/* ════════════════════════════════════════════════════════════════
   4. COLONNE DE DROITE : PANNEAUX CONTEXTUELS
   ════════════════════════════════════════════════════════════════ */

function Dock({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const { goNext, active } = useForm();
  const last = active !== null && ORDER.indexOf(active) === ORDER.length - 1;
  return (
    <DockBar disabled={disabled} last={last} onNext={goNext}>
      {children}
    </DockBar>
  );
}

/* ───────────── Secteur : grille asymétrique de bulles ───────────── */

function SectorsPanel() {
  const { values, set, queries } = useForm();
  const q = norm(queries.secteur ?? "");
  const hit = (s: (typeof sectorOptions)[number]) => !q || norm(s.label).includes(q);
  const sel = values.secteur ? SECTOR_BY_ID[values.secteur] : undefined;
  let n = 0;
  return (
    <>
      <PanelHead
        title="Dans quel secteur ?"
        subtitle="Choisissez le domaine le plus proche du problème."
      />
      <div className="pp-scroll -mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1 xl:overflow-visible">
        <div className="flex flex-wrap content-start gap-3 xl:h-full xl:flex-col xl:flex-nowrap xl:gap-4">
          {sectorRows.map((row, ri) => (
            <div
              key={ri}
              className="contents xl:flex xl:min-h-0 xl:gap-4 xl:pr-[var(--pr)] xl:pl-[var(--pl)] xl:[flex:var(--rh)_1_0%]"
              style={{ "--rh": row.h, "--pl": row.pl, "--pr": row.pr } as CSSProperties}
            >
              {row.ids.map((id, i) => {
                const s = SECTOR_BY_ID[id];
                const k = n++;
                return (
                  <motion.div
                    key={id}
                    variants={itemVariants}
                    className="h-[76px] min-w-0 flex-[1_1_calc(50%-6px)] xl:h-auto xl:[flex:var(--w)_1_0%]"
                    style={{ "--w": row.w[i] } as CSSProperties}
                  >
                    <div
                      className="pp-bob h-full"
                      style={
                        {
                          "--dur": `${6 + (k % 4) * 1.3}s`,
                          "--delay": `${-k * 0.9}s`,
                          "--bob": k % 2 ? "-5px" : "5px",
                        } as CSSProperties
                      }
                    >
                      <ChoiceBubble
                        s={s}
                        selected={values.secteur === id}
                        dimmed={!hit(s)}
                        onPick={() => set("secteur", values.secteur === id ? null : id)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Dock disabled={!sel}>
        {sel ? (
          <span className="flex items-center gap-2.5">
            <Tile c={sel.c} size={34} icon={sel.icon} />
            <span className={`truncate text-[15px] font-semibold ${INK}`}>{sel.label}</span>
          </span>
        ) : (
          <DockEmpty>Aucun secteur choisi</DockEmpty>
        )}
      </Dock>
    </>
  );
}

/* ───────────── Pays : carte interactive de l'Afrique ───────────── */

function MapPanel() {
  const { values, set, queries, setQuery } = useForm();
  const sel = values.pays ? COUNTRY_BY_ID[values.pays] : undefined;
  return (
    <>
      <PanelHead
        title="Où se situe le problème ?"
        subtitle="Touchez un pays sur la carte, ou cherchez-le ci-dessus."
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
          <span className="flex items-center gap-2.5">
            <Tile c={regionTone(sel)} size={34} code={sel.id} />
            <span className="min-w-0 leading-tight">
              <span className={`block truncate text-[15px] font-semibold ${INK}`}>{sel.name}</span>
              <span className={`block truncate text-[12px] ${INK3}`}>{sel.region}</span>
            </span>
          </span>
        ) : (
          <DockEmpty>Aucun pays choisi</DockEmpty>
        )}
      </Dock>
    </>
  );
}

/* ───────────── Étiquettes normalisées (Connectivité, Matériel, Langues) ───────────── */

function TagsPanel({ fieldKey }: { fieldKey: TagKey }) {
  const { values, custom, queries, toggleTag, commitQuery } = useForm();
  const cfg = tagSets[fieldKey];
  const raw = (queries[fieldKey] ?? "").trim();
  const q = norm(raw);
  const selected = values[fieldKey];
  const own = custom[fieldKey];
  const known = [...cfg.groups.flatMap((g) => g.tags.map((t) => t.label)), ...own];
  const exact = q !== "" && known.some((l) => norm(l) === q);
  const groups = cfg.groups
    .map((g) => ({ ...g, tags: g.tags.filter((t) => !q || norm(t.label).includes(q)) }))
    .filter((g) => g.tags.length);
  const ownShown = own.filter((l) => !q || norm(l).includes(q));
  const hasMatches = groups.length > 0 || ownShown.length > 0;
  const canCreate = q !== "" && !exact;

  return (
    <>
      <PanelHead title={cfg.title} subtitle={cfg.subtitle} />
      <div className="pp-scroll -mr-2 min-h-0 flex-1 space-y-7 overflow-x-hidden overflow-y-auto px-1 py-1 pr-2">
        <AnimatePresence initial={false}>
          {canCreate && (
            <motion.button
              key="create"
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={SPRING}
              onClick={() => commitQuery(fieldKey, true)}
              className="flex w-full items-center gap-3 rounded-full border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-soft)] p-2 pr-5 text-left"
            >
              <Tile c={PAL.lav} size={34} icon={Plus} />
              <span className={`min-w-0 flex-1 truncate text-[15px] ${INK}`}>
                Créer « <b className="font-semibold">{capital(raw)}</b> »
              </span>
              {!hasMatches && (
                <kbd
                  className={`rounded-md bg-[color:var(--chip)] px-2 py-1 text-[10px] ${MONO} ${INK2}`}
                >
                  Entrée
                </kbd>
              )}
            </motion.button>
          )}
        </AnimatePresence>

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
                  onPick={() => toggleTag(fieldKey, label)}
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
                  onPick={() => toggleTag(fieldKey, t.label)}
                />
              ))}
            </div>
          </motion.section>
        ))}

        {!hasMatches && !canCreate && (
          <p className={`px-1 text-[14.5px] ${INK3}`}>Aucune étiquette ne correspond.</p>
        )}
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
          <DockEmpty>Aucune étiquette sélectionnée</DockEmpty>
        )}
      </Dock>
    </>
  );
}

/* ───────────── Champs texte : aperçu en direct + aides ───────────── */

function PreviewCard() {
  const { values, active } = useForm();
  const sector = values.secteur ? SECTOR_BY_ID[values.secteur] : undefined;
  const country = values.pays ? COUNTRY_BY_ID[values.pays] : undefined;
  const c = sector?.c ?? PAL.slate;
  const SecIcon = sector?.icon;
  const hot = (k: FieldKey) => active === k;
  const chip = (t: string) => (
    <span
      key={t}
      className={`inline-flex h-8 items-center rounded-full bg-[color:var(--chip)] px-3 text-[13px] font-medium ${INK2}`}
    >
      {t}
    </span>
  );
  const ghost = (
    <span
      className={`inline-flex h-8 items-center rounded-full border border-dashed border-[color:var(--field-line)] px-3 text-[13px] ${INK3}`}
    >
      Non renseigné
    </span>
  );
  const rows: [string, ReactNode[]][] = [
    [
      "Pays",
      country
        ? [
            <span
              key="c"
              className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--accent-soft)] pr-3 pl-2.5 text-[13px] font-semibold ${ACCENT_TEXT}`}
            >
              <MapPin size={14} /> {country.name}
            </span>,
          ]
        : [],
    ],
    ["Connectivité", values.connectivite.map(chip)],
    ["Matériel", values.materiel.map(chip)],
    ["Langues", values.langue.map(chip)],
  ];
  const dotMask = "linear-gradient(100deg, transparent 8%, #000 88%)";
  return (
    <Glass variant="lg-strong" className="overflow-hidden rounded-[22px]">
      <div className="relative h-[108px] overflow-hidden bg-[#0A0F1D]">
        <motion.div
          key={sector?.id ?? "none"}
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
        {SecIcon && (
          <SecIcon
            aria-hidden
            size={132}
            strokeWidth={1.1}
            className="absolute -top-5 -right-2 rotate-[12deg]"
            style={{ color: hexA(c[0], 0.3) }}
          />
        )}
        <span
          className={`absolute top-3.5 left-4 text-[20px] leading-none tracking-[.02em] ${DISPLAY} ${INK2}`}
        >
          Aperçu du brouillon
        </span>
        {sector && (
          <span
            className={`absolute bottom-3.5 left-4 text-[11.5px] ${MONO}`}
            style={{ color: c[0] }}
          >
            {sector.label}
          </span>
        )}
      </div>
      <div className="space-y-2.5 p-5 pt-4">
        <h3
          data-hot={hot("titre")}
          className={`pp-hot -mx-2 px-2 py-0.5 text-[34px] leading-[1.02] ${DISPLAY} ${values.titre ? INK : INK3}`}
        >
          {values.titre || "Votre titre apparaîtra ici"}
        </h3>
        <p
          data-hot={hot("description")}
          className={`pp-hot -mx-2 line-clamp-3 px-2 py-0.5 text-[14.5px] leading-relaxed ${values.description ? INK2 : INK3}`}
        >
          {values.description ||
            "La description du besoin s’affichera ici, telle que les équipes la liront."}
        </p>
        <div className="space-y-2 pt-1.5">
          {rows.map(([label, nodes]) => (
            <div key={label} className="flex items-start gap-3">
              <span
                className={`w-[96px] shrink-0 pt-[10px] text-[10.5px] leading-none ${MONO} ${INK3}`}
              >
                {label}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                {nodes.length ? nodes : ghost}
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3">
            <span
              className={`w-[96px] shrink-0 pt-[6px] text-[10.5px] leading-none ${MONO} ${INK3}`}
            >
              Réussite
            </span>
            <p
              data-hot={hot("criteres")}
              className={`pp-hot -my-0.5 line-clamp-2 min-w-0 flex-1 px-2 py-0.5 text-[13.5px] leading-snug whitespace-pre-line ${values.criteres ? INK2 : INK3}`}
            >
              {values.criteres || "Non renseigné"}
            </p>
          </div>
        </div>
      </div>
    </Glass>
  );
}

function Suggestions({ fieldKey }: { fieldKey: HelpKey }) {
  const { values, queries, applyHelp } = useForm();
  const help = helpSets[fieldKey];
  const q = norm(queries[fieldKey] ?? "");
  const items = help.items.filter((t) => !q || norm(t).includes(q));
  const used = (t: string) =>
    help.mode === "replace" ? values[fieldKey] === t : values[fieldKey].includes(t.trim());
  return (
    <>
      <PanelHead title={help.title} subtitle={help.subtitle} />
      {/* Pas de défilement propre : c'est tout le panneau d'aide qui défile (sinon, sur un
          écran bas, l'aperçu prend toute la hauteur et la liste d'idées tombe à zéro). */}
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
                {t.replace(/ : $/, "")}
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
  const { values, focusField, missing } = useForm();
  const summary = (k: FieldKey) => {
    if (missing.includes(k)) return undefined;
    if (k === "secteur") return values.secteur ? SECTOR_BY_ID[values.secteur]?.label : undefined;
    if (k === "pays") return values.pays ? COUNTRY_BY_ID[values.pays]?.name : undefined;
    return k === "titre" || k === "description" ? values[k].trim() : undefined;
  };
  return (
    <>
      <PanelHead
        title="Avant de publier"
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
  return (
    <div className="pp-scroll -mr-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
      <motion.div variants={itemVariants} className="shrink-0">
        <PreviewCard />
      </motion.div>
      <div className="mt-4 flex shrink-0 flex-col">
        {isHelpKey(active) ? <Suggestions key={active} fieldKey={active} /> : <Checklist />}
      </div>
    </div>
  );
}

/* ───────────── Colonne de droite : barre de recherche + panneau animé ───────────── */

function useStageSearch() {
  const { active, queries, setQuery, set, addTag, activate, commitQuery, applyHelp } = useForm();
  const key: QueryKey = active ?? "idle";
  const f = active ? field(active) : null;
  const value = queries[key] ?? "";
  const n = norm(value);
  let placeholder = "Un secteur, un pays, une étiquette…";
  let results: SearchResult[] = [];
  let onEnter: (() => void) | undefined;

  if (f?.panel === "sectors") {
    placeholder = f.search ?? placeholder;
    onEnter = () => {
      const m = sectorOptions.find((s) => norm(s.label).includes(n));
      if (m) set("secteur", m.id);
    };
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
  } else if (f?.panel === "tags" && f.tagset) {
    const tk = f.tagset;
    placeholder = tagSets[tk].search;
    onEnter = () => commitQuery(tk);
  } else if (isHelpKey(active)) {
    const help = helpSets[active];
    placeholder = "Rechercher une idée…";
    onEnter = () => {
      const m = help.items.find((t) => norm(t).includes(n));
      if (m) applyHelp(active, m, help.mode);
    };
  } else if (n) {
    sectorOptions
      .filter((s) => norm(s.label).includes(n))
      .forEach((s) =>
        results.push({
          key: `s-${s.id}`,
          label: s.label,
          sub: "Secteur",
          lead: <Tile c={s.c} size={34} icon={s.icon} />,
          pick: () => {
            set("secteur", s.id);
            setQuery("idle", "");
            activate("secteur");
          },
        }),
      );
    COUNTRIES.filter((c) => norm(c.name).includes(n))
      .slice(0, 4)
      .forEach((c) =>
        results.push({
          key: `c-${c.id}`,
          label: c.name,
          sub: `Pays · ${c.region}`,
          lead: <Tile c={regionTone(c)} size={34} code={c.id} />,
          pick: () => {
            set("pays", c.id);
            setQuery("idle", "");
            activate("pays");
          },
        }),
      );
    (Object.keys(tagSets) as TagKey[]).forEach((tk) =>
      tagSets[tk].groups.forEach((g) =>
        g.tags
          .filter((t) => norm(t.label).includes(n))
          .forEach((t) =>
            results.push({
              key: `${tk}-${t.label}`,
              label: t.label,
              sub: field(tk).label,
              lead: <Tile c={g.tone} size={34} icon={t.icon} code={t.code} />,
              pick: () => {
                addTag(tk, t.label);
                setQuery("idle", "");
                activate(tk);
              },
            }),
          ),
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
  const panelKey = !f ? "help" : f.panel === "tags" ? `tags-${active}` : f.panel;

  let panel: ReactNode;
  if (f?.panel === "sectors") panel = <SectorsPanel />;
  else if (f?.panel === "map") panel = <MapPanel />;
  else if (f?.panel === "tags" && f.tagset) panel = <TagsPanel fieldKey={f.tagset} />;
  else panel = <HelpPanel />;

  return (
    <StageShell sheetOpen={sheetOpen} onClose={closeSheet} search={search} panelKey={panelKey}>
      {panel}
    </StageShell>
  );
}

/* ════════════════════════════════════════════════════════════════
   5. DÉCOR, CONFIRMATION, ASSEMBLAGE
   ════════════════════════════════════════════════════════════════ */

function SuccessModal() {
  const { status, values, reset, closeDone } = useForm();
  const sector = values.secteur ? SECTOR_BY_ID[values.secteur] : undefined;
  const country = values.pays ? COUNTRY_BY_ID[values.pays] : undefined;

  useEffect(() => {
    if (status !== "done") return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && closeDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, closeDone]);

  return (
    <AnimatePresence>
      {status === "done" && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            aria-hidden
            onClick={closeDone}
            className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pp-done-title"
            initial={{ scale: 0.86, y: 36, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="lg lg-strong relative w-full max-w-[480px] rounded-[26px] p-8 text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...SPRING, delay: 0.15 }}
              className="mx-auto grid size-20 place-items-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(74,222,128,.2), rgba(74,222,128,.07) 70%)",
                boxShadow: "inset 0 0 0 1.5px #4ADE80, 0 0 44px -6px rgba(74,222,128,.55)",
              }}
            >
              <svg viewBox="0 0 24 24" className="size-10" aria-hidden>
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke="#4ADE80"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                />
              </svg>
            </motion.span>
            <h2
              id="pp-done-title"
              className={`${WIDE} pp-silver mt-6 text-[22px] leading-tight`}
              style={{ letterSpacing: ".14em" }}
            >
              Problème publié
            </h2>
            <p className={`mx-auto mt-2 max-w-[36ch] text-[15.5px] leading-relaxed ${INK2}`}>
              « {values.titre} » est en ligne. Les équipes IA peuvent maintenant y répondre.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {sector && (
                <span
                  className={`inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--chip)] pr-3.5 pl-1.5 text-[13.5px] font-semibold ${INK}`}
                >
                  <Tile c={sector.c} size={26} icon={sector.icon} />
                  {sector.label}
                </span>
              )}
              {country && (
                <span
                  className={`inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--chip)] pr-3.5 pl-1.5 text-[13.5px] font-semibold ${INK}`}
                >
                  <Tile c={regionTone(country)} size={26} code={country.id} />
                  {country.name}
                </span>
              )}
            </div>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={closeDone}
                className={`lg h-12 flex-1 rounded-[12px] px-5 text-[15px] font-semibold ${INK}`}
              >
                Modifier
              </button>
              <motion.button
                type="button"
                onClick={reset}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                style={CTA_FILL}
                className="h-12 flex-[1.5] rounded-[12px] px-5 text-[15px] font-semibold whitespace-nowrap"
              >
                Publier un autre problème
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Publication d'un problème, ou modification si `initial` est fourni. Après publication,
 * « Modifier » met à jour le problème publié au lieu d'en créer un second.
 */
export function PublishProblem({ initial }: { initial?: ProblemDetail }) {
  usePageTitle(initial ? "Modifier le problème" : "Publier un problème");
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [values, setValues] = useState<Values>(() => valuesOf(initial));
  const [custom, setCustom] = useState<Record<TagKey, string[]>>(() => customOf(valuesOf(initial)));
  const [queries, setQueries] = useState<Partial<Record<QueryKey, string>>>({});
  const [active, setActive] = useState<FieldKey | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState<Ctx["status"]>("idle");
  const [shake, setShake] = useState(false);
  const [problemStatus, setProblemStatus] = useState<ProblemStatus | null>(initial?.status ?? null);
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const refs = useRef<Partial<Record<FieldKey, HTMLElement>>>({});
  const create = useCreateProblem();
  const update = useUpdateProblem(id ?? "");

  const register = useCallback((key: FieldKey, el: HTMLElement | null) => {
    if (el) refs.current[key] = el;
  }, []);
  const set = useCallback(
    <K extends keyof Values>(key: K, v: Values[K]) => setValues((p) => ({ ...p, [key]: v })),
    [],
  );
  const setQuery = useCallback(
    (key: QueryKey, v: string) => setQueries((p) => ({ ...p, [key]: v })),
    [],
  );
  const toggleTag = useCallback(
    (key: TagKey, label: string) =>
      setValues((p) => ({
        ...p,
        [key]: p[key].includes(label) ? p[key].filter((l) => l !== label) : [...p[key], label],
      })),
    [],
  );
  const addTag = useCallback(
    (key: TagKey, label: string) =>
      setValues((p) => (p[key].includes(label) ? p : { ...p, [key]: [...p[key], label] })),
    [],
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
    const next = active ? ORDER[ORDER.indexOf(active) + 1] : undefined;
    if (next) focusField(next);
    else {
      setSheetOpen(false);
      document
        .getElementById("pp-publish")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, focusField]);

  const commitQuery = useCallback(
    (key: TagKey, force = false) => {
      const raw = (queries[key] ?? "").trim();
      if (!raw) return;
      const all = [...knownLabels(key), ...custom[key]];
      const n = norm(raw);
      let label = all.find((l) => norm(l) === n);
      if (!label && !force) label = all.find((l) => norm(l).includes(n));
      if (!label) {
        const created = capital(raw.replace(/\s+/g, " "));
        label = created;
        setCustom((c) => ({ ...c, [key]: [...c[key], created] }));
      }
      addTag(key, label);
      setQuery(key, "");
    },
    [queries, custom, addTag, setQuery],
  );

  const applyHelp = useCallback((key: TextKey, text: string, mode: HelpMode) => {
    setValues((p) => {
      let v = p[key];
      if (mode === "replace") v = text;
      else if (mode === "append") v = v.trim() ? `${v.replace(/\s*$/, "")}\n${text}` : text;
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

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (status === "sending") return;
      if (missing.length) {
        setShake(true);
        setTimeout(() => setShake(false), 520);
        focusField(missing[0]);
        return;
      }
      setStatus("sending");
      const input = inputOf(values);
      const fail = () => setStatus("idle");
      if (id)
        update.mutate(problemStatus ? { ...input, status: problemStatus } : input, {
          onSuccess: () => navigate(`/problemes/${id}`),
          onError: fail,
        });
      else
        create.mutate(input, {
          onSuccess: (p) => {
            setId(p.id);
            setStatus("done");
          },
          onError: fail,
        });
    },
    [missing, status, focusField, values, id, problemStatus, update, create, navigate],
  );

  const closeDone = useCallback(() => setStatus("idle"), []);
  const reset = useCallback(() => {
    setValues(INITIAL);
    setCustom(NO_CUSTOM);
    setQueries({});
    setActive(null);
    setSheetOpen(false);
    setStatus("idle");
    setId(null);
    create.reset();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce, create]);

  const ctx: Ctx = {
    values,
    custom,
    queries,
    active,
    sheetOpen,
    status,
    shake,
    missing,
    isMobile,
    editing: !!id,
    problemStatus,
    setProblemStatus,
    set,
    setQuery,
    toggleTag,
    addTag,
    commitQuery,
    applyHelp,
    activate,
    closeSheet,
    focusField,
    goNext,
    register,
    submit,
    closeDone,
    reset,
  };

  return (
    <FormCtx.Provider value={ctx}>
      <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
        <Backdrop dim={active === "pays"} />
        <main className="mx-auto grid max-w-[1440px] gap-8 pt-[76px] pr-[max(16px,env(safe-area-inset-right,0px))] pb-4 pl-[max(16px,env(safe-area-inset-left,0px))] lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0 pt-7 pb-28 lg:pb-24">
            <FormColumn error={create.error ?? update.error} />
          </div>
          <Stage />
        </main>
        <SuccessModal />
      </div>
    </FormCtx.Provider>
  );
}
