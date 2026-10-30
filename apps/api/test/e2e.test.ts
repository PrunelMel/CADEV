/**
 * Tests de bout en bout de l'API. Ils tournent contre une API lancée (npm run dev)
 * avec une base migrée et le catalogue de licences inséré.
 *
 *   API_URL=http://localhost:4000 npm run test -w apps/api
 *
 * Chaque exécution crée ses propres comptes (suffixe aléatoire) : pas besoin de vider la base.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

const API = process.env.API_URL ?? "http://localhost:4000";
const ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const run = Math.random().toString(36).slice(2, 7);

type Res = { status: number; body: any; headers: Headers }; // eslint-disable-line @typescript-eslint/no-explicit-any

class Client {
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

const anon = new Client("anon");
const alice = new Client(`alice${run}`);
const bob = new Client(`bob${run}`);
const carol = new Client(`carol${run}`);
const org = `labo-${run}`;
const A = () => alice.username;
const B = () => bob.username;

before(async () => {
  await Promise.all([alice.signUp(), bob.signUp(), carol.signUp()]);
});

describe("Comptes", () => {
  test("nom d'utilisateur déjà pris", async () => {
    const dup = new Client(A());
    const r = await dup.post("/auth/sign-up/email", {
      email: `autre${run}@test.local`,
      password: "motdepasse123",
      name: "x",
      username: A(),
    });
    assert.notEqual(r.status, 200);
  });

  test("connexion par nom d'utilisateur", async () => {
    const c = new Client(A());
    const r = await c.post("/auth/sign-in/username", {
      username: A(),
      password: "motdepasse123",
    });
    assert.equal(r.status, 200);
    const me = await c.get("/me/namespaces");
    assert.equal(me.body.username, A());
  });

  test("route protégée sans session : 401 au format unique", async () => {
    const r = await anon.post("/repos", {
      type: "model",
      name: "x",
      licenseId: "mit",
    });
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, "unauthorized");
  });

  test("route inconnue : 404", async () => {
    const r = await anon.get("/nexiste-pas");
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "not_found");
  });
});

describe("Organisations", () => {
  test("création, ajout de membre, dernier admin protégé", async () => {
    const r = await alice.post("/orgs", {
      slug: org,
      name: "Labo",
      description: "Test",
    });
    assert.equal(r.status, 201);
    assert.equal((await alice.post(`/orgs/${org}/members`, { username: B() })).status, 200);
    assert.equal(
      (await bob.post(`/orgs/${org}/members`, { username: carol.username })).status,
      403,
    );
    assert.equal((await alice.del(`/orgs/${org}/members/${A()}`)).status, 409);
    const detail = await anon.get(`/orgs/${org}`);
    assert.equal(detail.body.members.length, 2);
  });

  test("un slug d'organisation ne peut pas reprendre un nom d'utilisateur", async () => {
    const r = await alice.post("/orgs", { slug: B(), name: "Vol" });
    assert.equal(r.status, 409);
  });

  test("slug invalide refusé", async () => {
    const r = await alice.post("/orgs", { slug: "A B", name: "x" });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "validation_error");
  });
});

describe("Dépôts et droits", () => {
  test("création publique, privée et sous organisation", async () => {
    const pub = await alice.post("/repos", {
      type: "model",
      name: "manioc-vit",
      licenseId: "mit",
      description: "Détection des maladies du manioc",
    });
    assert.equal(pub.status, 201);
    const priv = await alice.post("/repos", {
      type: "dataset",
      name: "photos-champs",
      licenseId: "cc-by-nc-4.0",
      visibility: "private",
      provenanceCommunity: "Coopérative de Bohicon",
      provenanceCountry: "Bénin",
    });
    assert.equal(priv.status, 201);
    const orgRepo = await alice.post("/repos", {
      type: "library",
      name: "outils",
      licenseId: "apache-2.0",
      visibility: "private",
      org,
    });
    assert.equal(orgRepo.status, 201);
    assert.equal(orgRepo.body.owner, org);
  });

  test("nom en double : 409, licence inconnue : 400", async () => {
    assert.equal(
      (
        await alice.post("/repos", {
          type: "model",
          name: "manioc-vit",
          licenseId: "mit",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await alice.post("/repos", {
          type: "model",
          name: "z",
          licenseId: "inconnue",
        })
      ).status,
      400,
    );
  });

  test("un non-admin ne crée pas de dépôt dans l'organisation", async () => {
    const r = await bob.post("/repos", {
      type: "model",
      name: "y",
      licenseId: "mit",
      org,
    });
    assert.equal(r.status, 403);
  });

  test("dépôt privé : 404 pour les tiers, visible pour les membres d'organisation", async () => {
    assert.equal((await anon.get(`/repos/${A()}/photos-champs`)).status, 404);
    assert.equal((await bob.get(`/repos/${A()}/photos-champs`)).status, 404);
    assert.equal((await bob.get(`/repos/${org}/outils`)).status, 200);
    assert.equal((await carol.get(`/repos/${org}/outils`)).status, 404);
    const hub = await anon.get("/repos");
    assert.ok(!hub.body.some((r: { name: string }) => r.name === "photos-champs"));
  });

  test("collaborateur : lecture et écriture sur un privé", async () => {
    assert.equal(
      (
        await bob.post(`/repos/${A()}/photos-champs/collaborators`, {
          username: carol.username,
        })
      ).status,
      404,
    );
    const add = await alice.post(`/repos/${A()}/photos-champs/collaborators`, {
      username: carol.username,
    });
    assert.equal(add.status, 200);
    const r = await carol.get(`/repos/${A()}/photos-champs`);
    assert.equal(r.status, 200);
    assert.equal(r.body.permissions.write, true);
    assert.equal(r.body.permissions.owner, false);
    assert.equal(
      (await carol.put(`/repos/${A()}/photos-champs/files/data/a.csv`, "x,y\n1,2\n")).status,
      201,
    );
  });

  test("seul le propriétaire modifie la fiche", async () => {
    assert.equal(
      (
        await carol.patch(`/repos/${A()}/photos-champs`, {
          description: "pirate",
        })
      ).status,
      403,
    );
    const ok = await alice.patch(`/repos/${A()}/manioc-vit`, {
      readme: "# Manioc\nFiche.",
    });
    assert.equal(ok.status, 200);
  });

  test("avertissement de licence uniquement si restrictions", async () => {
    const mit = await anon.get(`/repos/${A()}/manioc-vit`);
    assert.deepEqual(mit.body.license.restrictions, []);
    const nc = await alice.get(`/repos/${A()}/photos-champs`);
    assert.ok(nc.body.license.restrictions.includes("Usage commercial interdit"));
    assert.equal(nc.body.provenanceCountry, "Bénin");
  });
});

describe("Fichiers et versions", () => {
  const base = () => `/repos/${A()}/manioc-vit`;

  test("envoi, téléchargement, empreinte et versions", async () => {
    const up = await alice.put(`${base()}/files/model/config.json?message=init`, '{"a":1}');
    assert.equal(up.status, 201);
    assert.equal(up.body.version, 1);
    const up2 = await alice.put(`${base()}/files/model/config.json`, '{"a":2}');
    assert.equal(up2.body.version, 2);

    const dl = await anon.get(`${base()}/files/model/config.json`);
    assert.equal(dl.status, 200);
    assert.deepEqual(dl.body, { a: 2 });
    assert.equal(dl.headers.get("x-content-sha256"), up2.body.file.sha256);

    const old = await anon.get(`${base()}/files/model/config.json?version=1`);
    assert.deepEqual(old.body, { a: 1 });

    const versions = await anon.get(`${base()}/versions`);
    assert.equal(versions.body.length, 2);
    assert.equal(versions.body[0].message, "Ajout de model/config.json");
  });

  test("écriture refusée aux non-collaborateurs", async () => {
    assert.equal((await bob.put(`${base()}/files/x.txt`, "x")).status, 403);
    assert.equal((await anon.put(`${base()}/files/x.txt`, "x")).status, 401);
  });

  test("chemin dangereux refusé", async () => {
    // `fetch` résout lui-même les segments « .. » : on les encode dans un seul segment.
    const r = await alice.put(`${base()}/files/a%2F..%2Fb.txt`, "x");
    assert.equal(r.status, 400);
  });

  test("suppression crée une version, fichier absent : 404", async () => {
    await alice.put(`${base()}/files/tmp.txt`, "temp");
    const d = await alice.del(`${base()}/files/tmp.txt`);
    assert.equal(d.status, 200);
    assert.equal((await anon.get(`${base()}/files/tmp.txt`)).status, 404);
    assert.equal((await alice.del(`${base()}/files/tmp.txt`)).status, 404);
  });
});

describe("Likes et discussions", () => {
  test("like idempotent", async () => {
    const p = `/repos/${A()}/manioc-vit`;
    await bob.req("PUT", `${p}/like`);
    await bob.req("PUT", `${p}/like`);
    let r = await bob.get(p);
    assert.equal(r.body.likes, 1);
    assert.equal(r.body.liked, true);
    await bob.del(`${p}/like`);
    r = await bob.get(p);
    assert.equal(r.body.likes, 0);
  });

  test("discussion sur dépôt public, refusée sur privé inaccessible", async () => {
    const r = await bob.post(`/repos/${A()}/manioc-vit/discussions`, {
      body: "Bravo",
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.at(-1).author, B());
    assert.equal(
      (await bob.post(`/repos/${A()}/photos-champs/discussions`, { body: "x" })).status,
      404,
    );
  });
});

describe("Pull requests", () => {
  const base = () => `/repos/${A()}/manioc-vit`;

  test("proposition, droits de fusion, fusion", async () => {
    const pr = await bob.post(`${base()}/pulls`, { title: "Poids quantifiés" });
    assert.equal(pr.status, 201);
    const n = pr.body.number;
    assert.equal((await bob.put(`${base()}/pulls/${n}/files/model/int8.onnx`, "bin")).status, 201);
    assert.equal((await carol.put(`${base()}/pulls/${n}/files/x`, "x")).status, 403);
    assert.equal((await carol.post(`${base()}/pulls/${n}/merge`)).status, 403);
    const merged = await alice.post(`${base()}/pulls/${n}/merge`);
    assert.equal(merged.status, 200);
    const file = await anon.get(`${base()}/files/model/int8.onnx`);
    assert.equal(file.body, "bin");
    const detail = await anon.get(`${base()}/pulls/${n}`);
    assert.equal(detail.body.status, "merged");
  });

  test("fusion refusée si un fichier a changé depuis la base", async () => {
    const pr = await bob.post(`${base()}/pulls`, { title: "Conflit" });
    const n = pr.body.number;
    await bob.put(`${base()}/pulls/${n}/files/model/config.json`, '{"a":3}');
    await alice.put(`${base()}/files/model/config.json`, '{"a":4}');
    const detail = await anon.get(`${base()}/pulls/${n}`);
    assert.deepEqual(detail.body.conflicts, ["model/config.json"]);
    assert.equal((await alice.post(`${base()}/pulls/${n}/merge`)).status, 409);
    assert.equal((await bob.post(`${base()}/pulls/${n}/close`)).status, 204);
  });

  test("PR vide non fusionnable", async () => {
    const pr = await bob.post(`${base()}/pulls`, { title: "Vide" });
    assert.equal((await alice.post(`${base()}/pulls/${pr.body.number}/merge`)).status, 400);
  });
});

describe("Problèmes, solutions, contributions", () => {
  let problemId = "";

  test("validation des champs", async () => {
    const r = await alice.post("/problems", { title: "x" });
    assert.equal(r.status, 400);
    assert.ok(r.body.error.details.length > 0);
  });

  test("publication et filtres", async () => {
    const r = await alice.post("/problems", {
      title: `Détecter les maladies du manioc ${run}`,
      description: "Les agriculteurs perdent une partie de leur récolte sans diagnostic rapide.",
      sector: "Agriculture",
      country: "Bénin",
      connectivityConstraint: "Hors ligne",
      evaluationCriteria: "Précision sur photos prises au champ",
    });
    assert.equal(r.status, 201);
    problemId = r.body.id;
    const list = await anon.get("/problems?sector=Agriculture&country=B%C3%A9nin");
    assert.ok(list.body.some((p: { id: string }) => p.id === problemId));
    const other = await anon.get("/problems?country=Maroc");
    assert.ok(!other.body.some((p: { id: string }) => p.id === problemId));
  });

  test("solution : droits d'écriture, dépôt public, pas de doublon", async () => {
    assert.equal(
      (
        await bob.post(`/problems/${problemId}/solutions`, {
          repo: `${A()}/manioc-vit`,
          summary: "Je propose ce modèle",
        })
      ).status,
      403,
    );
    await bob.post("/repos", {
      type: "model",
      name: "manioc-lite",
      licenseId: "cc-by-nc-4.0",
    });
    const s = await bob.post(`/problems/${problemId}/solutions`, {
      repo: `${B()}/manioc-lite`,
      summary: "Modèle léger pour téléphone d'entrée de gamme",
      fieldResults: "Testé sur 300 photos à Bohicon",
    });
    assert.equal(s.status, 201);
    assert.equal(
      (
        await bob.post(`/problems/${problemId}/solutions`, {
          repo: `${B()}/manioc-lite`,
          summary: "Encore une fois",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await alice.post(`/problems/${problemId}/solutions`, {
          repo: `${A()}/photos-champs`,
          summary: "Dépôt privé proposé",
        })
      ).status,
      400,
    );
  });

  test("seul l'auteur du problème valide", async () => {
    const detail = await anon.get(`/problems/${problemId}`);
    const sol = detail.body.solutions[0];
    assert.ok(sol.license.restrictions.length > 0);
    assert.equal(
      (
        await bob.post(`/solutions/${sol.id}/validate`, {
          decision: "accepted",
        })
      ).status,
      403,
    );
    const ok = await alice.post(`/solutions/${sol.id}/validate`, {
      decision: "accepted",
      comment: "Concluant",
    });
    assert.equal(ok.status, 200);
    const after = await alice.get(`/problems/${problemId}`);
    assert.equal(after.body.solutions[0].status, "accepted");
    assert.equal(after.body.solutions[0].validations[0].comment, "Concluant");
    assert.equal(after.body.isAuthor, true);
  });

  test("le profil met en avant les problèmes résolus", async () => {
    const p = await anon.get(`/users/${B()}`);
    assert.equal(p.status, 200);
    assert.equal(p.body.solved.length, 1);
    assert.equal(p.body.solved[0].problem.id, problemId);
  });

  test("contributions de données", async () => {
    assert.equal(
      (
        await carol.post(`/problems/${problemId}/contributions`, {
          description: "Photos de feuilles",
          provenanceCommunity: "x",
          provenanceCountry: "Bénin",
          dataset: `${A()}/manioc-vit`,
        })
      ).status,
      400,
    );
    const c = await carol.post(`/problems/${problemId}/contributions`, {
      description: "200 photos de feuilles malades",
      provenanceCommunity: "Coopérative de Bohicon",
      provenanceCountry: "Bénin",
    });
    assert.equal(c.status, 201);
    const v = await alice.post(`/contributions/${c.body.id}/validate`, {
      decision: "rejected",
    });
    assert.equal(v.status, 200);
  });

  test("discussion sur problème", async () => {
    const r = await carol.post(`/problems/${problemId}/discussions`, {
      body: "Question",
    });
    assert.equal(r.status, 201);
  });

  test("recherche en langage courant : problème puis solution", async () => {
    const r = await anon.get(`/search?q=${encodeURIComponent("maladies du manioc")}`);
    const p = r.body.problems.find((x: { id: string }) => x.id === problemId);
    assert.ok(p, "le problème doit remonter");
    assert.equal(p.solutions[0].repo.name, "manioc-lite");
    assert.ok(!r.body.repos.some((x: { name: string }) => x.name === "manioc-lite"));
  });

  test("un dépôt rendu privé disparaît des solutions affichées", async () => {
    await bob.patch(`/repos/${B()}/manioc-lite`, { visibility: "private" });
    const d = await anon.get(`/problems/${problemId}`);
    assert.equal(d.body.solutions.length, 0);
    await bob.patch(`/repos/${B()}/manioc-lite`, { visibility: "public" });
  });

  test("identifiant de problème invalide : 400", async () => {
    assert.equal((await anon.get("/problems/abc")).status, 400);
  });
});

describe("Nouveautés : statut, fiche technique, tableau de bord, suggestions", () => {
  let problemId = "";

  test("fiche technique et filtres terrain du hub", async () => {
    const r = await bob.post("/repos", {
      type: "model",
      name: "transcription-fon",
      licenseId: "mit",
      // Le suffixe du run le distingue des dépôts laissés par les exécutions précédentes.
      description: `Transcription de la parole en fon ${run}`,
      task: "Reconnaissance vocale",
      languages: ["Fon", "Français"],
      worksOffline: true,
      targetHardware: "Android 2 Go",
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.worksOffline, true);
    assert.equal(r.body.ownerKind, "user");
    const offline = await anon.get("/repos?offline=true&language=fon");
    assert.ok(offline.body.some((x: { name: string }) => x.name === "transcription-fon"));
    assert.ok(!offline.body.some((x: { name: string }) => x.name === "manioc-vit"));
    const langs = await anon.get("/languages");
    assert.ok(langs.body.includes("Fon"));
    const bad = await bob.post("/repos", {
      type: "model",
      name: "w",
      licenseId: "mit",
      languages: "fon",
    });
    assert.equal(bad.status, 400);
  });

  test("suggestions : dépôts pertinents non encore proposés, compatibilité terrain", async () => {
    const p = await alice.post("/problems", {
      title: `Transcription de la parole en fon ${run}`,
      description: "Transcrire automatiquement les messages vocaux des producteurs.",
      sector: "Agriculture",
      country: "Bénin",
      connectivityConstraint: "Hors ligne",
      languageConstraint: "Fon",
      evaluationCriteria: "Taux d'erreur par mot sous 25 %",
    });
    problemId = p.body.id;
    const s = await anon.get(`/problems/${problemId}/suggestions`);
    const mine = (x: { owner: string; name: string }) =>
      x.owner === B() && x.name === "transcription-fon";
    const hit = s.body.find(mine);
    assert.ok(hit, "le dépôt doit être suggéré");
    assert.equal(hit.fits.offline, true);
    assert.deepEqual(hit.fits.languages, ["Fon"]);
    await bob.post(`/problems/${problemId}/solutions`, {
      repo: `${B()}/transcription-fon`,
      summary: "Modèle léger hors ligne",
    });
    const after = await anon.get(`/problems/${problemId}/suggestions`);
    assert.ok(!after.body.some(mine));
  });

  test("tableau de bord : privés, décisions en attente, suivi", async () => {
    const a = await alice.get("/me/dashboard");
    assert.equal(a.status, 200);
    const names = a.body.repos.map((r: { name: string }) => r.name);
    assert.ok(names.includes("photos-champs"), "dépôt privé visible par son propriétaire");
    assert.ok(names.includes("outils"), "dépôt d'organisation administrée");
    assert.ok(
      a.body.toReview.solutions.some((x: { problemId: string }) => x.problemId === problemId),
    );
    const c = await carol.get("/me/dashboard");
    assert.ok(
      c.body.repos.some((r: { name: string }) => r.name === "photos-champs"),
      "collaboration",
    );
    assert.ok(c.body.mine.contributions.length >= 1);
    const b = await bob.get("/me/dashboard");
    assert.ok(b.body.mine.solutions.some((x: { problemId: string }) => x.problemId === problemId));
    assert.equal((await anon.get("/me/dashboard")).status, 401);
  });

  test("édition et statut réservés à l'auteur, problème fermé verrouillé", async () => {
    assert.equal((await bob.patch(`/problems/${problemId}`, { status: "closed" })).status, 403);
    const e = await alice.patch(`/problems/${problemId}`, {
      status: "closed",
      country: "Togo",
    });
    assert.equal(e.status, 200);
    assert.equal(e.body.status, "closed");
    assert.equal(e.body.country, "Togo");
    assert.equal((await alice.patch(`/problems/${problemId}`, { status: "fini" })).status, 400);
    const closed = await anon.get("/problems?status=closed");
    assert.ok(closed.body.some((p: { id: string }) => p.id === problemId));
    const r = await carol.post(`/problems/${problemId}/contributions`, {
      description: "Enregistrements vocaux",
      provenanceCommunity: "x",
      provenanceCountry: "Togo",
    });
    assert.equal(r.status, 400);
  });

  test("compteur de solutions cohérent avec la page du problème", async () => {
    const list = await anon.get(`/problems?q=${encodeURIComponent(run)}`);
    for (const p of list.body) {
      const d = await anon.get(`/problems/${p.id}`);
      assert.equal(p.solutionCount, d.body.solutions.length);
    }
  });
});

describe("Deuxième passe : travaux en cours, carte, garde-fous", () => {
  let problemId = "";

  before(async () => {
    const p = await alice.post("/problems", {
      title: `Prévoir les crues du fleuve Ouémé ${run}`,
      description: "Les villages riverains sont prévenus trop tard des montées des eaux.",
      sector: "Environnement",
      country: "Bénin",
      evaluationCriteria: "Alerte au moins 48 heures avant la crue",
    });
    problemId = p.body.id;
  });

  test("déclarer, mettre à jour et retirer son travail en cours", async () => {
    assert.equal((await anon.req("PUT", `/problems/${problemId}/work`, {})).status, 401);
    const w = await bob.req("PUT", `/problems/${problemId}/work`, { note: "Modèle hydrologique" });
    assert.equal(w.status, 200);
    assert.equal(w.body[0].username, B());
    const u = await bob.req("PUT", `/problems/${problemId}/work`, { note: "Données satellite" });
    assert.equal(u.body.length, 1, "une seule déclaration par personne");
    assert.equal(u.body[0].note, "Données satellite");
    const d = await anon.get(`/problems/${problemId}`);
    assert.equal(d.body.workers.length, 1);
    const dash = await bob.get("/me/dashboard");
    assert.ok(dash.body.working.some((x: { problemId: string }) => x.problemId === problemId));
    const r = await bob.del(`/problems/${problemId}/work`);
    assert.equal(r.body.length, 0);
  });

  test("impossible de se déclarer sur un problème fermé", async () => {
    await alice.patch(`/problems/${problemId}`, { status: "closed" });
    const r = await bob.req("PUT", `/problems/${problemId}/work`, {});
    assert.equal(r.status, 400);
  });

  test("répartition des problèmes par pays", async () => {
    const r = await anon.get("/problem-countries");
    const benin = r.body.find((c: { country: string }) => c.country === "Bénin");
    assert.ok(benin.total >= 1);
    assert.ok(benin.open <= benin.total);
  });

  test("nom de dépôt unique sans tenir compte de la casse", async () => {
    const r = await alice.post("/repos", { type: "model", name: "Manioc-VIT", licenseId: "mit" });
    assert.equal(r.status, 409);
  });

  test("le propriétaire n'est pas ajouté comme collaborateur", async () => {
    const r = await alice.post(`/repos/${A()}/manioc-vit/collaborators`, { username: A() });
    assert.equal(r.status, 400);
  });

  test("message composé uniquement d'espaces refusé", async () => {
    const r = await bob.post(`/repos/${A()}/manioc-vit/discussions`, { body: "   " });
    assert.equal(r.status, 400);
  });
});
