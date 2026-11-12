// Client HTTP des tests de bout en bout : garde le cookie de session entre les requêtes.
import assert from "node:assert/strict";
import pg from "pg";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
export const run = Math.random().toString(36).slice(2, 7);

/**
 * Dernier code envoyé par e-mail, lu en base : les tests ne reçoivent pas d'e-mails. Les codes
 * sont stockés en clair par better-auth dans `verifications` (valeur `code:tentatives`).
 */
export async function lastCode(sql: string, param: string) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ value: string }>(sql, [param]);
    assert.ok(rows[0], "aucun code trouvé en base");
    return rows[0].value.split(":")[0];
  } finally {
    await db.end();
  }
}

/** Code de confirmation d'adresse envoyé à l'inscription. */
export const signUpCode = (email: string) =>
  lastCode(
    `select value from verifications where identifier = 'email-verification-otp-' || $1
     order by created_at desc limit 1`,
    email,
  );

/** Code de connexion (deuxième étape) en attente pour cet utilisateur. */
export const signInCode = (username: string) =>
  lastCode(
    `select o.value from verifications c
     join verifications o on o.identifier = '2fa-otp-' || c.identifier
     join users u on u.id = c.value
     where c.identifier like '2fa-%' and u.username = $1
     order by o.created_at desc limit 1`,
    username,
  );

export type Res = { status: number; body: any; headers: Headers }; // eslint-disable-line @typescript-eslint/no-explicit-any

export class Client {
  cookie = "";
  constructor(readonly username: string) {}

  async req(method: string, path: string, body?: unknown, raw?: BodyInit): Promise<Res> {
    const headers: Record<string, string> = { Origin: ORIGIN };
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (raw !== undefined) headers["Content-Type"] = "application/octet-stream";
    const res = await fetch(`${API}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : raw,
    });
    const set = res.headers.getSetCookie();
    if (set.length) this.cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // corps non JSON (téléchargement de fichier)
    }
    return { status: res.status, body: parsed, headers: res.headers };
  }
  get = (p: string) => this.req("GET", p);
  post = (p: string, b: unknown = {}) => this.req("POST", p, b);
  patch = (p: string, b: unknown) => this.req("PATCH", p, b);
  put = (p: string, raw: string) => this.req("PUT", p, undefined, raw);
  del = (p: string) => this.req("DELETE", p);

  get email() {
    return `${this.username}@test.local`;
  }

  /** Inscription, puis confirmation de l'adresse avec le code reçu (qui ouvre la session). */
  async signUp() {
    const r = await this.post("/auth/sign-up/email", {
      email: this.email,
      password: "motdepasse123",
      name: this.username,
      username: this.username,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const v = await this.post("/auth/email-otp/verify-email", {
      email: this.email,
      otp: await signUpCode(this.email),
    });
    assert.equal(v.status, 200, JSON.stringify(v.body));
    return this;
  }

  /** Connexion : mot de passe, puis code envoyé par e-mail. */
  async signIn(password = "motdepasse123") {
    const r = await this.post("/auth/sign-in/username", { username: this.username, password });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.twoFactorRedirect, true, "le code par e-mail doit être demandé");
    assert.equal((await this.post("/auth/two-factor/send-otp")).status, 200);
    const v = await this.post("/auth/two-factor/verify-otp", {
      code: await signInCode(this.username),
    });
    assert.equal(v.status, 200, JSON.stringify(v.body));
    return this;
  }
}
