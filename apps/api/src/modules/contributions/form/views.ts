// Fichiers de réponses lisibles (CSV, XLSX, un TXT par réponse) et dictionnaire des colonnes.
//
// Les réponses vivent en base (source de vérité) ; ces fichiers n'en sont que des vues, toujours
// reconstructibles : changer de format, ajouter une colonne ou réparer un fichier abîmé revient à
// les régénérer depuis la base.

import ExcelJS from "exceljs";
import type { MediaRef } from "../../../db/schema.js";
import { storage } from "../../../storage/index.js";
import { SYSTEM_COLUMNS, type StorageFormat } from "./model/blockTypes.js";
import { deriveFields, type Answer, type FormConfig } from "./model/formModel.js";
import { paths } from "./tree.js";

export type SubmissionRecord = {
  id: string;
  at: string;
  contributorId: string | null;
  formRevision: number;
  answers: Record<string, Answer>;
  media: Record<string, MediaRef>;
};

type Columns = { system: string[]; fields: string[]; legacy: string[]; all: string[] };

/**
 * Colonnes d'un fichier de réponses : colonnes système, champs actuels du formulaire, puis colonnes
 * « héritées » (champs supprimés ou renommés depuis, mais présents dans des réponses déjà
 * collectées). Rien n'est perdu quand le créateur modifie son formulaire après publication.
 */
export function columnsFor(config: FormConfig, records: SubmissionRecord[]): Columns {
  const system = SYSTEM_COLUMNS.filter(
    (c) => c !== "contributor_id" || config.storage?.includeContributor !== false,
  );
  const fields = deriveFields(config).map((f) => f.key);
  const known = new Set<string>([...system, ...fields]);
  const legacy: string[] = [];
  for (const r of records) {
    for (const k of [...Object.keys(r.answers ?? {}), ...Object.keys(r.media ?? {})]) {
      if (!known.has(k)) {
        known.add(k);
        legacy.push(k);
      }
    }
  }
  return { system, fields, legacy, all: [...system, ...fields, ...legacy] };
}

/** Valeurs d'une réponse, dans l'ordre des colonnes. */
export function rowFor(record: SubmissionRecord, columns: Columns): (string | number | string[])[] {
  const sys: Record<string, string | number> = {
    submission_id: record.id,
    submitted_at: record.at,
    contributor_id: record.contributorId ?? "",
    form_revision: record.formRevision,
  };
  return columns.all.map((c) => {
    if (c in sys) return sys[c];
    if (record.answers && c in record.answers) return record.answers[c];
    return record.media?.[c]?.file ?? "";
  });
}

/** Dictionnaire des colonnes, écrit à côté des réponses (responses/schema.json). */
export function dictionary(config: FormConfig, columns: Columns) {
  const byKey = new Map(deriveFields(config).map((f) => [f.key, f]));
  return {
    formRevision: config.revision,
    columns: columns.all.map((key) => {
      if ((SYSTEM_COLUMNS as readonly string[]).includes(key)) return { key, kind: "system" };
      const f = byKey.get(key);
      if (!f)
        return { key, kind: "legacy", note: "Champ retiré du formulaire ; données conservées." };
      return {
        key,
        label: f.label,
        kind: f.kind,
        type: f.type,
        required: f.required,
        ...(f.props?.options ? { options: f.props.options } : {}),
        ...(f.pii ? { personalData: true } : {}),
      };
    }),
  };
}

/* ---------- CSV : RFC 4180 + protection contre l'injection de formules ----------
 * Les réponses viennent d'inconnus et le créateur ouvre le fichier dans Excel ou LibreOffice. Une
 * cellule qui commence par = + - @ (ou tabulation, retour chariot) serait interprétée comme une
 * formule : on la neutralise en préfixant une apostrophe. La base, elle, reste intacte. */

const BOM = "\uFEFF"; // sans BOM, Excel lit l'UTF-8 comme du Windows-1252
const EOL = "\r\n";
const FORMULA_START = /^[=+\-@\t\r]/;

/** Valeur de cellule en texte : tableau → « a | b », null → vide. */
export function cellText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(" | ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function csvCell(value: unknown) {
  let s = cellText(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvLine = (cells: unknown[]) => cells.map(csvCell).join(",");

export function renderCsv(records: SubmissionRecord[], columns: Columns) {
  const lines = [csvLine(columns.all), ...records.map((r) => csvLine(rowFor(r, columns)))];
  return `${BOM}${lines.join(EOL)}${EOL}`;
}

async function renderXlsx(config: FormConfig, records: SubmissionRecord[], columns: Columns) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Plateforme IA appliquée";
  const ws = wb.addWorksheet("Réponses", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.all.map((c) => ({
    header: c,
    key: c,
    width: Math.min(60, Math.max(14, c.length + 4)),
  }));
  ws.getRow(1).font = { bold: true };
  // Les cellules sont écrites comme chaînes : Excel ne les interprète jamais comme des formules.
  for (const r of records) ws.addRow(rowFor(r, columns).map(cellText));
  const dict = wb.addWorksheet("Dictionnaire");
  dict.columns = [
    { header: "Colonne", key: "key", width: 28 },
    { header: "Libellé", key: "label", width: 44 },
    { header: "Nature", key: "kind", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Obligatoire", key: "required", width: 12 },
    { header: "Choix", key: "options", width: 50 },
  ];
  dict.getRow(1).font = { bold: true };
  for (const c of dictionary(config, columns).columns) {
    const col = c as { required?: boolean; options?: string[] };
    dict.addRow({
      ...c,
      required: col.required ? "oui" : "",
      options: (col.options ?? []).join(" | "),
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const fileStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"); // 20261028T025400Z

export function renderTxt(record: SubmissionRecord, columns: Columns, config: FormConfig) {
  const lines = [
    `# Contribution ${record.id}`,
    `date: ${record.at}`,
    ...(config.storage?.includeContributor !== false
      ? [`contributeur: ${record.contributorId ?? ""}`]
      : []),
    `version_formulaire: ${record.formRevision}`,
    "",
  ];
  const row = rowFor(record, columns);
  columns.all.forEach((k, i) => {
    if (i < columns.system.length) return;
    lines.push(`[${k}]`, cellText(row[i]), "");
  });
  return lines.join("\n");
}

const entryKey = (problemId: string, record: SubmissionRecord) =>
  `${paths(problemId).entriesDir}/${fileStamp(record.at)}_${record.id}.txt`;

export const CONTENT_TYPES: Record<StorageFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain; charset=utf-8",
};

/** Régénère le fichier de réponses (ou les fichiers TXT) et le dictionnaire. */
export async function writeAll(problemId: string, config: FormConfig, records: SubmissionRecord[]) {
  const p = paths(problemId);
  const columns = columnsFor(config, records);
  const format = config.storage.format;
  if (format === "csv") {
    await storage.write(p.responsesFile("csv"), renderCsv(records, columns), CONTENT_TYPES.csv);
  } else if (format === "xlsx") {
    await storage.write(
      p.responsesFile("xlsx"),
      await renderXlsx(config, records, columns),
      CONTENT_TYPES.xlsx,
    );
  } else {
    for (const r of records) {
      await storage.write(entryKey(problemId, r), renderTxt(r, columns, config), CONTENT_TYPES.txt);
    }
  }
  await storage.write(
    p.schemaFile,
    JSON.stringify(dictionary(config, columns), null, 2),
    "application/json",
  );
}

/** Une seule réponse en plus : un fichier TXT, sinon le tableau entier (pas d'ajout en place). */
export async function writeOne(
  problemId: string,
  config: FormConfig,
  record: SubmissionRecord,
  all: () => Promise<SubmissionRecord[]>,
) {
  if (config.storage.format !== "txt") return writeAll(problemId, config, await all());
  const records = await all();
  const columns = columnsFor(config, records);
  await storage.write(
    entryKey(problemId, record),
    renderTxt(record, columns, config),
    CONTENT_TYPES.txt,
  );
}

/** Changement de format : déplace les fichiers de l'ancien format dans responses/_archive/<date>/. */
export async function archive(problemId: string, format: StorageFormat) {
  const p = paths(problemId);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sources =
    format === "txt"
      ? (await storage.list(`${p.entriesDir}/`)).map((o) => o.name)
      : (await storage.size(p.responsesFile(format))) !== null
        ? [p.responsesFile(format)]
        : [];
  const moved: string[] = [];
  for (const src of sources) {
    const target = `${p.archiveDir(stamp)}/${src.slice(`${p.base}/responses/`.length)}`;
    await storage.copy(src, target);
    await storage.remove(src);
    moved.push(target.slice(p.base.length + 1));
  }
  return moved;
}
