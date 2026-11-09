// Onglet « Relectures » : les corrections proposées par les contributeurs (bloc « Validation de
// données »). Les données d'origine ne sont jamais modifiées et personne ne tranche : le nombre
// de relecteurs d'accord sur une correction, comparé au seuil du bloc, est le seul signal.

import { ShieldCheck, Users } from "lucide-react";
import { useContributionReviews, type ReviewGroup } from "../../../api/contribution";
import type { Answer } from "../model";
import { ACCENT_TEXT, Group, INK, INK2, INK3, MONO } from "./kit";

const show = (v: Answer | null) => (v == null ? "" : Array.isArray(v) ? v.join(", ") : v);
function Proposals({ group }: { group: ReviewGroup }) {
  return (
    <ul className="space-y-2">
      {group.proposals.map((p) => (
        <li
          key={p.reviewId}
          className="rounded-[14px] bg-[color:var(--field)] p-3"
          style={{ boxShadow: "inset 0 0 0 1px var(--field-line)" }}
        >
          <p className={`text-[15px] leading-snug whitespace-pre-line ${INK}`}>{show(p.value)}</p>
          <p
            className={`mt-1.5 flex items-center gap-1.5 text-[12.5px] ${p.reachedAgreement ? ACCENT_TEXT : INK3}`}
          >
            <Users size={13} />
            {p.supporters} contributeur{p.supporters > 1 ? "s" : ""}
            {p.reachedAgreement ? ` · seuil de ${group.minAgreements} atteint` : ""}
          </p>
          {p.comments.map((c, i) => (
            <p key={i} className={`mt-1 text-[13px] leading-snug ${INK2}`}>
              « {c} »
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

export function ReviewsPanel({ problemId }: { problemId: string }) {
  const reviews = useContributionReviews(problemId);
  const groups = reviews.data ?? [];
  const proposals = groups.reduce((n, g) => n + g.proposals.length, 0);
  return (
    <div className="space-y-2">
      <Group
        title="Corrections proposées"
        note={proposals ? `${proposals} correction${proposals > 1 ? "s" : ""}` : undefined}
      >
        {reviews.isPending ? (
          <p className={`px-1 text-[14px] ${INK3}`}>Chargement…</p>
        ) : groups.length === 0 ? (
          <div className="pp-slot grid min-h-[150px] place-items-center px-6 py-8 text-center">
            <div className="max-w-[44ch] space-y-3">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]">
                <ShieldCheck size={22} />
              </span>
              <p className={`text-[16px] font-semibold ${INK}`}>Aucune relecture pour le moment</p>
              <p className="text-[13.5px] leading-snug">
                Ajoutez un bloc « Validation de données » au formulaire : les contributeurs relisent
                les réponses existantes et proposent des corrections. Elles s’affichent ici avec le
                nombre de relecteurs d’accord ; les réponses d’origine ne changent jamais.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={`${g.submissionId}-${g.field}`} className="pp-card space-y-3 p-4">
                <div>
                  <p className={`mb-1 px-1 text-[11px] ${MONO} ${INK2}`}>{g.label}</p>
                  <p className={`px-1 text-[15px] leading-snug ${INK}`}>{show(g.original)}</p>
                  <p className={`mt-1 px-1 text-[12.5px] ${INK3}`}>
                    {g.confirmations} confirmation{g.confirmations > 1 ? "s" : ""} · contribution{" "}
                    <code style={{ fontFamily: "var(--font-mono)" }}>
                      {g.submissionId.slice(0, 8)}
                    </code>
                  </p>
                </div>
                {g.proposals.length > 0 && <Proposals group={g} />}
              </li>
            ))}
          </ul>
        )}
      </Group>
    </div>
  );
}
