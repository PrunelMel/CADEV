import { and, eq } from "drizzle-orm";
import { db, schema as t } from "../db/index.js";

export type Repo = typeof t.repositories.$inferSelect;
export type RepoAccess = { read: boolean; write: boolean; owner: boolean };

export async function orgMembership(orgId: string, userId: string) {
  const [m] = await db
    .select({ role: t.organizationMembers.role })
    .from(t.organizationMembers)
    .where(and(eq(t.organizationMembers.orgId, orgId), eq(t.organizationMembers.userId, userId)));
  return m?.role ?? null;
}

/**
 * Propriétaire : l'utilisateur propriétaire, ou un admin de l'organisation propriétaire.
 * Écriture : propriétaire ou collaborateur.
 * Lecture : dépôt public, ou écriture, ou membre de l'organisation propriétaire.
 */
export async function repoAccess(repo: Repo, userId: string | undefined): Promise<RepoAccess> {
  const isPublic = repo.visibility === "public";
  if (!userId) return { read: isPublic, write: false, owner: false };

  const role = repo.ownerOrgId ? await orgMembership(repo.ownerOrgId, userId) : null;
  const owner = repo.ownerUserId === userId || role === "admin";
  let write = owner;
  if (!write) {
    const [c] = await db
      .select({ userId: t.repositoryCollaborators.userId })
      .from(t.repositoryCollaborators)
      .where(
        and(
          eq(t.repositoryCollaborators.repoId, repo.id),
          eq(t.repositoryCollaborators.userId, userId),
        ),
      );
    write = !!c;
  }
  return { read: isPublic || write || role !== null, write, owner };
}
