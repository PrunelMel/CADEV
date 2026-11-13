/**
 * Profil d'un membre, charte « Liquid Glass » : bandeau (nom, organisations, nombre de solutions,
 * carte des pays où il a publié des solutions), puis onglets Solutions, Problèmes, Dépôts
 * (`?onglet=`). Le profil met en avant les problèmes résolus, pas la liste brute des dépôts.
 */
import { Link, useNavigate, useParams } from "react-router";
import { Boxes, ClipboardList, LayoutDashboard, MapPin, Plus, Star, Users } from "lucide-react";
import { useSession } from "../../api/auth";
import { useProfile } from "../../api/hooks";
import type { Profile } from "../../api/types";
import { AfricaDotMap, type CountryMarker } from "../../components/glass/AfricaDotMap";
import { COUNTRY_BY_ID } from "../../components/glass/africaMap";
import { ACCENT_TEXT, DISPLAY, INK, INK2, INK3 } from "../../components/glass/Glass";
import { ListMessage, Meta } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import { StatusIcon, codeOf, formatDate } from "../../components/glass/problemBits";
import { Heading, Reveal, TabbedContent, useTab } from "../../components/glass/sections";
import { Initial, RepoMini, RowCard, SpaceHero } from "../../components/glass/spaceBits";
import { PAL } from "../../content/problem-form";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = [
  { id: "solutions", label: "Solutions", icon: Star },
  { id: "problemes", label: "Problèmes publiés", icon: ClipboardList },
  { id: "depots", label: "Dépôts publics", icon: Boxes },
] as const;
const TAB_IDS = TABS.map((t) => t.id);

export function ProfileView() {
  const { username = "" } = useParams();
  const profile = useProfile(username);
  usePageTitle(profile.data?.name || username);
  const { tab, setTab, anchor } = useTab(TAB_IDS);
  const u = profile.data;

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      {!u ? (
        <ListMessage>{profile.isError ? "Ce profil est introuvable." : "Chargement…"}</ListMessage>
      ) : (
        <>
          <Hero user={u} />
          <TabbedContent
            label="Sections du profil"
            tabs={TABS.map((t) => ({
              ...t,
              count: {
                solutions: u.solved.length,
                problemes: u.posted.length,
                depots: u.repos.length,
              }[t.id],
            }))}
            tab={tab}
            onTab={setTab}
            anchor={anchor}
          >
            {tab === "solutions" && <SolutionsTab user={u} />}
            {tab === "problemes" && <PostedTab user={u} />}
            {tab === "depots" && <ReposTab user={u} />}
          </TabbedContent>
        </>
      )}
    </PageShell>
  );
}

function Hero({ user: u }: { user: Profile }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const mine = session?.user.username === u.username;
  const name = u.name || u.username;

  // Un cercle par pays où le membre a publié une solution.
  const markers: Record<string, CountryMarker> = {};
  for (const s of u.solved) {
    const code = codeOf(s.problem.country);
    if (!code) continue;
    const m = (markers[code] ??= { total: 0, open: 0, label: s.problem.country });
    m.total += 1;
    if (s.problem.status === "open") m.open += 1;
  }
  const countries = Object.keys(markers);

  return (
    <SpaceHero
      labelledBy="pf-title"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center"
    >
      <div className="min-w-0 space-y-5">
        <div className="flex items-center gap-4">
          <Initial name={name} size={72} c={PAL.lav} />
          <div className="min-w-0 space-y-1.5">
            <h1
              id="pf-title"
              className={`text-[clamp(40px,4.6vw,68px)] leading-[.95] [text-wrap:balance] ${DISPLAY} ${INK}`}
            >
              {name}
            </h1>
            <p className={`text-[13.5px] font-[family-name:var(--font-mono)] ${INK3}`}>
              @{u.username} · membre depuis le {formatDate(u.createdAt)}
            </p>
          </div>
        </div>

        <p className={`text-[16px] leading-relaxed ${INK2}`}>
          <span className={`text-[clamp(32px,3vw,44px)] leading-none ${DISPLAY} ${ACCENT_TEXT}`}>
            {u.solved.length}
          </span>{" "}
          {u.solved.length > 1 ? "solutions publiées" : "solution publiée"}
          {countries.length > 0 &&
            `, dans ${countries.length > 1 ? `${countries.length} pays` : "1 pays"}`}
        </p>

        {u.orgs.length > 0 && (
          <div className={`flex flex-wrap items-center gap-2 text-[14px] ${INK2}`}>
            <Users size={16} className={INK3} aria-label="Organisations" />
            {u.orgs.map((o) => (
              <Link
                key={o.slug}
                to={`/orgs/${o.slug}`}
                className={`pp-field rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold ${INK}`}
              >
                {o.name}
              </Link>
            ))}
          </div>
        )}

        {mine && (
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/tableau-de-bord"
              className={`inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--accent-soft)] px-5 text-[14.5px] font-semibold ${ACCENT_TEXT}`}
            >
              <LayoutDashboard size={16} /> Tableau de bord
            </Link>
            <Link
              to="/orgs/nouvelle"
              className={`pp-field inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold ${INK}`}
            >
              <Plus size={16} /> Créer une organisation
            </Link>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[22px] bg-[#0A0F1D]/70">
        <AfricaDotMap
          markers={markers}
          focus={countries.length === 1 ? countries[0] : null}
          spread={3.2}
          onPick={(c) => {
            const country = COUNTRY_BY_ID[c]?.name;
            if (country && markers[c]) navigate(`/problemes?pays=${encodeURIComponent(country)}`);
          }}
          label={`Carte des pays où ${name} a publié des solutions`}
          className="h-[240px] sm:h-[300px]"
        />
        <p className={`border-t border-[color:var(--hair)] px-4 py-2.5 text-[12.5px] ${INK3}`}>
          {countries.length
            ? "Pays des problèmes résolus. Touchez un pays pour voir ses problèmes."
            : "Aucune solution publiée pour l’instant."}
        </p>
      </div>
    </SpaceHero>
  );
}

function SolutionsTab({ user: u }: { user: Profile }) {
  return (
    <section className="space-y-4">
      <Heading
        title={`Solutions publiées (${u.solved.length})`}
        note="Dépôts publics que leur auteur a déclarés solution d’un problème."
      />
      {u.solved.length === 0 ? (
        <ListMessage>Aucune solution publiée pour l’instant.</ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {u.solved.map((s, i) => (
            <Reveal key={`${s.problem.id}-${s.repo.owner}/${s.repo.name}`} i={i}>
              <div className="pp-card flex h-full flex-col gap-3 p-5" data-selected={s.featured}>
                <div className="flex items-start gap-3">
                  <StatusIcon status={s.problem.status} />
                  <Link
                    to={`/problemes/${s.problem.id}`}
                    className={`min-w-0 flex-1 text-[16px] leading-snug font-semibold hover:underline ${INK}`}
                  >
                    {s.problem.title}
                  </Link>
                </div>
                <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] ${INK3}`}>
                  <Meta icon={MapPin}>{s.problem.country}</Meta>
                  {s.featured && (
                    <span className={`inline-flex items-center gap-1.5 ${ACCENT_TEXT}`}>
                      <Star size={14} /> Mise en avant sur le problème
                    </span>
                  )}
                </div>
                {s.summary && (
                  <p className={`line-clamp-3 text-[14.5px] leading-snug ${INK2}`}>{s.summary}</p>
                )}
                <Link
                  to={`/${s.repo.owner}/${s.repo.name}`}
                  className="mt-auto truncate border-t border-[color:var(--hair)] pt-3 font-[family-name:var(--font-mono)] text-[14px] hover:underline"
                >
                  <span className={INK3}>{s.repo.owner}/</span>
                  <span className={INK}>{s.repo.name}</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function PostedTab({ user: u }: { user: Profile }) {
  return (
    <section className="space-y-4">
      <Heading title={`Problèmes publiés (${u.posted.length})`} />
      {u.posted.length === 0 ? (
        <ListMessage>Aucun problème publié.</ListMessage>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {u.posted.map((p, i) => (
            <Reveal key={p.id} i={i}>
              <RowCard
                to={`/problemes/${p.id}`}
                icon={ClipboardList}
                title={p.title}
                meta={p.country}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReposTab({ user: u }: { user: Profile }) {
  return (
    <section className="space-y-4">
      <Heading title={`Dépôts publics (${u.repos.length})`} />
      {u.repos.length === 0 ? (
        <ListMessage>Aucun dépôt public.</ListMessage>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {u.repos.map((r, i) => (
            <Reveal key={`${r.owner}/${r.name}`} i={i}>
              <RepoMini owner={r.owner} name={r.name} type={r.type} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
