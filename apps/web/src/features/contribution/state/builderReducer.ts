// État du concepteur : la configuration JSON + sélection + historique annuler/rétablir.
// Fonction pure (aucune dépendance React) : rejouable et testable.

import {
  addBlock,
  duplicateBlock,
  findBlock,
  linkBlock,
  moveUnit,
  removeBlock,
  unlinkBlock,
  updateBlock,
  type BlockPatch,
  type BlockType,
  type CodeField,
  type FormConfig,
} from "../model";

const HISTORY_MAX = 100;
const COALESCE_MS = 800; // une rafale de frappes = une seule étape d'historique

export type BuilderState = {
  config: FormConfig;
  selectedId: string | null;
  past: FormConfig[];
  future: FormConfig[];
  dirty: boolean;
  last: { key: string | null; at: number };
};

export type BuilderAction =
  | { type: "LOAD"; config: FormConfig }
  | { type: "SELECT"; id: string | null }
  | { type: "ADD"; blockType: BlockType; unitIndex?: number; linkedTo?: string; id?: string }
  | { type: "MOVE_UNIT"; from: number; to: number }
  | { type: "UPDATE"; id: string; patch: BlockPatch; at?: number }
  | { type: "REMOVE"; id: string }
  | { type: "DUPLICATE"; id: string }
  | { type: "LINK"; id: string; anchorId: string }
  | { type: "UNLINK"; id: string }
  | {
      type: "SET_META";
      patch: Partial<Pick<FormConfig, "title" | "intro">> & {
        thanks?: Partial<NonNullable<FormConfig["thanks"]>>;
      };
      at?: number;
    }
  | { type: "SET_STORAGE"; patch: Partial<FormConfig["storage"]> }
  | { type: "SET_MODE"; mode: FormConfig["mode"] }
  | { type: "SET_CODE_FIELDS"; fields: CodeField[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVED"; snapshot: FormConfig; revision: number }
  | { type: "PUBLISHED"; config: FormConfig };

export const initialState = (config: FormConfig): BuilderState => ({
  config,
  selectedId: null,
  past: [],
  future: [],
  dirty: false,
  last: { key: null, at: 0 },
});

/** Enregistre un changement de configuration dans l'historique (sauf si rien n'a changé). */
function commit(
  state: BuilderState,
  config: FormConfig,
  {
    key = null,
    at = 0,
    selectedId = state.selectedId,
  }: { key?: string | null; at?: number; selectedId?: string | null } = {},
): BuilderState {
  if (config === state.config) return state;
  const merge = key !== null && state.last.key === key && at - state.last.at < COALESCE_MS;
  return {
    ...state,
    config,
    selectedId: selectedId && findBlock(config, selectedId) ? selectedId : null,
    past: merge ? state.past : [...state.past, state.config].slice(-HISTORY_MAX),
    future: [],
    dirty: true,
    last: { key, at },
  };
}

const keep = (config: FormConfig, id: string | null) => (id && findBlock(config, id) ? id : null);

export function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "LOAD":
      return initialState(action.config);

    case "SELECT":
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };

    case "ADD": {
      const { config, block } = addBlock(state.config, action.blockType, {
        unitIndex: action.unitIndex,
        linkedTo: action.linkedTo,
        id: action.id,
      });
      return block ? commit(state, config, { selectedId: block.id }) : state;
    }

    case "MOVE_UNIT":
      return commit(state, moveUnit(state.config, action.from, action.to));

    case "UPDATE": {
      // `at` vient de l'appelant (le reducer reste pur) ; même bloc + mêmes champs = même étape
      const key = `upd:${action.id}:${Object.keys(action.patch).sort().join(",")}`;
      return commit(state, updateBlock(state.config, action.id, action.patch), {
        key,
        at: action.at ?? 0,
      });
    }

    case "REMOVE":
      return commit(state, removeBlock(state.config, action.id), {
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      });

    case "DUPLICATE": {
      const { config, block } = duplicateBlock(state.config, action.id);
      return block ? commit(state, config, { selectedId: block.id }) : state;
    }

    case "LINK":
      return commit(state, linkBlock(state.config, action.id, action.anchorId));

    case "UNLINK":
      return commit(state, unlinkBlock(state.config, action.id));

    case "SET_META": {
      const key = `meta:${Object.keys(action.patch).sort().join(",")}`;
      const { thanks, ...rest } = action.patch;
      const next: FormConfig = { ...state.config, ...rest };
      if (thanks) {
        next.thanks = {
          title: state.config.thanks?.title ?? "",
          message: state.config.thanks?.message ?? "",
          ...thanks,
        };
      }
      return commit(state, next, { key, at: action.at ?? 0 });
    }

    case "SET_STORAGE":
      return commit(state, {
        ...state.config,
        storage: { ...state.config.storage, ...action.patch },
      });

    case "SET_MODE": {
      if (state.config.mode === action.mode) return state;
      const next: FormConfig = { ...state.config, mode: action.mode };
      // les blocs du mode visuel sont conservés : on peut revenir sans rien perdre
      if (action.mode === "code" && !next.code) next.code = { entry: "index.html", fields: [] };
      return commit(state, next, { selectedId: null });
    }

    case "SET_CODE_FIELDS":
      return commit(state, {
        ...state.config,
        code: { entry: "index.html", fields: action.fields },
      });

    case "UNDO": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        config: prev,
        past: state.past.slice(0, -1),
        future: [state.config, ...state.future],
        selectedId: keep(prev, state.selectedId),
        dirty: true,
        last: { key: null, at: 0 },
      };
    }

    case "REDO": {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        config: next,
        past: [...state.past, state.config],
        future: rest,
        selectedId: keep(next, state.selectedId),
        dirty: true,
        last: { key: null, at: 0 },
      };
    }

    /**
     * L'API a enregistré `snapshot`. Si l'utilisateur a continué à éditer entre-temps, l'état
     * reste « modifié » ; seule la révision (propriété de l'API) est reportée, sans changer
     * l'identité de la configuration quand rien d'autre n'a bougé.
     */
    case "SAVED": {
      const dirty = state.config !== action.snapshot;
      const config =
        state.config.revision === action.revision
          ? state.config
          : { ...state.config, revision: action.revision };
      return { ...state, config, dirty };
    }

    /** Publication réussie : la configuration publiée (clés figées, révision) devient la base. */
    case "PUBLISHED":
      return { ...initialState(action.config), selectedId: keep(action.config, state.selectedId) };

    default:
      return state;
  }
}
