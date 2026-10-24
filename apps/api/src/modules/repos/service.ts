import type { Readable } from "node:stream";
import { and, asc, count, desc, eq, ilike, max, or } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { orgMembership, repoAccess } from "../../lib/permissions.js";
import { storage } from "../../storage/index.js";
import { getLicense, withRestrictions } from "../licenses/service.js";
import { findOrg, userByUsername } from "../orgs/service.js";
import type { CreatePull, CreateRepo, ListQuery, UpdateRepo } from "./schemas.js";

type SessionUser = { id: string; username: string | null };
type FileRow = { path: string; size: number; sha256: string; storageKey: string };

/** Taille annoncée par le client, si présente. */
const contentLength = (body: Readable & { headers?: Record<string, unknown> }) => {
  const n = Number(body.headers?.["content-length"]);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

const publicFile = ({ path, size, sha256 }: FileRow) => ({ path, size, sha256 });

/* ---------- Lecture et droits ---------- */

export async function findRepo(owner: string, name: string, userId?: string) {
  const [repo] = await db
    .select()
    .from(t.repositories)
    .where(and(eq(t.repositories.ownerSlug, owner), eq(t.repositories.name, name)));
  // Un dépôt privé inaccessible répond 404 pour ne pas révéler son existence.
  if (!repo) throw notFound("Dépôt");
  const access = await repoAccess(repo, userId);
  if (!access.read) throw notFound("Dépôt");
  return { repo, access };
}

async function findWritable(owner: string, name: string, userId: string) {
  const found = await findRepo(owner, name, userId);
  if (!found.access.write) throw forbidden();
  return found;
}

async function findOwned(owner: string, name: string, userId: string) {
  const found = await findRepo(owner, name, userId);
  if (!found.access.owner) throw forbidden();
  return found;
}

async function latestVersion(repoId: string) {
  const [v] = await db
    .select()
    .from(t.repositoryVersions)
    .where(eq(t.repositoryVersions.repoId, repoId))
    .orderBy(desc(t.repositoryVersions.number))
    .limit(1);
  return v ?? null;
}

async function versionByNumber(repoId: string, number: number) {
  const [v] = await db
    .select()
    .from(t.repositoryVersions)
    .where(and(eq(t.repositoryVersions.repoId, repoId), eq(t.repositoryVersions.number, number)));
  if (!v) throw notFound("Version");
  return v;
}

function filesOf(versionId: string): Promise<FileRow[]> {
  return db
    .select({
      path: t.repositoryFiles.path,
      size: t.repositoryFiles.size,
      sha256: t.repositoryFiles.sha256,
      storageKey: t.repositoryFiles.storageKey,
    })
    .from(t.repositoryFiles)
    .where(eq(t.repositoryFiles.versionId, versionId))
    .orderBy(asc(t.repositoryFiles.path));
}

/** Crée une nouvelle version à partir de la dernière, modifiée par `mutate`. */
function commit(
  repoId: string,
  userId: string,
  message: string,
  mutate: (files: Map<string, FileRow>) => void,
) {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(t.repositoryVersions)
      .where(eq(t.repositoryVersions.repoId, repoId))
      .orderBy(desc(t.repositoryVersions.number))
      .limit(1);
    const current = latest
      ? await tx
          .select({
            path: t.repositoryFiles.path,
            size: t.repositoryFiles.size,
            sha256: t.repositoryFiles.sha256,
            storageKey: t.repositoryFiles.storageKey,
          })
          .from(t.repositoryFiles)
          .where(eq(t.repositoryFiles.versionId, latest.id))
      : [];
    const files = new Map(current.map((f) => [f.path, f]));
    mutate(files);

    const [version] = await tx
      .insert(t.repositoryVersions)
      .values({ repoId, number: (latest?.number ?? 0) + 1, message, createdBy: userId })
      .returning();
    if (files.size) {
      await tx
        .insert(t.repositoryFiles)
        .values([...files.values()].map((f) => ({ ...f, versionId: version.id })));
    }
    await tx
      .update(t.repositories)
      .set({ updatedAt: new Date() })
      .where(eq(t.repositories.id, repoId));
    return version;
  });
}

/* ---------- Dépôts ---------- */

export async function listRepos(query: ListQuery) {
  const filters = [eq(t.repositories.visibility, "public")];
  if (query.type) filters.push(eq(t.repositories.type, query.type));
  if (query.q) {
    const like = `%${query.q}%`;
    const match = or(ilike(t.repositories.name, like), ilike(t.repositories.description, like));
    if (match) filters.push(match);
  }
  const rows = await db
    .select({ repo: t.repositories, license: t.licenses })
    .from(t.repositories)
    .innerJoin(t.licenses, eq(t.licenses.id, t.repositories.licenseId))
    .where(and(...filters))
    .orderBy(desc(t.repositories.updatedAt))
    .limit(100);
  return rows.map(({ repo, license }) => ({
    ...summary(repo),
    license: withRestrictions(license),
  }));
}

export function summary(repo: typeof t.repositories.$inferSelect) {
  return {
    id: repo.id,
    type: repo.type,
    owner: repo.ownerSlug,
    name: repo.name,
    visibility: repo.visibility,
    description: repo.description,
    provenanceCommunity: repo.provenanceCommunity,
    provenanceCountry: repo.provenanceCountry,
    updatedAt: repo.updatedAt,
  };
}

export async function createRepo(input: CreateRepo, user: SessionUser) {
  const { org: orgSlug, ...data } = input;
  await getLicense(data.licenseId);

  let owner: { ownerSlug: string; ownerUserId: string | null; ownerOrgId: string | null };
  if (orgSlug) {
    const org = await findOrg(orgSlug);
    if ((await orgMembership(org.id, user.id)) !== "admin") throw forbidden();
    owner = { ownerSlug: org.slug, ownerUserId: null, ownerOrgId: org.id };
  } else {
    if (!user.username) throw badRequest("Choisissez d'abord un nom d'utilisateur");
    owner = { ownerSlug: user.username, ownerUserId: user.id, ownerOrgId: null };
  }

  const [existing] = await db
    .select({ id: t.repositories.id })
    .from(t.repositories)
    .where(and(eq(t.repositories.ownerSlug, owner.ownerSlug), eq(t.repositories.name, data.name)));
  if (existing) throw conflict("Un dépôt porte déjà ce nom");

  const [repo] = await db
    .insert(t.repositories)
    .values({ ...data, ...owner, createdBy: user.id })
    .returning();
  return summary(repo);
}

export async function repoDetail(
  owner: string,
  name: string,
  version: number | undefined,
  userId?: string,
) {
  const { repo, access } = await findRepo(owner, name, userId);
  const license = withRestrictions(await getLicense(repo.licenseId));
  const current = version ? await versionByNumber(repo.id, version) : await latestVersion(repo.id);
  const files = current ? await filesOf(current.id) : [];
  const [{ value: likeCount }] = await db
    .select({ value: count() })
    .from(t.likes)
    .where(eq(t.likes.repoId, repo.id));
  const liked = userId
    ? (
        await db
          .select({ userId: t.likes.userId })
          .from(t.likes)
          .where(and(eq(t.likes.repoId, repo.id), eq(t.likes.userId, userId)))
      ).length > 0
    : false;
  const solves = await db
    .select({ id: t.problems.id, title: t.problems.title, status: t.solutions.status })
    .from(t.solutions)
    .innerJoin(t.problems, eq(t.problems.id, t.solutions.problemId))
    .where(eq(t.solutions.repoId, repo.id));

  return {
    ...summary(repo),
    readme: repo.readme,
    limitations: repo.limitations,
    licenseId: repo.licenseId,
    license,
    version: current && {
      number: current.number,
      message: current.message,
      createdAt: current.createdAt,
    },
    files: files.map(publicFile),
    likes: likeCount,
    liked,
    solves,
    permissions: access,
  };
}

export async function updateRepo(owner: string, name: string, input: UpdateRepo, userId: string) {
  const { repo } = await findOwned(owner, name, userId);
  if (input.licenseId) await getLicense(input.licenseId);
  const [updated] = await db
    .update(t.repositories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(t.repositories.id, repo.id))
    .returning();
  return summary(updated);
}

/* ---------- Collaborateurs ---------- */

export async function listCollaborators(owner: string, name: string, userId?: string) {
  const { repo } = await findRepo(owner, name, userId);
  return db
    .select({ username: t.users.username, name: t.users.name })
    .from(t.repositoryCollaborators)
    .innerJoin(t.users, eq(t.users.id, t.repositoryCollaborators.userId))
    .where(eq(t.repositoryCollaborators.repoId, repo.id))
    .orderBy(asc(t.users.username));
}

export async function addCollaborator(
  owner: string,
  name: string,
  username: string,
  userId: string,
) {
  const { repo } = await findOwned(owner, name, userId);
  const collaborator = await userByUsername(username);
  await db
    .insert(t.repositoryCollaborators)
    .values({ repoId: repo.id, userId: collaborator.id })
    .onConflictDoNothing();
  return listCollaborators(owner, name, userId);
}

export async function removeCollaborator(
  owner: string,
  name: string,
  username: string,
  userId: string,
) {
  const { repo } = await findOwned(owner, name, userId);
  const collaborator = await userByUsername(username);
  await db
    .delete(t.repositoryCollaborators)
    .where(
      and(
        eq(t.repositoryCollaborators.repoId, repo.id),
        eq(t.repositoryCollaborators.userId, collaborator.id),
      ),
    );
}

/* ---------- Fichiers et versions ---------- */

export async function uploadFile(
  owner: string,
  name: string,
  path: string,
  body: Readable,
  message: string,
  userId: string,
) {
  const { repo } = await findWritable(owner, name, userId);
  const stored = await storage.put(body, contentLength(body));
  const version = await commit(repo.id, userId, message || `Ajout de ${path}`, (files) =>
    files.set(path, { path, ...stored }),
  );
  return { version: version.number, file: { path, size: stored.size, sha256: stored.sha256 } };
}

export async function deleteFile(
  owner: string,
  name: string,
  path: string,
  message: string,
  userId: string,
) {
  const { repo } = await findWritable(owner, name, userId);
  const latest = await latestVersion(repo.id);
  const files = latest ? await filesOf(latest.id) : [];
  if (!files.some((f) => f.path === path)) throw notFound("Fichier");
  const version = await commit(repo.id, userId, message || `Suppression de ${path}`, (map) =>
    map.delete(path),
  );
  return { version: version.number };
}

export async function downloadFile(
  owner: string,
  name: string,
  path: string,
  version: number | undefined,
  userId?: string,
) {
  const { repo } = await findRepo(owner, name, userId);
  const current = version ? await versionByNumber(repo.id, version) : await latestVersion(repo.id);
  const file = current ? (await filesOf(current.id)).find((f) => f.path === path) : undefined;
  if (!file) throw notFound("Fichier");
  return { file, stream: await storage.get(file.storageKey) };
}

export async function listVersions(owner: string, name: string, userId?: string) {
  const { repo } = await findRepo(owner, name, userId);
  return db
    .select({
      number: t.repositoryVersions.number,
      message: t.repositoryVersions.message,
      createdAt: t.repositoryVersions.createdAt,
      author: t.users.username,
    })
    .from(t.repositoryVersions)
    .innerJoin(t.users, eq(t.users.id, t.repositoryVersions.createdBy))
    .where(eq(t.repositoryVersions.repoId, repo.id))
    .orderBy(desc(t.repositoryVersions.number));
}

/* ---------- Likes ---------- */

export async function setLike(owner: string, name: string, userId: string, on: boolean) {
  const { repo } = await findRepo(owner, name, userId);
  if (on) {
    await db.insert(t.likes).values({ repoId: repo.id, userId }).onConflictDoNothing();
  } else {
    await db.delete(t.likes).where(and(eq(t.likes.repoId, repo.id), eq(t.likes.userId, userId)));
  }
}

/* ---------- Pull requests ---------- */

async function findPull(repoId: string, number: number) {
  const [pull] = await db
    .select()
    .from(t.pullRequests)
    .where(and(eq(t.pullRequests.repoId, repoId), eq(t.pullRequests.number, number)));
  if (!pull) throw notFound("Pull request");
  return pull;
}

function pullFiles(pullId: string): Promise<FileRow[]> {
  return db
    .select({
      path: t.pullRequestFiles.path,
      size: t.pullRequestFiles.size,
      sha256: t.pullRequestFiles.sha256,
      storageKey: t.pullRequestFiles.storageKey,
    })
    .from(t.pullRequestFiles)
    .where(eq(t.pullRequestFiles.pullId, pullId))
    .orderBy(asc(t.pullRequestFiles.path));
}

/** Fichiers de la PR modifiés dans le dépôt depuis la version de base. */
async function conflictsOf(repoId: string, baseVersionId: string | null, files: FileRow[]) {
  const latest = await latestVersion(repoId);
  if (!latest || latest.id === baseVersionId) return [];
  const sha = async (versionId: string | null) =>
    new Map(versionId ? (await filesOf(versionId)).map((f) => [f.path, f.sha256]) : []);
  const [base, current] = await Promise.all([sha(baseVersionId), sha(latest.id)]);
  return files.filter((f) => base.get(f.path) !== current.get(f.path)).map((f) => f.path);
}

export async function listPulls(owner: string, name: string, userId?: string) {
  const { repo } = await findRepo(owner, name, userId);
  return db
    .select({
      number: t.pullRequests.number,
      title: t.pullRequests.title,
      status: t.pullRequests.status,
      createdAt: t.pullRequests.createdAt,
      author: t.users.username,
    })
    .from(t.pullRequests)
    .innerJoin(t.users, eq(t.users.id, t.pullRequests.authorId))
    .where(eq(t.pullRequests.repoId, repo.id))
    .orderBy(desc(t.pullRequests.number));
}

export async function createPull(owner: string, name: string, input: CreatePull, userId: string) {
  const { repo } = await findRepo(owner, name, userId);
  const base = await latestVersion(repo.id);
  const [{ value: last }] = await db
    .select({ value: max(t.pullRequests.number) })
    .from(t.pullRequests)
    .where(eq(t.pullRequests.repoId, repo.id));
  const [pull] = await db
    .insert(t.pullRequests)
    .values({
      ...input,
      repoId: repo.id,
      number: (last ?? 0) + 1,
      authorId: userId,
      baseVersionId: base?.id ?? null,
    })
    .returning();
  return { number: pull.number };
}

export async function pullDetail(owner: string, name: string, number: number, userId?: string) {
  const { repo, access } = await findRepo(owner, name, userId);
  const pull = await findPull(repo.id, number);
  const files = await pullFiles(pull.id);
  const [author] = await db
    .select({ username: t.users.username })
    .from(t.users)
    .where(eq(t.users.id, pull.authorId));
  const versionNumber = async (id: string | null) =>
    id
      ? ((
          await db
            .select({ n: t.repositoryVersions.number })
            .from(t.repositoryVersions)
            .where(eq(t.repositoryVersions.id, id))
        )[0]?.n ?? null)
      : null;
  const isAuthor = pull.authorId === userId;
  return {
    number: pull.number,
    title: pull.title,
    description: pull.description,
    status: pull.status,
    author: author?.username ?? null,
    createdAt: pull.createdAt,
    baseVersion: await versionNumber(pull.baseVersionId),
    mergedVersion: await versionNumber(pull.mergedVersionId),
    files: files.map(publicFile),
    conflicts: pull.status === "open" ? await conflictsOf(repo.id, pull.baseVersionId, files) : [],
    permissions: {
      upload: pull.status === "open" && isAuthor,
      merge: pull.status === "open" && access.write,
      close: pull.status === "open" && (isAuthor || access.write),
    },
  };
}

export async function uploadPullFile(
  owner: string,
  name: string,
  number: number,
  path: string,
  body: Readable,
  userId: string,
) {
  const { repo } = await findRepo(owner, name, userId);
  const pull = await findPull(repo.id, number);
  if (pull.status !== "open") throw conflict("Cette pull request n'est plus ouverte");
  if (pull.authorId !== userId) throw forbidden();
  const stored = await storage.put(body, contentLength(body));
  await db
    .insert(t.pullRequestFiles)
    .values({ pullId: pull.id, path, ...stored })
    .onConflictDoUpdate({
      target: [t.pullRequestFiles.pullId, t.pullRequestFiles.path],
      set: stored,
    });
  await db
    .update(t.pullRequests)
    .set({ updatedAt: new Date() })
    .where(eq(t.pullRequests.id, pull.id));
  return { path, size: stored.size, sha256: stored.sha256 };
}

export async function mergePull(owner: string, name: string, number: number, userId: string) {
  const { repo } = await findWritable(owner, name, userId);
  const pull = await findPull(repo.id, number);
  if (pull.status !== "open") throw conflict("Cette pull request n'est plus ouverte");
  const files = await pullFiles(pull.id);
  if (!files.length) throw badRequest("La pull request ne contient aucun fichier");
  const conflicts = await conflictsOf(repo.id, pull.baseVersionId, files);
  if (conflicts.length) {
    throw conflict(`Fichiers modifiés depuis l'ouverture de la PR : ${conflicts.join(", ")}`);
  }
  const version = await commit(repo.id, userId, `PR #${pull.number} : ${pull.title}`, (map) => {
    for (const f of files) map.set(f.path, f);
  });
  await db
    .update(t.pullRequests)
    .set({ status: "merged", mergedVersionId: version.id, updatedAt: new Date() })
    .where(eq(t.pullRequests.id, pull.id));
  return { version: version.number };
}

export async function closePull(owner: string, name: string, number: number, userId: string) {
  const { repo, access } = await findRepo(owner, name, userId);
  const pull = await findPull(repo.id, number);
  if (pull.status !== "open") throw conflict("Cette pull request n'est plus ouverte");
  if (pull.authorId !== userId && !access.write) throw forbidden();
  await db
    .update(t.pullRequests)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(t.pullRequests.id, pull.id));
}

export async function pullId(owner: string, name: string, number: number, userId?: string) {
  const { repo } = await findRepo(owner, name, userId);
  return (await findPull(repo.id, number)).id;
}

export async function repoId(owner: string, name: string, userId?: string) {
  return (await findRepo(owner, name, userId)).repo.id;
}
