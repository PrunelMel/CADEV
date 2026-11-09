import { and, desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { withRestrictions } from "../licenses/service.js";
import { likesOf, summary } from "../repos/service.js";
import type { SetFeatured } from "./schemas.js";

/**
 * Dépôts publics liés au problème : les solutions d'abord (contenu complet), puis ceux en
 * construction (README seulement). Un dépôt privé n'apparaît jamais, même marqué « solution ».
 * La solution mise en avant est celle de l'auteur du problème, sinon la plus aimée.
 */
export async function solutionsForProblem(problemId: string) {
  const [problem] = await db
    .select({ featuredRepoId: t.problems.featuredRepoId })
    .from(t.problems)
    .where(eq(t.problems.id, problemId));
  if (!problem) throw notFound("Problème");
  const rows = await db
    .select({ repo: t.repositories, license: t.licenses, likes: likesOf })
    .from(t.repositories)
    .innerJoin(t.licenses, eq(t.licenses.id, t.repositories.licenseId))
    .where(and(eq(t.repositories.problemId, problemId), eq(t.repositories.visibility, "public")))
    .orderBy(desc(likesOf), desc(t.repositories.updatedAt));
  const items = rows.map(({ repo, license, likes }) => ({
    ...summary(repo),
    likes,
    license: withRestrictions(license),
  }));
  const solutions = items.filter((r) => r.stage === "solution");
  const byAuthor = solutions.find((r) => r.id === problem.featuredRepoId);
  const featured = byAuthor ?? solutions[0] ?? null;
  return {
    featured: featured && { id: featured.id, by: byAuthor ? "author" : "community" },
    solutions,
    inProgress: items.filter((r) => r.stage === "under_construction"),
  };
}

export async function setFeatured(problemId: string, input: SetFeatured, userId: string) {
  const [problem] = await db.select().from(t.problems).where(eq(t.problems.id, problemId));
  if (!problem) throw notFound("Problème");
  if (problem.authorId !== userId) {
    throw forbidden("Seul l'auteur du problème choisit la solution mise en avant");
  }
  let repoId: string | null = null;
  if (input.repo) {
    const [repo] = await db
      .select()
      .from(t.repositories)
      .where(
        and(
          eq(t.repositories.ownerSlug, input.repo.owner),
          eq(t.repositories.name, input.repo.name),
        ),
      );
    if (
      !repo ||
      repo.problemId !== problemId ||
      repo.visibility !== "public" ||
      repo.stage !== "solution"
    ) {
      throw badRequest("Seule une solution publique liée à ce problème peut être mise en avant");
    }
    repoId = repo.id;
  }
  await db.update(t.problems).set({ featuredRepoId: repoId }).where(eq(t.problems.id, problemId));
  return solutionsForProblem(problemId);
}
