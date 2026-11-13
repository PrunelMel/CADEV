import { z } from "zod";

export const userParams = z.object({ username: z.string().min(1).max(50) });

/** Corriger l'adresse d'une inscription pas encore confirmée (mot de passe de l'inscription requis). */
export const pendingEmail = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  newEmail: z.email().max(254),
});
