import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
  BETTER_AUTH_SECRET: z.string().min(32),
  S3_ENDPOINT: z.string().default("localhost"),
  S3_PORT: z.coerce.number().default(9000),
  S3_USE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().default("platform"),
  MAX_UPLOAD_MB: z.coerce.number().default(500),
});

export const env = schema.parse(process.env);
