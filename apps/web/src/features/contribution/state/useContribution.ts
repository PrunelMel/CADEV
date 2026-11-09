import { useCallback, useMemo, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import {
  usePublishedForm,
  useSubmitContribution,
  type ReviewInput,
} from "../../../api/contribution";
import {
  deriveFields,
  validateAnswers,
  type Answer,
  type Answers,
  type FormConfig,
} from "../model";

const isEmpty = (v: unknown) =>
  v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/** Identifiant d'envoi stable pour une tentative : un renvoi ne crée jamais de doublon. */
const newSubmissionId = () => crypto.randomUUID();

/** Message lisible pour une erreur d'envoi qui n'est pas une erreur de champ. */
export function submitMessage(e: unknown) {
  const err = e instanceof ApiError ? e : null;
  switch (err?.code) {
    case "form_outdated":
      return "Le formulaire vient d’être mis à jour. Rechargez la page pour répondre à la nouvelle version.";
    case "not_published":
      return "Ce problème n’accepte pas encore de contributions.";
    case "problem_closed":
      return "Ce problème est fermé : il n’accepte plus de contributions.";
    case "empty_submission":
      return "Répondez à au moins un champ avant d’envoyer.";
    default:
      break;
  }
  if (!err)
    return "Connexion impossible. Vos réponses sont conservées : réessayez dans un instant.";
  if (err.status === 401) return "Connectez-vous pour envoyer votre contribution.";
  if (err.status === 429)
    return "Trop d’envois en peu de temps. Patientez un instant, puis réessayez.";
  const first = Array.isArray(err.details) ? err.details[0]?.message : undefined;
  return first ?? err.message ?? "L’envoi a échoué. Réessayez.";
}

/** Erreurs par champ renvoyées par l'API (422) : { [clé]: message }. */
const fieldErrors = (e: unknown) =>
  e instanceof ApiError && e.details && !Array.isArray(e.details)
    ? (e.details as unknown as Record<string, string>)
    : null;

/**
 * État de la page du contributeur : formulaire publié, réponses, relectures, envoi.
 * status : 'loading' | 'ready' | 'error' | 'sending' | 'done'
 */
export function useContribution(problemId: string) {
  const query = usePublishedForm(problemId);
  const submission = useSubmitContribution(problemId);
  const form: FormConfig | null = query.data?.form ?? null;
  const [values, setValues] = useState<Record<string, Answer>>({});
  const [reviews, setReviews] = useState<Record<string, ReviewInput | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0); // +1 à chaque nouvelle contribution
  const submissionId = useRef<string | null>(null);

  const setValue = useCallback((key: string, value: Answer) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  }, []);
  const setReview = useCallback(
    (blockId: string, value: ReviewInput | null) => setReviews((r) => ({ ...r, [blockId]: value })),
    [],
  );

  const progress = useMemo(() => {
    const fields = form ? deriveFields(form).filter((f) => f.kind === "value") : [];
    const required = fields.filter((f) => f.required);
    const target = required.length ? required : fields;
    const answered = target.filter((f) => !isEmpty(values[f.key])).length;
    const reviewed = Object.values(reviews).filter((r) => r?.verdict).length;
    return {
      answered,
      total: target.length,
      requiredOnly: required.length > 0,
      reviewed,
      pct: target.length ? answered / target.length : reviewed ? 1 : 0,
      canSend: fields.some((f) => !isEmpty(values[f.key])) || reviewed > 0,
    };
  }, [form, values, reviews]);

  /** Envoie des réponses déjà nettoyées ; lève l'erreur d'API, que l'appelant range. */
  const send = useCallback(
    async (answers: Answers, reviewList?: ReviewInput[]) => {
      if (!form) return;
      if (!submissionId.current) submissionId.current = newSubmissionId();
      await submission.mutateAsync({
        submissionId: submissionId.current,
        formRevision: form.revision,
        answers,
        ...(reviewList?.length ? { reviews: reviewList } : {}),
      });
      setDone(true);
    },
    [form, submission.mutateAsync], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Page visuelle : valide comme l'API, puis envoie. */
  const submit = useCallback(async (): Promise<{ ok: boolean; firstInvalidBlockId?: string }> => {
    if (!form || submission.isPending) return { ok: false };
    setSendError(null);
    const check = validateAnswers(form, values);
    if (!check.ok) {
      setErrors(check.errors);
      return { ok: false, firstInvalidBlockId: form.blocks.find((b) => check.errors[b.key])?.id };
    }
    const reviewList = Object.values(reviews).filter((r): r is ReviewInput => !!r?.verdict);
    setErrors({});
    try {
      await send(check.clean, reviewList);
      return { ok: true };
    } catch (e) {
      const byField = fieldErrors(e);
      if (byField) {
        setErrors(byField);
        const first = form.blocks.find((b) => byField[b.key]);
        if (first) return { ok: false, firstInvalidBlockId: first.id };
      }
      setSendError(e);
      return { ok: false };
    }
  }, [form, values, reviews, send, submission.isPending]);

  /** Nouvelle contribution : tout repart de zéro, avec un nouvel identifiant d'envoi. */
  const reset = useCallback(() => {
    submissionId.current = null;
    setValues({});
    setReviews({});
    setErrors({});
    setSendError(null);
    setDone(false);
    setRound((n) => n + 1);
  }, []);

  const status = query.isPending
    ? "loading"
    : query.isError
      ? "error"
      : done
        ? "done"
        : submission.isPending
          ? "sending"
          : "ready";

  return {
    status,
    round,
    form,
    closed: query.data?.problemStatus === "closed",
    loadError: query.error,
    values,
    reviews,
    errors,
    sendError,
    progress,
    setValue,
    setReview,
    submit,
    send,
    reset,
    reload: () => void query.refetch(),
    dismissError: () => setSendError(null),
  };
}
