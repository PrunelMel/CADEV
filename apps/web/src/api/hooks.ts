import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, encodePath } from "./client";
import type {
  Collaborator,
  Discussion,
  License,
  Namespaces,
  OrgDetail,
  ProblemDetail,
  ProblemSummary,
  Profile,
  PullDetail,
  PullSummary,
  RepoDetail,
  RepoSummary,
  RepoType,
  SearchResult,
  Version,
} from "./types";

type Ref = { owner: string; name: string };
const repoPath = ({ owner, name }: Ref) => `/repos/${owner}/${name}`;

/** Invalide toutes les requêtes dont la clé commence par `prefix` après une mutation. */
function useMutate<I, O>(fn: (input: I) => Promise<O>, prefix: unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: prefix }),
  });
}

/* Licences, recherche, profils */

export const useLicenses = () =>
  useQuery({
    queryKey: ["licenses"],
    queryFn: () => api<License[]>("/licenses"),
    staleTime: Infinity,
  });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ["search", q],
    queryFn: () => api<SearchResult>("/search", { query: { q } }),
    enabled: q.trim().length >= 2,
  });

export const useProfile = (username: string) =>
  useQuery({ queryKey: ["users", username], queryFn: () => api<Profile>(`/users/${username}`) });

export const useNamespaces = (enabled: boolean) =>
  useQuery({ queryKey: ["namespaces"], queryFn: () => api<Namespaces>("/me/namespaces"), enabled });

/* Organisations */

export const useOrg = (slug: string) =>
  useQuery({ queryKey: ["orgs", slug], queryFn: () => api<OrgDetail>(`/orgs/${slug}`) });

export const useCreateOrg = () =>
  useMutate(
    (input: { slug: string; name: string; description: string }) =>
      api<{ slug: string }>("/orgs", { json: input }),
    ["namespaces"],
  );

export const useAddOrgMember = (slug: string) =>
  useMutate(
    (input: { username: string; role: "admin" | "member" }) =>
      api(`/orgs/${slug}/members`, { json: input }),
    ["orgs", slug],
  );

export const useRemoveOrgMember = (slug: string) =>
  useMutate(
    (username: string) => api(`/orgs/${slug}/members/${username}`, { method: "DELETE" }),
    ["orgs", slug],
  );

/* Dépôts */

export const useRepos = (filters: { type?: RepoType; q?: string }) =>
  useQuery({
    queryKey: ["repos", "list", filters],
    queryFn: () => api<RepoSummary[]>("/repos", { query: filters }),
  });

export const useRepo = (ref: Ref, version?: number) =>
  useQuery({
    queryKey: ["repos", ref.owner, ref.name, "detail", version],
    queryFn: () => api<RepoDetail>(repoPath(ref), { query: { version } }),
  });

export type RepoInput = {
  type: RepoType;
  name: string;
  org?: string;
  visibility: "public" | "private";
  licenseId: string;
  description: string;
  readme: string;
  limitations: string;
  provenanceCommunity: string | null;
  provenanceCountry: string | null;
};

export const useCreateRepo = () =>
  useMutate((input: RepoInput) => api<RepoSummary>("/repos", { json: input }), ["repos"]);

export const useUpdateRepo = (ref: Ref) =>
  useMutate(
    (input: Partial<Omit<RepoInput, "type" | "name" | "org">>) =>
      api<RepoSummary>(repoPath(ref), { method: "PATCH", json: input }),
    ["repos", ref.owner, ref.name],
  );

export const useVersions = (ref: Ref) =>
  useQuery({
    queryKey: ["repos", ref.owner, ref.name, "versions"],
    queryFn: () => api<Version[]>(`${repoPath(ref)}/versions`),
  });

export const useUploadFile = (ref: Ref) =>
  useMutate(
    ({ path, file, message }: { path: string; file: File; message: string }) =>
      api(`${repoPath(ref)}/files/${encodePath(path)}`, {
        method: "PUT",
        body: file,
        query: { message },
      }),
    ["repos", ref.owner, ref.name],
  );

export const useDeleteFile = (ref: Ref) =>
  useMutate(
    (path: string) => api(`${repoPath(ref)}/files/${encodePath(path)}`, { method: "DELETE" }),
    ["repos", ref.owner, ref.name],
  );

export const useLike = (ref: Ref) =>
  useMutate(
    (on: boolean) => api(`${repoPath(ref)}/like`, { method: on ? "PUT" : "DELETE" }),
    ["repos", ref.owner, ref.name],
  );

export const useCollaborators = (ref: Ref) =>
  useQuery({
    queryKey: ["repos", ref.owner, ref.name, "collaborators"],
    queryFn: () => api<Collaborator[]>(`${repoPath(ref)}/collaborators`),
  });

export const useAddCollaborator = (ref: Ref) =>
  useMutate(
    (username: string) => api(`${repoPath(ref)}/collaborators`, { json: { username } }),
    ["repos", ref.owner, ref.name],
  );

export const useRemoveCollaborator = (ref: Ref) =>
  useMutate(
    (username: string) => api(`${repoPath(ref)}/collaborators/${username}`, { method: "DELETE" }),
    ["repos", ref.owner, ref.name],
  );

/* Pull requests */

export const usePulls = (ref: Ref) =>
  useQuery({
    queryKey: ["repos", ref.owner, ref.name, "pulls"],
    queryFn: () => api<PullSummary[]>(`${repoPath(ref)}/pulls`),
  });

export const usePull = (ref: Ref, number: number) =>
  useQuery({
    queryKey: ["repos", ref.owner, ref.name, "pulls", number],
    queryFn: () => api<PullDetail>(`${repoPath(ref)}/pulls/${number}`),
  });

export const useCreatePull = (ref: Ref) =>
  useMutate(
    (input: { title: string; description: string }) =>
      api<{ number: number }>(`${repoPath(ref)}/pulls`, { json: input }),
    ["repos", ref.owner, ref.name, "pulls"],
  );

export const useUploadPullFile = (ref: Ref, number: number) =>
  useMutate(
    ({ path, file }: { path: string; file: File }) =>
      api(`${repoPath(ref)}/pulls/${number}/files/${encodePath(path)}`, {
        method: "PUT",
        body: file,
      }),
    ["repos", ref.owner, ref.name, "pulls"],
  );

export const usePullAction = (ref: Ref, number: number) =>
  useMutate(
    (action: "merge" | "close") =>
      api(`${repoPath(ref)}/pulls/${number}/${action}`, { method: "POST" }),
    ["repos", ref.owner, ref.name],
  );

/* Problèmes, solutions, contributions */

export const useProblems = (filters: { sector?: string; country?: string }) =>
  useQuery({
    queryKey: ["problems", "list", filters],
    queryFn: () => api<ProblemSummary[]>("/problems", { query: filters }),
  });

export const useProblem = (id: string) =>
  useQuery({ queryKey: ["problems", id], queryFn: () => api<ProblemDetail>(`/problems/${id}`) });

export type ProblemInput = {
  title: string;
  description: string;
  sector: string;
  country: string;
  connectivityConstraint: string;
  hardwareConstraint: string;
  languageConstraint: string;
  evaluationCriteria: string;
};

export const useCreateProblem = () =>
  useMutate(
    (input: ProblemInput) => api<{ id: string }>("/problems", { json: input }),
    ["problems"],
  );

export const useSubmitSolution = (problemId: string) =>
  useMutate(
    (input: { repo: string; summary: string; fieldResults: string }) =>
      api(`/problems/${problemId}/solutions`, { json: input }),
    ["problems", problemId],
  );

export const useSubmitContribution = (problemId: string) =>
  useMutate(
    (input: {
      description: string;
      provenanceCommunity: string;
      provenanceCountry: string;
      dataset?: string;
    }) => api(`/problems/${problemId}/contributions`, { json: input }),
    ["problems", problemId],
  );

export const useValidate = (problemId: string) =>
  useMutate(
    ({
      kind,
      id,
      ...input
    }: {
      kind: "solutions" | "contributions";
      id: string;
      decision: "accepted" | "rejected";
      comment: string;
    }) => api(`/${kind}/${id}/validate`, { json: input }),
    ["problems", problemId],
  );

/* Discussions (dépôt, problème ou pull request) */

export const useDiscussions = (path: string) =>
  useQuery({
    queryKey: ["discussions", path],
    queryFn: () => api<Discussion[]>(`${path}/discussions`),
  });

export const useAddDiscussion = (path: string) =>
  useMutate(
    (body: string) => api(`${path}/discussions`, { json: { body } }),
    ["discussions", path],
  );
