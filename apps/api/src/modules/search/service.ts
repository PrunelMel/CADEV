import { and, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { problemSummary } from "../problems/service.js";

/**
 * Recherche orientée problèmes : on remonte d'abord les problèmes (plein texte français),
 * puis les solutions qui y sont rattachées, puis les autres dépôts publics correspondants.
 */
export async function search(q: string) {
  const query = sql`websearch_to_tsquery('french', ${q})`;
  const like = `%${q}%`;

  const problemDoc = sql`to_tsvector('french', ${t.problems.title} || ' ' || ${t.problems.description} || ' ' || ${t.problems.sector} || ' ' || ${t.problems.country})`;
  const problems = await db
    .select({ ...problemSummary, rank: sql<number>`ts_rank(${problemDoc}, ${query})` })
    .from(t.problems)
    .innerJoin(t.users, eq(t.users.id, t.problems.authorId))
    .where(or(sql`${problemDoc} @@ ${query}`, ilike(t.problems.title, like)))
    .orderBy(desc(sql`ts_rank(${problemDoc}, ${query})`))
    .limit(20);

  const problemIds = problems.map((p) => p.id);
  const solutions = problemIds.length
    ? await db
        .select({
          problemId: t.solutions.problemId,
          status: t.solutions.status,
          summary: t.solutions.summary,
          repo: {
            id: t.repositories.id,
            owner: t.repositories.ownerSlug,
            name: t.repositories.name,
            type: t.repositories.type,
          },
        })
        .from(t.solutions)
        .innerJoin(t.repositories, eq(t.repositories.id, t.solutions.repoId))
        .where(
          and(inArray(t.solutions.problemId, problemIds), eq(t.repositories.visibility, "public")),
        )
    : [];

  const shown = solutions.map((s) => s.repo.id);
  const repoDoc = sql`to_tsvector('french', ${t.repositories.name} || ' ' || ${t.repositories.description} || ' ' || ${t.repositories.readme})`;
  const repos = await db
    .select({
      owner: t.repositories.ownerSlug,
      name: t.repositories.name,
      type: t.repositories.type,
      description: t.repositories.description,
    })
    .from(t.repositories)
    .where(
      and(
        eq(t.repositories.visibility, "public"),
        or(sql`${repoDoc} @@ ${query}`, ilike(t.repositories.name, like)),
        shown.length ? notInArray(t.repositories.id, shown) : undefined,
      ),
    )
    .orderBy(desc(sql`ts_rank(${repoDoc}, ${query})`))
    .limit(20);

  return {
    problems: problems.map(({ rank: _rank, ...p }) => ({
      ...p,
      solutions: solutions
        .filter((s) => s.problemId === p.id)
        .map(({ repo: { id: _id, ...repo }, status, summary }) => ({ repo, status, summary })),
    })),
    repos,
  };
}
