/**
 * Connexion et inscription, charte « Liquid Glass » : une carte de verre centrée sur le fond
 * marine à l'Afrique en points, avec une bascule Connexion / Inscription. Un code envoyé par
 * e-mail confirme l'adresse à l'inscription et termine chaque connexion (deuxième étape, dans la
 * même carte). Après succès, retour à la page d'origine (`?suite=`) si elle est interne, sinon au
 * tableau de bord.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck, TriangleAlert } from "lucide-react";
import { authClient, useSession } from "../../api/auth";
import { Backdrop } from "../../components/glass/formKit";
import { DISPLAY, Glass, INK, INK2, INK3, SOFT_SPRING } from "../../components/glass/Glass";
import { FIELD, GlassButton, Labelled } from "../../components/glass/sections";
import "../../components/glass/glass.css";
import { authErrorFallback, authErrors } from "../../content/auth";
import { usePageTitle } from "../../hooks/usePageTitle";

type Mode = "connexion" | "inscription";
type AuthError = { code?: string; message?: string } | null;
/** Deuxième étape : confirmer l'adresse (inscription) ou terminer la connexion. */
type Step = { kind: "adresse"; email: string } | { kind: "connexion" };

const messageOf = (error: AuthError) =>
  (error?.code && authErrors[error.code]) || authErrorFallback;

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
  const [step, setStep] = useState<Step | null>(null);

  // La session doit être à jour avant d'atteindre une page réservée aux membres.
  const done = async () => {
    await refetch();
    navigate(target);
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setPending(true);
    setError(null);
    if (mode === "inscription") {
      const { error } = await authClient.signUp.email({
        email: v.email,
        password: v.password,
        name: v.name,
        username: v.username,
      });
      setPending(false);
      if (error) setError(messageOf(error));
      else setStep({ kind: "adresse", email: v.email });
      return;
    }
    const { data, error } = v.login.includes("@")
      ? await authClient.signIn.email({ email: v.login, password: v.password })
      : await authClient.signIn.username({ username: v.login, password: v.password });
    if (error?.code === "EMAIL_NOT_VERIFIED" && v.login.includes("@")) {
      // Adresse jamais confirmée : le serveur vient d'envoyer un nouveau code.
      setPending(false);
      setStep({ kind: "adresse", email: v.login });
      return;
    }
    if (error) {
      setPending(false);
      setError(messageOf(error));
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      const sent = await authClient.twoFactor.sendOtp();
      setPending(false);
      if (sent.error) setError(messageOf(sent.error));
      else setStep({ kind: "connexion" });
      return;
    }
    setPending(false);
    await done();
  }

  if (step) {
    return (
      <Page>
        <CodeStep
          step={step}
          onBack={() => {
            setStep(null);
            setError(null);
          }}
          onDone={done}
        />
      </Page>
    );
  }

  return (
    <Page>
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
                <span className="relative">{m === "connexion" ? "Connexion" : "Inscription"}</span>
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

        {error && <Alert>{error}</Alert>}
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
    </Page>
  );
}

/** Fond de la charte et carte centrée sous l'en-tête. */
function Page({ children }: { children: ReactNode }) {
  return (
    <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
      <Backdrop />
      <main className="grid min-h-dvh place-items-center px-4 pt-[92px] pb-10">{children}</main>
    </div>
  );
}

/**
 * Deuxième étape : le code à 6 chiffres envoyé par e-mail. Il confirme l'adresse (inscription,
 * puis ouvre la session) ou termine la connexion. On peut demander un nouveau code.
 */
function CodeStep({
  step,
  onBack,
  onDone,
}: {
  step: Step;
  onBack: () => void;
  onDone: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } =
      step.kind === "adresse"
        ? await authClient.emailOtp.verifyEmail({ email: step.email, otp: code })
        : await authClient.twoFactor.verifyOtp({ code });
    setPending(false);
    if (error) setError(messageOf(error));
    else await onDone();
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const { error } =
      step.kind === "adresse"
        ? await authClient.emailOtp.sendVerificationOtp({
            email: step.email,
            type: "email-verification",
          })
        : await authClient.twoFactor.sendOtp();
    if (error) setError(messageOf(error));
    else setNotice("Nouveau code envoyé.");
  }

  return (
    <Glass
      as={motion.form}
      onSubmit={verify}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SOFT_SPRING}
      variant="lg-strong"
      aria-labelledby="code-title"
      className="w-full max-w-[440px] space-y-6 rounded-[30px] p-6 sm:p-8"
    >
      <span className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
        <MailCheck size={22} />
      </span>
      <div className="space-y-2">
        <h1 id="code-title" className={`text-[44px] leading-none ${DISPLAY} ${INK}`}>
          {step.kind === "adresse" ? "Confirmez votre adresse" : "Code de connexion"}
        </h1>
        <p className={`text-[14.5px] leading-snug ${INK2}`}>
          Entrez le code à 6 chiffres envoyé{" "}
          {step.kind === "adresse" ? (
            <>
              à <b className={`font-semibold ${INK}`}>{step.email}</b>
            </>
          ) : (
            "à l’adresse e-mail de votre compte"
          )}
          . Il est valable 10 minutes.
        </p>
      </div>
      <Field label="Code">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          autoFocus
          className={`${FIELD} h-14 text-center font-[family-name:var(--font-mono)] text-[26px] tracking-[0.5em] ${INK}`}
        />
      </Field>
      {error && <Alert>{error}</Alert>}
      {notice && <p className="px-1 text-[14px] text-[color:var(--ok)]">{notice}</p>}
      <GlassButton
        primary
        disabled={pending || code.length !== 6}
        className="h-12 w-full text-[15px]"
      >
        {pending ? "Vérification…" : "Valider"}
        {!pending && <ArrowRight size={17} strokeWidth={2.4} />}
      </GlassButton>
      <div className={`flex items-center justify-between text-[13.5px] ${INK3}`}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 hover:underline"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <button
          type="button"
          onClick={resend}
          className="font-semibold text-[color:var(--accent-text)] underline"
        >
          Renvoyer le code
        </button>
      </div>
    </Glass>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-[16px] px-4 py-3 text-[14px] leading-snug"
      style={{ color: "var(--danger)", background: "rgba(248,113,113,.1)" }}
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
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
