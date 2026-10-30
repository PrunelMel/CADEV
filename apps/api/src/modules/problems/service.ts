import { and, desc, eq, ilike, notInArray, or, sql } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { withRestrictions } from "../licenses/service.js";
import { contributionsForProblem } from "../contributions/service.js";
import { summary } from "../repos/service.js";
import { solutionsForProblem } from "../solutions/service.js";
import type { CreateProblem, DeclareWork, ListQuery, UpdateProblem } from "./schemas.js";

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

export async function updateProblem(id: string, input: UpdateProblem, userId: string) {
  const problem = await findProblem(id);
  if (problem.authorId !== userId) throw forbidden("Seul l'auteur peut modifier ce problème");
  const [updated] = await db
    .update(t.problems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(t.problems.id, id))
    .returning();
  return updated;
}

export const problemSummary = {
  id: t.problems.id,
  title: t.problems.title,
  sector: t.problems.sector,
  country: t.problems.country,
  status: t.problems.status,
  createdAt: t.problems.createdAt,
  author: t.users.username,
};

/** Solutions comptées comme sur la page du problème : seuls les dépôts publics. */
const solutionCount = sql<number>`(
  select count(*)::int from ${t.solutions}
  join ${t.repositories} r on r.id = ${t.solutions.repoId}
  where ${t.solutions.problemId} = ${t.problems.id} and r.visibility = 'public')`;
const acceptedCount = sql<number>`(
  select count(*)::int from ${t.solutions}
  join ${t.repositories} r on r.id = ${t.solutions.repoId}
  where ${t.solutions.problemId} = ${t.problems.id} and r.visibility = 'public'
  and ${t.solutions.status} = 'accepted')`;

export async function listProblems(query: ListQuery) {
  const filters = [];
  if (query.sector) filters.push(eq(t.problems.sector, query.sector));
  if (query.country) filters.push(eq(t.problems.country, query.country));
  if (query.status) filters.push(eq(t.problems.status, query.status));
  if (query.q) {
    const like = `%${query.q}%`;
    filters.push(or(ilike(t.problems.title, like), ilike(t.problems.description, like)));
  }
  return db
    .select({ ...problemSummary, solutionCount, acceptedCount })
    .from(t.problems)
    .innerJoin(t.users, eq(t.users.id, t.problems.authorId))
    .where(and(...filters))
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
    workers: await workersOf(id),
  };
}

/* ---------- Travaux en cours ---------- */

function workersOf(problemId: string) {
  return db
    .select({
      username: t.users.username,
      name: t.users.name,
      note: t.problemWorkers.note,
      createdAt: t.problemWorkers.createdAt,
    })
    .from(t.problemWorkers)
    .innerJoin(t.users, eq(t.users.id, t.problemWorkers.userId))
    .where(eq(t.problemWorkers.problemId, problemId))
    .orderBy(desc(t.problemWorkers.createdAt));
}

/** Déclare (ou met à jour) que l'utilisateur travaille sur le problème. */
export async function declareWork(id: string, input: DeclareWork, userId: string) {
  const problem = await findProblem(id);
  if (problem.status === "closed") throw badRequest("Ce problème est fermé");
  await db
    .insert(t.problemWorkers)
    .values({ problemId: id, userId, note: input.note })
    .onConflictDoUpdate({
      target: [t.problemWorkers.problemId, t.problemWorkers.userId],
      set: { note: input.note },
    });
  return workersOf(id);
}

export async function withdrawWork(id: string, userId: string) {
  await findProblem(id);
  await db
    .delete(t.problemWorkers)
    .where(and(eq(t.problemWorkers.problemId, id), eq(t.problemWorkers.userId, userId)));
  return workersOf(id);
}

/** Répartition des problèmes par pays, pour la carte. */
export function countByCountry() {
  return db
    .select({
      country: t.problems.country,
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${t.problems.status} = 'open')::int`,
    })
    .from(t.problems)
    .groupBy(t.problems.country)
    .orderBy(desc(sql`count(*)`));
}

/** Mots d'une contrainte de langue, pour la comparer aux langues déclarées par les dépôts. */
const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length > 2);

/**
 * Dépôts publics qui pourraient répondre au problème, pas encore proposés.
 * Pertinence plein texte (n'importe quel mot du titre ou de la description),
 * puis compatibilité avec les contraintes terrain posées par l'auteur.
 */
export async function suggestions(id: string) {
  const problem = await findProblem(id);
  const proposed = await db
    .select({ id: t.solutions.repoId })
    .from(t.solutions)
    .where(eq(t.solutions.problemId, id));

  // plainto_tsquery relie les mots par « & » : on les relie par « | » pour une recherche large.
  // Le sujet vient du titre seul : la description et les langues apportent trop de mots courants.
  const query = sql`nullif(replace(plainto_tsquery('french', ${problem.title})::text, '&', '|'), '')::tsquery`;
  const doc = sql`to_tsvector('french', replace(${t.repositories.name}, '-', ' ') || ' ' || ${t.repositories.description} || ' ' || ${t.repositories.task})`;
  const rank = sql<number>`ts_rank(${doc}, ${query})`;

  const rows = await db
    .select({ repo: t.repositories, license: t.licenses, rank })
    .from(t.repositories)
    .innerJoin(t.licenses, eq(t.licenses.id, t.repositories.licenseId))
    .where(
      and(
        eq(t.repositories.visibility, "public"),
        sql`${doc} @@ ${query}`,
        proposed.length
          ? notInArray(
              t.repositories.id,
              proposed.map((p) => p.id),
            )
          : undefined,
      ),
    )
    .orderBy(desc(rank))
    .limit(20);

  const wantsOffline = problem.connectivityConstraint.trim() !== "";
  const wanted = new Set(words(problem.languageConstraint));
  return rows
    .map(({ repo, license, rank }) => {
      const languageMatches = repo.languages.filter((l) => wanted.has(l.toLowerCase()));
      const fits = {
        offline: wantsOffline ? repo.worksOffline : null,
        languages: wanted.size ? languageMatches : null,
      };
      // Les contraintes terrain départagent des dépôts déjà pertinents, sans en ajouter.
      const score = rank * (1 + (fits.offline ? 0.5 : 0) + (languageMatches.length ? 0.5 : 0));
      return {
        ...summary(repo),
        license: withRestrictions(license),
        fits,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...r }) => r);
}
