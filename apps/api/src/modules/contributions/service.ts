import { desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import {
  assertProblemAuthor,
  recordValidation,
  validationsFor,
  type ReviewInput,
} from "../../lib/review.js";
import { findRepo } from "../repos/service.js";
import type { CreateContribution } from "./schemas.js";

export async function contributionsForProblem(problemId: string) {
  const rows = await db
    .select({
      id: t.dataContributions.id,
      description: t.dataContributions.description,
      provenanceCommunity: t.dataContributions.provenanceCommunity,
      provenanceCountry: t.dataContributions.provenanceCountry,
      status: t.dataContributions.status,
      createdAt: t.dataContributions.createdAt,
      contributor: t.users.username,
      dataset: {
        owner: t.repositories.ownerSlug,
        name: t.repositories.name,
        visibility: t.repositories.visibility,
      },
    })
    .from(t.dataContributions)
    .innerJoin(t.users, eq(t.users.id, t.dataContributions.contributorId))
    .leftJoin(t.repositories, eq(t.repositories.id, t.dataContributions.datasetRepoId))
    .where(eq(t.dataContributions.problemId, problemId))
    .orderBy(desc(t.dataContributions.createdAt));
  const history = await validationsFor(
    "contribution",
    rows.map((r) => r.id),
  );
  return rows.map(({ dataset, ...r }) => ({
    ...r,
    // Un dataset devenu privé n'est plus exposé.
    dataset: dataset?.visibility === "public" ? { owner: dataset.owner, name: dataset.name } : null,
    validations: history.get(r.id) ?? [],
  }));
}

export async function createContribution(
  problemId: string,
  input: CreateContribution,
  userId: string,
) {
  const [problem] = await db
    .select({ id: t.problems.id, status: t.problems.status })
    .from(t.problems)
    .where(eq(t.problems.id, problemId));
  if (!problem) throw notFound("Problème");
  if (problem.status === "closed")
    throw badRequest("Ce problème est fermé aux nouvelles propositions");

  let datasetRepoId: string | null = null;
  if (input.dataset) {
    const { repo, access } = await findRepo(input.dataset.owner, input.dataset.name, userId);
    if (repo.type !== "dataset") throw badRequest("Le dépôt lié doit être un dataset");
    if (repo.visibility !== "public") throw badRequest("Le dataset lié doit être public");
    if (!access.write) throw forbidden("Vous devez pouvoir écrire sur ce dataset");
    datasetRepoId = repo.id;
  }

  const [contribution] = await db
    .insert(t.dataContributions)
    .values({
      problemId,
      datasetRepoId,
      contributorId: userId,
      description: input.description,
      provenanceCommunity: input.provenanceCommunity,
      provenanceCountry: input.provenanceCountry,
    })
    .returning();
  return contribution;
}

export async function validateContribution(id: string, input: ReviewInput, userId: string) {
  const [c] = await db.select().from(t.dataContributions).where(eq(t.dataContributions.id, id));
  if (!c) throw notFound("Contribution");
  await assertProblemAuthor(c.problemId, userId);
  await db.transaction(async (tx) => {
    await recordValidation(tx, "contribution", id, input, userId);
    await tx
      .update(t.dataContributions)
      .set({ status: input.decision })
      .where(eq(t.dataContributions.id, id));
  });
  return { id, status: input.decision };
}
