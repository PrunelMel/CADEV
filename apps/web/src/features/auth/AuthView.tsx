/**
 * Connexion et inscription, charte « Liquid Glass » : une carte de verre centrée sur le fond
 * marine à l'Afrique en points, avec une bascule Connexion / Inscription. Après succès, retour à
 * la page d'origine (`?suite=`) si elle est interne, sinon au tableau de bord.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { authClient, useSession } from "../../api/auth";
import { Backdrop } from "../../components/glass/formKit";
import { DISPLAY, Glass, INK, INK2, INK3, SOFT_SPRING } from "../../components/glass/Glass";
import { FIELD, GlassButton, Labelled } from "../../components/glass/sections";
import "../../components/glass/glass.css";
import { authErrorFallback, authErrors } from "../../content/auth";
import { usePageTitle } from "../../hooks/usePageTitle";

type Mode = "connexion" | "inscription";
type Result = { error: { code?: string; message?: string } | null };

export function AuthView({ mode }: { mode: Mode }) {
  usePageTitle(mode === "connexion" ? "Connexion" : "Inscription");
  const navigate = useNavigate();
  const { refetch } = useSession();
  const [params] = useSearchParams();
  const next = params.get("suite");
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/tableau-de-bord";
  // La page d'origine suit l'utilisateur quand il bascule entre connexion et inscription.
  const suffix = next ? `?suite=${encodeURIComponent(next)}` : "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setPending(true);
    setError(null);
    const { error }: Result =
      mode === "connexion"
        ? v.login.includes("@")
          ? await authClient.signIn.email({ email: v.login, password: v.password })
          : await authClient.signIn.username({ username: v.login, password: v.password })
        : await authClient.signUp.email({
            email: v.email,
            password: v.password,
            name: v.name,
            username: v.username,
          });
    setPending(false);
    if (error) setError((error.code && authErrors[error.code]) || authErrorFallback);
    else {
      // La session doit être à jour avant d'atteindre une page réservée aux membres.
      await refetch();
      navigate(target);
    }
  }

  return (
    <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
      <Backdrop />
      <main className="grid min-h-dvh place-items-center px-4 pt-[92px] pb-10">
        <Glass
          as={motion.form}
          onSubmit={submit}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SOFT_SPRING}
          variant="lg-strong"
          aria-labelledby="auth-title"
          className="w-full max-w-[440px] space-y-6 rounded-[30px] p-6 sm:p-8"
        >
          <div
            role="tablist"
            aria-label="Compte"
            className="flex rounded-full bg-[color:var(--chip)] p-1"
          >
            {(["connexion", "inscription"] as const).map((m) => {
              const on = mode === m;
              return (
                <Link
                  key={m}
                  to={`/${m}${suffix}`}
                  replace
                  role="tab"
                  aria-selected={on}
                  className={`relative flex h-10 flex-1 items-center justify-center rounded-full text-[14.5px] font-semibold ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
                >
                  {on && (
                    <motion.span
                      layoutId="auth-lens"
                      className="pp-lens absolute inset-0 rounded-full"
                      transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    />
                  )}
                  <span className="relative">
                    {m === "connexion" ? "Connexion" : "Inscription"}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-2">
            <h1 id="auth-title" className={`text-[44px] leading-none ${DISPLAY} ${INK}`}>
              {mode === "connexion" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className={`text-[14.5px] leading-snug ${INK2}`}>
              {mode === "connexion"
                ? "Retrouvez vos problèmes, vos dépôts et vos contributions."
                : "Publiez des problèmes, partagez vos dépôts et contribuez aux données."}
            </p>
          </div>

          {/* Une clé par mode : les champs se vident en changeant de formulaire. */}
          <div key={mode} className="space-y-4">
            {mode === "connexion" ? (
              <>
                <Field label="Email ou nom d’utilisateur">
                  <input
                    name="login"
                    required
                    autoComplete="username"
                    autoFocus
                    className={`${FIELD} h-12 ${INK}`}
                  />
                </Field>
                <Password autoComplete="current-password" />
              </>
            ) : (
              <>
                <Field label="Nom affiché">
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    autoFocus
                    className={`${FIELD} h-12 ${INK}`}
                  />
                </Field>
                <Field
                  label="Nom d’utilisateur"
                  hint="Il apparaît dans l’adresse de vos dépôts. 3 à 30 lettres, chiffres, points ou tirets bas."
                >
                  <input
                    name="username"
                    required
                    pattern="[a-zA-Z0-9_.]{3,30}"
                    autoComplete="username"
                    className={`${FIELD} h-12 ${INK}`}
                  />
                </Field>
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={`${FIELD} h-12 ${INK}`}
                  />
                </Field>
                <Password autoComplete="new-password" hint="8 caractères minimum." />
              </>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-[16px] px-4 py-3 text-[14px] leading-snug"
              style={{ color: "var(--danger)", background: "rgba(248,113,113,.1)" }}
            >
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <GlassButton primary disabled={pending} className="h-12 w-full text-[15px]">
            {pending
              ? mode === "connexion"
                ? "Connexion…"
                : "Création du compte…"
              : mode === "connexion"
                ? "Se connecter"
                : "Créer le compte"}
            {!pending && <ArrowRight size={17} strokeWidth={2.4} />}
          </GlassButton>
          <p className={`text-center text-[13.5px] ${INK3}`}>
            {mode === "connexion" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
            <Link
              to={`/${mode === "connexion" ? "inscription" : "connexion"}${suffix}`}
              replace
              className="font-semibold text-[color:var(--accent-text)] underline"
            >
              {mode === "connexion" ? "Inscription" : "Connexion"}
            </Link>
          </p>
        </Glass>
      </main>
    </div>
  );
}

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <Labelled label={label} hint={hint}>
    {children}
  </Labelled>
);

/** Mot de passe avec bouton pour l'afficher en clair. */
function Password({ autoComplete, hint }: { autoComplete: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label="Mot de passe" hint={hint}>
      <span className="relative block">
        <input
          name="password"
          type={shown ? "text" : "password"}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
          autoComplete={autoComplete}
          className={`${FIELD} h-12 pr-12 ${INK}`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={shown}
          className={`absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full hover:bg-[color:var(--accent-soft)] ${INK2}`}
        >
          {shown ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </Field>
  );
}
