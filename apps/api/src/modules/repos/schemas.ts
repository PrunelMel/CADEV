import { z } from "zod";
import { filePath } from "../../lib/validate.js";

export const repoType = z.enum(["model", "dataset", "library"]);

const meta = {
  visibility: z.enum(["public", "private"]),
  licenseId: z.string().min(1),
  description: z.string().max(500),
  readme: z.string().max(100_000),
  limitations: z.string().max(20_000),
  provenanceCommunity: z.string().max(200).nullable(),
  provenanceCountry: z.string().max(100).nullable(),
  task: z.string().max(200),
  languages: z.array(z.string().trim().min(1).max(50)).max(20),
  worksOffline: z.boolean(),
  targetHardware: z.string().max(300),
};

export const createRepo = z.object({
  type: repoType,
  name: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/, "Nom de dépôt invalide"),
  org: z.string().optional(),
  visibility: meta.visibility.default("public"),
  licenseId: meta.licenseId,
  description: meta.description.default(""),
  readme: meta.readme.default(""),
  limitations: meta.limitations.default(""),
  provenanceCommunity: meta.provenanceCommunity.default(null),
  provenanceCountry: meta.provenanceCountry.default(null),
  task: meta.task.default(""),
  languages: meta.languages.default([]),
  worksOffline: meta.worksOffline.default(false),
  targetHardware: meta.targetHardware.default(""),
});
export type CreateRepo = z.infer<typeof createRepo>;

export const updateRepo = z.object(meta).partial();
export type UpdateRepo = z.infer<typeof updateRepo>;

export const listQuery = z.object({
  type: repoType.optional(),
  q: z.string().max(200).optional(),
  /** "true" pour ne garder que les ressources utilisables sans connexion. */
  offline: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  language: z.string().trim().max(50).optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

export const repoParams = z.object({ owner: z.string(), name: z.string() });
export const fileParams = repoParams.extend({ path: filePath });
export const collaboratorParams = repoParams.extend({ username: z.string() });
export const pullParams = repoParams.extend({
  number: z.coerce.number().int().positive(),
});
export const pullFileParams = pullParams.extend({ path: filePath });

export const versionQuery = z.object({
  version: z.coerce.number().int().positive().optional(),
});
export const commitQuery = z.object({
  message: z.string().max(500).default(""),
});

export const addCollaborator = z.object({ username: z.string().min(1) });

export const createPull = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20_000).default(""),
});
export type CreatePull = z.infer<typeof createPull>;
