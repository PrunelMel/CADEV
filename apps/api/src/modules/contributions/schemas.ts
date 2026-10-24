import { z } from "zod";
import { repoRef } from "../solutions/schemas.js";

export const createContribution = z.object({
  description: z.string().min(10).max(10_000),
  provenanceCommunity: z.string().min(1).max(200),
  provenanceCountry: z.string().min(1).max(100),
  dataset: repoRef.optional(),
});
export type CreateContribution = z.infer<typeof createContribution>;

export const idParams = z.object({ id: z.uuid() });
