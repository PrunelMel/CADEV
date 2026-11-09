// Contribution de données : appels à /api/problems/:id/contribution et hooks TanStack Query.
// Le modèle (types de blocs, validation) est celui de l'API, importé tel quel : une seule règle,
// appliquée par le navigateur pour guider et par l'API qui revérifie toujours.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { MediaKind, StorageFormat } from "../features/contribution/model";
import type { Answer, FormConfig } from "../features/contribution/model";

export type Resource = {
  id: string;
  kind: MediaKind;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type TreeNode = { name: string; type: "dir" | "file"; size?: number; children?: TreeNode[] };
export type StorageSettings = FormConfig["storage"];
export type ReviewItem = {
  blockId: string;
  submissionId: string;
  target: { key: string; label: string; type: string; value: Answer; options?: string[] };
  context: { key: string; label: string; value: Answer }[];
  media: { key: string; kind: MediaKind; resourceId: string }[];
};
export type ReviewInput = {
  blockId: string;
  targetSubmissionId: string;
  targetField: string;
  verdict: "agree" | "correct" | null;
  proposedValue?: string;
  comment?: string;
};
export type ReviewGroup = {
  submissionId: string;
  field: string;
  label: string;
  original: Answer | null;
  minAgreements: number;
  confirmations: number;
  proposals: {
    value: Answer;
    supporters: number;
    reachedAgreement: boolean;
    reviewId: string;
    comments: string[];
  }[];
};
export type ContributionSummary = {
  published: boolean;
  title: string | null;
  fields: number;
  submissions: number;
};

const root = (problemId: string) => `/problems/${problemId}/contribution`;
const key = (problemId: string, ...rest: unknown[]) => ["contribution", problemId, ...rest];

/** URLs utilisables telles quelles dans <img>, <audio>, <video>, <iframe>, <a download>. */
export const contributionUrls = (problemId: string) => ({
  resource: (id: string) => `/api${root(problemId)}/resources/${encodeURIComponent(id)}/file`,
  code: (draft = false) => `/api${root(problemId)}/form/code/frame${draft ? "?draft=1" : ""}`,
  export: () => `/api${root(problemId)}/submissions/export`,
});

/* ---------- Conception (auteur) ---------- */

export const useContributionDraft = (problemId: string) =>
  useQuery({
    queryKey: key(problemId, "draft"),
    queryFn: () => api<{ form: FormConfig; published: number }>(`${root(problemId)}/form/draft`),
    // Le concepteur garde sa propre copie : ne jamais l'écraser par un rechargement.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

export const useSaveDraft = (problemId: string) =>
  useMutation({
    mutationFn: (form: FormConfig) =>
      api<{ form: FormConfig; savedAt: string }>(`${root(problemId)}/form/draft`, {
        method: "PUT",
        json: form,
      }),
  });

export function usePublishForm(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ form: FormConfig }>(`${root(problemId)}/form/publish`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(problemId, "tree") });
      void qc.invalidateQueries({ queryKey: key(problemId, "summary") });
      void qc.invalidateQueries({ queryKey: key(problemId, "form") });
    },
  });
}

export function useSetStorage(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storage: StorageSettings) =>
      api<{ storage: StorageSettings; archived: string[] }>(`${root(problemId)}/storage`, {
        method: "PUT",
        json: storage,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(problemId, "tree") }),
  });
}

export const useContributionTree = (problemId: string, enabled: boolean) =>
  useQuery({
    queryKey: key(problemId, "tree"),
    queryFn: () => api<{ tree: TreeNode[] }>(`${root(problemId)}/tree`).then((r) => r.tree),
    enabled,
  });

export const useSaveCode = (problemId: string) =>
  useMutation({
    mutationFn: (html: string) =>
      api<void>(`${root(problemId)}/form/code`, { method: "PUT", json: { html } }),
  });

export const useContributionResources = (problemId: string) =>
  useQuery({
    queryKey: key(problemId, "resources"),
    queryFn: () =>
      api<{ resources: Resource[] }>(`${root(problemId)}/resources`).then((r) => r.resources),
  });

export function useUploadResource(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind }: { file: File; kind?: MediaKind }) =>
      api<{ resource: Resource; duplicate: boolean }>(`${root(problemId)}/resources`, {
        method: "POST",
        body: file,
        query: { kind, name: file.name },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(problemId, "resources") });
      void qc.invalidateQueries({ queryKey: key(problemId, "tree") });
    },
  });
}

export function useDeleteResource(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`${root(problemId)}/resources/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(problemId, "resources") });
      void qc.invalidateQueries({ queryKey: key(problemId, "tree") });
    },
  });
}

export const useContributionReviews = (problemId: string, enabled = true) =>
  useQuery({
    queryKey: key(problemId, "reviews"),
    queryFn: () =>
      api<{ reviews: ReviewGroup[] }>(`${root(problemId)}/reviews`).then((r) => r.reviews),
    enabled,
  });

export const useContributionStats = (problemId: string, enabled = true) =>
  useQuery({
    queryKey: key(problemId, "stats"),
    queryFn: () => api<{ submissions: number; lastAt: string | null }>(`${root(problemId)}/stats`),
    enabled,
  });

/* ---------- Page du problème ---------- */

export const useContributionSummary = (problemId: string) =>
  useQuery({
    queryKey: key(problemId, "summary"),
    queryFn: () => api<ContributionSummary>(`${root(problemId)}/summary`),
  });

/* ---------- Contributeur ---------- */

export const usePublishedForm = (problemId: string) =>
  useQuery({
    queryKey: key(problemId, "form"),
    queryFn: () => api<{ form: FormConfig; problemStatus: string }>(`${root(problemId)}/form`),
    retry: false,
    refetchOnWindowFocus: false,
  });

export function useSubmitContribution(problemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      submissionId: string;
      formRevision: number;
      answers: Record<string, Answer>;
      reviews?: ReviewInput[];
    }) =>
      api<{ id: string; duplicate: boolean; reviewsRecorded?: number }>(
        `${root(problemId)}/submissions`,
        { json: body },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(problemId, "summary") });
      void qc.invalidateQueries({ queryKey: key(problemId, "review") });
    },
  });
}

export const useReviewItem = (
  problemId: string,
  blockId: string,
  round: number,
  enabled: boolean,
) =>
  useQuery({
    queryKey: key(problemId, "review", blockId, round),
    queryFn: () =>
      api<{ item: ReviewItem | null }>(`${root(problemId)}/review-queue`, {
        query: { blockId },
      }).then((r) => r.item),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export type { StorageFormat };
