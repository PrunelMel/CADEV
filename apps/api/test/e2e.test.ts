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
import { Client, run, signInCode, signUpCode } from "./client.js";

const anon = new Client("anon");
const alice = new Client(`alice${run}`);
const bob = new Client(`bob${run}`);
const carol = new Client(`carol${run}`);
const org = `labo-${run}`;
const A = () => alice.username;
const B = () => bob.username;
/** Problème auquel les dépôts des tests sont liés : un dépôt n'existe jamais sans problème. */
let baseProblem = "";

before(async () => {
  await Promise.all([alice.signUp(), bob.signUp(), carol.signUp()]);
  const p = await alice.post("/problems", {
    title: `Problème de référence ${run}`,
    description: "Problème auquel les dépôts créés par les tests sont rattachés.",
    sector: "Agriculture",
    country: "Bénin",
  });
  baseProblem = p.body.id;
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

  test("connexion : mot de passe seul insuffisant, puis code reçu par e-mail", async () => {
    const c = new Client(A());
    const r = await c.post("/auth/sign-in/username", {
      username: A(),
      password: "motdepasse123",
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.twoFactorRedirect, true);
    assert.equal((await c.get("/me/namespaces")).status, 401, "pas de session avant le code");
    assert.equal((await c.post("/auth/two-factor/send-otp")).status, 200);
    const bad = await c.post("/auth/two-factor/verify-otp", { code: "000000" });
    assert.notEqual(bad.status, 200, "un mauvais code est refusé");
    const ok = await c.post("/auth/two-factor/verify-otp", { code: await signInCode(A()) });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const me = await c.get("/me/namespaces");
    assert.equal(me.body.username, A());
  });

  test("inscription : pas de session avant la confirmation de l'adresse", async () => {
    const d = new Client(`dora${run}`);
    const r = await d.post("/auth/sign-up/email", {
      email: d.email,
      password: "motdepasse123",
      name: "Dora",
      username: d.username,
    });
    assert.equal(r.status, 200);
    assert.equal((await d.get("/me/namespaces")).status, 401);
    const blocked = await d.post("/auth/sign-in/username", {
      username: d.username,
      password: "motdepasse123",
    });
    assert.equal(blocked.status, 403, "adresse non confirmée");
    const bad = await d.post("/auth/email-otp/verify-email", { email: d.email, otp: "000000" });
    assert.notEqual(bad.status, 200);
    const ok = await d.post("/auth/email-otp/verify-email", {
      email: d.email,
      otp: await signUpCode(d.email),
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal((await d.get("/me/namespaces")).body.username, d.username);
  });

  test("route protégée sans session : 401 au format unique", async () => {
    const r = await anon.post("/repos", {
      problemId: baseProblem,
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
      problemId: baseProblem,
      type: "model",
      name: "manioc-vit",
      licenseId: "mit",
      description: "Détection des maladies du manioc",
      stage: "solution",
    });
    assert.equal(pub.status, 201);
    assert.equal(pub.body.problem.id, baseProblem);
    const priv = await alice.post("/repos", {
      problemId: baseProblem,
      type: "dataset",
      name: "photos-champs",
      licenseId: "cc-by-nc-4.0",
      visibility: "private",
      provenanceCommunity: "Coopérative de Bohicon",
      provenanceCountry: "Bénin",
    });
    assert.equal(priv.status, 201);
    const orgRepo = await alice.post("/repos", {
      problemId: baseProblem,
      type: "library",
      name: "outils",
      licenseId: "apache-2.0",
      visibility: "private",
      org,
    });
    assert.equal(orgRepo.status, 201);
    assert.equal(orgRepo.body.owner, org);
  });

  test("un dépôt sans problème, ou avec un problème inconnu, est refusé", async () => {
    const none = await alice.post("/repos", { type: "model", name: "seul", licenseId: "mit" });
    assert.equal(none.status, 400);
    const unknown = await alice.post("/repos", {
      problemId: "00000000-0000-4000-8000-000000000000",
      type: "model",
      name: "seul",
      licenseId: "mit",
    });
    assert.equal(unknown.status, 400);
  });

  test("en construction : README et fiche seulement hors de l'équipe", async () => {
    const r = await bob.post("/repos", {
      problemId: baseProblem,
      type: "model",
      name: "brouillon",
      licenseId: "mit",
      readme: "# Brouillon\nCe que je prépare.",
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.stage, "under_construction");
    const base = `/repos/${B()}/brouillon`;
    assert.equal((await bob.put(`${base}/files/poids.bin`, "bin")).status, 201);
    const seen = await anon.get(base);
    assert.equal(seen.status, 200);
    assert.equal(seen.body.readme, "# Brouillon\nCe que je prépare.");
    assert.deepEqual(seen.body.files, []);
    assert.equal(seen.body.version, null);
    assert.equal(seen.body.permissions.full, false);
    assert.equal((await anon.get(`${base}/files/poids.bin`)).status, 403);
    assert.equal((await anon.get(`${base}/versions`)).status, 403);
    assert.equal((await alice.post(`${base}/pulls`, { title: "Idée" })).status, 403);
    assert.equal((await alice.get(`${base}/discussions`)).status, 403);
    const own = await bob.get(base);
    assert.equal(own.body.files.length, 1, "le propriétaire voit tout");
    await bob.patch(base, { stage: "solution" });
    assert.equal((await anon.get(`${base}/files/poids.bin`)).status, 200);
  });

  test("nom en double : 409, licence inconnue : 400", async () => {
    assert.equal(
      (
        await alice.post("/repos", {
          problemId: baseProblem,
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
          problemId: baseProblem,
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
      problemId: baseProblem,
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
      connectivityConstraint: ["Hors ligne"],
      evaluationCriteria: "Précision sur photos prises au champ",
    });
    assert.equal(r.status, 201);
    problemId = r.body.id;
    const list = await anon.get("/problems?sector=Agriculture&country=B%C3%A9nin");
    assert.ok(list.body.some((p: { id: string }) => p.id === problemId));
    const other = await anon.get("/problems?country=Maroc");
    assert.ok(!other.body.some((p: { id: string }) => p.id === problemId));
  });

  test("solutions : dépôts publics liés au problème, privés exclus", async () => {
    const lite = await bob.post("/repos", {
      problemId,
      type: "model",
      name: "manioc-lite",
      licenseId: "cc-by-nc-4.0",
      stage: "solution",
      readme: "# Manioc lite\n\n## Résultats terrain\n\nTesté sur 300 photos à Bohicon.",
    });
    assert.equal(lite.status, 201);
    await alice.post("/repos", {
      problemId,
      type: "dataset",
      name: "photos-privees",
      licenseId: "mit",
      visibility: "private",
      stage: "solution",
    });
    await carol.post("/repos", {
      problemId,
      type: "library",
      name: "piste",
      licenseId: "mit",
    });
    const d = await anon.get(`/problems/${problemId}`);
    const names = (xs: { name: string }[]) => xs.map((x) => x.name);
    assert.deepEqual(names(d.body.solutions.solutions), ["manioc-lite"]);
    assert.deepEqual(names(d.body.solutions.inProgress), ["piste"]);
    assert.ok(d.body.solutions.solutions[0].license.restrictions.length > 0);
    assert.equal(d.body.solutions.featured.by, "community");
  });

  test("mise en avant : l'auteur du problème seul, une solution liée seulement", async () => {
    const path = `/problems/${problemId}/featured`;
    assert.equal((await bob.req("PUT", path, { repo: `${B()}/manioc-lite` })).status, 403);
    assert.equal((await alice.req("PUT", path, { repo: `${carol.username}/piste` })).status, 400);
    const ok = await alice.req("PUT", path, { repo: `${B()}/manioc-lite` });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.featured.by, "author");
    const reset = await alice.req("PUT", path, { repo: null });
    assert.equal(reset.body.featured.by, "community");
    await alice.req("PUT", path, { repo: `${B()}/manioc-lite` });
    assert.equal((await anon.get(`/repos/${B()}/manioc-lite`)).body.featured, true);
  });

  test("plus de validation par l'auteur du problème", async () => {
    assert.equal((await alice.post(`/solutions/x/validate`, { decision: "accepted" })).status, 404);
  });

  test("le profil met en avant les problèmes résolus", async () => {
    const p = await anon.get(`/users/${B()}`);
    assert.equal(p.status, 200);
    const s = p.body.solved.find((x: { problem: { id: string } }) => x.problem.id === problemId);
    assert.ok(s);
    assert.equal(s.featured, true);
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
    const v = await alice.post(`/contributions/${c.body.id}/validate`, { decision: "rejected" });
    assert.equal(v.status, 404, "personne ne valide une contribution à un problème");
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
    assert.equal(p.solutions[0].name, "manioc-lite");
    assert.equal(p.solutions[0].stage, "solution");
    assert.ok(!r.body.repos.some((x: { name: string }) => x.name === "manioc-lite"));
  });

  test("un dépôt rendu privé disparaît des solutions affichées", async () => {
    await bob.patch(`/repos/${B()}/manioc-lite`, { visibility: "private" });
    const d = await anon.get(`/problems/${problemId}`);
    assert.equal(d.body.solutions.solutions.length, 0);
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
      problemId: baseProblem,
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
      problemId: baseProblem,
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
      connectivityConstraint: ["Hors ligne"],
      languageConstraint: ["Fon"],
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
    // Lié à ce problème, le dépôt n'est plus une suggestion mais une de ses solutions.
    const moved = await bob.patch(`/repos/${B()}/transcription-fon`, {
      problemId,
      stage: "solution",
    });
    assert.equal(moved.body.problem.id, problemId);
    const after = await anon.get(`/problems/${problemId}/suggestions`);
    assert.ok(!after.body.some(mine));
    const d = await anon.get(`/problems/${problemId}`);
    assert.ok(d.body.solutions.solutions.some(mine));
  });

  test("tableau de bord : privés, décisions en attente, suivi", async () => {
    const a = await alice.get("/me/dashboard");
    assert.equal(a.status, 200);
    const names = a.body.repos.map((r: { name: string }) => r.name);
    assert.ok(names.includes("photos-champs"), "dépôt privé visible par son propriétaire");
    assert.ok(names.includes("outils"), "dépôt d'organisation administrée");
    assert.ok(a.body.repos.every((r: { problem: { id: string } }) => r.problem.id));
    assert.equal(a.body.toReview.solutions, undefined, "plus de décision sur les solutions");
    const c = await carol.get("/me/dashboard");
    assert.ok(
      c.body.repos.some((r: { name: string }) => r.name === "photos-champs"),
      "collaboration",
    );
    assert.ok(c.body.mine.contributions.length >= 1);
    const b = await bob.get("/me/dashboard");
    assert.ok(
      b.body.repos.some((r: { problem: { id: string } }) => r.problem.id === problemId),
      "ses dépôts avec leur problème",
    );
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

  test("fermeture : le propriétaire d'un dépôt lié est notifié, pas l'auteur", async () => {
    const n = await bob.get("/me/notifications");
    assert.equal(n.status, 200);
    const hit = n.body.items.find(
      (x: { kind: string; problem: { id: string } }) =>
        x.kind === "problem_closed" && x.problem.id === problemId,
    );
    assert.ok(hit, "notification de fermeture");
    assert.equal(hit.repo.name, "transcription-fon");
    assert.ok(n.body.unread >= 1);
    const a = await alice.get("/me/notifications");
    assert.ok(!a.body.items.some((x: { problem: { id: string } }) => x.problem.id === problemId));
    const read = await bob.post("/me/notifications/read", { ids: [hit.id] });
    assert.ok(read.body.items.find((x: { id: string }) => x.id === hit.id).readAt);
    assert.equal((await anon.get("/me/notifications")).status, 401);
    // Un dépôt peut encore être lié à un problème fermé.
    const late = await bob.post("/repos", {
      problemId,
      type: "model",
      name: "tardif",
      licenseId: "mit",
    });
    assert.equal(late.status, 201);
    assert.equal(late.body.problem.status, "closed");
  });

  test("le hub range les dépôts d'un problème fermé derrière les autres", async () => {
    const hub = await anon.get("/repos");
    const statuses = hub.body.map((r: { problem: { status: string } }) => r.problem.status);
    const firstClosed = statuses.indexOf("closed");
    if (firstClosed >= 0)
      assert.ok(statuses.slice(firstClosed).every((x: string) => x === "closed"));
  });

  test("compteur de solutions cohérent avec la page du problème", async () => {
    const list = await anon.get(`/problems?q=${encodeURIComponent(run)}`);
    for (const p of list.body) {
      const d = await anon.get(`/problems/${p.id}`);
      assert.equal(p.solutionCount, d.body.solutions.solutions.length);
      assert.equal(p.inProgressCount, d.body.solutions.inProgress.length);
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
    const r = await alice.post("/repos", {
      problemId: baseProblem,
      type: "model",
      name: "Manioc-VIT",
      licenseId: "mit",
    });
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
