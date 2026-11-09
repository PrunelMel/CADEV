/**
 * Mise en page commune aux listes en verre (problèmes, hub) : la liste à gauche, la fiche de
 * l'élément choisi à droite (collante) ; sur téléphone, la fiche monte du bas.
 */
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { INK, INK2, INK3, MONO } from "./Glass";

export function MasterDetail({
  wide,
  list,
  detail,
  label,
  sheetOpen,
  onCloseSheet,
}: {
  wide: boolean;
  list: ReactNode;
  /** null : rien de choisi, pas de fiche. */
  detail: ReactNode | null;
  label: string;
  sheetOpen: boolean;
  onCloseSheet: () => void;
}) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {list}
        {wide && detail && (
          <aside
            aria-label={label}
            className="lg lg-stage pp-scroll sticky top-[156px] max-h-[calc(100dvh-172px)] self-start overflow-y-auto rounded-[30px] p-5"
          >
            {detail}
          </aside>
        )}
      </div>

      {!wide && (
        <AnimatePresence>
          {sheetOpen && detail && (
            <>
              <motion.div
                key="scrim"
                aria-hidden
                onClick={onCloseSheet}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[55] bg-[color:var(--scrim)]"
              />
              <motion.div
                key="sheet"
                role="dialog"
                aria-modal="true"
                aria-label={label}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="lg lg-strong pp-scroll fixed inset-x-0 bottom-0 z-[60] max-h-[86dvh] overflow-y-auto rounded-t-[28px] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    aria-hidden
                    className="mx-auto h-1 w-10 rounded-full bg-[color:var(--hair)]"
                  />
                  <button
                    type="button"
                    aria-label="Fermer"
                    onClick={onCloseSheet}
                    className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-[color:var(--ink2)] hover:bg-[color:var(--accent-soft)]"
                  >
                    <X size={16} />
                  </button>
                </div>
                {detail}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

/** Message à la place de la liste (chargement, erreur, rien ne correspond). */
export const ListMessage = ({ children }: { children: ReactNode }) => (
  <p className={`pp-card px-5 py-10 text-center text-[14.5px] ${INK3}`}>{children}</p>
);

/** Information d'une carte : icône lucide et texte. */
export const Meta = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon size={15} strokeWidth={1.8} aria-hidden />
    {children}
  </span>
);

/** Case de la fiche : un intitulé et des étiquettes (ou un texte quand la liste est vide). */
export function Fact({
  icon: Icon,
  label,
  values,
  empty = "Non précisé",
}: {
  icon: LucideIcon;
  label: string;
  values: string[];
  empty?: string;
}) {
  const list = values.filter(Boolean);
  return (
    <div className="pp-card space-y-2 p-3.5">
      <p className={`flex items-center gap-2 text-[11px] ${MONO} ${INK2}`}>
        <Icon size={13} /> {label}
      </p>
      {list.length ? (
        <div className="flex flex-wrap gap-1.5">
          {list.map((v) => (
            <span
              key={v}
              className={`rounded-full bg-[color:var(--chip)] px-2.5 py-1 text-[12.5px] font-medium ${INK}`}
            >
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className={`text-[13px] ${INK3}`}>{empty}</p>
      )}
    </div>
  );
}
