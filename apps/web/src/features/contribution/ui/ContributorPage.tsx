// Page du contributeur : « Contribuer » sur un problème → le formulaire publié se charge, on le
// remplit, on valide, la réponse est enregistrée dans le format choisi par l'auteur, un message de
// remerciement s'affiche.
//
// Une seule colonne centrée ; la barre d'envoi reste visible en bas pendant le défilement et montre
// la progression. Un envoi invalide secoue la barre et place le focus sur le premier champ à corriger.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Send, TriangleAlert, X } from "lucide-react";
import { ApiError } from "../../../api/client";
import { contributionUrls } from "../../../api/contribution";
import { submitMessage, useContribution } from "../state/useContribution";
import { CenterCard } from "./DesignerParts";
import { AccentTitle, FormRenderer } from "./FormRenderer";
import {
  ACCENT_TEXT,
  CTA_FILL,
  Glass,
  INK2,
  INK3,
  MONO,
  PageShell,
  PENDING_FILL,
  ProgressRing,
  SOFT_BTN,
  SuccessModal,
} from "./kit";
import { SandboxedFormFrame } from "./SandboxedFormFrame";

function loadMessage(e: unknown) {
  if (!(e instanceof ApiError))
    return "Connexion impossible. Vérifiez votre réseau, puis réessayez.";
  if (e.code === "not_published")
    return "Ce problème n’accepte pas encore de contributions. Revenez bientôt.";
  return e.message;
}

function focusBlock(blockId: string) {
  const box = document.querySelector(`[data-block="${blockId}"]`);
  if (!box) return;
  box.scrollIntoView({
    block: "center",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  box.querySelector<HTMLElement>("input,select,textarea,button")?.focus({ preventScroll: true });
}

export function ContributorPage({
  problemId,
  problemTitle,
}: {
  problemId: string;
  problemTitle: string;
}) {
  const urls = useMemo(() => contributionUrls(problemId), [problemId]);
  const c = useContribution(problemId);
  const navigate = useNavigate();
  const back = () => navigate(`/problemes/${problemId}`);
  const bar = useRef<HTMLElement>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!shake || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const f = (x: number) => ({ transform: `translateX(${x}px)` });
    bar.current?.animate?.([f(0), f(-7), f(6), f(-4), f(3), f(0)], {
      duration: 450,
      easing: "ease",
    });
  }, [shake]);

  const backLink = (
    <Link
      to={`/problemes/${problemId}`}
      className={`mb-3 flex max-w-full items-center gap-1.5 truncate px-1 text-[11px] ${MONO} ${INK3} hover:text-[color:var(--accent-text)]`}
    >
      <ArrowLeft size={13} className="shrink-0" />
      <span className="truncate">{problemTitle}</span>
    </Link>
  );

  if (c.status === "loading") {
    return (
      <PageShell mainClassName="grid">
        <CenterCard busy title="Chargement du formulaire">
          Un instant…
        </CenterCard>
      </PageShell>
    );
  }
  if (c.status === "error" || !c.form) {
    return (
      <PageShell mainClassName="grid">
        <CenterCard
          tone="error"
          title="Formulaire indisponible"
          action={{ label: "Retour au problème", onClick: back }}
        >
          {loadMessage(c.loadError)}
        </CenterCard>
      </PageShell>
    );
  }
  if (c.closed) {
    return (
      <PageShell mainClassName="grid">
        <CenterCard title="Problème fermé" action={{ label: "Retour au problème", onClick: back }}>
          Ce problème n’accepte plus de contributions.
        </CenterCard>
      </PageShell>
    );
  }

  const { form, progress } = c;
  const sending = c.status === "sending";
  const ready = progress.canSend;
  const code = form.mode === "code";

  const onSend = async () => {
    if (!ready) {
      setShake((n) => n + 1);
      return;
    }
    const r = await c.submit();
    if (!r.ok) {
      setShake((n) => n + 1);
      if (r.firstInvalidBlockId) focusBlock(r.firstInvalidBlockId);
    }
  };

  const total = progress.total;
  const counter =
    total > 0
      ? `${progress.answered} / ${total} ${progress.requiredOnly ? "obligatoire" : "champ"}${total > 1 ? "s" : ""}`
      : progress.reviewed
        ? `${progress.reviewed} relecture${progress.reviewed > 1 ? "s" : ""}`
        : "Rien à remplir";

  return (
    <PageShell>
      <section
        aria-labelledby="cd-contrib-title"
        className="lg lg-stage mx-auto max-w-[760px] rounded-[30px] p-5 sm:p-8"
      >
        {backLink}
        {code ? (
          <>
            <div className="mb-6">
              <AccentTitle text={form.title} className="text-[clamp(46px,4.7vw,72px)]" />
              {form.intro && (
                <p
                  className={`mt-4 max-w-[52ch] text-[16.5px] leading-relaxed whitespace-pre-line ${INK2}`}
                >
                  {form.intro}
                </p>
              )}
            </div>
            <SandboxedFormFrame
              key={c.round}
              src={urls.code()}
              form={form}
              onSubmit={async (answers) => {
                await c.send(answers);
                return { ok: true };
              }}
            />
          </>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void onSend();
            }}
          >
            <FormRenderer
              form={form}
              mode="fill"
              values={c.values}
              onChange={c.setValue}
              errors={c.errors}
              reviews={c.reviews}
              onReviewChange={c.setReview}
              resourceUrl={urls.resource}
              problemId={problemId}
            />

            {c.sendError != null && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-[14px] px-4 py-3 text-[14px] leading-snug"
                style={{
                  background: "rgba(248,113,113,.08)",
                  boxShadow: "inset 0 0 0 1px rgba(248,113,113,.3)",
                }}
              >
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[color:var(--danger)]" />
                <p className="min-w-0 flex-1 text-[color:var(--danger)]">
                  {submitMessage(c.sendError)}
                </p>
                {c.sendError instanceof ApiError && c.sendError.code === "form_outdated" ? (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className={`shrink-0 text-[13.5px] font-semibold ${ACCENT_TEXT}`}
                  >
                    Recharger
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Fermer ce message"
                    onClick={c.dismissError}
                    className={SOFT_BTN}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <Glass
              ref={bar}
              className="lg-strong sticky bottom-4 z-30 mt-8 flex items-center gap-3 rounded-full py-2 pr-2 pl-4"
            >
              <ProgressRing pct={progress.pct} />
              <p className={`min-w-0 flex-1 truncate text-[13.5px] ${INK2}`} aria-live="polite">
                {counter}
              </p>
              <button
                type="submit"
                disabled={sending}
                style={ready ? CTA_FILL : PENDING_FILL}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-60"
              >
                {sending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Send size={16} strokeWidth={2.2} />
                )}
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </Glass>
          </form>
        )}
      </section>

      <SuccessModal
        open={c.status === "done"}
        title={form.thanks?.title || "Merci pour votre contribution"}
        message={form.thanks?.message || "Vos réponses ont bien été enregistrées."}
        primary={{ label: "Contribuer encore", onClick: c.reset }}
        secondary={{ label: "Retour au problème", onClick: back }}
        onClose={c.reset}
      />
    </PageShell>
  );
}
