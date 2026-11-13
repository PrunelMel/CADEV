/**
 * Tableau de bord, charte « Liquid Glass » : bandeau (actions, ce qui attend l'utilisateur), puis
 * onglets (À traiter, Mes problèmes, Travaux en cours, Contributions, Dépôts ; `?onglet=`).
 * Tous ses dépôts y figurent, privés compris.
 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Database,
  GitPullRequest,
  Hammer,
  Inbox,
  Plus,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useSession } from "../../api/auth";
import { useDashboard } from "../../api/hooks";
import type { Dashboard } from "../../api/types";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  INK,
  INK2,
  INK3,
  SPRING,
} from "../../components/glass/Glass";
import { ListMessage } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import { StatusIcon, formatDate, plural } from "../../components/glass/problemBits";
import { Heading, Reveal, TabbedContent, useTab } from "../../components/glass/sections";
import { RepoMini, RowCard, SpaceHero, amberNote } from "../../components/glass/spaceBits";
import { PAL } from "../../content/problem-form";
import { problemStatusLabels } from "../../content/site";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = [
  { id: "a-traiter", label: "À traiter", icon: Inbox },
  { id: "problemes", label: "Mes problèmes", icon: ClipboardList },
  { id: "travaux", label: "Travaux en cours", icon: Hammer },
  { id: "contributions", label: "Contributions", icon: Database },
  { id: "depots", label: "Dépôts", icon: Boxes },
] as const;
const TAB_IDS = TABS.map((t) => t.id);
type TabId = (typeof TAB_IDS)[number];

/** Dépôts dont le problème a été fermé : à relier à un autre problème, ou à un nouveau. */
const orphansOf = (d: Dashboard) => d.repos.filter((r) => r.problem?.status === "closed");

export function DashboardView() {
  usePageTitle("Tableau de bord");
  const { data: session } = useSession();
  const dashboard = useDashboard(!!session);
  const { tab, setTab, anchor } = useTab(TAB_IDS);
  const d = dashboard.data;

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      <Hero
        name={session?.user.name ?? ""}
        username={session?.user.username ?? null}
        data={d}
        onTab={setTab}
      />
      {!d ? (
        <ListMessage>
          {dashboard.isError ? "Le tableau de bord n’a pas pu être chargé." : "Chargement…"}
        </ListMessage>
      ) : (
        <TabbedContent
          label="Sections du tableau de bord"
          tabs={TABS.map((t) => ({
            ...t,
            count: {
              "a-traiter": d.toReview.pulls.length + orphansOf(d).length,
              problemes: d.problems.length,
              travaux: d.working.length,
              contributions: d.mine.contributions.length,
              depots: d.repos.length,
            }[t.id],
          }))}
          tab={tab}
          onTab={setTab}
          anchor={anchor}
        >
          {tab === "a-traiter" && <ReviewTab data={d} />}
          {tab === "problemes" && <ProblemsTab data={d} />}
          {tab === "travaux" && <WorkTab data={d} />}
          {tab === "contributions" && <ContributionsTab data={d} />}
          {tab === "depots" && <ReposTab data={d} />}
        </TabbedContent>
      )}
    </PageShell>
  );
}

/* ───────────── Bandeau ───────────── */

function Hero({
  name,
  username,
  data: d,
  onTab,
}: {
  name: string;
  username: string | null;
  data?: Dashboard;
  onTab: (t: TabId) => void;
}) {
  const pulls = d?.toReview.pulls.length ?? 0;
  const orphans = d ? orphansOf(d).length : 0;
  return (
    <SpaceHero
      labelledBy="db-title"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center"
    >
      <div className="min-w-0 space-y-5">
        <div className="space-y-3">
          <h1
            id="db-title"
            className={`text-[clamp(40px,4.6vw,72px)] leading-[.95] ${DISPLAY} ${INK}`}
          >
            Tableau de bord
          </h1>
          <p className={`max-w-[56ch] text-[16px] leading-relaxed ${INK2}`}>
            {name ? `${name}, voici` : "Voici"} ce qui attend votre décision, les problèmes que vous
            suivez et tous vos dépôts, privés compris.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING}>
            <Link
              to="/problemes/nouveau"
              style={CTA_FILL}
              className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
            >
              <Plus size={17} strokeWidth={2.4} /> Publier un problème
            </Link>
          </motion.div>
          <Link
            to="/nouveau-depot"
            className={`inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[15px] font-semibold ${ACCENT_TEXT}`}
          >
            <Plus size={16} /> Créer un dépôt
          </Link>
          {username && (
            <Link
              to={`/u/${username}`}
              className={`pp-field inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold ${INK}`}
            >
              <UserRound size={16} /> Mon profil
            </Link>
          )}
        </div>
      </div>

      <Glass className="space-y-2 rounded-[24px] p-4">
        <p className={`px-1 pb-1 text-[15px] font-semibold ${INK}`}>À faire</p>
        {!d ? (
          <p className={`px-1 text-[14px] ${INK3}`}>Chargement…</p>
        ) : pulls + orphans === 0 ? (
          <p className={`px-1 pb-1 text-[14px] leading-snug ${INK3}`}>
            Rien n’attend votre décision.
          </p>
        ) : (
          <>
            {pulls > 0 && (
              <Todo icon={GitPullRequest} onClick={() => onTab("a-traiter")}>
                {plural(pulls, "pull request")} à traiter
              </Todo>
            )}
            {orphans > 0 && (
              <Todo icon={TriangleAlert} warn onClick={() => onTab("a-traiter")}>
                {orphans > 1
                  ? `${orphans} dépôts liés à un problème fermé`
                  : "1 dépôt lié à un problème fermé"}
              </Todo>
            )}
          </>
        )}
      </Glass>
    </SpaceHero>
  );
}

function Todo({
  icon: Icon,
  warn = false,
  onClick,
  children,
}: {
  icon: typeof Inbox;
  warn?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pp-card flex w-full items-center gap-3 px-4 py-3 text-left text-[14.5px] font-semibold ${INK}`}
    >
      <Icon
        size={17}
        style={warn ? { color: amberNote.color } : undefined}
        className={warn ? "" : ACCENT_TEXT}
      />
      <span className="flex-1">{children}</span>
      <ArrowRight size={16} className={INK3} />
    </button>
  );
}

/* ───────────── Onglets ───────────── */

function ReviewTab({ data: d }: { data: Dashboard }) {
  const orphans = orphansOf(d);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Heading
          title={`Pull requests (${d.toReview.pulls.length})`}
          note="Propositions ouvertes sur les dépôts dont vous êtes propriétaire ou collaborateur."
        />
        {d.toReview.pulls.length === 0 ? (
          <ListMessage>Aucune pull request n’attend votre décision.</ListMessage>
        ) : (
          <ul className="space-y-3">
            {d.toReview.pulls.map((p, i) => (
              <Reveal key={`${p.repo.owner}/${p.repo.name}#${p.number}`} i={i}>
                <RowCard
                  to={`/${p.repo.owner}/${p.repo.name}/pulls/${p.number}`}
                  icon={GitPullRequest}
                  title={`#${p.number} ${p.title}`}
                  meta={
                    <>
                      <span className="font-[family-name:var(--font-mono)]">
                        {p.repo.owner}/{p.repo.name}
                      </span>
                      {p.author && ` · par ${p.author}`} · {formatDate(p.createdAt)}
                    </>
                  }
                />
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {orphans.length > 0 && (
        <section className="space-y-4">
          <Heading
            title={`Problème fermé (${orphans.length})`}
            note="Ces dépôts passent derrière les autres dans le hub et la recherche. Liez-les à un autre problème depuis leurs paramètres, ou publiez-en un nouveau qui explique pourquoi le travail continue."
          />
          <ul className="space-y-3">
            {orphans.map((r, i) => (
              <Reveal key={r.id} i={i}>
                <RowCard
                  to={`/${r.owner}/${r.name}?onglet=parametres`}
                  icon={TriangleAlert}
                  tone={PAL.amber}
                  title={
                    <span className="font-[family-name:var(--font-mono)]">
                      {r.owner}/{r.name}
                    </span>
                  }
                  meta={<>Lié à « {r.problem?.title} »</>}
                  end={
                    <span className={`hidden text-[13px] font-semibold sm:inline ${ACCENT_TEXT}`}>
                      Changer de problème
                    </span>
                  }
                />
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProblemsTab({ data: d }: { data: Dashboard }) {
  return (
    <section className="space-y-4">
      <Heading
        title={`Mes problèmes (${d.problems.length})`}
        note="Vous seul pouvez en changer le statut et choisir la solution mise en avant."
      />
      {d.problems.length === 0 ? (
        <ListMessage>
          Vous n’avez pas encore publié de problème.{" "}
          <Link to="/problemes/nouveau" className={`font-semibold underline ${ACCENT_TEXT}`}>
            Publier un problème
          </Link>
        </ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {d.problems.map((p, i) => (
            <Reveal key={p.id} i={i}>
              <RowCard
                to={`/problemes/${p.id}`}
                lead={<StatusIcon status={p.status} />}
                title={p.title}
                meta={problemStatusLabels[p.status]}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkTab({ data: d }: { data: Dashboard }) {
  return (
    <section className="space-y-4">
      <Heading
        title={`Travaux en cours (${d.working.length})`}
        note="Les problèmes sur lesquels vous vous êtes déclaré avec « Je travaille dessus »."
      />
      {d.working.length === 0 ? (
        <ListMessage>
          Déclarez-vous sur un problème avec « Je travaille dessus » pour le retrouver ici.
        </ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {d.working.map((w, i) => (
            <Reveal key={w.problemId} i={i}>
              <RowCard
                to={`/problemes/${w.problemId}`}
                lead={<StatusIcon status={w.status} />}
                title={w.problemTitle}
                meta={w.note || problemStatusLabels[w.status]}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContributionsTab({ data: d }: { data: Dashboard }) {
  const list = d.mine.contributions;
  return (
    <section className="space-y-4">
      <Heading
        title={`Contributions de données (${list.length})`}
        note="Les jeux de données que vous avez proposés aux problèmes."
      />
      {list.length === 0 ? (
        <ListMessage>Aucune contribution de données pour l’instant.</ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c, i) => (
            <Reveal key={c.id} i={i}>
              <RowCard
                to={`/problemes/${c.problemId}?onglet=contributions`}
                icon={Database}
                tone={PAL.teal}
                title={c.problemTitle}
                meta={`Proposée le ${formatDate(c.createdAt)}`}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReposTab({ data: d }: { data: Dashboard }) {
  return (
    <section className="space-y-4">
      <Heading
        title={`Mes dépôts (${d.repos.length})`}
        note="Tous vos dépôts, privés compris."
        action={
          <Link
            to="/nouveau-depot"
            style={CTA_FILL}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
          >
            <Plus size={16} strokeWidth={2.4} /> Créer un dépôt
          </Link>
        }
      />
      {d.repos.length === 0 ? (
        <ListMessage>Aucun dépôt pour l’instant.</ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.repos.map((r, i) => (
            <Reveal key={r.id} i={i}>
              <RepoMini
                owner={r.owner}
                name={r.name}
                type={r.type}
                description={r.description}
                isPrivate={r.visibility === "private"}
                building={r.stage === "under_construction"}
                problem={
                  r.problem && { title: r.problem.title, closed: r.problem.status === "closed" }
                }
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
