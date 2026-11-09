// Formes des réponses de l'API (apps/api). À garder alignées avec les services.

export type RepoType = "model" | "dataset" | "library";
export type Visibility = "public" | "private";
export type ProblemStatus = "open" | "solved" | "closed";
/** En construction : README et fiche seulement hors de l'équipe. Solution : tout est visible. */
export type RepoStage = "under_construction" | "solution";
export type ProblemRef = { id: string; title: string; status: ProblemStatus };

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
  stage: RepoStage;
  problemId: string;
  /** Présent sur les listes et la fiche ; absent des listes déjà rangées par problème. */
  problem?: ProblemRef;
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
  problem: ProblemRef;
  /** Mis en avant par son problème. */
  featured: boolean;
  /** `full` : fichiers, versions, téléchargements, pull requests et discussions visibles. */
  permissions: { read: boolean; write: boolean; owner: boolean; full: boolean };
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

export type ProblemSummary = {
  id: string;
  title: string;
  sector: string;
  country: string;
  status: ProblemStatus;
  createdAt: string;
  closedAt: string | null;
  author: string | null;
  /** Dépôts publics liés au statut « solution ». */
  solutionCount?: number;
  /** Dépôts publics liés encore en construction. */
  inProgressCount?: number;
};

/** Dépôt public lié à un problème. */
export type LinkedRepo = RepoSummary & { license: License; likes: number };

export type ProblemSolutions = {
  /** Mise en avant par l'auteur du problème, sinon la plus aimée de la communauté. */
  featured: { id: string; by: "author" | "community" } | null;
  solutions: LinkedRepo[];
  inProgress: LinkedRepo[];
};

export type Contribution = {
  id: string;
  description: string;
  provenanceCommunity: string;
  provenanceCountry: string;
  createdAt: string;
  contributor: string | null;
  dataset: { owner: string; name: string } | null;
};

export type ProblemDetail = {
  id: string;
  title: string;
  description: string;
  sector: string;
  country: string;
  connectivityConstraint: string[];
  hardwareConstraint: string[];
  languageConstraint: string[];
  evaluationCriteria: string;
  status: ProblemStatus;
  createdAt: string;
  author: string | null;
  isAuthor: boolean;
  workers: Worker[];
  solutions: ProblemSolutions;
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
      owner: string;
      name: string;
      type: RepoType;
      stage: RepoStage;
      description: string;
    }[];
  })[];
  repos: {
    owner: string;
    name: string;
    type: RepoType;
    stage: RepoStage;
    description: string;
    problem: ProblemRef;
  }[];
};

export type Profile = {
  username: string;
  name: string;
  image: string | null;
  createdAt: string;
  solved: {
    problem: { id: string; title: string; country: string; status: ProblemStatus };
    repo: { owner: string; name: string };
    summary: string;
    featured: boolean;
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
    pulls: {
      number: number;
      title: string;
      author: string | null;
      repo: RepoRef;
      createdAt: string;
    }[];
  };
  mine: {
    contributions: {
      id: string;
      problemId: string;
      problemTitle: string;
      createdAt: string;
    }[];
  };
};

export type NotificationItem = {
  id: string;
  kind: "problem_closed" | "problem_reopened";
  readAt: string | null;
  createdAt: string;
  problem: ProblemRef | null;
  repo: { owner: string; name: string } | null;
};
export type Notifications = { unread: number; items: NotificationItem[] };
