import { z } from "zod";

export const userParams = z.object({ username: z.string().min(1).max(50) });
