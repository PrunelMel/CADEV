// Formes des réponses de l'API (apps/api). À garder alignées avec les services.

export type RepoType = "model" | "dataset" | "library";
export type Visibility = "public" | "private";
export type ReviewStatus = "pending" | "accepted" | "rejected";
export type ProblemStatus = "open" | "solved" | "closed";

export type License = {
  id: string;
  name: string;
  url: string | null;
  summary: string;
  restrictions: string[];
};

export type RepoSummary = {
  id: string;
  type: RepoType;
  owner: string;
  name: string;
  visibility: Visibility;
  description: string;
  provenanceCommunity: string | null;
  provenanceCountry: string | null;
  ownerKind: "user" | "org";
  task: string;
  languages: string[];
  worksOffline: boolean;
  targetHardware: string;
  updatedAt: string;
  license?: License;
  likes?: number;
};

export type RepoFile = { path: string; size: number; sha256: string };

export type RepoDetail = RepoSummary & {
  readme: string;
  limitations: string;
  licenseId: string;
  license: License;
  version: { number: number; message: string; createdAt: string } | null;
  files: RepoFile[];
  likes: number;
  liked: boolean;
  solves: { id: string; title: string; status: ReviewStatus }[];
  permissions: { read: boolean; write: boolean; owner: boolean };
};

export type Version = {
  number: number;
  message: string;
  createdAt: string;
  author: string;
};

export type PullSummary = {
  number: number;
  title: string;
  status: "open" | "merged" | "closed";
  createdAt: string;
  author: string;
};

export type PullDetail = Omit<PullSummary, "author"> & {
  description: string;
  author: string | null;
  baseVersion: number | null;
  mergedVersion: number | null;
  files: RepoFile[];
  conflicts: string[];
  permissions: { upload: boolean; merge: boolean; close: boolean };
};

export type Validation = {
  decision: "accepted" | "rejected";
  comment: string;
  createdAt: string;
};

export type ProblemSummary = {
  id: string;
  title: string;
  sector: string;
  country: string;
  status: ProblemStatus;
  createdAt: string;
  author: string | null;
  solutionCount?: number;
  acceptedCount?: number;
};

export type Solution = {
  id: string;
  summary: string;
  fieldResults: string;
  status: ReviewStatus;
  createdAt: string;
  submittedBy: string | null;
  repo: { owner: string; name: string; type: RepoType };
  license: { id: string; name: string; restrictions: string[] };
  validations: Validation[];
};

export type Contribution = {
  id: string;
  description: string;
  provenanceCommunity: string;
  provenanceCountry: string;
  status: ReviewStatus;
  createdAt: string;
  contributor: string | null;
  dataset: { owner: string; name: string } | null;
  validations: Validation[];
};

export type ProblemDetail = {
  id: string;
  title: string;
  description: string;
  sector: string;
  country: string;
  connectivityConstraint: string;
  hardwareConstraint: string;
  languageConstraint: string;
  evaluationCriteria: string;
  status: ProblemStatus;
  createdAt: string;
  author: string | null;
  isAuthor: boolean;
  workers: Worker[];
  solutions: Solution[];
  contributions: Contribution[];
};

export type Discussion = {
  id: string;
  body: string;
  createdAt: string;
  author: string | null;
};

export type SearchResult = {
  problems: (ProblemSummary & {
    solutions: {
      repo: { owner: string; name: string; type: RepoType };
      status: ReviewStatus;
      summary: string;
    }[];
  })[];
  repos: { owner: string; name: string; type: RepoType; description: string }[];
};

export type Profile = {
  username: string;
  name: string;
  image: string | null;
  createdAt: string;
  solved: {
    problem: { id: string; title: string; country: string };
    repo: { owner: string; name: string };
    summary: string;
  }[];
  posted: { id: string; title: string; country: string }[];
  repos: { owner: string; name: string; type: RepoType }[];
  orgs: { slug: string; name: string }[];
};

export type OrgDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  myRole: "admin" | "member" | null;
  members: {
    username: string | null;
    name: string;
    role: "admin" | "member";
  }[];
  repos: {
    ownerSlug: string;
    name: string;
    type: RepoType;
    visibility: Visibility;
    description: string;
  }[];
};

export type Namespaces = { username: string | null; adminOrgs: string[] };
export type Collaborator = { username: string | null; name: string };

export type Worker = { username: string | null; name: string; note: string; createdAt: string };

export type Suggestion = RepoSummary & {
  license: License;
  /** null : contrainte non posée par l'auteur du problème. */
  fits: { offline: boolean | null; languages: string[] | null };
};

type RepoRef = { owner: string; name: string };
export type Dashboard = {
  repos: RepoSummary[];
  working: { problemId: string; problemTitle: string; status: ProblemStatus; note: string }[];
  problems: { id: string; title: string; status: ProblemStatus }[];
  toReview: {
    solutions: {
      id: string;
      problemId: string;
      problemTitle: string;
      submittedBy: string | null;
      createdAt: string;
      repo: RepoRef;
    }[];
    contributions: {
      id: string;
      problemId: string;
      problemTitle: string;
      contributor: string | null;
      createdAt: string;
    }[];
    pulls: {
      number: number;
      title: string;
      author: string | null;
      repo: RepoRef;
      createdAt: string;
    }[];
  };
  mine: {
    solutions: {
      id: string;
      status: ReviewStatus;
      problemId: string;
      problemTitle: string;
      repo: RepoRef;
      createdAt: string;
    }[];
    contributions: {
      id: string;
      status: ReviewStatus;
      problemId: string;
      problemTitle: string;
      createdAt: string;
    }[];
  };
};
