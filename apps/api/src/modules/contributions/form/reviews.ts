// Bloc « Validation de données » : un contributeur relit une contribution déjà enregistrée et
// répond « c'est correct » ou propose une correction. Les réponses d'origine ne sont JAMAIS
// modifiées : un retour est une ligne de contribution_reviews.
//
// Règle de la plateforme : l'auteur du problème seul accepte ou rejette une correction. Le seuil
// `minAgreements` du bloc ne valide rien : il signale à l'auteur les corrections proposées par
// assez de contributeurs distincts.
//
// Confidentialité : seuls les champs non personnels sont montrés au relecteur (jamais un e-mail).

import { randomInt } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as t } from "../../../db/index.js";
import { AppError, notFound } from "../../../lib/errors.js";
import { LIMITS } from "./model/blockTypes.js";
import {
  deriveFields,
  reviewBlocks,
  validateFieldValue,
  type Answer,
  type Block,
  type FormConfig,
} from "./model/formModel.js";

const REVIEWABLE_TYPES = new Set(["text", "textarea", "radio", "select"]);
const normalizeValue = (v: unknown) =>
  String(v).normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
const targetKey = (submissionId: string, field: string) => `${submissionId}\u0000${field}`;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Champs qu'un bloc de validation autorise à relire : texte ou choix, non personnels. */
export function allowedTargets(form: FormConfig, block: Block) {
  const wanted = block.props.targetKeys;
  return deriveFields(form).filter(
    (f) =>
      f.kind === "value" &&
      !f.pii &&
      REVIEWABLE_TYPES.has(f.type) &&
      (wanted == null || wanted.includes(f.key)),
  );
}

const reviewsOf = (problemId: string) =>
  db.select().from(t.contributionReviews).where(eq(t.contributionReviews.problemId, problemId));

/**
 * Choisit une contribution à relire : jamais celle du relecteur, jamais une déjà relue par lui, en
 * priorité celles qui ont le moins de retours (la relecture se répartit au lieu de se concentrer).
 */
export async function nextToReview(
  problemId: string,
  form: FormConfig,
  userId: string,
  blockId: string,
) {
  const block = reviewBlocks(form).find((b) => b.id === blockId);
  if (!block) throw notFound("Bloc de validation");
  const targets = allowedTargets(form, block);
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of await reviewsOf(problemId)) {
    const k = targetKey(r.submissionId, r.field);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (r.reviewerId === userId) mine.add(k);
  }
  const records = await db
    .select()
    .from(t.contributionSubmissions)
    .where(
      and(
        eq(t.contributionSubmissions.problemId, problemId),
        sql`${t.contributionSubmissions.contributorId} is distinct from ${userId}`,
      ),
    );
  const candidates: {
    rec: (typeof records)[number];
    field: (typeof targets)[number];
    n: number;
  }[] = [];
  for (const rec of records) {
    for (const f of targets) {
      const value = rec.answers?.[f.key];
      const k = targetKey(rec.id, f.key);
      if (value == null || value === "" || mine.has(k)) continue;
      candidates.push({ rec, field: f, n: counts.get(k) ?? 0 });
    }
  }
  if (!candidates.length) return null;
  const min = Math.min(...candidates.map((c) => c.n));
  const pool = candidates.filter((c) => c.n === min);
  const { rec, field } = pool[randomInt(0, pool.length)];

  const publicFields = deriveFields(form).filter(
    (f) => f.kind === "value" && !f.pii && f.key !== field.key,
  );
  const filled = (v: Answer | undefined) =>
    v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  return {
    blockId,
    submissionId: rec.id,
    target: {
      key: field.key,
      label: field.label,
      type: field.type,
      value: rec.answers[field.key],
      ...(field.props?.options ? { options: field.props.options } : {}),
    },
    context: publicFields
      .filter((f) => filled(rec.answers?.[f.key]))
      .map((f) => ({ key: f.key, label: f.label, value: rec.answers[f.key] })),
    media: Object.entries(rec.media ?? {}).map(([key, m]) => ({
      key,
      kind: m.kind,
      resourceId: m.resourceId,
    })),
  };
}

export type ReviewEvent = {
  blockId: string;
  submissionId: string;
  field: string;
  verdict: "agree" | "correct";
  proposedValue?: Answer;
  comment: string;
};

/** Valide les retours joints à une soumission ; lève une erreur 422 au premier défaut. */
export async function validateIncoming(
  problemId: string,
  form: FormConfig,
  userId: string,
  reviews: unknown[] | undefined,
): Promise<ReviewEvent[]> {
  if (reviews == null) return [];
  if (reviews.length > LIMITS.reviewsPerSubmission) {
    throw new AppError(422, "invalid_reviews", "Retours de relecture invalides");
  }
  const done = new Set(
    (await reviewsOf(problemId))
      .filter((r) => r.reviewerId === userId)
      .map((r) => targetKey(r.submissionId, r.field)),
  );
  const seen = new Set<string>();
  const out: ReviewEvent[] = [];
  for (const [i, raw] of reviews.entries()) {
    const fail = (code: string, message: string): never => {
      throw new AppError(422, code, message, [{ path: `reviews[${i}]`, code, message }]);
    };
    if (!raw || typeof raw !== "object") fail("invalid_review", "Retour invalide");
    const r = raw as Record<string, unknown>;
    const block = reviewBlocks(form).find((b) => b.id === r.blockId);
    if (!block) return fail("no_such_block", "Bloc de validation introuvable");
    if (r.verdict !== "agree" && r.verdict !== "correct") {
      fail("invalid_verdict", "Verdict attendu : agree ou correct");
    }
    const field = allowedTargets(form, block).find((f) => f.key === r.targetField);
    if (!field) return fail("field_not_reviewable", "Ce champ ne peut pas être relu");
    const [rec] =
      typeof r.targetSubmissionId === "string"
        ? await db
            .select()
            .from(t.contributionSubmissions)
            .where(
              and(
                eq(t.contributionSubmissions.problemId, problemId),
                eq(t.contributionSubmissions.id, r.targetSubmissionId),
              ),
            )
        : [];
    if (!rec) return fail("no_such_submission", "Contribution introuvable");
    if (rec.contributorId === userId) {
      fail("own_submission", "Vous ne pouvez pas relire votre propre contribution");
    }
    const k = targetKey(rec.id, field.key);
    if (done.has(k) || seen.has(k))
      fail("already_reviewed", "Vous avez déjà relu cette contribution");
    seen.add(k);

    let proposedValue: Answer | undefined;
    if (r.verdict === "correct") {
      const res = validateFieldValue({ ...field, required: true }, r.proposedValue);
      if (res.error !== undefined) return fail("invalid_proposal", res.error);
      if (normalizeValue(res.value) === normalizeValue(rec.answers[field.key])) {
        fail("no_change", "La correction est identique à la valeur existante");
      }
      proposedValue = res.value;
    }
    const comment = r.comment == null ? "" : String(r.comment).trim();
    if ([...comment].length > LIMITS.reviewComment) {
      fail("comment_too_long", `${LIMITS.reviewComment} caractères maximum`);
    }
    out.push({
      blockId: block.id,
      submissionId: rec.id,
      field: field.key,
      verdict: r.verdict as ReviewEvent["verdict"],
      ...(proposedValue !== undefined ? { proposedValue } : {}),
      comment,
    });
  }
  return out;
}

export async function recordReviews(
  tx: Tx,
  problemId: string,
  userId: string,
  formRevision: number,
  events: ReviewEvent[],
) {
  if (!events.length) return;
  await tx.insert(t.contributionReviews).values(
    events.map((e) => ({
      problemId,
      blockId: e.blockId,
      submissionId: e.submissionId,
      field: e.field,
      verdict: e.verdict,
      proposedValue: e.proposedValue ?? null,
      comment: e.comment,
      reviewerId: userId,
      formRevision,
    })),
  );
}

/** Vue de l'auteur : pour chaque (contribution, champ) relu, valeur d'origine, propositions, état. */
export async function reviewSummary(problemId: string, form: FormConfig | null) {
  const rows = await reviewsOf(problemId);
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.submissionId))];
  const records = new Map(
    (
      await db
        .select()
        .from(t.contributionSubmissions)
        .where(
          and(
            eq(t.contributionSubmissions.problemId, problemId),
            inArray(t.contributionSubmissions.id, ids),
          ),
        )
    ).map((r) => [r.id, r]),
  );
  const labels = new Map(deriveFields(form).map((f) => [f.key, f.label]));
  const signal = (field: string) => {
    const wanted = form
      ? reviewBlocks(form)
          .filter((b) => allowedTargets(form, b).some((f) => f.key === field))
          .map((b) => b.props.minAgreements ?? 2)
      : [];
    return wanted.length ? Math.min(...wanted) : 2;
  };

  type Proposal = {
    value: Answer;
    supporters: Set<string>;
    reviewIds: string[];
    comments: string[];
  };
  const groups = new Map<
    string,
    { submissionId: string; field: string; agree: Set<string>; proposals: Map<string, Proposal> }
  >();
  for (const r of rows) {
    const k = targetKey(r.submissionId, r.field);
    if (!groups.has(k)) {
      groups.set(k, {
        submissionId: r.submissionId,
        field: r.field,
        agree: new Set(),
        proposals: new Map(),
      });
    }
    const g = groups.get(k)!;
    const who = r.reviewerId ?? r.id;
    if (r.verdict === "agree") g.agree.add(who);
    else if (r.proposedValue != null) {
      const nk = normalizeValue(r.proposedValue);
      if (!g.proposals.has(nk)) {
        g.proposals.set(nk, {
          value: r.proposedValue,
          supporters: new Set(),
          reviewIds: [],
          comments: [],
        });
      }
      const p = g.proposals.get(nk)!;
      p.supporters.add(who);
      p.reviewIds.push(r.id);
      if (r.comment) p.comments.push(r.comment);
    }
  }
  return [...groups.values()].map((g) => {
    const min = signal(g.field);
    return {
      submissionId: g.submissionId,
      field: g.field,
      label: labels.get(g.field) ?? g.field,
      original: records.get(g.submissionId)?.answers?.[g.field] ?? null,
      minAgreements: min,
      confirmations: g.agree.size,
      proposals: [...g.proposals.values()].map((p) => ({
        value: p.value,
        supporters: p.supporters.size,
        reachedAgreement: p.supporters.size >= min,
        reviewId: p.reviewIds[0],
        comments: p.comments,
      })),
    };
  });
}
