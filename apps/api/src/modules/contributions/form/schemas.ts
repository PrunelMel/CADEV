import { z } from "zod";
import { MEDIA_KINDS, STORAGE_FORMATS } from "./model/blockTypes.js";
import { BLOCK_ID_RE, RESOURCE_ID_RE } from "./model/formModel.js";

export const problemParams = z.object({ id: z.uuid() });
export const resourceParams = problemParams.extend({ rid: z.string().regex(RESOURCE_ID_RE) });

/** La structure détaillée est validée par le modèle partagé (validateConfig), comme côté front. */
export const formBody = z.record(z.string(), z.unknown());

export const storageInput = z.object({
  format: z.enum(STORAGE_FORMATS),
  includeContributor: z.boolean().optional(),
});
export type StorageInput = z.infer<typeof storageInput>;

export const codeInput = z.object({ html: z.string().min(1).max(1_100_000) });

export const kindQuery = z.object({ kind: z.enum(MEDIA_KINDS).optional() });
export const uploadQuery = z.object({
  kind: z.enum(MEDIA_KINDS).optional(),
  name: z.string().trim().max(200).default("fichier"),
});
export const frameQuery = z.object({ draft: z.literal("1").optional() });
export const reviewQueueQuery = z.object({ blockId: z.string().regex(BLOCK_ID_RE) });

export const submissionInput = z.object({
  submissionId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{8,64}$/, "8 à 64 caractères : lettres, chiffres, - et _"),
  formRevision: z.number().int().nullable().optional(),
  // Les valeurs sont validées par le modèle partagé contre le formulaire publié.
  answers: z.record(z.string(), z.unknown()).default({}),
  reviews: z.array(z.unknown()).optional(),
});
export type SubmissionInput = z.infer<typeof submissionInput>;
