import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { emailOTP, twoFactor, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { env } from "../env.js";
import { sendCode } from "../lib/mail.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  // Un code envoyé par e-mail confirme l'adresse à l'inscription, puis termine chaque connexion.
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: { sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: true },
  plugins: [
    username(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      expiresIn: 600,
      sendVerificationOTP: ({ email, otp }) => sendCode(email, otp, "inscription"),
    }),
    twoFactor({
      totpOptions: { disable: true },
      otpOptions: {
        period: 10,
        sendOTP: ({ user, otp }) => sendCode(user.email, otp, "connexion"),
      },
    }),
  ],
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
          // Le code par e-mail à la connexion vaut pour tout nouveau compte.
          return { data: { ...user, twoFactorEnabled: true } };
        },
      },
    },
  },
});
