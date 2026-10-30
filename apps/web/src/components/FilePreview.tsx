import { useFileText } from "../api/hooks";
import type { RepoFile } from "../api/types";
import { ErrorText, Query } from "./ui";

const TEXT = /\.(txt|md|csv|tsv|json|geojson|ya?ml|py|js|ts|toml|ini|cfg|sh|xml|html|css)$/i;
const MAX = 200 * 1024;

/** Fichiers texte assez petits pour être lus dans le navigateur. */
export const canPreview = (f: RepoFile) => TEXT.test(f.path) && f.size <= MAX;

/** Découpe une ligne CSV simple (guillemets doubles gérés). */
function cells(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  return [...out, cur];
}

export function FilePreview({ url, file }: { url: string; file: RepoFile }) {
  const text = useFileText(url, true);
  const tabular = /\.(csv|tsv)$/i.test(file.path);
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-neutral-200 bg-paper">
      <Query query={text}>
        {(t) => {
          if (tabular) {
            const sep = file.path.toLowerCase().endsWith(".tsv") ? "\t" : ",";
            const rows = t
              .split(/\r?\n/)
              .filter(Boolean)
              .slice(0, 101)
              .map((l) => cells(l, sep));
            const [head = [], ...body] = rows;
            return (
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    {head.map((h, i) => (
                      <th key={i} className="border-b border-neutral-200 px-2 py-1.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {body.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j} className="px-2 py-1">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          return (
            <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{t}</pre>
          );
        }}
      </Query>
      {text.error ? <ErrorText error={text.error} /> : null}
    </div>
  );
}
