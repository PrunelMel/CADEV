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
    if (length !== undefined && length > maxBytes) {
      throw new AppError(413, "too_large", `Fichier limité à ${env.MAX_UPLOAD_MB} Mo`);
    }
    const storageKey = `objects/${randomUUID()}`;
    const hash = createHash("sha256");
    let size = 0;
    const tap = new PassThrough();
    input.on("data", (chunk: Buffer) => {
      size += chunk.length;
      hash.update(chunk);
      if (size > maxBytes) {
        input.destroy();
        tap.destroy(new AppError(413, "too_large", `Fichier limité à ${env.MAX_UPLOAD_MB} Mo`));
      }
    });
    input.pipe(tap);
    await client.putObject(bucket, storageKey, tap, length);
    return { storageKey, size, sha256: hash.digest("hex") };
  },

  get(storageKey: string) {
    return client.getObject(bucket, storageKey);
  },
};
