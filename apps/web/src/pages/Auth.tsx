import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../api/auth";
import { Button, ErrorText, Field, Input, formValues } from "../components/ui";

function useAuthForm(
  run: (v: Record<string, string>) => Promise<{ error: { message?: string } | null }>,
) {
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await run(formValues(e.currentTarget));
    setPending(false);
    if (error) setError(new Error(error.message ?? "Échec"));
    else navigate("/");
  }
  return { onSubmit, error, pending };
}

export function SignIn() {
  const form = useAuthForm((v) =>
    v.login.includes("@")
      ? authClient.signIn.email({ email: v.login, password: v.password })
      : authClient.signIn.username({ username: v.login, password: v.password }),
  );
  return (
    <form onSubmit={form.onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Connexion</h1>
      <Field label="Email ou nom d'utilisateur">
        <Input name="login" required autoComplete="username" />
      </Field>
      <Field label="Mot de passe">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>
      <ErrorText error={form.error} />
      <Button disabled={form.pending}>Se connecter</Button>
      <p className="text-sm">
        Pas de compte ?{" "}
        <Link to="/inscription" className="underline">
          Inscription
        </Link>
      </p>
    </form>
  );
}

export function SignUp() {
  const form = useAuthForm((v) =>
    authClient.signUp.email({
      email: v.email,
      password: v.password,
      name: v.name,
      username: v.username,
    }),
  );
  return (
    <form onSubmit={form.onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Inscription</h1>
      <Field label="Nom affiché">
        <Input name="name" required />
      </Field>
      <Field label="Nom d'utilisateur" hint="Apparaît dans l'adresse de vos dépôts.">
        <Input name="username" required pattern="[a-zA-Z0-9_.]{3,30}" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Mot de passe" hint="8 caractères minimum.">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <ErrorText error={form.error} />
      <Button disabled={form.pending}>Créer le compte</Button>
    </form>
  );
}
