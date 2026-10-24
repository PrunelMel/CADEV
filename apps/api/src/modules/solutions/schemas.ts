import { z } from "zod";

export const repoRef = z
  .string()
  .regex(/^[^/\s]+\/[^/\s]+$/, "Format attendu : proprietaire/nom")
  .transform((v) => {
    const [owner, name] = v.split("/");
    return { owner, name };
  });

export const submitSolution = z.object({
  repo: repoRef,
  summary: z.string().min(10).max(5000),
  fieldResults: z.string().max(20_000).default(""),
});
export type SubmitSolution = z.infer<typeof submitSolution>;

export const idParams = z.object({ id: z.uuid() });
