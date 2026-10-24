import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { conflict, forbidden, notFound } from "../../lib/errors.js";
import { orgMembership } from "../../lib/permissions.js";
import type { AddMember, CreateOrg } from "./schemas.js";

export async function findOrg(slug: string) {
  const [org] = await db.select().from(t.organizations).where(eq(t.organizations.slug, slug));
  if (!org) throw notFound("Organisation");
  return org;
}

export async function userByUsername(username: string) {
  const [u] = await db.select().from(t.users).where(eq(t.users.username, username.toLowerCase()));
  if (!u) throw notFound("Utilisateur");
  return u;
}

async function requireAdmin(orgId: string, userId: string) {
  if ((await orgMembership(orgId, userId)) !== "admin") throw forbidden();
}

export async function createOrg(input: CreateOrg, userId: string) {
  const [taken] = await db
    .select({ id: t.users.id })
    .from(t.users)
    .where(eq(t.users.username, input.slug));
  if (taken) throw conflict("Ce nom est déjà pris");

  return db.transaction(async (tx) => {
    const [org] = await tx.insert(t.organizations).values(input).returning();
    await tx.insert(t.organizationMembers).values({ orgId: org.id, userId, role: "admin" });
    return org;
  });
}

export async function orgDetail(slug: string, userId?: string) {
  const org = await findOrg(slug);
  const members = await listMembers(org.id);
  const myRole = userId ? await orgMembership(org.id, userId) : null;
  const repos = await db
    .select({
      ownerSlug: t.repositories.ownerSlug,
      name: t.repositories.name,
      type: t.repositories.type,
      visibility: t.repositories.visibility,
      description: t.repositories.description,
    })
    .from(t.repositories)
    .where(eq(t.repositories.ownerOrgId, org.id))
    .orderBy(desc(t.repositories.updatedAt));
  return {
    ...org,
    members,
    myRole,
    repos: myRole ? repos : repos.filter((r) => r.visibility === "public"),
  };
}

function listMembers(orgId: string) {
  return db
    .select({ username: t.users.username, name: t.users.name, role: t.organizationMembers.role })
    .from(t.organizationMembers)
    .innerJoin(t.users, eq(t.users.id, t.organizationMembers.userId))
    .where(eq(t.organizationMembers.orgId, orgId))
    .orderBy(asc(t.users.username));
}

export async function addMember(slug: string, input: AddMember, userId: string) {
  const org = await findOrg(slug);
  await requireAdmin(org.id, userId);
  const member = await userByUsername(input.username);
  await db
    .insert(t.organizationMembers)
    .values({ orgId: org.id, userId: member.id, role: input.role })
    .onConflictDoUpdate({
      target: [t.organizationMembers.orgId, t.organizationMembers.userId],
      set: { role: input.role },
    });
  return listMembers(org.id);
}

export async function removeMember(slug: string, username: string, userId: string) {
  const org = await findOrg(slug);
  await requireAdmin(org.id, userId);
  const member = await userByUsername(username);
  const admins = (await listMembers(org.id)).filter((m) => m.role === "admin");
  if (admins.length === 1 && admins[0].username === member.username) {
    throw conflict("L'organisation doit garder au moins un admin");
  }
  await db
    .delete(t.organizationMembers)
    .where(
      and(eq(t.organizationMembers.orgId, org.id), eq(t.organizationMembers.userId, member.id)),
    );
}
