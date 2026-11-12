import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { Answer, Answers, FormConfig } from "../modules/contributions/form/model/formModel.js";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
const userRef = (name: string) => text(name).references(() => users.id, { onDelete: "cascade" });

/* ---------- better-auth (usePlural) ---------- */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // Code envoyé par e-mail à chaque connexion (plugin twoFactor de better-auth) : activé pour tous.
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: userRef("user_id").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: userRef("user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Table attendue par le plugin twoFactor (codes TOTP, désactivés ici : seul le code par e-mail sert). */
export const twoFactors = pgTable("two_factors", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: userRef("user_id").notNull(),
  verified: boolean("verified").notNull().default(true),
  failedVerificationCount: integer("failed_verification_count").notNull().default(0),
  lockedUntil: ts("locked_until"),
});

/* ---------- Organisations ---------- */

export const orgRole = pgEnum("org_role", ["admin", "member"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: createdAt(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
    role: orgRole("role").notNull().default("member"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

/* ---------- Licences (souveraineté) ---------- */

export const licenses = pgTable("licenses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  summary: text("summary").notNull().default(""),
  noCommercialUse: boolean("no_commercial_use").notNull().default(false),
  noRedistribution: boolean("no_redistribution").notNull().default(false),
  noDerivatives: boolean("no_derivatives").notNull().default(false),
  requiresCommunityReturn: boolean("requires_community_return").notNull().default(false),
  requiresShareAlike: boolean("requires_share_alike").notNull().default(false),
  otherRestrictions: text("other_restrictions").array().notNull().default([]),
});

/* ---------- Dépôts ---------- */

export const repoType = pgEnum("repo_type", ["model", "dataset", "library"]);
export const visibility = pgEnum("visibility", ["public", "private"]);
/**
 * En construction : seul le README (et la fiche) est visible hors propriétaire et collaborateurs.
 * Solution : le dépôt entier est visible, et proposé comme solution de son problème.
 */
export const repoStage = pgEnum("repo_stage", ["under_construction", "solution"]);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: repoType("type").notNull(),
    ownerSlug: text("owner_slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: userRef("owner_user_id"),
    ownerOrgId: uuid("owner_org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    visibility: visibility("visibility").notNull().default("public"),
    // Tout dépôt répond à un problème, dès sa création ; son propriétaire peut en changer.
    problemId: uuid("problem_id")
      .notNull()
      .references((): AnyPgColumn => problems.id),
    stage: repoStage("stage").notNull().default("under_construction"),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    description: text("description").notNull().default(""),
    readme: text("readme").notNull().default(""),
    limitations: text("limitations").notNull().default(""),
    provenanceCommunity: text("provenance_community"),
    provenanceCountry: text("provenance_country"),
    // Fiche technique : ce qu'il faut savoir pour juger l'adéquation au terrain.
    task: text("task").notNull().default(""),
    languages: text("languages").array().notNull().default([]),
    worksOffline: boolean("works_offline").notNull().default(false),
    targetHardware: text("target_hardware").notNull().default(""),
    createdBy: userRef("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.ownerSlug, t.name), index().on(t.problemId)],
);

export const repositoryCollaborators = pgTable(
  "repository_collaborators",
  {
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.repoId, t.userId] })],
);

export const repositoryVersions = pgTable(
  "repository_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    message: text("message").notNull().default(""),
    createdBy: userRef("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.repoId, t.number)],
);

const fileColumns = () => ({
  path: text("path").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  sha256: text("sha256").notNull(),
  storageKey: text("storage_key").notNull(),
});

export const repositoryFiles = pgTable(
  "repository_files",
  {
    versionId: uuid("version_id")
      .notNull()
      .references(() => repositoryVersions.id, { onDelete: "cascade" }),
    ...fileColumns(),
  },
  (t) => [primaryKey({ columns: [t.versionId, t.path] })],
);

/* ---------- Pull requests ---------- */

export const pullStatus = pgEnum("pull_status", ["open", "merged", "closed"]);

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    authorId: userRef("author_id").notNull(),
    status: pullStatus("status").notNull().default("open"),
    baseVersionId: uuid("base_version_id").references(() => repositoryVersions.id),
    mergedVersionId: uuid("merged_version_id").references(() => repositoryVersions.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.repoId, t.number)],
);

export const pullRequestFiles = pgTable(
  "pull_request_files",
  {
    pullId: uuid("pull_id")
      .notNull()
      .references(() => pullRequests.id, { onDelete: "cascade" }),
    ...fileColumns(),
  },
  (t) => [primaryKey({ columns: [t.pullId, t.path] })],
);

/* ---------- Problèmes, solutions, contributions ---------- */

export const problemStatus = pgEnum("problem_status", ["open", "solved", "closed"]);

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  // Étiquettes choisies dans les listes du formulaire ou créées par l'auteur.
  connectivityConstraint: text("connectivity_constraint").array().notNull().default([]),
  hardwareConstraint: text("hardware_constraint").array().notNull().default([]),
  languageConstraint: text("language_constraint").array().notNull().default([]),
  evaluationCriteria: text("evaluation_criteria").notNull().default(""),
  status: problemStatus("status").notNull().default("open"),
  // Date de fermeture, affichée sur la liste ; vidée si l'auteur rouvre le problème.
  closedAt: ts("closed_at"),
  // Solution mise en avant par l'auteur ; sinon, celle que la communauté préfère (likes).
  featuredRepoId: uuid("featured_repo_id").references((): AnyPgColumn => repositories.id, {
    onDelete: "set null",
  }),
  authorId: userRef("author_id").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Développeurs qui déclarent travailler sur un problème : évite que deux équipes partent en parallèle sans le savoir. */
export const problemWorkers = pgTable(
  "problem_workers",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.userId] })],
);

export const dataContributions = pgTable("data_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  datasetRepoId: uuid("dataset_repo_id").references(() => repositories.id, {
    onDelete: "set null",
  }),
  contributorId: userRef("contributor_id").notNull(),
  description: text("description").notNull(),
  provenanceCommunity: text("provenance_community").notNull(),
  provenanceCountry: text("provenance_country").notNull(),
  createdAt: createdAt(),
});

/* ---------- Communauté ---------- */

export const likes = pgTable(
  "likes",
  {
    userId: userRef("user_id").notNull(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.repoId] })],
);

export const discussionTarget = pgEnum("discussion_target", ["repo", "problem", "pull"]);

export const discussions = pgTable(
  "discussions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: discussionTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    authorId: userRef("author_id").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.targetType, t.targetId)],
);

/* ---------- Contribution de données : page-formulaire ----------
 * Configuration, révisions, réponses et relectures vivent ici (source de vérité). Les médias et
 * les fichiers lisibles (CSV, XLSX, TXT, dictionnaire) sont rangés dans le stockage objet, sous
 * problems/<id>/contribution/ : voir modules/contributions/form/tree.ts. */

export const contributionForms = pgTable("contribution_forms", {
  problemId: uuid("problem_id")
    .primaryKey()
    .references(() => problems.id, { onDelete: "cascade" }),
  draft: jsonb("draft").$type<FormConfig>().notNull(),
  published: jsonb("published").$type<FormConfig>(),
  /** Page HTML importée (mode « code »), brouillon et version publiée. */
  codeDraft: text("code_draft"),
  codePublished: text("code_published"),
  /** Une écriture des fichiers de réponses a échoué : la prochaine réponse les reconstruit. */
  viewsDirty: boolean("views_dirty").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contributionFormRevisions = pgTable(
  "contribution_form_revisions",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    config: jsonb("config").$type<FormConfig>().notNull(),
    publishedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.revision] })],
);

export const contributionMediaKind = pgEnum("contribution_media_kind", [
  "image",
  "gif",
  "audio",
  "video",
]);

export const contributionResources = pgTable(
  "contribution_resources",
  {
    id: text("id").primaryKey(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    kind: contributionMediaKind("kind").notNull(),
    name: text("name").notNull(),
    /** Nom du fichier dans resources/<dossier du type>/. */
    file: text("file").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.problemId, t.kind, t.sha256), index().on(t.problemId)],
);

export type MediaRef = { resourceId: string; kind: string; file: string };

/** Journal des réponses : une ligne par contribution, jamais modifiée. */
export const contributionSubmissions = pgTable(
  "contribution_submissions",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    /** Identifiant généré par le client : un renvoi ne crée jamais de doublon. */
    id: text("id").notNull(),
    contributorId: text("contributor_id").references(() => users.id, { onDelete: "set null" }),
    formRevision: integer("form_revision").notNull(),
    answers: jsonb("answers").$type<Answers>().notNull(),
    media: jsonb("media").$type<Record<string, MediaRef>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.id] }), index().on(t.problemId, t.createdAt)],
);

export const contributionReviewVerdict = pgEnum("contribution_review_verdict", [
  "agree",
  "correct",
]);

/**
 * Retours du bloc « Validation de données ». Les réponses d'origine ne sont jamais modifiées ;
 * personne ne tranche : le nombre de relecteurs d'accord sur une correction est le seul signal.
 */
export const contributionReviews = pgTable(
  "contribution_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    submissionId: text("submission_id").notNull(),
    field: text("field").notNull(),
    verdict: contributionReviewVerdict("verdict").notNull(),
    proposedValue: jsonb("proposed_value").$type<Answer>(),
    comment: text("comment").notNull().default(""),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    formRevision: integer("form_revision").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.problemId), unique().on(t.problemId, t.submissionId, t.field, t.reviewerId)],
);

/* ---------- Notifications ---------- */

export const notificationKind = pgEnum("notification_kind", ["problem_closed", "problem_reopened"]);

/** Boîte de réception : chaque notification est aussi envoyée par e-mail quand c'est configuré. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef("user_id").notNull(),
    kind: notificationKind("kind").notNull(),
    problemId: uuid("problem_id").references(() => problems.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => repositories.id, { onDelete: "cascade" }),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);
