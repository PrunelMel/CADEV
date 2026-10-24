import { z } from "zod";
import { AppError } from "./errors.js";

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      400,
      "validation_error",
      "Données invalides",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return result.data;
}

/** Chemin de fichier dans un dépôt, reçu via un paramètre wildcard Express 5. */
export const filePath = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v.join("/") : v))
  .pipe(
    z
      .string()
      .min(1)
      .max(500)
      .refine((p) => !p.split("/").some((s) => s === "" || s === "." || s === ".."), {
        message: "Chemin invalide",
      }),
  );

export const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,38}$/, "Minuscules, chiffres et tirets, 2 à 39 caractères");
