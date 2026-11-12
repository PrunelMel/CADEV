import { createAuthClient } from "better-auth/react";
import { emailOTPClient, twoFactorClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  // La deuxième étape (code par e-mail) est gérée par le formulaire de connexion lui-même.
  plugins: [usernameClient(), emailOTPClient(), twoFactorClient()],
});

export const useSession = authClient.useSession;
