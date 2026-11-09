import { createHash, randomUUID } from "node:crypto";
import { PassThrough, type Readable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "minio";
import { env } from "../env.js";
import { AppError } from "../lib/errors.js";

const client = new Client({
  endPoint: env.S3_ENDPOINT,
  port: env.S3_PORT,
  useSSL: env.S3_USE_SSL,
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
});
const bucket = env.S3_BUCKET;
const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;

export type StoredObject = { storageKey: string; size: number; sha256: string };

const tooLarge = (limit: number) =>
  new AppError(413, "too_large", `Fichier limité à ${Math.round(limit / 1048576)} Mo`);

const isMissing = (err: unknown) =>
  ["NotFound", "NoSuchKey"].includes((err as { code?: string }).code ?? "");

export const storage = {
  /** Attend que le stockage réponde (30 s max), puis crée le bucket s'il manque. */
  async init() {
    for (let attempt = 1; ; attempt++) {
      try {
        if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket);
        return;
      } catch (err) {
        if (attempt >= 30) throw err;
        await sleep(1000);
      }
    }
  },

  /** Envoie un flux vers le stockage en calculant taille et empreinte au passage.
   *  `length` (Content-Length) évite un envoi multipart quand la taille est connue. */
  async put(input: Readable, length?: number): Promise<StoredObject> {
    const storageKey = `objects/${randomUUID()}`;
    const { size, sha256 } = await storage.putAt(storageKey, input, { length });
    return { storageKey, size, sha256 };
  },

  /**
   * Envoie un flux à une clé donnée, avec taille, empreinte et premiers octets (détection du
   * type réel d'un fichier). Coupe l'envoi au-delà de `limit` octets.
   */
  async putAt(
    key: string,
    input: Readable,
    { length, limit = maxBytes }: { length?: number; limit?: number } = {},
  ) {
    if (length !== undefined && length > limit) throw tooLarge(limit);
    const hash = createHash("sha256");
    let size = 0;
    let head = Buffer.alloc(0);
    const tap = new PassThrough();
    input.on("data", (chunk: Buffer) => {
      if (head.length < 32) head = Buffer.concat([head, chunk.subarray(0, 32 - head.length)]);
      size += chunk.length;
      hash.update(chunk);
      if (size > limit) {
        input.destroy();
        tap.destroy(tooLarge(limit));
      }
    });
    input.pipe(tap);
    await client.putObject(bucket, key, tap, length);
    return { size, sha256: hash.digest("hex"), head };
  },

  /** Écrit un contenu complet (fichier généré : CSV, JSON, texte). */
  async write(key: string, data: Buffer | string, contentType: string) {
    const body = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    await client.putObject(bucket, key, body, body.length, { "Content-Type": contentType });
  },

  get(storageKey: string) {
    return client.getObject(bucket, storageKey);
  },

  /** Lecture d'une plage d'octets (lecture audio et vidéo avec avance rapide). */
  getRange(key: string, offset: number, length: number) {
    return client.getPartialObject(bucket, key, offset, length);
  },

  /** Taille de l'objet, ou null s'il n'existe pas. */
  async size(key: string) {
    try {
      return (await client.statObject(bucket, key)).size;
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  },

  async copy(from: string, to: string) {
    await client.copyObject(bucket, to, `/${bucket}/${from}`);
  },

  async remove(key: string) {
    await client.removeObject(bucket, key);
  },

  /** Objets sous un préfixe (récursif), triés par nom. */
  async list(prefix: string) {
    const out: { name: string; size: number }[] = [];
    for await (const item of client.listObjectsV2(bucket, prefix, true)) {
      if (item.name) out.push({ name: item.name, size: item.size });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
};
