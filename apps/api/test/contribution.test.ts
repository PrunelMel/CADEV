/**
 * Contribution de données : page-formulaire conçue par l'auteur du problème, réponses des
 * contributeurs, fichiers générés, relecture. Mêmes conditions que e2e.test.ts (API lancée).
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { Client, run } from "./client.js";

const anon = new Client("anon");
const author = new Client(`auteur${run}`);
const bob = new Client(`contrib${run}`);
const carol = new Client(`relect${run}`);

// En-tête WAV minimal : la signature binaire suffit à la détection du type.
const wav = (seed: number) =>
  Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.alloc(4),
    Buffer.from("WAVEfmt "),
    Buffer.alloc(32, seed),
  ]);

let problemId = "";
let base = "";
let audioId = "";

const upload = (c: Client, body: Buffer | string, query: string) =>
  c.req("POST", `${base}/resources?${query}`, undefined, body);

/** Formulaire de démonstration : un audio, une transcription liée, un choix, un e-mail, une relecture. */
function form(title = `Transcrire la darija ${run}`) {
  return {
    version: 1,
    mode: "visual",
    problemId,
    revision: 0,
    title,
    intro: "Écoutez puis transcrivez.",
    blocks: [
      {
        id: "b_audio00001",
        type: "audio",
        key: "ecoutez",
        label: "Écoutez",
        props: { resourceId: audioId || null },
      },
      {
        id: "b_transcr001",
        type: "textarea",
        key: "transcription",
        label: "Transcrivez",
        required: true,
        linkedTo: "b_audio00001",
        props: { placeholder: "", maxLength: 1000 },
      },
      {
        id: "b_certitude1",
        type: "radio",
        key: "certitude",
        label: "Certitude",
        props: { options: ["Sûr(e)", "Incertain(e)"] },
      },
      {
        id: "b_contact001",
        type: "email",
        key: "contact",
        label: "E-mail",
        props: { placeholder: "" },
      },
      {
        id: "b_relecture1",
        type: "validation",
        key: "relecture",
        label: "Relisez",
        props: { targetKeys: null, minAgreements: 2 },
      },
    ],
    storage: { format: "csv", includeContributor: true },
  };
}

before(async () => {
  await Promise.all([author.signUp(), bob.signUp(), carol.signUp()]);
  const p = await author.post("/problems", {
    title: `Transcrire des messages en darija ${run}`,
    description: "Les messages vocaux des clients ne sont pas compris par les outils actuels.",
    sector: "Langues et traduction",
    country: "Maroc",
  });
  assert.equal(p.status, 201);
  problemId = p.body.id;
  base = `/problems/${problemId}/contribution`;
});

describe("Contribution de données : conception", () => {
  test("brouillon réservé à l'auteur, formulaire non publié", async () => {
    assert.equal((await anon.get(`${base}/form/draft`)).status, 401);
    assert.equal((await bob.get(`${base}/form/draft`)).status, 403);
    const d = await author.get(`${base}/form/draft`);
    assert.equal(d.status, 200);
    assert.equal(d.body.published, 0);
    assert.equal((await bob.get(`${base}/form`)).body.error.code, "not_published");
    assert.equal((await anon.get(`${base}/summary`)).body.published, false);
  });

  test("médias : signature binaire, type attendu, doublons", async () => {
    assert.equal((await upload(bob, wav(1), "name=x.wav")).status, 403);
    const html = await upload(author, "<html><script>alert(1)</script></html>", "name=page.wav");
    assert.equal(html.status, 415);
    assert.equal((await upload(author, wav(1), "kind=image&name=son.wav")).status, 415);
    const up = await upload(author, wav(1), "kind=audio&name=Message%20vocal%20%C3%A9t%C3%A9.wav");
    assert.equal(up.status, 201, JSON.stringify(up.body));
    assert.equal(up.body.resource.kind, "audio");
    assert.equal(up.body.resource.name, "Message vocal été.wav");
    audioId = up.body.resource.id;
    const again = await upload(author, wav(1), "name=copie.wav");
    assert.equal(again.status, 200);
    assert.equal(again.body.duplicate, true);
    assert.equal(again.body.resource.id, audioId);
  });

  test("enregistrement du brouillon : validation structurelle", async () => {
    const bad = await author.req("PUT", `${base}/form/draft`, { ...form(), blocks: [{ id: "x" }] });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.error.details.length > 0);
    const unknownMedia = form();
    unknownMedia.blocks[0].props = { resourceId: "r_inexistant01" };
    assert.equal((await author.req("PUT", `${base}/form/draft`, unknownMedia)).status, 422);
    const ok = await author.req("PUT", `${base}/form/draft`, form());
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.form.problemId, problemId);
  });

  test("champs collectés et publication", async () => {
    const f = await author.get(`${base}/fields`);
    assert.deepEqual(
      f.body.fields.map((x: { key: string; kind: string }) => `${x.key}:${x.kind}`),
      ["ecoutez:media_ref", "transcription:value", "certitude:value", "contact:value"],
    );
    assert.equal(f.body.fields.find((x: { key: string }) => x.key === "contact").pii, true);
    assert.equal((await bob.post(`${base}/form/publish`)).status, 403);
    const pub = await author.post(`${base}/form/publish`);
    assert.equal(pub.status, 201, JSON.stringify(pub.body));
    assert.equal(pub.body.form.revision, 1);
    assert.ok(pub.body.form.blocks.every((b: { keyLocked: boolean }) => b.keyLocked));
    const pf = await anon.get(`${base}/form`);
    assert.equal(pf.status, 200);
    assert.equal(pf.body.form.revision, 1);
    assert.equal((await anon.get(`${base}/summary`)).body.published, true);
  });

  test("une clé publiée ne change plus", async () => {
    const f = form();
    f.blocks[1].key = "autre_nom";
    const r = await author.req("PUT", `${base}/form/draft`, f);
    assert.equal(r.status, 422);
    assert.ok(r.body.error.details.some((d: { code: string }) => d.code === "key_locked"));
  });

  test("média publié servi à tous, avec les requêtes partielles", async () => {
    const full = await anon.get(`${base}/resources/${audioId}/file`);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("content-type"), "audio/wav");
    const res = await fetch(
      `${process.env.API_URL ?? "http://localhost:4000"}/api${base}/resources/${audioId}/file`,
      {
        headers: { Range: "bytes=0-3" },
      },
    );
    assert.equal(res.status, 206);
    assert.equal(Buffer.from(await res.arrayBuffer()).toString("latin1"), "RIFF");
  });

  test("arborescence générée automatiquement", async () => {
    const tree = (await author.get(`${base}/tree`)).body.tree;
    const names = (nodes: { name: string; children?: unknown[] }[], prefix = ""): string[] =>
      nodes.flatMap((n) => [
        `${prefix}${n.name}`,
        ...names((n.children ?? []) as typeof nodes, `${prefix}${n.name}/`),
      ]);
    const all = names(tree);
    assert.ok(all.includes("form/form.json"));
    assert.ok(all.includes("form/revisions/rev-0001.json"));
    assert.ok(all.some((n) => n.startsWith("resources/audio/r_")));
    assert.ok(all.includes("resources/images"));
    assert.ok(all.includes("responses/responses.csv"));
    assert.ok(all.includes("responses/schema.json"));
  });
});

describe("Contribution de données : réponses", () => {
  test("envoi : connexion requise, validation contre la version publiée, idempotence", async () => {
    const body = (answers: Record<string, unknown>, submissionId = `sub-${run}-01`) => ({
      submissionId,
      formRevision: 1,
      answers,
    });
    assert.equal(
      (await anon.post(`${base}/submissions`, body({ transcription: "x" }))).status,
      401,
    );
    const bad = await bob.post(
      `${base}/submissions`,
      body({ certitude: "Peut-être", inconnu: "x" }),
    );
    assert.equal(bad.status, 422);
    assert.ok(bad.body.error.details.transcription);
    assert.ok(bad.body.error.details.certitude);
    assert.ok(bad.body.error.details.inconnu);
    const ok = await bob.post(
      `${base}/submissions`,
      body({
        transcription: "=1+1 salam, kifach",
        certitude: "Sûr(e)",
        contact: "bob@exemple.org",
      }),
    );
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const dup = await bob.post(`${base}/submissions`, body({ transcription: "autre" }));
    assert.equal(dup.status, 200);
    assert.equal(dup.body.duplicate, true);
  });

  test("fichier CSV : colonnes, nom du média, formule neutralisée", async () => {
    assert.equal((await bob.get(`${base}/submissions/export`)).status, 403);
    const r = await author.get(`${base}/submissions/export`);
    assert.equal(r.status, 200);
    const text = String(r.body).replace(/^\uFEFF/, "");
    const [header, line] = text.split("\r\n");
    assert.equal(
      header,
      "submission_id,submitted_at,contributor_id,form_revision,ecoutez,transcription,certitude,contact",
    );
    assert.match(line, /r_[a-z0-9]+-message-vocal-ete\.wav/);
    assert.match(line, /"'=1\+1 salam, kifach"/);
    assert.equal((await author.get(`${base}/stats`)).body.submissions, 1);
  });

  test("un média utilisé ne peut pas être supprimé", async () => {
    assert.equal((await author.del(`${base}/resources/${audioId}`)).status, 409);
  });

  test("relecture : jamais sa propre contribution, l'auteur seul décide", async () => {
    const own = await bob.get(`${base}/review-queue?blockId=b_relecture1`);
    assert.equal(own.body.item, null);
    const q = await carol.get(`${base}/review-queue?blockId=b_relecture1`);
    assert.equal(q.status, 200);
    const item = q.body.item;
    assert.ok(item);
    assert.ok(
      !item.context.some((c: { key: string }) => c.key === "contact"),
      "e-mail jamais montré",
    );
    const target = item.target.key === "transcription" ? "transcription" : "certitude";
    const proposed = target === "transcription" ? "Salam, kifach halek" : "Incertain(e)";
    // Les champs obligatoires restent dus, même pour qui vient surtout relire.
    const sent = await carol.post(`${base}/submissions`, {
      submissionId: `sub-${run}-02`,
      formRevision: 1,
      answers: { transcription: "Labas, hamdoullah" },
      reviews: [
        {
          blockId: "b_relecture1",
          targetSubmissionId: item.submissionId,
          targetField: target,
          verdict: "correct",
          proposedValue: proposed,
          comment: "Orthographe",
        },
      ],
    });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.reviewsRecorded, 1);
    assert.equal((await author.get(`${base}/stats`)).body.submissions, 2);

    const summary = (await author.get(`${base}/reviews`)).body.reviews;
    assert.equal(summary.length, 1);
    const proposal = summary[0].proposals[0];
    assert.equal(proposal.reachedAgreement, false);
    assert.equal(proposal.status, undefined, "personne ne tranche : l'accord est le seul signal");
    // L'auteur du problème ne décide plus des corrections.
    const d = await author.post(`${base}/reviews/${proposal.reviewId}/decision`, {
      status: "accepted",
    });
    assert.equal(d.status, 404);

    const twice = await carol.post(`${base}/submissions`, {
      submissionId: `sub-${run}-03`,
      answers: { transcription: "Encore une" },
      reviews: [
        {
          blockId: "b_relecture1",
          targetSubmissionId: item.submissionId,
          targetField: target,
          verdict: "agree",
        },
      ],
    });
    assert.equal(twice.status, 422);
    assert.equal(twice.body.error.code, "already_reviewed");
  });

  test("changement de format : réponses reportées, ancien fichier archivé", async () => {
    const x = await author.req("PUT", `${base}/storage`, {
      format: "xlsx",
      includeContributor: true,
    });
    assert.equal(x.status, 200);
    assert.deepEqual(
      x.body.archived.map((a: string) => a.replace(/_archive\/[^/]+\//, "_archive/*/")),
      ["responses/_archive/*/responses.csv"],
    );
    const exp = await author.get(`${base}/submissions/export`);
    assert.equal(exp.status, 200);
    assert.match(exp.headers.get("content-type") ?? "", /spreadsheetml/);
    const t = await author.req("PUT", `${base}/storage`, {
      format: "txt",
      includeContributor: false,
    });
    assert.equal(t.status, 200);
    assert.equal((await author.get(`${base}/submissions/export`)).status, 409);
    const tree = JSON.stringify((await author.get(`${base}/tree`)).body.tree);
    assert.match(tree, /"entries"/);
    assert.match(tree, /sub-[a-z0-9]+-01\.txt/);
  });

  test("mode « code » : page isolée, brouillon réservé à l'auteur", async () => {
    const html =
      '<!doctype html><script type="application/json" id="cd-manifest">{"fields":[]}</script>';
    assert.equal((await bob.req("PUT", `${base}/form/code`, { html })).status, 403);
    assert.equal((await author.req("PUT", `${base}/form/code`, { html })).status, 204);
    assert.equal((await bob.get(`${base}/form/code/frame?draft=1`)).status, 403);
    const frame = await author.get(`${base}/form/code/frame?draft=1`);
    assert.equal(frame.status, 200);
    assert.match(frame.headers.get("content-security-policy") ?? "", /connect-src 'none'/);
  });

  test("un problème fermé refuse les contributions", async () => {
    assert.equal((await author.patch(`/problems/${problemId}`, { status: "closed" })).status, 200);
    const r = await bob.post(`${base}/submissions`, {
      submissionId: `sub-${run}-04`,
      answers: { transcription: "encore" },
    });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "problem_closed");
  });
});
