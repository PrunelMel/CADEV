// Messages des erreurs de connexion et d'inscription, par code d'erreur de better-auth.
// Un code absent d'ici affiche le message générique.

export const authErrors: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Nom d’utilisateur ou mot de passe incorrect.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_EMAIL: "Cette adresse email n’est pas valide.",
  INVALID_USERNAME:
    "Nom d’utilisateur non valide : 3 à 30 lettres, chiffres, points ou tirets bas.",
  USERNAME_TOO_SHORT: "Nom d’utilisateur trop court : 3 caractères minimum.",
  USERNAME_TOO_LONG: "Nom d’utilisateur trop long : 30 caractères maximum.",
  USERNAME_IS_ALREADY_TAKEN: "Ce nom d’utilisateur est déjà pris.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse email.",
  PASSWORD_TOO_SHORT: "Mot de passe trop court : 8 caractères minimum.",
  PASSWORD_TOO_LONG: "Mot de passe trop long.",
  EMAIL_NOT_VERIFIED:
    "Adresse e-mail non confirmée : connectez-vous avec votre adresse e-mail pour recevoir un nouveau code.",
  INVALID_OTP: "Code incorrect.",
  INVALID_CODE: "Code incorrect.",
  OTP_EXPIRED: "Ce code a expiré : demandez-en un nouveau.",
  OTP_HAS_EXPIRED: "Ce code a expiré : demandez-en un nouveau.",
  ACCOUNT_TEMPORARILY_LOCKED:
    "Trop d’essais : compte bloqué quelques minutes, réessayez plus tard.",
  TOO_MANY_ATTEMPTS: "Trop d’essais : demandez un nouveau code.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Trop d’essais : demandez un nouveau code.",
  INVALID_TWO_FACTOR_COOKIE: "La vérification a expiré : reconnectez-vous.",
};

export const authErrorFallback = "La demande a échoué. Vérifiez vos informations et réessayez.";
