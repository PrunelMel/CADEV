import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useContributionDraft, usePublishForm, useSaveDraft } from "../../../api/contribution";
import { emptyForm, validateConfig, type FormConfig } from "../model";
import { initialState, reducer } from "./builderReducer";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

/**
 * État du concepteur + synchronisation avec l'API :
 *  - charge le brouillon au montage ;
 *  - enregistre automatiquement (1,2 s après la dernière modification, un seul envoi à la fois) ;
 *  - publie après avoir envoyé la dernière version du brouillon.
 * `loaded` distingue un échec de chargement (rien à afficher) d'un échec d'enregistrement (le
 * travail est toujours à l'écran et sera renvoyé).
 */
export function useBuilder(problemId: string, autosaveMs = 1200) {
  const draft = useContributionDraft(problemId);
  const saveMutation = useSaveDraft(problemId);
  const publishMutation = usePublishForm(problemId);
  const [state, dispatch] = useReducer(reducer, null, () => initialState(emptyForm({ problemId })));
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<unknown>(null);
  const [publishedRevision, setPublishedRevision] = useState(0);
  const inFlight = useRef<Promise<unknown> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Le brouillon n'est chargé qu'une fois : ensuite, l'écran fait foi.
  useEffect(() => {
    if (loaded || !draft.data) return;
    dispatch({ type: "LOAD", config: draft.data.form });
    setPublishedRevision(draft.data.published);
    setLoaded(true);
    setStatus("idle");
  }, [draft.data, loaded]);

  /** Envoie `snapshot` ; un seul envoi à la fois (le suivant attend, puis repart du dernier état). */
  const save = useCallback(
    async (snapshot: FormConfig) => {
      if (inFlight.current) await inFlight.current.catch(() => {});
      setStatus("saving");
      const p = saveMutation.mutateAsync(snapshot);
      inFlight.current = p;
      try {
        const { form } = await p;
        dispatch({ type: "SAVED", snapshot, revision: form.revision });
        setError(null);
        setStatus("saved");
        return form;
      } catch (e) {
        setError(e);
        setStatus("error");
        throw e;
      } finally {
        if (inFlight.current === p) inFlight.current = null;
      }
    },
    // mutateAsync est stable ; l'objet de mutation, lui, change à chaque rendu.
    [saveMutation.mutateAsync], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!state.dirty || !loaded) return undefined;
    const snapshot = state.config;
    const timer = setTimeout(() => {
      save(snapshot).catch(() => {});
    }, autosaveMs);
    return () => clearTimeout(timer);
  }, [state.config, state.dirty, loaded, autosaveMs, save]);

  // Évite de perdre une modification non enregistrée en fermant l'onglet.
  useEffect(() => {
    if (!state.dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.dirty]);

  const publish = useCallback(async () => {
    await save(stateRef.current.config);
    const { form } = await publishMutation.mutateAsync();
    dispatch({ type: "PUBLISHED", config: form });
    setPublishedRevision(form.revision);
    return form;
  }, [save, publishMutation.mutateAsync]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    dispatch,
    status: draft.isError && !loaded ? ("error" as const) : status,
    error: !loaded ? draft.error : error,
    loaded,
    reload: () => void draft.refetch(),
    publishedRevision,
    publishing: publishMutation.isPending,
    publish,
    saveNow: () => save(stateRef.current.config),
    /** Ce qui manque avant de pouvoir publier (côté client ; l'API revérifie). */
    publishCheck: validateConfig(state.config, { stage: "publish" }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
