/**
 * Boîte de réception de l'en-tête : changements de statut des problèmes auxquels les dépôts de
 * l'utilisateur sont liés. Chaque notification est aussi envoyée par e-mail par l'API.
 */
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Bell, RotateCcw, TriangleAlert } from "lucide-react";
import { useMarkRead, useNotifications } from "../../api/hooks";
import type { NotificationItem } from "../../api/types";
import { PAL } from "../../content/problem-form";
import { Glass, INK, INK2, INK3, SPRING, ACCENT_TEXT } from "./Glass";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Bulle ronde avec le nombre de notifications non lues. */
export function InboxBubble({
  open,
  onToggle,
  className = "",
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const inbox = useNotifications(true);
  const unread = inbox.data?.unread ?? 0;
  return (
    <Glass
      lens
      as={motion.button}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"}
      whileHover={{ y: -2, scale: 1.04 }}
      whileTap={{ scale: 0.93 }}
      transition={SPRING}
      className={`pointer-events-auto relative grid size-12 shrink-0 place-items-center rounded-full ${INK} ${className}`}
    >
      <Bell size={17} strokeWidth={2.2} />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[color:var(--accent)] px-1 text-[11px] leading-none font-bold text-[color:var(--on-accent)]"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Glass>
  );
}

function message(n: NotificationItem) {
  const repo = n.repo ? `${n.repo.owner}/${n.repo.name}` : "votre dépôt";
  const title = n.problem?.title ?? "un problème";
  return n.kind === "problem_closed"
    ? `« ${title} », le problème de ${repo}, a été fermé. Liez votre dépôt à un autre problème ou publiez-en un nouveau.`
    : `« ${title} », le problème de ${repo}, a été rouvert.`;
}

/** Liste déroulante des notifications ; un clic ouvre le dépôt concerné et marque la ligne lue. */
export function InboxPanel({ onClose }: { onClose: () => void }) {
  const inbox = useNotifications(true);
  const markRead = useMarkRead();
  const items = inbox.data?.items ?? [];
  const unread = inbox.data?.unread ?? 0;
  return (
    <motion.section
      aria-label="Notifications"
      initial={{ opacity: 0, y: -12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      style={{ transformOrigin: "top right" }}
      className="lg lg-strong pp-scroll pointer-events-auto max-h-[min(70dvh,560px)] w-[min(100%,400px)] overflow-y-auto rounded-[26px] p-2"
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5">
        <h2 className={`text-[15px] font-semibold ${INK}`}>Notifications</h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate(undefined)}
            disabled={markRead.isPending}
            className={`text-[13px] font-semibold ${ACCENT_TEXT} hover:underline`}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      {inbox.isPending ? (
        <p className={`px-3 py-4 text-[14px] ${INK3}`}>Chargement…</p>
      ) : items.length === 0 ? (
        <p className={`px-3 py-4 text-[14px] ${INK3}`}>
          Rien de nouveau. Vous serez prévenu ici et par e-mail si le problème d’un de vos dépôts
          est fermé ou rouvert.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((n) => {
            const Icon = n.kind === "problem_closed" ? TriangleAlert : RotateCcw;
            const to = n.repo
              ? `/${n.repo.owner}/${n.repo.name}`
              : n.problem
                ? `/problemes/${n.problem.id}`
                : "/tableau-de-bord";
            return (
              <li key={n.id}>
                <Link
                  to={to}
                  onClick={() => {
                    if (!n.readAt) markRead.mutate([n.id]);
                    onClose();
                  }}
                  className={`flex gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-[color:var(--accent-soft)] ${n.readAt ? "" : "bg-[color:var(--chip)]"}`}
                >
                  <Icon
                    size={17}
                    className="mt-0.5 shrink-0"
                    style={{ color: n.kind === "problem_closed" ? PAL.amber[0] : "var(--ok)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13.5px] leading-snug ${n.readAt ? INK2 : `font-semibold ${INK}`}`}
                    >
                      {message(n)}
                    </span>
                    <span className={`mt-0.5 block text-[12px] ${INK3}`}>
                      {formatDate(n.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
