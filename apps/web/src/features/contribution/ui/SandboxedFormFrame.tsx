// Exécute une page-formulaire IMPORTÉE (code du créateur) dans une iframe isolée.
//
// Isolation : `sandbox="allow-scripts"` SANS `allow-same-origin` → origine opaque : pas d'accès
// aux cookies, au stockage ni à l'API de la plateforme. L'API ajoute une CSP (connect-src 'none') :
// la page ne peut contacter aucun serveur. Sa seule voie de sortie est postMessage vers ce composant.
//
// Protocole (version 1), données JSON simples :
//   page → plateforme   { type: 'cd:ready' }
//   plateforme → page   { protocol: 1, type: 'cd:init', title, locale, fields: [{key,label,type,required,options}] }
//   page → plateforme   { type: 'cd:submit', answers: { [clé]: valeur } }
//   plateforme → page   { protocol: 1, type: 'cd:result', ok, errors?: { [clé]: message } }
//   page → plateforme   { type: 'cd:resize', height }       (facultatif)
//
// Les messages sont reconnus à leur `source` (la fenêtre de l'iframe), pas à leur origine (« null »
// pour une iframe isolée). La réponse vise '*' : seule la fenêtre de l'iframe est visée, et rien de
// secret n'est envoyé (la structure du formulaire est publique).

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import { deriveFields, validateAnswers, type Answers, type FormConfig } from "../model";

export function SandboxedFormFrame({
  src,
  form,
  onSubmit,
  title = "Formulaire de contribution",
}: {
  src: string;
  form: FormConfig;
  onSubmit: (answers: Answers) => Promise<{ ok: boolean; errors?: Record<string, string> } | void>;
  title?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(520);
  const latest = useRef({ form, onSubmit });
  latest.current = { form, onSubmit };

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      const win = ref.current?.contentWindow;
      const msg: unknown = event.data;
      if (!win || event.source !== win || !msg || typeof msg !== "object") return;
      const m = msg as { type?: unknown; height?: unknown; answers?: unknown };
      if (typeof m.type !== "string") return;
      const reply = (body: Record<string, unknown>) =>
        win.postMessage({ protocol: 1, ...body }, "*");
      const { form: f, onSubmit: submit } = latest.current;

      if (m.type === "cd:ready") {
        reply({
          type: "cd:init",
          title: f.title,
          locale: "fr",
          fields: deriveFields(f)
            .filter((x) => x.kind === "value")
            .map(({ key, label, type, required, props }) => ({
              key,
              label,
              type,
              required,
              options: props?.options,
            })),
        });
      } else if (m.type === "cd:resize") {
        if (typeof m.height === "number" && Number.isFinite(m.height)) {
          setHeight(Math.min(4000, Math.max(200, Math.round(m.height))));
        }
      } else if (m.type === "cd:submit") {
        const check = validateAnswers(f, m.answers); // mêmes règles que l'API, qui revérifie
        if (!check.ok) {
          reply({ type: "cd:result", ok: false, errors: check.errors });
          return;
        }
        try {
          const res = await submit(check.clean);
          reply({ type: "cd:result", ok: res?.ok !== false, errors: res?.errors });
        } catch (e) {
          const byField =
            e instanceof ApiError && e.details && !Array.isArray(e.details) ? e.details : null;
          reply({
            type: "cd:result",
            ok: false,
            errors: byField ?? { _form: e instanceof Error ? e.message : "Envoi impossible" },
          });
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      loading="lazy"
      style={{ height, colorScheme: "dark" }}
      className="w-full rounded-[22px] bg-transparent"
    />
  );
}
