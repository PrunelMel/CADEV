import { AuthView } from "../features/auth/AuthView";

export function SignIn() {
  return <AuthView mode="connexion" />;
}

export function SignUp() {
  return <AuthView mode="inscription" />;
}
