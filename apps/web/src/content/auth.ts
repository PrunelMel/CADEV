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
};

export const authErrorFallback = "La demande a échoué. Vérifiez vos informations et réessayez.";
