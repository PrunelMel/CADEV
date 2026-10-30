import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { userByUsername } from "../orgs/service.js";
import { summary } from "../repos/service.js";

/** Le profil met en avant les problèmes résolus, pas la liste brute des dépôts. */
export async function profile(username: string) {
  const user = await userByUsername(username);

  const solved = await db
    .select({
      problem: {
        id: t.problems.id,
        title: t.problems.title,
        country: t.problems.country,
      },
      repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
      summary: t.solutions.summary,
    })
    .from(t.solutions)
    .innerJoin(t.problems, eq(t.problems.id, t.solutions.problemId))
    .innerJoin(t.repositories, eq(t.repositories.id, t.solutions.repoId))
    .where(
      and(
        eq(t.solutions.submittedBy, user.id),
        eq(t.solutions.status, "accepted"),
        eq(t.repositories.visibility, "public"),
      ),
    )
    .orderBy(desc(t.solutions.createdAt));

  const posted = await db
    .select({
      id: t.problems.id,
      title: t.problems.title,
      country: t.problems.country,
    })
    .from(t.problems)
    .where(eq(t.problems.authorId, user.id))
    .orderBy(desc(t.problems.createdAt));

  const repos = await db
    .select({
      owner: t.repositories.ownerSlug,
      name: t.repositories.name,
      type: t.repositories.type,
    })
    .from(t.repositories)
    .where(and(eq(t.repositories.ownerUserId, user.id), eq(t.repositories.visibility, "public")))
    .orderBy(desc(t.repositories.updatedAt));

  const orgs = await db
    .select({ slug: t.organizations.slug, name: t.organizations.name })
    .from(t.organizationMembers)
    .innerJoin(t.organizations, eq(t.organizations.id, t.organizationMembers.orgId))
    .where(eq(t.organizationMembers.userId, user.id));

  return {
    username: user.username,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    solved,
    posted,
    repos,
    orgs,
  };
}

/** Comptes sous lesquels l'utilisateur peut créer un dépôt. */
export async function myNamespaces(userId: string, username: string | null) {
  const orgs = await db
    .select({ slug: t.organizations.slug })
    .from(t.organizationMembers)
    .innerJoin(t.organizations, eq(t.organizations.id, t.organizationMembers.orgId))
    .where(and(eq(t.organizationMembers.userId, userId), eq(t.organizationMembers.role, "admin")));
  return { username, adminOrgs: orgs.map((o) => o.slug) };
}

/**
 * Tableau de bord : ce qui attend l'utilisateur.
 * Dépôts accessibles en écriture (privés compris), décisions à prendre sur ses problèmes,
 * et suivi de ses propres propositions.
 */
export async function dashboard(userId: string) {
  const adminOrgs = db
    .select({ id: t.organizationMembers.orgId })
    .from(t.organizationMembers)
    .where(and(eq(t.organizationMembers.userId, userId), eq(t.organizationMembers.role, "admin")));
  const collaborations = db
    .select({ id: t.repositoryCollaborators.repoId })
    .from(t.repositoryCollaborators)
    .where(eq(t.repositoryCollaborators.userId, userId));
  const repos = await db
    .select()
    .from(t.repositories)
    .where(
      or(
        eq(t.repositories.ownerUserId, userId),
        inArray(t.repositories.ownerOrgId, adminOrgs),
        inArray(t.repositories.id, collaborations),
      ),
    )
    .orderBy(desc(t.repositories.updatedAt));

  const myProblems = await db
    .select({
      id: t.problems.id,
      title: t.problems.title,
      status: t.problems.status,
    })
    .from(t.problems)
    .where(eq(t.problems.authorId, userId))
    .orderBy(desc(t.problems.createdAt));
  const problemIds = myProblems.map((p) => p.id);

  const pendingSolutions = problemIds.length
    ? await db
        .select({
          id: t.solutions.id,
          problemId: t.solutions.problemId,
          problemTitle: t.problems.title,
          submittedBy: t.users.username,
          createdAt: t.solutions.createdAt,
          repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
        })
        .from(t.solutions)
        .innerJoin(t.problems, eq(t.problems.id, t.solutions.problemId))
        .innerJoin(t.users, eq(t.users.id, t.solutions.submittedBy))
        .innerJoin(t.repositories, eq(t.repositories.id, t.solutions.repoId))
        .where(
          and(
            inArray(t.solutions.problemId, problemIds),
            eq(t.solutions.status, "pending"),
            eq(t.repositories.visibility, "public"),
          ),
        )
        .orderBy(desc(t.solutions.createdAt))
    : [];

  const pendingContributions = problemIds.length
    ? await db
        .select({
          id: t.dataContributions.id,
          problemId: t.dataContributions.problemId,
          problemTitle: t.problems.title,
          contributor: t.users.username,
          createdAt: t.dataContributions.createdAt,
        })
        .from(t.dataContributions)
        .innerJoin(t.problems, eq(t.problems.id, t.dataContributions.problemId))
        .innerJoin(t.users, eq(t.users.id, t.dataContributions.contributorId))
        .where(
          and(
            inArray(t.dataContributions.problemId, problemIds),
            eq(t.dataContributions.status, "pending"),
          ),
        )
        .orderBy(desc(t.dataContributions.createdAt))
    : [];

  const mySolutions = await db
    .select({
      id: t.solutions.id,
      status: t.solutions.status,
      problemId: t.problems.id,
      problemTitle: t.problems.title,
      repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
      createdAt: t.solutions.createdAt,
    })
    .from(t.solutions)
    .innerJoin(t.problems, eq(t.problems.id, t.solutions.problemId))
    .innerJoin(t.repositories, eq(t.repositories.id, t.solutions.repoId))
    .where(eq(t.solutions.submittedBy, userId))
    .orderBy(desc(t.solutions.createdAt));

  const myContributions = await db
    .select({
      id: t.dataContributions.id,
      status: t.dataContributions.status,
      problemId: t.problems.id,
      problemTitle: t.problems.title,
      createdAt: t.dataContributions.createdAt,
    })
    .from(t.dataContributions)
    .innerJoin(t.problems, eq(t.problems.id, t.dataContributions.problemId))
    .where(eq(t.dataContributions.contributorId, userId))
    .orderBy(desc(t.dataContributions.createdAt));

  const openPulls = repos.length
    ? await db
        .select({
          number: t.pullRequests.number,
          title: t.pullRequests.title,
          author: t.users.username,
          repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
          createdAt: t.pullRequests.createdAt,
        })
        .from(t.pullRequests)
        .innerJoin(t.repositories, eq(t.repositories.id, t.pullRequests.repoId))
        .innerJoin(t.users, eq(t.users.id, t.pullRequests.authorId))
        .where(
          and(
            inArray(
              t.pullRequests.repoId,
              repos.map((r) => r.id),
            ),
            eq(t.pullRequests.status, "open"),
            sql`${t.pullRequests.authorId} <> ${userId}`,
          ),
        )
        .orderBy(desc(t.pullRequests.createdAt))
    : [];

  const working = await db
    .select({
      problemId: t.problems.id,
      problemTitle: t.problems.title,
      status: t.problems.status,
      note: t.problemWorkers.note,
    })
    .from(t.problemWorkers)
    .innerJoin(t.problems, eq(t.problems.id, t.problemWorkers.problemId))
    .where(eq(t.problemWorkers.userId, userId))
    .orderBy(desc(t.problemWorkers.createdAt));

  return {
    repos: repos.map(summary),
    working,
    problems: myProblems,
    toReview: {
      solutions: pendingSolutions,
      contributions: pendingContributions,
      pulls: openPulls,
    },
    mine: { solutions: mySolutions, contributions: myContributions },
  };
}
