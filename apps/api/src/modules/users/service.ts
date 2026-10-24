import { and, desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { userByUsername } from "../orgs/service.js";

/** Le profil met en avant les problèmes résolus, pas la liste brute des dépôts. */
export async function profile(username: string) {
  const user = await userByUsername(username);

  const solved = await db
    .select({
      problem: { id: t.problems.id, title: t.problems.title, country: t.problems.country },
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
    .select({ id: t.problems.id, title: t.problems.title, country: t.problems.country })
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
