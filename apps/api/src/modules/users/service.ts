import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { auth } from "../../auth/index.js";
import { db, schema as t } from "../../db/index.js";
import { conflict, forbidden } from "../../lib/errors.js";
import { userByUsername } from "../orgs/service.js";
import { closedLast, problemOf, summary } from "../repos/service.js";

/** Le profil met en avant les problèmes résolus, pas la liste brute des dépôts. */
export async function profile(username: string) {
  const user = await userByUsername(username);

  // Ses dépôts publics au statut « solution », avec le problème auquel ils répondent ;
  // `featured` : la solution que le problème met en avant.
  const solved = await db
    .select({
      problem: {
        id: t.problems.id,
        title: t.problems.title,
        country: t.problems.country,
        status: t.problems.status,
      },
      repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
      summary: t.repositories.description,
      featured: sql<boolean>`${t.problems.featuredRepoId} = ${t.repositories.id}`,
    })
    .from(t.repositories)
    .innerJoin(t.problems, eq(t.problems.id, t.repositories.problemId))
    .where(
      and(
        eq(t.repositories.ownerUserId, user.id),
        eq(t.repositories.stage, "solution"),
        eq(t.repositories.visibility, "public"),
      ),
    )
    .orderBy(closedLast, desc(t.repositories.updatedAt));

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
 * Dépôts accessibles en écriture (privés compris) avec leur problème, pull requests à traiter,
 * ses problèmes et ses propositions de données.
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
  const rows = await db
    .select({ repo: t.repositories, problem: problemOf })
    .from(t.repositories)
    .innerJoin(t.problems, eq(t.problems.id, t.repositories.problemId))
    .where(
      or(
        eq(t.repositories.ownerUserId, userId),
        inArray(t.repositories.ownerOrgId, adminOrgs),
        inArray(t.repositories.id, collaborations),
      ),
    )
    .orderBy(desc(t.repositories.updatedAt));
  const repos = rows.map((r) => r.repo);

  const myProblems = await db
    .select({
      id: t.problems.id,
      title: t.problems.title,
      status: t.problems.status,
    })
    .from(t.problems)
    .where(eq(t.problems.authorId, userId))
    .orderBy(desc(t.problems.createdAt));
  const myContributions = await db
    .select({
      id: t.dataContributions.id,
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
    repos: rows.map((r) => summary(r.repo, r.problem)),
    working,
    problems: myProblems,
    toReview: { pulls: openPulls },
    mine: { contributions: myContributions },
  };
}

/* ---------- Inscriptions en attente du code ---------- */

/** Délai pour confirmer son adresse ; passé ce délai, le compte est supprimé (nom et adresse libérés). */
export const PENDING_SIGNUP_TTL_HOURS = 24;

/**
 * Corrige l'adresse d'un compte pas encore confirmé, puis envoie un code à la nouvelle adresse.
 * Réponse identique si l'adresse ou le mot de passe ne correspondent pas : on ne révèle pas
 * quelles adresses ont un compte.
 */
export async function changePendingEmail(input: {
  email: string;
  password: string;
  newEmail: string;
}) {
  const email = input.email.toLowerCase();
  const newEmail = input.newEmail.toLowerCase();
  const [row] = await db
    .select({ id: t.users.id, verified: t.users.emailVerified, hash: t.accounts.password })
    .from(t.users)
    .innerJoin(
      t.accounts,
      and(eq(t.accounts.userId, t.users.id), eq(t.accounts.providerId, "credential")),
    )
    .where(eq(t.users.email, email));
  const ctx = await auth.$context;
  const ok =
    row &&
    !row.verified &&
    row.hash &&
    (await ctx.password.verify({ hash: row.hash, password: input.password }));
  if (!ok) throw forbidden("Adresse ou mot de passe incorrect");

  if (newEmail !== email) {
    const [taken] = await db
      .select({ id: t.users.id })
      .from(t.users)
      .where(eq(t.users.email, newEmail));
    if (taken) throw conflict("Cette adresse est déjà utilisée par un autre compte");
    await db
      .update(t.users)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(t.users.id, row.id));
    // L'ancien code ne doit plus servir.
    await db
      .delete(t.verifications)
      .where(eq(t.verifications.identifier, `email-verification-otp-${email}`));
  }
  await auth.api.sendVerificationOTP({ body: { email: newEmail, type: "email-verification" } });
  return { email: newEmail };
}

/** Supprime les comptes jamais confirmés après le délai : leur nom d'utilisateur redevient libre. */
export async function purgePendingSignups() {
  const limit = new Date(Date.now() - PENDING_SIGNUP_TTL_HOURS * 3600 * 1000);
  const removed = await db
    .delete(t.users)
    .where(and(eq(t.users.emailVerified, false), lt(t.users.createdAt, limit)))
    .returning({ id: t.users.id });
  return removed.length;
}
