// Page « Concevoir la contribution » (auteur du problème).
//
//   ┌──────── 1/3 ────────┐ ┌──────────────── 2/3 ─────────────────────┐
//   │ Palette de blocs    │ │ Problème · titre · état · annuler ·      │
//   │ (recherche + cartes)│ │ aperçu · Publier                         │
//   │                     │ │ [Concevoir | Importer du code]           │
//   │                     │ │ [Formulaire | Ressources | Stockage |    │
//   │                     │ │  Relectures]                             │
//   │                     │ │ formulaire éditable   │ inspecteur       │
//   └─────────────────────┘ └───────────────────────────────────────────┘
//
// Un seul DndContext enveloppe la palette et le formulaire : on glisse une carte vers le
// formulaire (ajout), un bloc vers un autre (ordre) ou vers la zone « lier » d'une ancre (groupe).
// Toute la décision se prend dans state/dnd.ts ; ici on branche les événements.
//
// Sous 1024 px la palette devient une feuille ouverte par « Ajouter un bloc » (le « + » de chaque
// carte remplace le glisser) ; sous 1280 px l'inspecteur est aussi une feuille.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Over,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Code2,
  Database,
  Eye,
  FolderOpen,
  LayoutTemplate,
  MousePointerClick,
  PencilRuler,
  Plus,
  Redo2,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { ApiError } from "../../../api/client";
import {
  contributionUrls,
  useContributionResources,
  useContributionReviews,
  useContributionStats,
  useContributionTree,
  useDeleteResource,
  useSetStorage,
  useUploadResource,
  type Resource,
  type StorageSettings,
} from "../../../api/contribution";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import {
  BLOCK_TYPES,
  LIMITS,
  findBlock,
  newBlockId,
  units,
  type BlockType,
  type FormConfig,
  type MediaKind,
} from "../model";
import type { BuilderAction } from "../state/builderReducer";
import {
  anchorOf,
  CANVAS_ID,
  dropToAction,
  insertionHint,
  isLinkId,
  makeCollisionDetection,
  type DragSource,
  type InsertHint,
} from "../state/dnd";
import { useBuilder } from "../state/useBuilder";
import { BlockPalette, PaletteGhost } from "./BlockPalette";
import { Canvas, UnitGhost, type ActiveDrag } from "./Canvas";
import { CodeImportPanel } from "./CodeImportPanel";
import {
  CenterCard,
  describeIssue,
  ModeSwitch,
  PublishButton,
  Sheet,
  StatusPill,
  Tabs,
  Toast,
  type Issue,
  type Notice,
  type Tab,
} from "./DesignerParts";
import { FormRenderer } from "./FormRenderer";
import { Inspector, type UploadError } from "./Inspector";
import {
  ACCENT_TEXT,
  DISPLAY,
  INK,
  INK2,
  INK3,
  MONO,
  PageShell,
  PanelHead,
  panelVariants,
  SOFT_BTN,
  SuccessModal,
} from "./kit";
import { ResourcePanel } from "./ResourcePanel";
import { ReviewsPanel } from "./ReviewsPanel";
import { StoragePanel } from "./StoragePanel";

const FORMAT_LABEL = {
  csv: "Tableau CSV",
  xlsx: "Classeur Excel",
  txt: "Un fichier texte par réponse",
};
const MODES = [
  { id: "visual" as const, label: "Concevoir", icon: PencilRuler },
  { id: "code" as const, label: "Importer du code", icon: Code2 },
];
type TabId = "form" | "resources" | "storage" | "reviews" | "code";
/** Onglet ouvert par un lien (« ?onglet=relectures » depuis le tableau de bord). */
const TAB_PARAM: Record<string, TabId> = {
  relectures: "reviews",
  stockage: "storage",
  ressources: "resources",
};
const DROP = { duration: 220, easing: "cubic-bezier(.2,.9,.3,1)" };
const SR_INSTRUCTIONS = {
  draggable:
    "Pour saisir un bloc, appuyez sur Espace. Déplacez-le avec les flèches, déposez-le avec Espace, annulez avec Échap.",
};

function loadMessage(e: unknown) {
  if (!(e instanceof ApiError))
    return "Connexion impossible. Vérifiez votre réseau, puis réessayez.";
  if (e.status === 403) return "Seul l’auteur du problème peut concevoir ce formulaire.";
  if (e.status === 404) return "Ce problème est introuvable.";
  return e.message;
}

const sourceOf = (active: Active): DragSource => {
  const d = active.data.current as { kind?: string; type?: BlockType } | undefined;
  return d?.kind === "palette" && d.type
    ? { kind: "palette", type: d.type }
    : { kind: "unit", id: String(active.id) };
};

export function ContributionDesigner({
  problemId,
  problemTitle,
}: {
  problemId: string;
  problemTitle: string;
}) {
  const urls = useMemo(() => contributionUrls(problemId), [problemId]);
  const builder = useBuilder(problemId);
  const resources = useContributionResources(problemId);
  const upload = useUploadResource(problemId);
  const removeResource = useDeleteResource(problemId);
  const setStorage = useSetStorage(problemId);
  const { state, dispatch } = builder;
  const { config } = state;
  const stateRef = useRef(state);
  stateRef.current = state;
  const resourceList = resources.data ?? [];

  const isWide = useMediaQuery("(min-width: 1024px)");
  const inlineInspector = useMediaQuery("(min-width: 1280px)");

  const [params] = useSearchParams();
  const [tab, setTab] = useState<TabId>(TAB_PARAM[params.get("onglet") ?? ""] ?? "form");
  const [preview, setPreview] = useState(false);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [hint, setHint] = useState<InsertHint>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [publishError, setPublishError] = useState<unknown>(null);
  const [done, setDone] = useState<FormConfig | null>(null);
  const [storageError, setStorageError] = useState<Error | null>(null);
  const [uploadError, setUploadError] = useState<UploadError>(null);
  const [codeTouched, setCodeTouched] = useState(false);
  const [codeRev, setCodeRev] = useState(0);
  const hintRef = useRef<InsertHint>(null);
  const dragKind = useRef<DragSource["kind"] | null>(null);
  const pointerY = useRef<number | null>(null);

  // Position réelle du pointeur pendant un glisser (la translation de dnd-kit part du point de
  // saisie, et les rectangles qu'il mesure au départ ne voient pas les zones « lier » apparues).
  useEffect(() => {
    const on = (e: PointerEvent) => {
      pointerY.current = e.clientY;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  const mode = config.mode;
  const published = builder.publishedRevision > 0;
  const reviews = useContributionReviews(problemId, published);
  // Personne ne tranche les corrections : le badge compte celles proposées.
  const pendingReviews = (reviews.data ?? []).reduce((n, g) => n + g.proposals.length, 0);
  const tabs = useMemo<Tab<TabId>[]>(() => {
    const storage: Tab<TabId> = {
      id: "storage",
      label: "Stockage",
      icon: Database,
      badge: config.storage.format,
    };
    const relectures: Tab<TabId> = {
      id: "reviews",
      label: "Relectures",
      icon: ShieldCheck,
      badge: pendingReviews || null,
    };
    return mode === "code"
      ? [{ id: "code", label: "Code", icon: Code2 }, storage]
      : [
          {
            id: "form",
            label: "Formulaire",
            icon: LayoutTemplate,
            badge: units(config.blocks).length || null,
          },
          {
            id: "resources",
            label: "Ressources",
            icon: FolderOpen,
            badge: resourceList.length || null,
          },
          storage,
          relectures,
        ];
  }, [mode, config.blocks, config.storage.format, resourceList.length, pendingReviews]);
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const tree = useContributionTree(problemId, current === "storage" || current === "resources");
  const stats = useContributionStats(problemId, current === "storage" && published);
  const selected = state.selectedId ? findBlock(config, state.selectedId) : null;
  const usedIds = useMemo(
    () => new Set(config.blocks.map((b) => b.props?.resourceId).filter((x): x is string => !!x)),
    [config.blocks],
  );
  const issues = useMemo(
    () => builder.publishCheck.errors.map((e) => describeIssue(config, e)),
    [builder.publishCheck, config],
  );
  const imported = codeTouched || (config.code?.fields?.length ?? 0) > 0;

  /* ── petites aides ─────────────────────────────────────────────────── */
  const flash = useCallback((text: string) => setNotice({ text, key: Date.now() }), []);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  const scrollToBlock = useCallback((id: string) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector(`[data-block-card="${id}"]`)?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }),
    );
  }, []);

  // Ctrl/Cmd+Z annule, Maj+Z ou Ctrl+Y rétablit ; dans un champ de saisie, le navigateur décide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
      } else if (k === "y") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  // Retour du réseau : on renvoie ce qui n'a pas pu partir.
  const saveNow = builder.saveNow;
  useEffect(() => {
    const on = () => {
      if (stateRef.current.dirty) saveNow().catch(() => {});
    };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [saveNow]);

  /* ── médias ───────────────────────────────────────────────────────── */
  const uploadFiles = useCallback(
    async (files: FileList, kind?: MediaKind) => {
      const out: Resource[] = [];
      setUploadError(null);
      for (const file of Array.from(files)) {
        try {
          const { resource } = await upload.mutateAsync({ file, kind });
          out.push(resource);
        } catch (e) {
          const err = (e instanceof Error ? e : new Error("Import impossible")) as Error & {
            fileName?: string;
          };
          err.fileName = file.name;
          setUploadError(err);
        }
      }
      return out;
    },
    [upload.mutateAsync], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── ajout, lien, déplacement (avec garde-fous) ─────────────────────── */
  const perform = useCallback(
    (action: BuilderAction) => {
      const cfg = stateRef.current.config;
      const group = (anchorId: string) => units(cfg.blocks).find((u) => u.anchor.id === anchorId);
      if (action.type === "ADD") {
        if (cfg.blocks.length >= LIMITS.blocks) {
          flash(`Limite atteinte : ${LIMITS.blocks} blocs au maximum`);
          return;
        }
        if (action.linkedTo) {
          const g = group(action.linkedTo);
          if (!g || g.members.length + 1 >= LIMITS.linkGroup) {
            flash(`Un groupe compte ${LIMITS.linkGroup} blocs au plus`);
            return;
          }
        }
        const id = newBlockId();
        dispatch({ ...action, id });
        flash(`${BLOCK_TYPES[action.blockType].label} ajouté`);
        scrollToBlock(id);
      } else if (action.type === "LINK") {
        const g = group(action.anchorId);
        const already = cfg.blocks.find((b) => b.id === action.id)?.linkedTo === action.anchorId;
        if (!g || (!already && g.members.length + 1 >= LIMITS.linkGroup)) {
          flash(`Un groupe compte ${LIMITS.linkGroup} blocs au plus`);
          return;
        }
        dispatch(action);
        flash("Bloc lié");
      } else {
        dispatch(action);
      }
    },
    [dispatch, flash, scrollToBlock],
  );

  /** Le « + » d'une carte : ajoute après le bloc sélectionné (ou à la fin), sans glisser. */
  const addFromPalette = useCallback(
    (type: BlockType) => {
      const cfg = stateRef.current.config;
      const sel = stateRef.current.selectedId ? findBlock(cfg, stateRef.current.selectedId) : null;
      const unitIndex = sel
        ? units(cfg.blocks).findIndex((u) => u.anchor.id === (sel.linkedTo ?? sel.id)) + 1
        : undefined;
      setTab("form");
      setPreview(false);
      perform({ type: "ADD", blockType: type, unitIndex });
      if (!isWide) setDrawer(false);
    },
    [perform, isWide],
  );

  /* ── glisser-déposer ───────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = useMemo(
    () => makeCollisionDetection({ pointerWithin, closestCenter }),
    [],
  );
  const setHintStable = (h: InsertHint) => {
    hintRef.current = h;
    setHint((p) => (p?.overId === h?.overId && p?.position === h?.position ? p : h));
  };
  const endDrag = () => {
    setActiveDrag(null);
    setHintStable(null);
  };

  const announcements = useMemo<Announcements>(() => {
    const list = units(config.blocks);
    const nameOf = (a: Active) => {
      const src = sourceOf(a);
      if (src.kind === "palette") return BLOCK_TYPES[src.type].label;
      const b = findBlock(config, src.id);
      return b ? b.label || BLOCK_TYPES[b.type].label : "Bloc";
    };
    const where = (over: Over | null) => {
      if (!over) return "hors du formulaire";
      if (isLinkId(over.id))
        return `lié à « ${findBlock(config, anchorOf(over.id))?.label || "ce bloc"} »`;
      if (over.id === CANVAS_ID) return "dans le formulaire";
      return `position ${list.findIndex((u) => u.anchor.id === over.id) + 1} sur ${list.length}`;
    };
    return {
      onDragStart: ({ active }) => `${nameOf(active)} saisi.`,
      onDragOver: ({ active, over }) => `${nameOf(active)} : ${where(over)}.`,
      onDragEnd: ({ active, over }) =>
        over ? `${nameOf(active)} déposé : ${where(over)}.` : `${nameOf(active)} : dépôt annulé.`,
      onDragCancel: ({ active }) => `Déplacement de ${nameOf(active)} annulé.`,
    };
  }, [config]);

  const onDragStart = ({ active }: DragStartEvent) => {
    const src = sourceOf(active);
    dragKind.current = src.kind;
    setActiveDrag(src);
  };
  const onDragMove = ({ active, over, activatorEvent }: DragMoveEvent) => {
    const src = sourceOf(active);
    if (!over || src.kind !== "palette") {
      setHintStable(null);
      return;
    }
    // Au clavier, pas de pointeur : on prend le centre du bloc déplacé.
    const t = active.rect.current.translated;
    const y =
      activatorEvent instanceof KeyboardEvent || pointerY.current == null
        ? t
          ? t.top + t.height / 2
          : null
        : pointerY.current;
    // Rectangle mesuré maintenant : les zones « lier » ont pu agrandir les cartes depuis le départ.
    const card = document.querySelector(`[data-block-card="${CSS.escape(String(over.id))}"]`);
    const rect = card?.getBoundingClientRect() ?? over.rect;
    setHintStable(insertionHint({ source: src, overId: over.id, pointerY: y }, rect));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const action = over
      ? dropToAction({
          source: sourceOf(active),
          overId: over.id,
          config: stateRef.current.config,
          position: hintRef.current?.position,
        })
      : null;
    endDrag();
    if (action) perform(action);
  };

  /* ── publication et stockage ───────────────────────────────────────── */
  const onPublish = async () => {
    if (!builder.publishCheck.ok) {
      setMissingOpen((o) => !o);
      setShakeKey((k) => k + 1);
      return;
    }
    setMissingOpen(false);
    setPublishError(null);
    try {
      setDone(await builder.publish());
    } catch (e) {
      setPublishError(e);
    }
  };

  const pickIssue = (issue: Issue) => {
    setMissingOpen(false);
    if (issue.code) {
      setTab("code");
      return;
    }
    setTab("form");
    setPreview(false);
    if (issue.blockId) {
      dispatch({ type: "SELECT", id: issue.blockId });
      if (!inlineInspector) setInspectorOpen(true);
      scrollToBlock(issue.blockId);
    } else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onStorage = async (patch: Partial<StorageSettings>) => {
    setStorageError(null);
    const prev = stateRef.current.config.storage;
    dispatch({ type: "SET_STORAGE", patch });
    // Déjà publié : le changement s'applique tout de suite aux réponses collectées.
    if (published) {
      try {
        await setStorage.mutateAsync({ ...prev, ...patch });
      } catch (e) {
        setStorageError(e instanceof Error ? e : new Error("Changement impossible"));
        dispatch({ type: "SET_STORAGE", patch: prev });
      }
    }
  };

  const openInspector = (id: string) => {
    dispatch({ type: "SELECT", id });
    setInspectorOpen(true);
  };
  const closeInspector = () => {
    setInspectorOpen(false);
    dispatch({ type: "SELECT", id: null });
  };

  /* ── états de chargement ───────────────────────────────────────────── */
  if (!builder.loaded) {
    return (
      <PageShell mainClassName="grid">
        {builder.status === "error" ? (
          <CenterCard
            tone="error"
            title="Chargement impossible"
            action={{ label: "Réessayer", onClick: builder.reload }}
          >
            {loadMessage(builder.error)}
            <BackLink problemId={problemId} />
          </CenterCard>
        ) : (
          <CenterCard busy title="Chargement du brouillon">
            Un instant…
          </CenterCard>
        )}
      </PageShell>
    );
  }

  /* ── morceaux de page ──────────────────────────────────────────────── */
  const palette =
    mode === "visual" ? (
      <BlockPalette query={query} onQuery={setQuery} onAdd={addFromPalette} />
    ) : (
      <CodeAside onBack={() => dispatch({ type: "SET_MODE", mode: "visual" })} />
    );

  const inspector = selected && (
    <Inspector
      block={selected}
      config={config}
      dispatch={dispatch}
      resources={resourceList}
      resourceUrl={urls.resource}
      onUpload={uploadFiles}
      uploading={upload.isPending}
      uploadError={uploadError}
      onClose={closeInspector}
    />
  );

  const formTab = (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {preview ? (
          <div className="mx-auto max-w-[680px]">
            <p className="pp-pill mb-6">
              <Eye size={13} />
              Aperçu · rien n’est envoyé
            </p>
            <FormRenderer
              form={config}
              mode="preview"
              resourceUrl={urls.resource}
              titleClassName="text-[clamp(38px,3.6vw,60px)]"
            />
            <button
              type="button"
              disabled
              className="mt-8 inline-flex h-12 items-center rounded-full bg-[color:var(--chip)] px-7 text-[15px] font-semibold opacity-60"
            >
              Envoyer ma contribution
            </button>
          </div>
        ) : (
          <Canvas
            config={config}
            selectedId={state.selectedId}
            dispatch={dispatch}
            resourceUrl={urls.resource}
            onInspect={inlineInspector ? undefined : openInspector}
            hint={hint}
            activeDrag={activeDrag}
          />
        )}
      </div>
      {inlineInspector && !preview && (
        <aside
          aria-label="Réglages du bloc sélectionné"
          className="pp-card sticky top-[88px] flex max-h-[calc(100dvh-108px)] min-h-[240px] flex-col self-start p-4"
        >
          {inspector ?? (
            <div className="grid flex-1 place-items-center px-2 py-8 text-center">
              <div className="max-w-[24ch] space-y-3">
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
                  <MousePointerClick size={20} />
                </span>
                <p className={`text-[15px] font-semibold ${INK}`}>Sélectionnez un bloc</p>
                <p className={`text-[13.5px] leading-snug ${INK3}`}>
                  Ses réglages apparaissent ici : intitulé, aide, choix, fichier média, lien.
                </p>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );

  const panels: Record<TabId, ReactNode> = {
    form: formTab,
    resources: (
      <ResourcePanel
        resources={resourceList}
        resourceUrl={urls.resource}
        usedIds={usedIds}
        onUpload={(files) => void uploadFiles(files)}
        onRemove={(id) =>
          removeResource.mutate(id, {
            onError: (e) =>
              setUploadError(e instanceof Error ? e : new Error("Suppression impossible")),
          })
        }
        uploading={upload.isPending}
        error={uploadError}
        onClearError={() => setUploadError(null)}
      />
    ),
    storage: (
      <StoragePanel
        config={config}
        onStorage={(p) => void onStorage(p)}
        tree={tree.data}
        exportUrl={urls.export()}
        published={published}
        error={storageError}
        submissions={stats.data?.submissions}
      />
    ),
    reviews: <ReviewsPanel problemId={problemId} />,
    code: (
      <CodeImportPanel
        key={codeRev}
        problemId={problemId}
        config={config}
        dispatch={dispatch}
        imported={imported}
        onImported={() => {
          setCodeTouched(true);
          setCodeRev((n) => n + 1);
        }}
      />
    ),
  };

  return (
    <PageShell mainClassName="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={endDrag}
        accessibility={{ announcements, screenReaderInstructions: SR_INSTRUCTIONS }}
      >
        {/* `sticky` doit être la classe NON préfixée : la règle .lg:where(:not(.sticky)) de la charte
            force position: relative sinon. L'aside n'existe qu'en grand écran. */}
        {isWide && (
          <aside
            aria-label="Blocs disponibles"
            className="lg lg-stage sticky top-[76px] flex h-[calc(100dvh-92px)] flex-col self-start rounded-[30px] p-4 sm:p-5"
          >
            {palette}
          </aside>
        )}

        <section
          aria-labelledby="cd-title"
          className="lg lg-stage min-w-0 rounded-[30px] p-4 sm:p-6 lg:min-h-[calc(100dvh-92px)]"
        >
          <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <Link
                to={`/problemes/${problemId}`}
                className={`mb-2 flex max-w-full items-center gap-1.5 truncate px-1 text-[11px] ${MONO} ${INK3} hover:text-[color:var(--accent-text)]`}
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span className="truncate">{problemTitle}</span>
              </Link>
              <h1
                id="cd-title"
                className={`text-[clamp(34px,3.4vh+12px,52px)] leading-[.95] ${DISPLAY} ${INK}`}
              >
                Concevoir la <span className="text-[color:var(--accent)]">contribution</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                status={builder.status}
                dirty={state.dirty}
                error={builder.error}
                onRetry={() => builder.saveNow().catch(() => {})}
              />
              <button
                type="button"
                aria-label="Annuler (Ctrl+Z)"
                title="Annuler (Ctrl+Z)"
                disabled={!builder.canUndo}
                onClick={() => dispatch({ type: "UNDO" })}
                className={SOFT_BTN}
              >
                <Undo2 size={17} />
              </button>
              <button
                type="button"
                aria-label="Rétablir (Ctrl+Maj+Z)"
                title="Rétablir (Ctrl+Maj+Z)"
                disabled={!builder.canRedo}
                onClick={() => dispatch({ type: "REDO" })}
                className={SOFT_BTN}
              >
                <Redo2 size={17} />
              </button>
              {mode === "visual" && current === "form" && (
                <button
                  type="button"
                  aria-pressed={preview}
                  onClick={() => setPreview((v) => !v)}
                  className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition-colors ${preview ? ACCENT_TEXT : INK}`}
                  style={{
                    background: preview ? "var(--accent-soft2)" : "var(--chip)",
                    boxShadow: preview ? "inset 0 0 0 1px var(--accent)" : undefined,
                  }}
                >
                  <Eye size={16} />
                  Aperçu
                </button>
              )}
              <PublishButton
                ready={builder.publishCheck.ok}
                busy={builder.publishing}
                published={published}
                onClick={() => void onPublish()}
                issues={issues}
                open={missingOpen}
                onClose={() => setMissingOpen(false)}
                onPickIssue={pickIssue}
                shakeKey={shakeKey}
              />
            </div>
          </header>

          {publishError != null && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-[14px] px-4 py-3 text-[14px] leading-snug"
              style={{
                background: "rgba(248,113,113,.08)",
                boxShadow: "inset 0 0 0 1px rgba(248,113,113,.3)",
              }}
            >
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[color:var(--danger)]" />
              <div className="min-w-0 flex-1 text-[color:var(--danger)]">
                <p className="font-semibold">
                  {publishError instanceof Error ? publishError.message : "Publication impossible"}
                </p>
                {publishError instanceof ApiError &&
                  Array.isArray(publishError.details) &&
                  publishError.details
                    .slice(0, 5)
                    .map((d, i) => <p key={i}>{describeIssue(config, d).text}</p>)}
              </div>
              <button
                type="button"
                aria-label="Fermer ce message"
                onClick={() => setPublishError(null)}
                className={SOFT_BTN}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <ModeSwitch
              value={mode}
              onChange={(m) => dispatch({ type: "SET_MODE", mode: m })}
              options={MODES}
            />
            <Tabs
              tabs={tabs}
              value={current}
              onChange={(t) => {
                setTab(t);
                if (t !== "form") setPreview(false);
              }}
            />
          </div>

          <div id="cd-panel" role="tabpanel" aria-labelledby={`cd-tab-${current}`} className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current}
                variants={panelVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {panels[current]}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <DragOverlay dropAnimation={dragKind.current === "palette" ? null : DROP}>
          {activeDrag?.kind === "palette" && <PaletteGhost type={activeDrag.type} />}
          {activeDrag?.kind === "unit" && findBlock(config, activeDrag.id) && (
            <UnitGhost block={findBlock(config, activeDrag.id)!} />
          )}
        </DragOverlay>

        {/* petits écrans : palette et inspecteur montent du bas */}
        {!isWide && (
          <Sheet open={drawer} onClose={() => setDrawer(false)} label="Ajouter un bloc">
            <div className="flex min-h-0 flex-1 flex-col pt-2">{palette}</div>
          </Sheet>
        )}
      </DndContext>

      {!inlineInspector && (
        <Sheet
          open={inspectorOpen && !!selected && current === "form"}
          onClose={closeInspector}
          label="Réglages du bloc"
          closable={false}
        >
          <div className="flex min-h-0 flex-1 flex-col pt-1">{inspector}</div>
        </Sheet>
      )}

      {!isWide && mode === "visual" && current === "form" && !preview && !drawer && (
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="lg lg-strong fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 inline-flex h-14 items-center gap-2 rounded-full px-5 text-[15px] font-semibold"
        >
          <Plus size={18} strokeWidth={2.4} className="text-[color:var(--accent-text)]" />
          Ajouter un bloc
        </button>
      )}

      <Toast notice={notice} />

      <SuccessModal
        open={!!done}
        title="Formulaire publié"
        message="Les contributeurs peuvent maintenant le remplir. Leurs réponses arrivent dans le format choisi."
        chips={
          done
            ? [
                `Révision ${done.revision}`,
                FORMAT_LABEL[done.storage.format] ?? done.storage.format,
              ]
            : []
        }
        primary={{ label: "Continuer", onClick: () => setDone(null) }}
        secondary={{
          label: "Voir le stockage",
          onClick: () => {
            setDone(null);
            setTab("storage");
          },
        }}
        onClose={() => setDone(null)}
      />
    </PageShell>
  );
}

function BackLink({ problemId }: { problemId: string }) {
  return (
    <Link
      to={`/problemes/${problemId}`}
      className={`mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold ${ACCENT_TEXT}`}
    >
      <ArrowLeft size={14} />
      Retour au problème
    </Link>
  );
}

/** Colonne de gauche en mode « code » : pas de palette, on explique ce que la plateforme garantit. */
function CodeAside({ onBack }: { onBack: () => void }) {
  const items = [
    [
      ShieldCheck,
      "Page isolée",
      "Votre page s’exécute dans un bac à sable, sans accès aux comptes ni au réseau.",
    ],
    [
      Database,
      "Réponses validées",
      "La plateforme vérifie chaque réponse d’après le manifeste, puis l’enregistre au format choisi.",
    ],
    [
      FolderOpen,
      "Dossier généré",
      "L’arborescence du problème est créée pour vous : aucun chemin à écrire dans votre code.",
    ],
  ] as const;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHead
        title="Votre page, vos règles"
        subtitle="Importez un fichier HTML qui respecte le protocole de la plateforme."
      />
      <ul className="space-y-3">
        {items.map(([Icon, t, d]) => (
          <li key={t} className="pp-card flex gap-3 p-4">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
              <Icon size={17} />
            </span>
            <div>
              <p className={`text-[14.5px] font-semibold ${INK}`}>{t}</p>
              <p className={`mt-1 text-[13px] leading-snug ${INK2}`}>{d}</p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[14.5px] font-semibold text-[color:var(--accent-text)]"
      >
        <PencilRuler size={15} />
        Revenir à l’éditeur visuel
      </button>
    </div>
  );
}
