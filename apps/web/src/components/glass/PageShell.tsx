import type { ReactNode } from "react";
import "./glass.css";

/** Fond de la charte (halos, grain) et colonne principale sous l'en-tête en verre. */
export function PageShell({
  children,
  mainClassName = "",
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <div lang="fr" className="pp-theme pp-root relative isolate min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={{
          background:
            "radial-gradient(1100px 620px at 50% -10%, #0F1628 0%, transparent 72%), radial-gradient(900px 560px at 100% 100%, #0B1121 0%, transparent 70%), #070A11",
        }}
      >
        <i className="pp-blob pp-blob-a" />
        <i className="pp-blob pp-blob-b" />
        <i className="pp-blob pp-blob-c" />
        <i className="pp-blob pp-blob-d" />
        <i className="pp-blob pp-blob-e" />
        <div className="pp-grain absolute inset-0" />
      </div>
      <main
        className={`mx-auto max-w-[1440px] pt-[76px] pr-[max(16px,env(safe-area-inset-right,0px))] pb-4 pl-[max(16px,env(safe-area-inset-left,0px))] ${mainClassName}`}
      >
        {children}
      </main>
    </div>
  );
}
