import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { env } from "../env.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  emailAndPassword: { enabled: true },
  plugins: [username()],
  databaseHooks: {
    user: {
      create: {
        // Un nom d'utilisateur et un slug d'organisation partagent le même espace d'URL.
        before: async (user) => {
          const name = typeof user.username === "string" ? user.username : null;
          if (!name) return;
          const [org] = await db
            .select({ id: schema.organizations.id })
            .from(schema.organizations)
            .where(eq(schema.organizations.slug, name));
          if (org) throw new APIError("BAD_REQUEST", { message: "Nom d'utilisateur déjà pris" });
        },
      },
    },
  },
});
