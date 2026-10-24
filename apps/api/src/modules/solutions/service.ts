import { and, desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import {
  assertProblemAuthor,
  recordValidation,
  validationsFor,
  type ReviewInput,
} from "../../lib/review.js";
import { restrictionsOf } from "../licenses/service.js";
import { findRepo } from "../repos/service.js";
import type { SubmitSolution } from "./schemas.js";

/** Toutes les tentatives, y compris rejetées : c'est ce qui évite le travail en double. */
export async function solutionsForProblem(problemId: string) {
  const rows = await db
    .select({
      id: t.solutions.id,
      summary: t.solutions.summary,
      fieldResults: t.solutions.fieldResults,
      status: t.solutions.status,
      createdAt: t.solutions.createdAt,
      submittedBy: t.users.username,
      repo: {
        owner: t.repositories.ownerSlug,
        name: t.repositories.name,
        type: t.repositories.type,
      },
      license: t.licenses,
    })
    .from(t.solutions)
    .innerJoin(t.repositories, eq(t.repositories.id, t.solutions.repoId))
    .innerJoin(t.licenses, eq(t.licenses.id, t.repositories.licenseId))
    .innerJoin(t.users, eq(t.users.id, t.solutions.submittedBy))
    .where(and(eq(t.solutions.problemId, problemId), eq(t.repositories.visibility, "public")))
    .orderBy(desc(t.solutions.createdAt));
  const history = await validationsFor(
    "solution",
    rows.map((r) => r.id),
  );
  return rows.map(({ license, ...r }) => ({
    ...r,
    license: { id: license.id, name: license.name, restrictions: restrictionsOf(license) },
    validations: history.get(r.id) ?? [],
  }));
}

export async function submitSolution(problemId: string, input: SubmitSolution, userId: string) {
  const [problem] = await db
    .select({ id: t.problems.id })
    .from(t.problems)
    .where(eq(t.problems.id, problemId));
  if (!problem) throw notFound("Problème");
  const { repo, access } = await findRepo(input.repo.owner, input.repo.name, userId);
  if (!access.write) throw forbidden("Vous devez pouvoir écrire sur ce dépôt pour le proposer");
  if (repo.visibility !== "public") throw badRequest("Seul un dépôt public peut être proposé");
  const [solution] = await db
    .insert(t.solutions)
    .values({
      problemId,
      repoId: repo.id,
      submittedBy: userId,
      summary: input.summary,
      fieldResults: input.fieldResults,
    })
    .returning();
  return solution;
}

export async function validateSolution(id: string, input: ReviewInput, userId: string) {
  const [solution] = await db.select().from(t.solutions).where(eq(t.solutions.id, id));
  if (!solution) throw notFound("Solution");
  await assertProblemAuthor(solution.problemId, userId);
  await db.transaction(async (tx) => {
    await recordValidation(tx, "solution", id, input, userId);
    await tx.update(t.solutions).set({ status: input.decision }).where(eq(t.solutions.id, id));
  });
  return { id, status: input.decision };
}
