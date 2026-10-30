import { z } from "zod";

const fields = {
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(20_000),
  sector: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  connectivityConstraint: z.string().max(1000),
  hardwareConstraint: z.string().max(1000),
  languageConstraint: z.string().max(1000),
  evaluationCriteria: z.string().min(10).max(10_000),
};

export const problemStatus = z.enum(["open", "solved", "closed"]);

export const createProblem = z.object({
  ...fields,
  connectivityConstraint: fields.connectivityConstraint.default(""),
  hardwareConstraint: fields.hardwareConstraint.default(""),
  languageConstraint: fields.languageConstraint.default(""),
});
export type CreateProblem = z.infer<typeof createProblem>;

/** L'auteur peut tout modifier, y compris le statut. */
export const updateProblem = z.object({ ...fields, status: problemStatus }).partial();
export type UpdateProblem = z.infer<typeof updateProblem>;

export const listQuery = z.object({
  sector: z.string().optional(),
  country: z.string().optional(),
  status: problemStatus.optional(),
  q: z.string().trim().max(200).optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

export const problemParams = z.object({ id: z.uuid() });

export const declareWork = z.object({ note: z.string().trim().max(500).default("") });
export type DeclareWork = z.infer<typeof declareWork>;
