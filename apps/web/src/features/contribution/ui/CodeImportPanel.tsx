// Mode « Importer du code » : le créateur téléverse une page HTML qui respecte les règles de la
// plateforme. Le manifeste de champs est lu DANS le fichier (balise
// <script type="application/json" id="cd-manifest">) avec DOMParser, qui n'exécute aucun script :
// le fichier n'est jamais exécuté avant publication.

import { useRef, useState, type Dispatch } from "react";
import { Check, Code2, FileUp, TriangleAlert } from "lucide-react";
import { contributionUrls, useSaveCode } from "../../../api/contribution";
import { validateConfig, type CodeField, type FormConfig } from "../model";
import type { BuilderAction } from "../state/builderReducer";
import { Group, INK, INK2, INK3, MONO, PAL, Tile } from "./kit";
import { SandboxedFormFrame } from "./SandboxedFormFrame";

const RULES = [
  [
    "Un seul fichier index.html",
    "1 Mo maximum, styles et scripts intégrés. Aucun accès au réseau : la page est exécutée dans un bac à sable.",
  ],
  [
    "Un manifeste de champs",
    'Une balise <script type="application/json" id="cd-manifest"> déclare les champs collectés (clé, libellé, type). La plateforme valide les réponses d’après lui.',
  ],
  [
    "Un dialogue par messages",
    "La page envoie cd:ready, reçoit cd:init, puis envoie cd:submit avec ses réponses. Elle ne contacte jamais un serveur.",
  ],
];

/** Extrait et vérifie le manifeste ; renvoie { fields, title, problems }. */
export function readManifest(html: string, baseConfig: FormConfig) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const node = doc.querySelector('script#cd-manifest[type="application/json"]');
  if (!node) {
    return {
      problems: [
        'Manifeste introuvable : ajoutez <script type="application/json" id="cd-manifest">…</script>.',
      ],
    };
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(node.textContent ?? "");
  } catch {
    return { problems: ["Le manifeste n’est pas du JSON valide."] };
  }
  const m = manifest as { fields?: unknown; title?: unknown } | null;
  if (!m || !Array.isArray(m.fields))
    return { problems: ["Le manifeste doit contenir une liste « fields »."] };
  const fields = m.fields as CodeField[];
  const trial = {
    ...baseConfig,
    mode: "code" as const,
    code: { entry: "index.html" as const, fields },
  };
  const { errors } = validateConfig(trial, { stage: "publish" });
  const problems = errors
    .filter((e) => e.path.startsWith("code"))
    .map((e) => `${e.path.replace("code.", "")} : ${e.message}`);
  return { fields, title: typeof m.title === "string" ? m.title : "", problems };
}

export function CodeImportPanel({
  problemId,
  config,
  dispatch,
  imported,
  onImported,
}: {
  problemId: string;
  config: FormConfig;
  dispatch: Dispatch<BuilderAction>;
  imported: boolean;
  onImported: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const saveCode = useSaveCode(problemId);
  const [state, setState] = useState<{ busy: boolean; problems: string[] }>({
    busy: false,
    problems: [],
  });
  const fields = config.code?.fields ?? [];

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setState({ busy: true, problems: [] });
    try {
      if (file.size > 1024 * 1024) throw new Error("Fichier trop volumineux (1 Mo maximum).");
      const html = await file.text();
      const m = readManifest(html, config);
      if (m.problems.length || !m.fields) {
        setState({ busy: false, problems: m.problems });
        return;
      }
      await saveCode.mutateAsync(html);
      dispatch({ type: "SET_CODE_FIELDS", fields: m.fields });
      if (m.title && !config.title)
        dispatch({ type: "SET_META", patch: { title: m.title }, at: Date.now() });
      onImported();
      setState({ busy: false, problems: [] });
    } catch (e) {
      setState({ busy: false, problems: [e instanceof Error ? e.message : "Import impossible."] });
    }
  };

  return (
    <div className="space-y-2">
      <Group title="Règles de la plateforme">
        <ol className="space-y-2.5">
          {RULES.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[12px] ${MONO} text-[color:var(--accent-text)]`}
              >
                {i + 1}
              </span>
              <div>
                <p className={`text-[14.5px] font-semibold ${INK}`}>{t}</p>
                <p className={`text-[13.5px] leading-snug ${INK3}`}>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Group>

      <Group title="Fichier de la page">
        <input
          ref={input}
          type="file"
          hidden
          accept=".html,text/html"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={state.busy}
          className="pp-slot flex min-h-[110px] w-full flex-col items-center justify-center gap-2 px-4 text-[14.5px] font-semibold disabled:opacity-60"
        >
          <FileUp size={22} />
          {state.busy
            ? "Vérification…"
            : fields.length
              ? "Remplacer le fichier"
              : "Choisir index.html"}
        </button>
        {state.problems.length > 0 && (
          <ul
            role="alert"
            className="space-y-1.5 rounded-[14px] px-3.5 py-3 text-[13.5px] leading-snug"
            style={{
              background: "rgba(248,113,113,.08)",
              boxShadow: "inset 0 0 0 1px rgba(248,113,113,.3)",
            }}
          >
            {state.problems.map((p) => (
              <li key={p} className="flex gap-2 text-[color:var(--danger)]">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        )}
      </Group>

      {fields.length > 0 && (
        <Group title="Champs déclarés" note={`${fields.length}`}>
          <ul className="space-y-2">
            {fields.map((f) => (
              <li
                key={f.key}
                className="pp-card flex items-center gap-3 px-3 py-2.5"
                style={{ borderRadius: 16 }}
              >
                <Tile c={PAL.lav} size={30} icon={Code2} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14.5px] font-semibold ${INK}`}>{f.label}</p>
                  <p
                    className={`truncate text-[12px] ${INK3}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {f.key}
                  </p>
                </div>
                <span className={`text-[10.5px] ${MONO} ${INK2}`}>
                  {f.type}
                  {f.required ? " · obligatoire" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {imported && fields.length > 0 && (
        <Group title="Aperçu isolé">
          <p className={`flex items-center gap-2 px-1 text-[13px] ${INK3}`}>
            <Check size={14} className="text-[color:var(--ok)]" />
            Exécuté dans un bac à sable, sans accès au réseau.
          </p>
          <SandboxedFormFrame
            src={contributionUrls(problemId).code(true)}
            form={config}
            onSubmit={async () => ({ ok: true })}
            title="Aperçu de la page importée"
          />
        </Group>
      )}
    </div>
  );
}
