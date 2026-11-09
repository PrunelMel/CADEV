import { Router, json, type Request } from "express";
import { AppError } from "../../../lib/errors.js";
import { parse } from "../../../lib/validate.js";
import { requireUser } from "../../../middleware/session.js";
import { storage } from "../../../storage/index.js";
import { deriveFields } from "./model/formModel.js";
import { nextToReview, reviewSummary } from "./reviews.js";
import {
  codeInput,
  formBody,
  frameQuery,
  kindQuery,
  problemParams,
  resourceParams,
  reviewQueueQuery,
  storageInput,
  submissionInput,
  uploadQuery,
} from "./schemas.js";
import * as service from "./service.js";
import { listTree } from "./tree.js";
import { CONTENT_TYPES } from "./views.js";

/** Page-formulaire de contribution d'un problème : conception (auteur) et contributions. */
export const contributionFormRouter = Router();
const base = "/problems/:id/contribution";

// Le code importé par l'auteur s'exécute chez les contributeurs : il est servi avec une politique
// qui l'enferme (origine opaque, aucun réseau, aucun accès aux cookies ni à l'API).
const CODE_FRAME_CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const ctx = (req: Request) =>
  service.access(parse(problemParams, req.params).id, req.user?.id ?? null);

async function creator(req: Request) {
  const a = await ctx(req);
  service.assertCreator(a);
  return a;
}

/** Limiteur à fenêtre fixe, en mémoire : 30 envois par 10 minutes et par contributeur. */
const hits = new Map<string, { count: number; reset: number }>();
function rateLimit(userId: string) {
  const now = Date.now();
  let h = hits.get(userId);
  if (!h || now >= h.reset) {
    h = { count: 0, reset: now + 10 * 60 * 1000 };
    hits.set(userId, h);
  }
  h.count += 1;
  if (hits.size > 10_000) for (const [k, v] of hits) if (now >= v.reset) hits.delete(k);
  if (h.count > 30) {
    throw new AppError(
      429,
      "rate_limited",
      "Trop de contributions envoyées, réessayez dans quelques minutes",
    );
  }
}

/* ---------- Formulaire ---------- */

/** Version publiée : ce que voit le contributeur. */
contributionFormRouter.get(`${base}/form`, async (req, res) => {
  const a = await ctx(req);
  const form = await service.getPublished(a.problem.id);
  if (!form)
    throw new AppError(404, "not_published", "Ce problème n’accepte pas encore de contributions");
  res.json({ form, problemStatus: a.problem.status });
});

contributionFormRouter.get(`${base}/form/draft`, async (req, res) => {
  res.json(await service.getDraft(await creator(req)));
});

contributionFormRouter.put(`${base}/form/draft`, async (req, res) => {
  const a = await creator(req);
  const form = await service.saveDraft(a, parse(formBody, req.body));
  res.json({ form, savedAt: new Date().toISOString() });
});

contributionFormRouter.post(`${base}/form/publish`, async (req, res) => {
  res.status(201).json({ form: await service.publish(await creator(req)) });
});

contributionFormRouter.get(`${base}/fields`, async (req, res) => {
  res.json(await service.fields(await creator(req)));
});

contributionFormRouter.put(`${base}/storage`, async (req, res) => {
  const a = await creator(req);
  res.json(await service.setStorage(a, parse(storageInput, req.body)));
});

contributionFormRouter.get(`${base}/tree`, async (req, res) => {
  const a = await creator(req);
  res.json({ tree: await listTree(a.problem.id) });
});

/* ---------- Mode « code » ---------- */

// Corps propre à cette route : une page de 1 Mo dépasse la limite JSON générale une fois encodée.
contributionFormRouter.put(`${base}/form/code`, json({ limit: "1200kb" }), async (req, res) => {
  const a = await creator(req);
  await service.saveCode(a, parse(codeInput, req.body).html);
  res.status(204).end();
});

contributionFormRouter.get(`${base}/form/code/frame`, async (req, res) => {
  const a = await ctx(req);
  const { draft } = parse(frameQuery, req.query);
  if (draft) service.assertCreator(a);
  const html = await service.readCode(a.problem.id, !draft);
  if (html == null) throw new AppError(404, "no_code", "Aucun code importé");
  res
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CODE_FRAME_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    })
    .send(html);
});

/* ---------- Ressources (médias) ---------- */

contributionFormRouter.get(`${base}/resources`, async (req, res) => {
  const a = await creator(req);
  res.json({ resources: await service.listResources(a, parse(kindQuery, req.query).kind) });
});

/** Corps brut (le fichier), nom et type attendu en paramètres : pas de multipart. */
contributionFormRouter.post(`${base}/resources`, async (req, res) => {
  const a = await creator(req);
  const { kind, name } = parse(uploadQuery, req.query);
  const length = Number(req.headers["content-length"]) || undefined;
  const out = await service.addResource(a, req, { name, kindHint: kind, length });
  res.status(out.duplicate ? 200 : 201).json(out);
});

contributionFormRouter.delete(`${base}/resources/:rid`, async (req, res) => {
  const a = await creator(req);
  await service.removeResource(a, parse(resourceParams, req.params).rid);
  res.status(204).end();
});

/** Fichier média, avec les requêtes partielles (avance rapide dans un audio ou une vidéo). */
contributionFormRouter.get(`${base}/resources/:rid/file`, async (req, res) => {
  const a = await ctx(req);
  const { entry, visible } = await service.resourceToServe(
    a,
    parse(resourceParams, req.params).rid,
  );
  res.set({
    "Content-Type": entry.mime,
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": visible ? "public, max-age=31536000, immutable" : "private, no-store",
  });
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const size = entry.size;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      res.status(416).set("Content-Range", `bytes */${size}`).end();
      return;
    }
    res.status(206).set({
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    });
    (await storage.getRange(entry.storageKey, start, end - start + 1)).pipe(res);
    return;
  }
  res.set("Content-Length", String(entry.size));
  (await storage.get(entry.storageKey)).pipe(res);
});

/* ---------- Contributions ---------- */

contributionFormRouter.post(`${base}/submissions`, async (req, res) => {
  const user = requireUser(req);
  const a = await ctx(req);
  rateLimit(user.id);
  const result = await service.submit(a, user.id, parse(submissionInput, req.body));
  res.status(result.duplicate ? 200 : 201).json(result);
});

contributionFormRouter.get(`${base}/review-queue`, async (req, res) => {
  const user = requireUser(req);
  const a = await ctx(req);
  const form = await service.getPublished(a.problem.id);
  if (!form)
    throw new AppError(404, "not_published", "Ce problème n’accepte pas encore de contributions");
  const { blockId } = parse(reviewQueueQuery, req.query);
  res.json({ item: await nextToReview(a.problem.id, form, user.id, blockId) });
});

contributionFormRouter.get(`${base}/stats`, async (req, res) => {
  const a = await creator(req);
  res.json(await service.stats(a.problem.id));
});

contributionFormRouter.get(`${base}/submissions/export`, async (req, res) => {
  const a = await creator(req);
  const { key, format } = await service.exportFile(a);
  res.set({
    "Content-Type": CONTENT_TYPES[format],
    "Content-Disposition": `attachment; filename="contributions-${a.problem.id}.${format}"`,
  });
  (await storage.get(key)).pipe(res);
});

contributionFormRouter.get(`${base}/reviews`, async (req, res) => {
  const a = await creator(req);
  const form = await service.getPublished(a.problem.id);
  res.json({ reviews: await reviewSummary(a.problem.id, form) });
});

contributionFormRouter.get(`${base}/summary`, async (req, res) => {
  const a = await ctx(req);
  const form = await service.getPublished(a.problem.id);
  const s = await service.stats(a.problem.id);
  res.json({
    published: !!form,
    title: form?.title ?? null,
    fields: form ? deriveFields(form).filter((f) => f.kind === "value").length : 0,
    submissions: s.submissions,
  });
});
