import { z } from "zod";

export const markRead = z.object({ ids: z.array(z.uuid()).max(200).optional() });
