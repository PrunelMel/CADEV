import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: repoType("type").notNull(),
    ownerSlug: text("owner_slug").notNull(),
    name: text("name").notNull(),
    ownerUserId: userRef("owner_user_id"),
    ownerOrgId: uuid("owner_org_id").references(() => organizations.id, { onDelete: "cascade" }),
    visibility: visibility("visibility").notNull().default("public"),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    description: text("description").notNull().default(""),
    readme: text("readme").notNull().default(""),
    limitations: text("limitations").notNull().default(""),
    provenanceCommunity: text("provenance_community"),
    provenanceCountry: text("provenance_country"),
    createdBy: userRef("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.ownerSlug, t.name)],
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

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  connectivityConstraint: text("connectivity_constraint").notNull().default(""),
  hardwareConstraint: text("hardware_constraint").notNull().default(""),
  languageConstraint: text("language_constraint").notNull().default(""),
  evaluationCriteria: text("evaluation_criteria").notNull(),
  authorId: userRef("author_id").notNull(),
  createdAt: createdAt(),
});

export const reviewStatus = pgEnum("review_status", ["pending", "accepted", "rejected"]);

export const solutions = pgTable(
  "solutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    submittedBy: userRef("submitted_by").notNull(),
    summary: text("summary").notNull(),
    fieldResults: text("field_results").notNull().default(""),
    status: reviewStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.problemId, t.repoId)],
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
  status: reviewStatus("status").notNull().default("pending"),
  createdAt: createdAt(),
});

export const validationTarget = pgEnum("validation_target", ["solution", "contribution"]);
export const decision = pgEnum("decision", ["accepted", "rejected"]);

export const validations = pgTable(
  "validations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: validationTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    decision: decision("decision").notNull(),
    comment: text("comment").notNull().default(""),
    validatorId: userRef("validator_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.targetType, t.targetId)],
);

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
