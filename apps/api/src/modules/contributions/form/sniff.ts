// Détection du type réel d'un fichier par sa signature binaire (« magic bytes »).
// Le type MIME et l'extension annoncés par le client sont ignorés : ils sont trivialement
// falsifiables. Les formats actifs (SVG, HTML) ne sont jamais acceptés.

import type { MediaKind } from "./model/blockTypes.js";

export type Sniffed = { mime: string; ext: string; kinds: MediaKind[] };

const ascii = (buf: Buffer, from: number, to: number) => buf.subarray(from, to).toString("latin1");

/** `kinds` : types de bloc média qui conviennent ; plusieurs si le conteneur est ambigu
 *  (MP4 et WebM peuvent ne contenir que de l'audio). */
export function sniff(b: Buffer): Sniffed | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a) {
    return { mime: "image/png", ext: "png", kinds: ["image"] };
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg", kinds: ["image"] };
  }
  if (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a") {
    return { mime: "image/gif", ext: "gif", kinds: ["gif"] };
  }
  if (ascii(b, 0, 4) === "RIFF") {
    const form = ascii(b, 8, 12);
    if (form === "WEBP") return { mime: "image/webp", ext: "webp", kinds: ["image"] };
    if (form === "WAVE") return { mime: "audio/wav", ext: "wav", kinds: ["audio"] };
    return null;
  }
  if (
    ascii(b, 0, 3) === "ID3" ||
    (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0)
  ) {
    return { mime: "audio/mpeg", ext: "mp3", kinds: ["audio"] };
  }
  if (ascii(b, 0, 4) === "OggS") return { mime: "audio/ogg", ext: "ogg", kinds: ["audio"] };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return { mime: "video/webm", ext: "webm", kinds: ["video", "audio"] };
  }
  if (ascii(b, 4, 8) === "ftyp") {
    const brand = ascii(b, 8, 12);
    if (brand === "M4A " || brand === "M4B ")
      return { mime: "audio/mp4", ext: "m4a", kinds: ["audio"] };
    return { mime: "video/mp4", ext: "mp4", kinds: ["video", "audio"] };
  }
  return null;
}

/** MIME à servir pour un type donné (un WebM/MP4 rangé comme audio est servi en audio/*). */
export function mimeForKind(sniffed: Sniffed, kind: MediaKind) {
  if (kind === "audio" && sniffed.mime === "video/webm") return "audio/webm";
  if (kind === "audio" && sniffed.mime === "video/mp4") return "audio/mp4";
  return sniffed.mime;
}
