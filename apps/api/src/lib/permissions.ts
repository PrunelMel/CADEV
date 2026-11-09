import { and, eq } from "drizzle-orm";
import { db, schema as t } from "../db/index.js";

export type Repo = typeof t.repositories.$inferSelect;
export type RepoAccess = { read: boolean; write: boolean; owner: boolean; full: boolean };

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
 * Tout le contenu (`full`) : un dépôt « en construction » ne montre que son README et sa fiche ;
 * fichiers, versions, téléchargements, pull requests et discussions restent à son équipe
 * (propriétaire, collaborateurs, membres de l'organisation propriétaire).
 */
export async function repoAccess(repo: Repo, userId: string | undefined): Promise<RepoAccess> {
  const isPublic = repo.visibility === "public";
  const solution = repo.stage === "solution";
  if (!userId) return { read: isPublic, write: false, owner: false, full: isPublic && solution };

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
  const team = write || role !== null;
  return { read: isPublic || team, write, owner, full: team || (isPublic && solution) };
}
