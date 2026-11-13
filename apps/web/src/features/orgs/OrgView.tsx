/**
 * Organisations, charte « Liquid Glass ».
 * - Fiche (`/orgs/:slug`) : bandeau, puis onglets Dépôts et Membres (`?onglet=`) ; les admins
 *   ajoutent et retirent des membres dans l'onglet Membres.
 * - Création (`/orgs/nouvelle`) : carte de verre centrée, comme la connexion.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { Boxes, ChevronRight, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useAddOrgMember, useCreateOrg, useOrg, useRemoveOrgMember } from "../../api/hooks";
import type { OrgDetail } from "../../api/types";
import { Backdrop } from "../../components/glass/formKit";
import {
  ACCENT_TEXT,
  CTA_FILL,
  DISPLAY,
  Glass,
  INK,
  INK2,
  INK3,
  SOFT_SPRING,
} from "../../components/glass/Glass";
import { ListMessage } from "../../components/glass/MasterDetail";
import { PageShell } from "../../components/glass/PageShell";
import {
  FIELD,
  GlassButton,
  Heading,
  Labelled,
  Reveal,
  TabbedContent,
  useTab,
} from "../../components/glass/sections";
import { Initial, RepoMini, SpaceHero } from "../../components/glass/spaceBits";
import { ErrorText, formValues } from "../../components/ui";
import { PAL } from "../../content/problem-form";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = [
  { id: "depots", label: "Dépôts", icon: Boxes },
  { id: "membres", label: "Membres", icon: Users },
] as const;
const TAB_IDS = TABS.map((t) => t.id);

export function OrgView() {
  const { slug = "" } = useParams();
  const org = useOrg(slug);
  usePageTitle(org.data?.name ?? slug);
  const { tab, setTab, anchor } = useTab(TAB_IDS);
  const o = org.data;

  return (
    <PageShell mainClassName="space-y-6 pb-16">
      {!o ? (
        <ListMessage>
          {org.isError ? "Cette organisation est introuvable." : "Chargement…"}
        </ListMessage>
      ) : (
        <>
          <SpaceHero labelledBy="org-title" className="space-y-5">
            <div className="flex items-center gap-4">
              <Initial name={o.name} size={72} c={PAL.teal} />
              <div className="min-w-0 space-y-1.5">
                <h1
                  id="org-title"
                  className={`text-[clamp(40px,4.6vw,68px)] leading-[.95] [text-wrap:balance] ${DISPLAY} ${INK}`}
                >
                  {o.name}
                </h1>
                <p className={`text-[13.5px] font-[family-name:var(--font-mono)] ${INK3}`}>
                  @{o.slug}
                  {o.myRole && ` · vous en êtes ${o.myRole === "admin" ? "admin" : "membre"}`}
                </p>
              </div>
            </div>
            {o.description && (
              <p className={`max-w-[62ch] text-[16px] leading-relaxed whitespace-pre-line ${INK2}`}>
                {o.description}
              </p>
            )}
            {o.myRole && (
              <Link
                to="/nouveau-depot"
                style={CTA_FILL}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
              >
                <Plus size={17} strokeWidth={2.4} /> Créer un dépôt
              </Link>
            )}
          </SpaceHero>
          <TabbedContent
            label="Sections de l’organisation"
            tabs={TABS.map((t) => ({
              ...t,
              count: t.id === "depots" ? o.repos.length : o.members.length,
            }))}
            tab={tab}
            onTab={setTab}
            anchor={anchor}
          >
            {tab === "depots" && <ReposTab org={o} />}
            {tab === "membres" && <MembersTab org={o} />}
          </TabbedContent>
        </>
      )}
    </PageShell>
  );
}

function ReposTab({ org: o }: { org: OrgDetail }) {
  return (
    <section className="space-y-4">
      <Heading
        title={`Dépôts (${o.repos.length})`}
        note={
          o.myRole
            ? "Les dépôts privés de l’organisation ne sont visibles que par ses membres."
            : undefined
        }
      />
      {o.repos.length === 0 ? (
        <ListMessage>Aucun dépôt.</ListMessage>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.repos.map((r, i) => (
            <Reveal key={r.name} i={i}>
              <RepoMini
                owner={r.ownerSlug}
                name={r.name}
                type={r.type}
                description={r.description}
                isPrivate={r.visibility === "private"}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function MembersTab({ org: o }: { org: OrgDetail }) {
  const add = useAddOrgMember(o.slug);
  const remove = useRemoveOrgMember(o.slug);
  const admin = o.myRole === "admin";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    add.mutate(
      { username: v.username.trim(), role: v.role === "admin" ? "admin" : "member" },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <section className="space-y-4">
      <Heading
        title={`Membres (${o.members.length})`}
        note="Les admins gèrent les membres et les dépôts de l’organisation ; les membres accèdent à ses dépôts privés."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3">
          <ul className="space-y-3">
            {o.members.map((m, i) => (
              <Reveal key={m.username ?? `${m.name}-${i}`} i={i}>
                <div className="pp-card flex items-center gap-3.5 p-4">
                  <Initial name={m.name || m.username || "?"} size={38} />
                  <div className="min-w-0 flex-1">
                    {m.username ? (
                      <Link
                        to={`/u/${m.username}`}
                        className={`block truncate text-[15.5px] font-semibold hover:underline ${INK}`}
                      >
                        {m.name || m.username}
                      </Link>
                    ) : (
                      <span className={`block truncate text-[15.5px] font-semibold ${INK}`}>
                        {m.name}
                      </span>
                    )}
                    <span className={`flex items-center gap-1.5 text-[13px] ${INK3}`}>
                      {m.username && (
                        <span className="font-[family-name:var(--font-mono)]">@{m.username}</span>
                      )}
                      {m.role === "admin" && (
                        <span className={`inline-flex items-center gap-1 ${ACCENT_TEXT}`}>
                          <ShieldCheck size={13} /> Admin
                        </span>
                      )}
                    </span>
                  </div>
                  {admin && m.username && (
                    <button
                      type="button"
                      title={`Retirer ${m.username}`}
                      aria-label={`Retirer ${m.username}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(m.username!)}
                      className="pp-field grid h-10 w-10 shrink-0 place-items-center rounded-full text-[color:var(--danger)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
          <ErrorText error={remove.error} />
        </div>

        {admin && (
          <Glass as="form" onSubmit={submit} className="space-y-4 rounded-[24px] p-5">
            <p className={`flex items-center gap-2 text-[16px] font-semibold ${INK}`}>
              <UserPlus size={17} /> Ajouter un membre
            </p>
            <Labelled label="Nom d’utilisateur">
              <input
                name="username"
                required
                autoComplete="off"
                placeholder="awa"
                className={`${FIELD} h-12 ${INK}`}
              />
            </Labelled>
            <Labelled label="Rôle">
              <span className="pp-field relative flex h-12 items-center rounded-full">
                <select
                  name="role"
                  defaultValue="member"
                  className={`h-full w-full cursor-pointer appearance-none rounded-full bg-transparent pr-10 pl-4 text-[15px] outline-none ${INK}`}
                >
                  <option value="member" className="bg-[#0D121F]">
                    Membre
                  </option>
                  <option value="admin" className="bg-[#0D121F]">
                    Admin
                  </option>
                </select>
                <ChevronRight
                  size={15}
                  className={`pointer-events-none absolute right-4 rotate-90 ${INK3}`}
                />
              </span>
            </Labelled>
            <ErrorText error={add.error} />
            <GlassButton primary disabled={add.isPending}>
              <UserPlus size={15} /> {add.isPending ? "Ajout…" : "Ajouter"}
            </GlassButton>
          </Glass>
        )}
      </div>
    </section>
  );
}

/* ───────────── Création ───────────── */

export function OrgNewView() {
  usePageTitle("Nouvelle organisation");
  const create = useCreateOrg();
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    create.mutate(
      { slug: v.slug, name: v.name.trim(), description: v.description.trim() },
      { onSuccess: (o) => navigate(`/orgs/${o.slug}`) },
    );
  }

  return (
    <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
      <Backdrop dim />
      <main className="grid min-h-dvh place-items-center px-4 pt-[92px] pb-10">
        <Glass
          as={motion.form}
          onSubmit={submit}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SOFT_SPRING}
          variant="lg-strong"
          aria-labelledby="org-new-title"
          className="w-full max-w-[480px] space-y-6 rounded-[30px] p-6 sm:p-8"
        >
          <div className="space-y-2">
            <h1 id="org-new-title" className={`text-[44px] leading-none ${DISPLAY} ${INK}`}>
              Nouvelle organisation
            </h1>
            <p className={`text-[14.5px] leading-snug ${INK3}`}>
              Une équipe, un laboratoire ou une association : ses dépôts portent son nom et ses
              membres accèdent à ses dépôts privés. Vous en serez admin.
            </p>
          </div>
          <Labelled label="Nom">
            <input name="name" required maxLength={80} className={`${FIELD} h-12 ${INK}`} />
          </Labelled>
          <Labelled
            label="Identifiant"
            hint={
              <>
                Minuscules, chiffres et tirets. Adresse des dépôts :{" "}
                <span className={`font-[family-name:var(--font-mono)] ${INK2}`}>
                  /{slug || "identifiant"}/nom-du-depot
                </span>
              </>
            }
          >
            <input
              name="slug"
              required
              pattern="[a-z0-9][a-z0-9\-]{1,38}"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              autoComplete="off"
              className={`${FIELD} h-12 font-[family-name:var(--font-mono)] ${INK}`}
            />
          </Labelled>
          <Labelled label="Description" hint="Facultative">
            <textarea name="description" rows={3} className={`${FIELD} resize-y py-3 ${INK}`} />
          </Labelled>
          <ErrorText error={create.error} />
          <GlassButton primary disabled={create.isPending} className="w-full">
            {create.isPending ? "Création…" : "Créer l’organisation"}
          </GlassButton>
        </Glass>
      </main>
    </div>
  );
}
