import { z } from "zod";

export const createProblem = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(20_000),
  sector: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  connectivityConstraint: z.string().max(1000).default(""),
  hardwareConstraint: z.string().max(1000).default(""),
  languageConstraint: z.string().max(1000).default(""),
  evaluationCriteria: z.string().min(10).max(10_000),
});
export type CreateProblem = z.infer<typeof createProblem>;

export const listQuery = z.object({
  sector: z.string().optional(),
  country: z.string().optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

export const problemParams = z.object({ id: z.uuid() });
