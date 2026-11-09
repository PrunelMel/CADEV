// Client HTTP des tests de bout en bout : garde le cookie de session entre les requêtes.
import assert from "node:assert/strict";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
export const run = Math.random().toString(36).slice(2, 7);

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

  async signUp() {
    const r = await this.post("/auth/sign-up/email", {
      email: `${this.username}@test.local`,
      password: "motdepasse123",
      name: this.username,
      username: this.username,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return this;
  }
}
