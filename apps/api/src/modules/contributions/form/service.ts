import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema as t } from "../../../db/index.js";
import { AppError, forbidden, notFound } from "../../../lib/errors.js";
import { storage } from "../../../storage/index.js";
import { MAX_BYTES, MEDIA_KINDS, blockDef, type MediaKind } from "./model/blockTypes.js";
import {
  FORM_VERSION,
  deriveFields,
  emptyForm,
  newResourceId,
  validateAnswers,
  validateConfig,
  type ConfigIssue,
  type FormConfig,
} from "./model/formModel.js";
import { recordReviews, validateIncoming } from "./reviews.js";
import type { StorageInput, SubmissionInput } from "./schemas.js";
import { mimeForKind, sniff } from "./sniff.js";
import { ensureTree, paths } from "./tree.js";
import { archive, writeAll, writeOne, type SubmissionRecord } from "./views.js";

const MAX_CODE_BYTES = 1024 * 1024;

/* ---------- Verrou par problème ----------
 * Les écritures d'un même problème (publication, réponses, fichiers) passent l'une après l'autre
 * dans ce processus. La base garantit le reste (clés primaires, contraintes d'unicité). */

const queues = new Map<string, Promise<unknown>>();
export function locked<T>(problemId: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(problemId) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  queues.set(problemId, run);
  // then(f, f) et non finally : la promesse de nettoyage ne doit jamais rejeter à son tour.
  const cleanup = () => {
    if (queues.get(problemId) === run) queues.delete(problemId);
  };
  run.then(cleanup, cleanup);
  return run;
}

/* ---------- Accès ---------- */

export type Access = {
  problem: { id: string; title: string; authorId: string; status: string };
  userId: string | null;
  isCreator: boolean;
};

export async function access(problemId: string, userId: string | null): Promise<Access> {
  const [problem] = await db
    .select({
      id: t.problems.id,
      title: t.problems.title,
      authorId: t.problems.authorId,
      status: t.problems.status,
    })
    .from(t.problems)
    .where(eq(t.problems.id, problemId));
  if (!problem) throw notFound("Problème");
  return { problem, userId, isCreator: !!userId && userId === problem.authorId };
}

export function assertCreator(a: Access) {
  if (!a.userId) throw new AppError(401, "unauthorized", "Connexion requise");
  if (!a.isCreator) throw forbidden("Réservé à l'auteur du problème");
}

const invalidForm = (message: string, errors: ConfigIssue[]) =>
  new AppError(422, "invalid_form", message, errors);

/* ---------- Formulaire : brouillon et versions publiées ---------- */

async function formRow(problemId: string) {
  const [row] = await db
    .select()
    .from(t.contributionForms)
    .where(eq(t.contributionForms.problemId, problemId));
  return row ?? null;
}

export async function getPublished(problemId: string) {
  return (await formRow(problemId))?.published ?? null;
}

/** Brouillon courant ; à défaut, formulaire vide au titre du problème. */
export async function getDraft(a: Access) {
  const row = await formRow(a.problem.id);
  return {
    form: row?.draft ?? emptyForm({ problemId: a.problem.id, title: a.problem.title }),
    published: row?.published?.revision ?? 0,
  };
}

async function resourcesOf(problemId: string) {
  return db
    .select()
    .from(t.contributionResources)
    .where(eq(t.contributionResources.problemId, problemId))
    .orderBy(asc(t.contributionResources.createdAt));
}

/** Les médias référencés existent dans le dossier du problème et ont le bon type. */
async function checkResources(problemId: string, config: FormConfig) {
  const known = new Map((await resourcesOf(problemId)).map((r) => [r.id, r]));
  const errors: ConfigIssue[] = [];
  config.blocks.forEach((b, i) => {
    const def = blockDef(b.type);
    const rid = b.props?.resourceId;
    if (!def?.mediaKind || rid == null) return;
    const res = known.get(rid);
    const path = `blocks[${i}].props.resourceId`;
    if (!res) {
      errors.push({
        path,
        code: "unknown_resource",
        message: "Ressource introuvable dans le dossier du problème",
      });
    } else if (res.kind !== def.mediaKind) {
      errors.push({
        path,
        code: "resource_kind_mismatch",
        message: `Ce bloc attend un fichier de type « ${def.mediaKind} »`,
      });
    }
  });
  return errors;
}

/** Une clé publiée ne change plus, un type non plus ; `keyLocked` n'est jamais levé par le client. */
function checkLocks(published: FormConfig | null, config: FormConfig) {
  const errors: ConfigIssue[] = [];
  if (published?.mode !== "visual" || config.mode !== "visual") return errors;
  const byId = new Map(config.blocks.map((b, i) => [b.id, { b, i }]));
  for (const old of published.blocks) {
    const hit = byId.get(old.id);
    if (!hit || !old.keyLocked) continue;
    if (hit.b.key !== old.key) {
      errors.push({
        path: `blocks[${hit.i}].key`,
        code: "key_locked",
        message: "Le nom de colonne d’un champ publié ne peut plus changer",
      });
    }
    if (hit.b.type !== old.type) {
      errors.push({
        path: `blocks[${hit.i}].type`,
        code: "type_locked",
        message: "Le type d’un champ publié ne peut plus changer",
      });
    }
    hit.b.keyLocked = true;
  }
  return errors;
}

/** `revision`, `publishedAt` et `keyLocked` appartiennent à l'API : le client ne les fixe pas. */
export async function saveDraft(a: Access, input: unknown) {
  const problemId = a.problem.id;
  return locked(problemId, async () => {
    const row = await formRow(problemId);
    const published = row?.published ?? null;
    const config = structuredClone(input) as FormConfig;
    config.problemId = problemId;
    config.revision = published?.revision ?? 0;
    delete config.publishedAt;
    const v = validateConfig(config, { stage: "draft" });
    const errors = [...v.errors];
    if (v.ok && config.mode === "visual") {
      errors.push(...(await checkResources(problemId, config)), ...checkLocks(published, config));
    }
    if (errors.length) throw invalidForm("Configuration invalide", errors);
    if (!row) {
      await ensureTree(problemId);
      await db.insert(t.contributionForms).values({ problemId, draft: config });
    } else {
      await db
        .update(t.contributionForms)
        .set({ draft: config, updatedAt: new Date() })
        .where(eq(t.contributionForms.problemId, problemId));
    }
    return config;
  });
}

/** Valide strictement, incrémente la révision, fige les clés, puis régénère les fichiers. */
export async function publish(a: Access) {
  const problemId = a.problem.id;
  return locked(problemId, async () => {
    const row = await formRow(problemId);
    if (!row) throw new AppError(409, "no_draft", "Aucun brouillon à publier");
    const published = row.published;
    const config = structuredClone(row.draft);
    config.problemId = problemId;

    const errors = [...validateConfig(config, { stage: "publish" }).errors];
    if (config.mode === "visual") {
      errors.push(...(await checkResources(problemId, config)), ...checkLocks(published, config));
    }
    if (config.mode === "code" && !row.codeDraft) {
      errors.push({
        path: "code",
        code: "no_code",
        message: "Importez le code de la page avant de publier",
      });
    }
    if (errors.length) throw invalidForm("Le formulaire n’est pas prêt à être publié", errors);

    config.version = FORM_VERSION;
    config.revision = (published?.revision ?? 0) + 1;
    config.publishedAt = new Date().toISOString();
    if (config.mode === "visual") for (const b of config.blocks) b.keyLocked = true;

    await db.transaction(async (tx) => {
      await tx
        .insert(t.contributionFormRevisions)
        .values({ problemId, revision: config.revision, config });
      await tx
        .update(t.contributionForms)
        .set({
          published: config,
          draft: config,
          codePublished: config.mode === "code" ? row.codeDraft : row.codePublished,
          updatedAt: new Date(),
        })
        .where(eq(t.contributionForms.problemId, problemId));
    });

    const p = paths(problemId);
    const json = JSON.stringify(config, null, 2);
    await storage.write(p.revisionFile(config.revision), json, "application/json");
    await storage.write(p.formJson, json, "application/json");
    if (config.mode === "code" && row.codeDraft) {
      await storage.write(p.codeFile(true), row.codeDraft, "text/html; charset=utf-8");
    }
    await rebuildViews(problemId, config);
    return config;
  });
}

/** Le format de stockage se change à chaud : brouillon et version publiée, sans nouvelle révision. */
export async function setStorage(a: Access, input: StorageInput) {
  const problemId = a.problem.id;
  return locked(problemId, async () => {
    const next = { format: input.format, includeContributor: input.includeContributor !== false };
    const row = await formRow(problemId);
    const before = (row?.published ?? row?.draft)?.storage ?? null;
    if (!row) {
      await ensureTree(problemId);
      const draft = { ...emptyForm({ problemId, title: a.problem.title }), storage: next };
      await db.insert(t.contributionForms).values({ problemId, draft });
      return { storage: next, archived: [] as string[] };
    }
    const published = row.published ? { ...row.published, storage: next } : null;
    await db
      .update(t.contributionForms)
      .set({ draft: { ...row.draft, storage: next }, published, updatedAt: new Date() })
      .where(eq(t.contributionForms.problemId, problemId));
    let archived: string[] = [];
    if (published && before) {
      if (before.format !== next.format) {
        archived = await archive(problemId, before.format);
        await rebuildViews(problemId, published);
      } else if (before.includeContributor !== next.includeContributor) {
        await rebuildViews(problemId, published);
      }
    }
    return { storage: next, archived };
  });
}

/** Champs collectés par le brouillon : ce que le créateur voit avant de choisir le format. */
export async function fields(a: Access) {
  const { form } = await getDraft(a);
  return {
    fields: deriveFields(form).map(({ key, label, type, kind, required, pii }) => ({
      key,
      label,
      type,
      kind,
      required,
      pii,
    })),
    storage: form.storage,
  };
}

/* ---------- Mode « code » ---------- */

export async function saveCode(a: Access, html: string) {
  if (!html.trim()) throw new AppError(422, "invalid_code", "Fichier vide");
  if (Buffer.byteLength(html) > MAX_CODE_BYTES) {
    throw new AppError(413, "too_large", "Code trop volumineux (1 Mo maximum)");
  }
  const problemId = a.problem.id;
  await locked(problemId, async () => {
    const row = await formRow(problemId);
    if (!row) {
      await ensureTree(problemId);
      const draft = emptyForm({ problemId, title: a.problem.title });
      await db.insert(t.contributionForms).values({ problemId, draft, codeDraft: html });
    } else {
      await db
        .update(t.contributionForms)
        .set({ codeDraft: html, updatedAt: new Date() })
        .where(eq(t.contributionForms.problemId, problemId));
    }
    await storage.write(paths(problemId).codeFile(false), html, "text/html; charset=utf-8");
  });
}

export async function readCode(problemId: string, published: boolean) {
  const row = await formRow(problemId);
  return (published ? row?.codePublished : row?.codeDraft) ?? null;
}

/* ---------- Médias ---------- */

const slugName = (name: string) =>
  name
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "fichier";

export type Resource = typeof t.contributionResources.$inferSelect;

/** Représentation publique d'une ressource (sans clé de stockage ni empreinte). */
export const publicResource = (r: Resource) => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  mime: r.mime,
  size: r.size,
  createdAt: r.createdAt,
});

export async function listResources(a: Access, kind?: MediaKind) {
  const list = await resourcesOf(a.problem.id);
  return (kind ? list.filter((r) => r.kind === kind) : list).map(publicResource);
}

/**
 * Importe un média : vérifie la signature binaire, la taille selon le type, déduplique par
 * SHA-256, puis range le fichier dans resources/<dossier du type>/. Le flux est d'abord écrit
 * dans un emplacement temporaire, le type réel n'étant connu qu'après lecture.
 */
export async function addResource(
  a: Access,
  input: Readable,
  { name, kindHint, length }: { name: string; kindHint?: MediaKind; length?: number },
) {
  const problemId = a.problem.id;
  const p = paths(problemId);
  const tmp = p.uploadTmp(randomUUID());
  const limit = Math.max(...Object.values(MAX_BYTES));
  const { size, sha256, head } = await storage.putAt(tmp, input, { length, limit });
  try {
    const sniffed = sniff(head);
    if (!sniffed) {
      throw new AppError(
        415,
        "unsupported_media",
        "Format de fichier non pris en charge (images PNG/JPEG/WebP, GIF, audio MP3/WAV/OGG/M4A, vidéo MP4/WebM)",
      );
    }
    if (kindHint && !sniffed.kinds.includes(kindHint)) {
      throw new AppError(415, "kind_mismatch", `Ce fichier n’est pas de type « ${kindHint} »`);
    }
    const kind = kindHint ?? sniffed.kinds[0];
    if (size > MAX_BYTES[kind]) {
      throw new AppError(
        413,
        "too_large",
        `Fichier trop volumineux (${Math.round(MAX_BYTES[kind] / 1048576)} Mo maximum pour ce type)`,
      );
    }
    return await locked(problemId, async () => {
      const [same] = await db
        .select()
        .from(t.contributionResources)
        .where(
          and(
            eq(t.contributionResources.problemId, problemId),
            eq(t.contributionResources.kind, kind),
            eq(t.contributionResources.sha256, sha256),
          ),
        );
      if (same) return { resource: publicResource(same), duplicate: true };
      const id = newResourceId();
      const file = `${id}-${slugName(name)}.${sniffed.ext}`;
      const storageKey = p.resourceFile(kind, file);
      await storage.copy(tmp, storageKey);
      const [created] = await db
        .insert(t.contributionResources)
        .values({
          id,
          problemId,
          kind,
          name: name.slice(0, 200) || file,
          file,
          mime: mimeForKind(sniffed, kind),
          size,
          sha256,
          storageKey,
        })
        .returning();
      return { resource: publicResource(created), duplicate: false };
    });
  } finally {
    await storage.remove(tmp);
  }
}

const usedBySubmissions = async (problemId: string, rid: string) => {
  const [hit] = await db
    .select({ id: t.contributionSubmissions.id })
    .from(t.contributionSubmissions)
    .where(
      and(
        eq(t.contributionSubmissions.problemId, problemId),
        sql`jsonb_path_exists(${t.contributionSubmissions.media}, '$.*.resourceId ? (@ == $rid)', jsonb_build_object('rid', ${rid}::text))`,
      ),
    )
    .limit(1);
  return !!hit;
};

const usesResource = (form: FormConfig | null | undefined, rid: string) =>
  !!form?.blocks?.some((b) => b.props?.resourceId === rid);

async function findResource(problemId: string, rid: string) {
  const [r] = await db
    .select()
    .from(t.contributionResources)
    .where(
      and(eq(t.contributionResources.problemId, problemId), eq(t.contributionResources.id, rid)),
    );
  return r ?? null;
}

/** Un média utilisé par le formulaire ou par des réponses collectées ne peut pas être supprimé. */
export async function removeResource(a: Access, rid: string) {
  const problemId = a.problem.id;
  await locked(problemId, async () => {
    const entry = await findResource(problemId, rid);
    if (!entry) throw notFound("Ressource");
    const row = await formRow(problemId);
    if (
      usesResource(row?.draft, rid) ||
      usesResource(row?.published, rid) ||
      (await usedBySubmissions(problemId, rid))
    ) {
      throw new AppError(
        409,
        "resource_in_use",
        "Ce fichier est utilisé par le formulaire ou par des réponses déjà collectées",
      );
    }
    await db.delete(t.contributionResources).where(eq(t.contributionResources.id, rid));
    await storage.remove(entry.storageKey);
  });
}

/**
 * Média à servir. Public pour ce que voient les contributeurs (bloc du formulaire publié, média
 * rattaché à une réponse), car un <img> ou un <audio> d'une page importée isolée n'envoie pas de
 * cookie. Tout le reste est réservé au créateur, et répond 404 sinon.
 */
export async function resourceToServe(a: Access, rid: string) {
  const entry = await findResource(a.problem.id, rid);
  if (!entry) throw notFound("Ressource");
  const visible =
    usesResource(await getPublished(a.problem.id), rid) ||
    (await usedBySubmissions(a.problem.id, rid));
  if (!visible && !a.isCreator) throw notFound("Ressource");
  return { entry, visible };
}

/* ---------- Réponses ---------- */

const toRecord = (r: typeof t.contributionSubmissions.$inferSelect): SubmissionRecord => ({
  id: r.id,
  at: r.createdAt.toISOString(),
  contributorId: r.contributorId,
  formRevision: r.formRevision,
  answers: r.answers,
  media: r.media,
});

export async function allRecords(problemId: string) {
  const rows = await db
    .select()
    .from(t.contributionSubmissions)
    .where(eq(t.contributionSubmissions.problemId, problemId))
    .orderBy(asc(t.contributionSubmissions.createdAt));
  return rows.map(toRecord);
}

const setDirty = (problemId: string, viewsDirty: boolean) =>
  db
    .update(t.contributionForms)
    .set({ viewsDirty })
    .where(eq(t.contributionForms.problemId, problemId));

/** Régénère les fichiers de réponses ; un échec n'efface aucune réponse (elles sont en base). */
async function rebuildViews(problemId: string, config: FormConfig) {
  try {
    await writeAll(problemId, config, await allRecords(problemId));
    await setDirty(problemId, false);
  } catch (err) {
    console.error(`[contribution:${problemId}] fichiers de réponses non régénérés`, err);
    await setDirty(problemId, true);
  }
}

/** Fichier de média (référence calculée par l'API, jamais envoyée par le client). */
async function mediaRefs(problemId: string, form: FormConfig) {
  const out: Record<string, { resourceId: string; kind: string; file: string }> = {};
  if (form.mode !== "visual") return out;
  const anchored = deriveFields(form).filter((f) => f.kind === "media_ref");
  if (!anchored.length) return out;
  const byId = new Map((await resourcesOf(problemId)).map((r) => [r.id, r]));
  const blocks = new Map(form.blocks.map((b) => [b.id, b]));
  for (const f of anchored) {
    const res = byId.get(blocks.get(f.blockId ?? "")?.props?.resourceId ?? "");
    if (res) out[f.key] = { resourceId: res.id, kind: res.kind, file: res.file };
  }
  return out;
}

/**
 * Enregistre une contribution, dans le verrou du problème :
 *  1. valider contre la version PUBLIÉE (le client n'est jamais cru) ;
 *  2. calculer les références média ;
 *  3. valider les retours de relecture éventuels ;
 *  4. écrire en base (réponse et relectures, dans une transaction) : la contribution est acquise ;
 *  5. écrire le fichier de réponses : un échec ici n'annule pas la contribution.
 * `submissionId`, généré par le client, rend le renvoi sans danger (pas de doublon).
 */
export async function submit(a: Access, userId: string, input: SubmissionInput) {
  const problemId = a.problem.id;
  if (a.problem.status === "closed") {
    throw new AppError(
      409,
      "problem_closed",
      "Ce problème est fermé : il n’accepte plus de contributions",
    );
  }
  return locked(problemId, async () => {
    const row = await formRow(problemId);
    const form = row?.published;
    if (!form)
      throw new AppError(409, "not_published", "Ce problème n’accepte pas encore de contributions");
    const [dup] = await db
      .select({ id: t.contributionSubmissions.id })
      .from(t.contributionSubmissions)
      .where(
        and(
          eq(t.contributionSubmissions.problemId, problemId),
          eq(t.contributionSubmissions.id, input.submissionId),
        ),
      );
    if (dup) return { id: input.submissionId, duplicate: true, materialized: "done" as const };

    const check = validateAnswers(form, input.answers);
    if (!check.ok) {
      const outdated = input.formRevision != null && input.formRevision !== form.revision;
      throw new AppError(
        outdated ? 409 : 422,
        outdated ? "form_outdated" : "invalid_answers",
        outdated
          ? "Le formulaire a été mis à jour : rechargez la page"
          : "Certaines réponses sont invalides",
        check.errors,
      );
    }
    const reviews = await validateIncoming(problemId, form, userId, input.reviews);
    const filled = Object.values(check.clean).some((v) =>
      Array.isArray(v) ? v.length > 0 : v !== "",
    );
    if (!filled && !reviews.length) {
      throw new AppError(422, "empty_submission", "Répondez à au moins un champ");
    }

    const [saved] = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(t.contributionSubmissions)
        .values({
          problemId,
          id: input.submissionId,
          contributorId: userId,
          formRevision: form.revision,
          answers: filled ? check.clean : {},
          media: filled ? await mediaRefs(problemId, form) : {},
        })
        .returning();
      await recordReviews(tx, problemId, userId, form.revision, reviews);
      return rows;
    });

    // Une relecture seule (aucun champ rempli) n'ajoute pas de ligne de réponses.
    let materialized: "done" | "failed" = "done";
    if (filled) {
      try {
        if (row.viewsDirty) await writeAll(problemId, form, await allRecords(problemId));
        else await writeOne(problemId, form, toRecord(saved), () => allRecords(problemId));
        if (row.viewsDirty) await setDirty(problemId, false);
      } catch (err) {
        console.error(`[contribution:${problemId}] fichier de réponses non mis à jour`, err);
        await setDirty(problemId, true);
        materialized = "failed";
      }
    }
    return { id: saved.id, duplicate: false, materialized, reviewsRecorded: reviews.length };
  });
}

export async function stats(problemId: string) {
  const [s] = await db
    .select({
      submissions: sql<number>`count(*)::int`,
      lastAt: sql<string | null>`max(${t.contributionSubmissions.createdAt})`,
    })
    .from(t.contributionSubmissions)
    .where(
      and(
        eq(t.contributionSubmissions.problemId, problemId),
        sql`${t.contributionSubmissions.answers} <> '{}'::jsonb`,
      ),
    );
  return s;
}

/** Fichier de réponses à télécharger (CSV ou XLSX), régénéré d'abord s'il était en retard. */
export async function exportFile(a: Access) {
  const problemId = a.problem.id;
  const row = await formRow(problemId);
  const form = row?.published;
  if (!form) throw new AppError(404, "not_published", "Rien à exporter");
  const format = form.storage.format;
  if (format === "txt") {
    throw new AppError(
      409,
      "export_unavailable",
      "Format « un fichier par réponse » : les fichiers sont dans responses/entries",
    );
  }
  const key = paths(problemId).responsesFile(format);
  if (row.viewsDirty || (await storage.size(key)) === null) {
    await locked(problemId, () => rebuildViews(problemId, form));
  }
  return { key, format };
}

export const isMediaKind = (k: string): k is MediaKind =>
  (MEDIA_KINDS as readonly string[]).includes(k);
