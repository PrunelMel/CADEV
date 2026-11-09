import { storage } from "../../../storage/index.js";
import { RESOURCE_FOLDER, type MediaKind, type StorageFormat } from "./model/blockTypes.js";

/**
 * Arborescence standardisée d'un problème dans le stockage objet. L'utilisateur ne crée ni ne
 * nomme jamais un dossier : toute clé est calculée ici, à partir de l'identifiant du problème
 * (un UUID validé par la route, donc sans traversée de chemin possible).
 *
 *   problems/<problemId>/contribution/
 *     form/form.json                     version publiée
 *     form/revisions/rev-0001.json       copie de chaque publication
 *     form/custom/draft|published/index.html   page importée (mode « code »)
 *     resources/images|gifs|audio|videos/      médias importés, triés par type
 *     responses/responses.csv|xlsx       selon le format choisi
 *     responses/entries/<date>_<id>.txt  format « un fichier par réponse »
 *     responses/schema.json              dictionnaire des colonnes
 *     responses/_archive/<date>/         anciens fichiers après un changement de format
 *
 * La base de données reste la source de vérité ; ces fichiers en sont des vues reconstructibles.
 */
export function paths(problemId: string) {
  const base = `problems/${problemId}/contribution`;
  return {
    base,
    formJson: `${base}/form/form.json`,
    revisionFile: (n: number) => `${base}/form/revisions/rev-${String(n).padStart(4, "0")}.json`,
    codeFile: (published: boolean) =>
      `${base}/form/custom/${published ? "published" : "draft"}/index.html`,
    resourceFile: (kind: MediaKind, file: string) =>
      `${base}/resources/${RESOURCE_FOLDER[kind]}/${file}`,
    uploadTmp: (id: string) => `${base}/.uploads/${id}`,
    responsesFile: (format: Exclude<StorageFormat, "txt">) =>
      `${base}/responses/responses.${format}`,
    entriesDir: `${base}/responses/entries`,
    schemaFile: `${base}/responses/schema.json`,
    archiveDir: (stamp: string) => `${base}/responses/_archive/${stamp}`,
  };
}

/** Marqueur de dossier (le stockage objet n'a pas de dossiers vides) ; masqué dans l'arborescence. */
const MARKER = ".dossier";

/** Crée l'arborescence standard (idempotent). Appelé au premier enregistrement du formulaire. */
export async function ensureTree(problemId: string) {
  const { base } = paths(problemId);
  const dirs = [
    "form/revisions",
    ...Object.values(RESOURCE_FOLDER).map((d) => `resources/${d}`),
    "responses",
  ];
  await Promise.all(dirs.map((d) => storage.write(`${base}/${d}/${MARKER}`, "", "text/plain")));
}

export type TreeNode = { name: string; type: "dir" | "file"; size?: number; children?: TreeNode[] };

/** Vue en lecture seule pour l'interface : dossiers puis fichiers, triés par nom. */
export async function listTree(problemId: string): Promise<TreeNode[]> {
  const { base } = paths(problemId);
  const root: TreeNode = { name: "", type: "dir", children: [] };
  for (const obj of await storage.list(`${base}/`)) {
    const parts = obj.name.slice(base.length + 1).split("/");
    if (parts.some((p) => p.startsWith(".") && p !== MARKER)) continue; // téléversements en cours
    let node = root;
    parts.slice(0, -1).forEach((dir) => {
      let next = node.children!.find((c) => c.name === dir && c.type === "dir");
      if (!next) {
        next = { name: dir, type: "dir", children: [] };
        node.children!.push(next);
      }
      node = next;
    });
    const file = parts.at(-1)!;
    if (file !== MARKER) node.children!.push({ name: file, type: "file", size: obj.size });
  }
  const sort = (n: TreeNode) => {
    n.children?.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1,
    );
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}
