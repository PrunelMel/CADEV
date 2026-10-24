import { z } from "zod";
import { slug } from "../../lib/validate.js";

export const createOrg = z.object({
  slug,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).default(""),
});
export type CreateOrg = z.infer<typeof createOrg>;

export const orgParams = z.object({ slug: z.string() });
export const memberParams = orgParams.extend({ username: z.string() });

export const addMember = z.object({
  username: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
});
export type AddMember = z.infer<typeof addMember>;
