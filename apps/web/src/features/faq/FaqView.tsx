/**
 * Questions fréquentes, charte « Liquid Glass » : bandeau, section « Notre communauté » (objectif,
 * vision, qui peut en faire partie), « Comment contribuer » (étapes selon le profil choisi), puis une carte de verre par question, qui s'ouvre au clic
 * (une à la fois). Contenu : `community` et `faq` dans content/site.ts.
 */
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  CircleHelp,
  Code,
  HeartHandshake,
  Target,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import {
  ACCENT_TEXT,
  DISPLAY,
  INK,
  INK2,
  INK3,
  Tile,
  trackGlow,
} from "../../components/glass/Glass";
import { PageShell } from "../../components/glass/PageShell";
import { Heading, Reveal } from "../../components/glass/sections";
import { SpaceHero } from "../../components/glass/spaceBits";
import { community, contributionPaths, faq } from "../../content/site";
import { PAL, type Tone } from "../../content/problem-form";
import { usePageTitle } from "../../hooks/usePageTitle";

export function FaqView() {
  usePageTitle("Questions fréquentes");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageShell mainClassName="pb-16">
      {/* Les cartes et le bandeau survolés s'éclairent autour du pointeur. */}
      <div onPointerMove={trackGlow} className="space-y-6">
        <SpaceHero labelledBy="faq-title" className="space-y-4">
          <div className="flex items-center gap-4">
            <Tile c={PAL.lav} size={56} icon={CircleHelp} />
            <h1
              id="faq-title"
              className={`text-[clamp(40px,4.6vw,72px)] leading-[.95] ${DISPLAY} ${INK}`}
            >
              Questions fréquentes
            </h1>
          </div>
          <p className={`max-w-[62ch] text-[16px] leading-relaxed ${INK2}`}>
            Qui nous sommes, ce que nous construisons, et ce qu’il faut savoir avant de publier ou
            de contribuer.
          </p>
        </SpaceHero>

        <Community />

        <HowTo />

        <div className="mx-auto max-w-[920px] pt-4">
          <Heading title="Vos questions" />
        </div>
        <ul className="mx-auto max-w-[920px] space-y-3">
          {faq.map((f, i) => (
            <Reveal key={f.q} i={i}>
              <Question
                q={f.q}
                a={f.a}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            </Reveal>
          ))}
        </ul>

        <p className={`mx-auto max-w-[920px] px-1 text-[14px] ${INK3}`}>
          Une question reste sans réponse ? Posez-la dans la discussion d’un problème.{" "}
          <Link
            to="/problemes"
            className={`inline-flex items-center gap-1 font-semibold hover:underline ${ACCENT_TEXT}`}
          >
            Voir les problèmes <ArrowRight size={14} />
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

const AUDIENCE: Record<string, { icon: LucideIcon; c: Tone }> = {
  dev: { icon: Code, c: PAL.lav },
  "non-tech": { icon: Building2, c: PAL.amber },
  all: { icon: HeartHandshake, c: PAL.mint },
};

/** Objectif, vision, et les trois façons d'en faire partie. */
function Community() {
  return (
    <section aria-labelledby="community-title" className="space-y-5">
      <div className="px-1 pt-4">
        <h2
          id="community-title"
          className={`text-[clamp(28px,2.6vw,38px)] leading-none ${DISPLAY} ${INK}`}
        >
          Notre communauté
        </h2>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        <Reveal i={0}>
          <Pillar icon={Target} c={PAL.lav} title="Notre objectif" text={community.goal} />
        </Reveal>
        <Reveal i={1}>
          <Pillar icon={Telescope} c={PAL.sky} title="Notre vision" text={community.vision} />
        </Reveal>
      </ul>
      <Heading title="Qui peut en faire partie" />
      <ul className="grid gap-3 md:grid-cols-3">
        {community.audiences.map((a, i) => {
          const look = AUDIENCE[a.id] ?? AUDIENCE.all;
          return (
            <Reveal key={a.id} i={i + 2}>
              <div className="pp-card pp-glow flex h-full flex-col gap-3 p-5">
                <Tile c={look.c} size={44} icon={look.icon} />
                <h3 className={`text-[18px] font-semibold ${INK}`}>{a.title}</h3>
                <p className={`flex-1 text-[14.5px] leading-relaxed ${INK2}`}>{a.text}</p>
                <Link
                  to={a.link.href}
                  className={`inline-flex items-center gap-1.5 border-t border-[color:var(--hair)] pt-3 text-[14px] font-semibold hover:underline ${ACCENT_TEXT}`}
                >
                  {a.link.label} <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

type ProfileId = keyof typeof contributionPaths;
const PROFILE_IDS = Object.keys(contributionPaths) as ProfileId[];

/**
 * Les étapes pour contribuer, selon le profil choisi par le lecteur. Le choix est dans l'URL
 * (`?profil=`), pour partager directement le bon parcours.
 */
function HowTo() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("profil");
  const profile = PROFILE_IDS.find((p) => p === raw) ?? PROFILE_IDS[0];
  const choose = (id: ProfileId) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (id === PROFILE_IDS[0]) n.delete("profil");
        else n.set("profil", id);
        return n;
      },
      { replace: true, preventScrollReset: true },
    );
  const path = contributionPaths[profile];
  const look = AUDIENCE[profile] ?? AUDIENCE.all;

  return (
    <section aria-labelledby="howto-title" className="space-y-5 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <h2
          id="howto-title"
          className={`text-[clamp(28px,2.6vw,38px)] leading-none ${DISPLAY} ${INK}`}
        >
          Comment contribuer
        </h2>
        <div
          role="tablist"
          aria-label="Votre profil"
          className="lg lg-strong pp-scroll flex max-w-full gap-1 overflow-x-auto rounded-[26px] p-1.5"
        >
          {community.audiences.map((a) => {
            const id = a.id as ProfileId;
            const on = profile === id;
            const Icon = (AUDIENCE[id] ?? AUDIENCE.all).icon;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`howto-tab-${id}`}
                aria-selected={on}
                aria-controls="howto-panel"
                onClick={() => choose(id)}
                className={`relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold transition-colors ${on ? INK : `${INK2} hover:text-[color:var(--ink)]`}`}
              >
                {on && (
                  <motion.span
                    layoutId="howto-lens"
                    className="pp-lens absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  />
                )}
                <Icon size={16} className="relative" />
                <span className="relative">{a.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="howto-panel" role="tabpanel" aria-labelledby={`howto-tab-${profile}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={profile}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
            className="space-y-4"
          >
            <p className={`px-1 text-[16px] leading-relaxed ${INK2}`}>{path.intro}</p>
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {path.steps.map((st, i) => (
                <li key={st.title} className="pp-card pp-glow flex gap-4 p-5">
                  <Tile c={look.c} size={40} code={String(i + 1)} />
                  <div className="min-w-0 space-y-1.5">
                    <h3 className={`text-[16.5px] leading-snug font-semibold ${INK}`}>
                      {st.title}
                    </h3>
                    <p className={`text-[14.5px] leading-relaxed ${INK2}`}>{st.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to={path.cta.href}
              className={`inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[14.5px] font-semibold ${ACCENT_TEXT}`}
            >
              {path.cta.label} <ArrowRight size={16} />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Pillar({
  icon,
  c,
  title,
  text,
}: {
  icon: LucideIcon;
  c: Tone;
  title: string;
  text: string;
}) {
  return (
    <div className="pp-card pp-glow flex h-full gap-4 p-5 sm:p-6">
      <Tile c={c} size={48} icon={icon} />
      <div className="min-w-0 space-y-2">
        <h3 className={`text-[18px] font-semibold ${INK}`}>{title}</h3>
        <p className={`text-[15px] leading-relaxed ${INK2}`}>{text}</p>
      </div>
    </div>
  );
}

function Question({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <div className="pp-card pp-glow" data-selected={open}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={`flex w-full items-center gap-4 px-5 py-4 text-left text-[16.5px] leading-snug font-semibold ${INK}`}
      >
        <span className="flex-1">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={`shrink-0 ${open ? ACCENT_TEXT : INK3}`}
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className={`px-5 pb-5 text-[15px] leading-relaxed ${INK2}`}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
