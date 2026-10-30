import { asc, and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as t } from "../db/index.js";

export const createDiscussion = z.object({ body: z.string().trim().min(1).max(20_000) });
type Target = (typeof t.discussionTarget.enumValues)[number];

export function listDiscussions(targetType: Target, targetId: string) {
  return db
    .select({
      id: t.discussions.id,
      body: t.discussions.body,
      createdAt: t.discussions.createdAt,
      author: t.users.username,
    })
    .from(t.discussions)
    .innerJoin(t.users, eq(t.users.id, t.discussions.authorId))
    .where(and(eq(t.discussions.targetType, targetType), eq(t.discussions.targetId, targetId)))
    .orderBy(asc(t.discussions.createdAt));
}

export async function addDiscussion(
  targetType: Target,
  targetId: string,
  authorId: string,
  body: string,
) {
  await db.insert(t.discussions).values({ targetType, targetId, authorId, body });
  return listDiscussions(targetType, targetId);
}
