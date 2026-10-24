import { and, count, desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { notFound } from "../../lib/errors.js";
import { contributionsForProblem } from "../contributions/service.js";
import { solutionsForProblem } from "../solutions/service.js";
import type { CreateProblem, ListQuery } from "./schemas.js";

export async function findProblem(id: string) {
  const [problem] = await db.select().from(t.problems).where(eq(t.problems.id, id));
  if (!problem) throw notFound("Problème");
  return problem;
}

export async function createProblem(input: CreateProblem, userId: string) {
  const [problem] = await db
    .insert(t.problems)
    .values({ ...input, authorId: userId })
    .returning();
  return problem;
}

export const problemSummary = {
  id: t.problems.id,
  title: t.problems.title,
  sector: t.problems.sector,
  country: t.problems.country,
  createdAt: t.problems.createdAt,
  author: t.users.username,
};

export async function listProblems(query: ListQuery) {
  const filters = [];
  if (query.sector) filters.push(eq(t.problems.sector, query.sector));
  if (query.country) filters.push(eq(t.problems.country, query.country));
  return db
    .select({ ...problemSummary, solutionCount: count(t.solutions.id) })
    .from(t.problems)
    .innerJoin(t.users, eq(t.users.id, t.problems.authorId))
    .leftJoin(t.solutions, eq(t.solutions.problemId, t.problems.id))
    .where(and(...filters))
    .groupBy(t.problems.id, t.users.username)
    .orderBy(desc(t.problems.createdAt))
    .limit(100);
}

export async function problemDetail(id: string, userId?: string) {
  const problem = await findProblem(id);
  const [author] = await db
    .select({ username: t.users.username, name: t.users.name })
    .from(t.users)
    .where(eq(t.users.id, problem.authorId));
  const { authorId, ...rest } = problem;
  return {
    ...rest,
    author: author?.username ?? null,
    isAuthor: authorId === userId,
    solutions: await solutionsForProblem(id),
    contributions: await contributionsForProblem(id),
  };
}
