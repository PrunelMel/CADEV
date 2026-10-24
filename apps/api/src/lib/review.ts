import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema as t } from "../db/index.js";
import { forbidden, notFound } from "./errors.js";

export const reviewInput = z.object({
  decision: z.enum(["accepted", "rejected"]),
  comment: z.string().max(5000).default(""),
});
export type ReviewInput = z.infer<typeof reviewInput>;
type Target = (typeof t.validationTarget.enumValues)[number];

/** Seul l'auteur du problème valide ou rejette ce qui y est rattaché. */
export async function assertProblemAuthor(problemId: string, userId: string) {
  const [p] = await db
    .select({ authorId: t.problems.authorId })
    .from(t.problems)
    .where(eq(t.problems.id, problemId));
  if (!p) throw notFound("Problème");
  if (p.authorId !== userId) throw forbidden("Seul l'auteur du problème peut valider");
}

export function recordValidation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  targetType: Target,
  targetId: string,
  input: ReviewInput,
  validatorId: string,
) {
  return tx.insert(t.validations).values({ targetType, targetId, validatorId, ...input });
}

/** Historique des décisions, indexé par cible, plus récente en premier. */
export async function validationsFor(targetType: Target, ids: string[]) {
  const byTarget = new Map<string, { decision: string; comment: string; createdAt: Date }[]>();
  if (!ids.length) return byTarget;
  const rows = await db
    .select({
      targetId: t.validations.targetId,
      decision: t.validations.decision,
      comment: t.validations.comment,
      createdAt: t.validations.createdAt,
    })
    .from(t.validations)
    .where(and(eq(t.validations.targetType, targetType), inArray(t.validations.targetId, ids)))
    .orderBy(desc(t.validations.createdAt));
  for (const { targetId, ...v } of rows) {
    byTarget.set(targetId, [...(byTarget.get(targetId) ?? []), v]);
  }
  return byTarget;
}
