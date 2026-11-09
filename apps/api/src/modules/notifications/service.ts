import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema as t } from "../../db/index.js";
import { env } from "../../env.js";
import { sendMail } from "../../lib/mail.js";

type Kind = (typeof t.notificationKind.enumValues)[number];

/**
 * Prévient les propriétaires des dépôts liés à un problème que son statut a changé
 * (propriétaire du dépôt, ou admins de l'organisation propriétaire), sauf l'auteur du changement.
 * Une notification par dépôt, copiée par e-mail.
 */
export async function notifyProblemStatus(
  problem: { id: string; title: string },
  kind: Kind,
  actorId: string,
) {
  const repos = await db
    .select({
      id: t.repositories.id,
      owner: t.repositories.ownerSlug,
      name: t.repositories.name,
      ownerUserId: t.repositories.ownerUserId,
      ownerOrgId: t.repositories.ownerOrgId,
    })
    .from(t.repositories)
    .where(eq(t.repositories.problemId, problem.id));
  if (!repos.length) return;

  const orgIds = repos.flatMap((r) => (r.ownerOrgId ? [r.ownerOrgId] : []));
  const admins = orgIds.length
    ? await db
        .select({ orgId: t.organizationMembers.orgId, userId: t.organizationMembers.userId })
        .from(t.organizationMembers)
        .where(
          and(
            inArray(t.organizationMembers.orgId, orgIds),
            eq(t.organizationMembers.role, "admin"),
          ),
        )
    : [];

  const rows = repos.flatMap((r) => {
    const users = r.ownerUserId
      ? [r.ownerUserId]
      : admins.filter((a) => a.orgId === r.ownerOrgId).map((a) => a.userId);
    return users
      .filter((u) => u !== actorId)
      .map((userId) => ({ userId, kind, problemId: problem.id, repoId: r.id }));
  });
  if (!rows.length) return;
  await db.insert(t.notifications).values(rows);

  const emails = await db
    .select({ id: t.users.id, email: t.users.email })
    .from(t.users)
    .where(
      inArray(
        t.users.id,
        rows.map((r) => r.userId),
      ),
    );
  const emailOf = new Map(emails.map((u) => [u.id, u.email]));
  for (const row of rows) {
    const repo = repos.find((r) => r.id === row.repoId)!;
    const to = emailOf.get(row.userId);
    if (!to) continue;
    const { subject, text } = message(kind, problem, repo);
    sendMail(to, subject, text);
  }
}

/** Texte de l'e-mail : ce qui a changé et ce que cela implique pour le dépôt. */
function message(
  kind: Kind,
  problem: { id: string; title: string },
  repo: { owner: string; name: string },
) {
  const repoUrl = `${env.WEB_ORIGIN}/${repo.owner}/${repo.name}`;
  const problemUrl = `${env.WEB_ORIGIN}/problemes/${problem.id}`;
  if (kind === "problem_closed") {
    return {
      subject: `Problème fermé : ${problem.title}`,
      text: [
        `Le problème « ${problem.title} », auquel votre dépôt ${repo.owner}/${repo.name} est lié, vient d'être fermé par son auteur.`,
        "",
        "Un problème fermé n'est plus mis en avant : les dépôts qui y restent liés passent derrière les autres dans le hub et la recherche.",
        "Si vous continuez à travailler sur ce sujet, liez votre dépôt à un autre problème, ou publiez-en un nouveau qui explique pourquoi le travail continue.",
        "",
        `Votre dépôt : ${repoUrl}`,
        `Le problème : ${problemUrl}`,
        `Publier un problème : ${env.WEB_ORIGIN}/problemes/nouveau`,
      ].join("\n"),
    };
  }
  return {
    subject: `Problème rouvert : ${problem.title}`,
    text: [
      `Le problème « ${problem.title} », auquel votre dépôt ${repo.owner}/${repo.name} est lié, vient d'être rouvert par son auteur.`,
      "",
      "Votre dépôt retrouve sa place dans le hub et la recherche.",
      "",
      `Votre dépôt : ${repoUrl}`,
      `Le problème : ${problemUrl}`,
    ].join("\n"),
  };
}

export async function listNotifications(userId: string) {
  const items = await db
    .select({
      id: t.notifications.id,
      kind: t.notifications.kind,
      readAt: t.notifications.readAt,
      createdAt: t.notifications.createdAt,
      problem: { id: t.problems.id, title: t.problems.title, status: t.problems.status },
      repo: { owner: t.repositories.ownerSlug, name: t.repositories.name },
    })
    .from(t.notifications)
    .leftJoin(t.problems, eq(t.problems.id, t.notifications.problemId))
    .leftJoin(t.repositories, eq(t.repositories.id, t.notifications.repoId))
    .where(eq(t.notifications.userId, userId))
    .orderBy(desc(t.notifications.createdAt))
    .limit(50);
  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(t.notifications)
    .where(and(eq(t.notifications.userId, userId), isNull(t.notifications.readAt)));
  return { unread, items };
}

/** Marque comme lues les notifications données, ou toutes. */
export async function markRead(userId: string, ids?: string[]) {
  await db
    .update(t.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(t.notifications.userId, userId),
        isNull(t.notifications.readAt),
        ids?.length ? inArray(t.notifications.id, ids) : undefined,
      ),
    );
  return listNotifications(userId);
}
