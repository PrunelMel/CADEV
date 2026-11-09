import { z } from "zod";

export const repoRef = z
  .string()
  .regex(/^[^/\s]+\/[^/\s]+$/, "Format attendu : proprietaire/nom")
  .transform((v) => {
    const [owner, name] = v.split("/");
    return { owner, name };
  });

/** Solution mise en avant par l'auteur du problème ; `null` rend la main à la communauté. */
export const setFeatured = z.object({ repo: repoRef.nullable() });
export type SetFeatured = z.infer<typeof setFeatured>;

export const idParams = z.object({ id: z.uuid() });
