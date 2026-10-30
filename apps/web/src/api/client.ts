export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

type Options = {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  query?: Record<string, unknown>;
};

/** Seul point d'accès HTTP du front. Les composants passent par les hooks de ./hooks. */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.size ? `?${params}` : "";
  const res = await fetch(`/api${path}${qs}`, {
    method: opts.method ?? (opts.json !== undefined || opts.body ? "POST" : "GET"),
    credentials: "include",
    headers:
      opts.json !== undefined
        ? { "Content-Type": "application/json" }
        : opts.body
          ? { "Content-Type": "application/octet-stream" }
          : undefined,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code: string; message: string; details?: [] } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "error",
      err?.message ?? res.statusText,
      err?.details,
    );
  }
  return data as T;
}

/** Lit un fichier de l'API en texte (aperçu dans le navigateur). */
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, "error", "Aperçu indisponible");
  return res.text();
}

/** Encode chaque segment d'un chemin de fichier en gardant les "/". */
export const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export const fileUrl = (owner: string, name: string, path: string, version?: number) =>
  `/api/repos/${owner}/${name}/files/${encodePath(path)}${version ? `?version=${version}` : ""}`;
