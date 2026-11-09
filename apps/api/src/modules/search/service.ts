import { and, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { problemSummary } from "../problems/service.js";
import { closedLast, likesOf, problemOf } from "../repos/service.js";

/**
 * Recherche orientée problèmes : on remonte d'abord les problèmes (plein texte français),
 * puis les dépôts publics qui y sont liés, puis les autres dépôts publics correspondants.
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
  // Dépôts publics liés aux problèmes trouvés : solutions d'abord, puis en construction.
  const linked = problemIds.length
    ? await db
        .select({
          id: t.repositories.id,
          problemId: t.repositories.problemId,
          owner: t.repositories.ownerSlug,
          name: t.repositories.name,
          type: t.repositories.type,
          stage: t.repositories.stage,
          description: t.repositories.description,
        })
        .from(t.repositories)
        .where(
          and(
            inArray(t.repositories.problemId, problemIds),
            eq(t.repositories.visibility, "public"),
          ),
        )
        .orderBy(desc(sql`${t.repositories.stage} = 'solution'`), desc(likesOf))
    : [];

  const shown = linked.map((r) => r.id);
  const repoDoc = sql`to_tsvector('french', ${t.repositories.name} || ' ' || ${t.repositories.description} || ' ' || ${t.repositories.readme})`;
  const repos = await db
    .select({
      owner: t.repositories.ownerSlug,
      name: t.repositories.name,
      type: t.repositories.type,
      stage: t.repositories.stage,
      description: t.repositories.description,
      problem: problemOf,
    })
    .from(t.repositories)
    .innerJoin(t.problems, eq(t.problems.id, t.repositories.problemId))
    .where(
      and(
        eq(t.repositories.visibility, "public"),
        or(sql`${repoDoc} @@ ${query}`, ilike(t.repositories.name, like)),
        shown.length ? notInArray(t.repositories.id, shown) : undefined,
      ),
    )
    // Les dépôts liés à un problème fermé passent derrière les autres.
    .orderBy(closedLast, desc(sql`ts_rank(${repoDoc}, ${query})`))
    .limit(20);

  return {
    problems: problems.map(({ rank: _rank, ...p }) => ({
      ...p,
      solutions: linked
        .filter((r) => r.problemId === p.id)
        .map(({ id: _id, problemId: _p, ...repo }) => repo),
    })),
    repos,
  };
}
