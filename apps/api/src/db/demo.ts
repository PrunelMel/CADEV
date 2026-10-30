/**
 * Données de démonstration (Coupe CAdev) : comptes, organisation, dépôts avec fichiers,
 * problèmes, solutions, contributions, discussions et likes.
 *
 *   npm run db:demo
 *
 * Sans effet si les comptes de démo existent déjà. Mot de passe de tous les comptes : demo-cadev-2026
 */
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { auth } from "../auth/index.js";
import { storage } from "../storage/index.js";
import { db } from "./index.js";
import * as t from "./schema.js";

const PASSWORD = "demo-cadev-2026";

const people = [
  { username: "aminata", name: "Aminata Diallo", email: "aminata@demo.local" },
  { username: "koffi", name: "Koffi Mensah", email: "koffi@demo.local" },
  {
    username: "yasmine",
    name: "Yasmine El Amrani",
    email: "yasmine@demo.local",
  },
  { username: "sena", name: "Séna Hounkpatin", email: "sena@demo.local" },
] as const;
type Who = (typeof people)[number]["username"];

async function main() {
  const [exists] = await db.select().from(t.users).where(eq(t.users.username, "aminata"));
  if (exists) {
    console.log("Données de démo déjà présentes, rien à faire.");
    return;
  }

  await storage.init();
  const id = {} as Record<Who, string>;
  for (const p of people) {
    const res = await auth.api.signUpEmail({
      body: { ...p, password: PASSWORD },
    });
    id[p.username] = res.user.id;
  }

  const [org] = await db
    .insert(t.organizations)
    .values({
      slug: "agrinova-benin",
      name: "AgriNova Bénin",
      description: "Coopérative de producteurs et d'agronomes du plateau d'Abomey.",
    })
    .returning();
  await db.insert(t.organizationMembers).values([
    { orgId: org.id, userId: id.aminata, role: "admin" },
    { orgId: org.id, userId: id.sena, role: "member" },
  ]);

  /* ---------- Dépôts ---------- */

  type RepoSeed = {
    owner: Who | "org";
    type: "model" | "dataset" | "library";
    name: string;
    licenseId: string;
    description: string;
    task: string;
    languages?: string[];
    worksOffline?: boolean;
    targetHardware?: string;
    readme: string;
    limitations?: string;
    provenanceCommunity?: string;
    provenanceCountry?: string;
    visibility?: "public" | "private";
    files: Record<string, string>;
  };

  const repos: RepoSeed[] = [
    {
      owner: "koffi",
      type: "model",
      name: "manioc-mobilenet",
      licenseId: "apache-2.0",
      description:
        "Classifieur léger des maladies du manioc, pensé pour téléphone d'entrée de gamme.",
      task: "Classification d'images",
      worksOffline: true,
      targetHardware: "Android 8+, 2 Go de RAM",
      readme: `# Maladies du manioc, MobileNetV3

Classifieur en cinq classes : sain, mosaïque, striure brune, bactériose, acarien vert.

## Utilisation

| Fichier | Rôle |
| --- | --- |
| \`model/manioc.tflite\` | Modèle quantifié int8, 4,2 Mo |
| \`labels.txt\` | Noms des classes |

Le modèle tourne **sans connexion** sur un téléphone Android à 2 Go de RAM, en moins de 300 ms par photo.

## Entraînement

Entraîné sur le jeu public Cassava Leaf Disease, puis affiné sur 1 800 photos prises au champ à Bohicon et Djidja.`,
      limitations:
        "Précision en baisse sur les photos prises à contre-jour. Non testé sur les variétés locales Ben 86052 et RB 89509.",
      files: {
        "labels.txt": "sain\nmosaique\nstriure_brune\nbacteriose\nacarien_vert\n",
        "model/config.json": JSON.stringify(
          { input: [224, 224, 3], quantization: "int8" },
          null,
          2,
        ),
      },
    },
    {
      owner: "org",
      type: "dataset",
      name: "feuilles-manioc-zou",
      licenseId: "noodl",
      description: "Photos de feuilles de manioc annotées par des agronomes, département du Zou.",
      task: "Images annotées",
      readme: `# Feuilles de manioc du Zou

1 800 photos prises au champ par les producteurs de la coopérative entre mars et août 2026, annotées par deux agronomes.

- Appareil : téléphones Android de milieu de gamme
- Format : JPEG, 1024 px, fichier \`labels.csv\`

Toute réutilisation commerciale hors du continent implique un retour vers la coopérative.`,
      provenanceCommunity: "Producteurs du plateau d'Abomey",
      provenanceCountry: "Bénin",
      files: {
        "labels.csv": "image,classe,annotateur\nzou_0001.jpg,mosaique,A\nzou_0002.jpg,sain,B\n",
      },
    },
    {
      owner: "yasmine",
      type: "library",
      name: "arabizi-norm",
      licenseId: "mit",
      description:
        "Normalisation du darija écrit en Arabizi et du code-switching darija, français, anglais.",
      task: "Normalisation de texte",
      languages: ["Darija", "Français", "Arabe"],
      worksOffline: true,
      targetHardware: "Python 3.13, aucun GPU",
      readme: `# arabizi-norm

Transforme \`ana 3ndi mochkil f l'compte\` en texte normalisé exploitable par un modèle :
détection de langue par mot, translittération des chiffres Arabizi (3, 7, 9), découpage des mots collés.

\`\`\`python
from arabizi_norm import normalize
normalize("wach t9der t3awni f had l'formulaire ?")
\`\`\`

Règles écrites avec des locuteurs de Casablanca, Fès et Oujda.`,
      limitations: "Le darija oriental et le hassania sont encore mal couverts.",
      files: {
        "arabizi_norm/__init__.py": "def normalize(text: str) -> str:\n    return text\n",
      },
    },
    {
      owner: "sena",
      type: "library",
      name: "geo-reperes",
      licenseId: "cc-by-sa-4.0",
      description:
        "Géocodage par repères : « derrière la pharmacie du carrefour Vêdoko » vers des coordonnées.",
      task: "Géocodage",
      languages: ["Français", "Fon"],
      targetHardware: "Serveur, 1 Go de RAM",
      readme: `# geo-reperes

Dans beaucoup de quartiers, l'adresse se donne par repères. Cette bibliothèque résout une description en coordonnées à partir d'une base de repères collectés par la communauté.

1. Extraction des repères et des relations (*derrière*, *à côté de*, *en face de*)
2. Recherche dans la base de repères de Cotonou (4 300 points)
3. Estimation de la position et d'un rayon de confiance`,
      limitations: "Base de repères limitée à Cotonou et Abomey-Calavi.",
      files: {
        "reperes/cotonou.geojson": '{"type":"FeatureCollection","features":[]}\n',
      },
    },
    {
      owner: "koffi",
      type: "model",
      name: "whisper-fon-small",
      licenseId: "cc-by-nc-4.0",
      description: "Transcription de la parole en fon, affinée sur des consultations de santé.",
      task: "Reconnaissance vocale",
      languages: ["Fon"],
      targetHardware: "GPU 8 Go conseillé",
      readme: `# Whisper small, fon

Affiné sur 40 heures d'enregistrements en fon (radio communautaire et consultations simulées).

Taux d'erreur par mot : 31 % sur le jeu de test.`,
      limitations:
        "Nécessite une connexion au serveur de transcription : ne tourne pas sur téléphone.",
      files: { "README.txt": "Poids disponibles sur demande.\n" },
    },
  ];

  const repoId: Record<string, string> = {};
  for (const r of repos) {
    const { owner, files, ...data } = r;
    const ownerFields =
      owner === "org"
        ? { ownerSlug: org.slug, ownerOrgId: org.id, ownerUserId: null }
        : { ownerSlug: owner, ownerUserId: id[owner], ownerOrgId: null };
    const createdBy = owner === "org" ? id.aminata : id[owner];
    const [repo] = await db
      .insert(t.repositories)
      .values({ ...data, ...ownerFields, createdBy })
      .returning();
    repoId[r.name] = repo.id;

    const [version] = await db
      .insert(t.repositoryVersions)
      .values({
        repoId: repo.id,
        number: 1,
        message: "Première version",
        createdBy,
      })
      .returning();
    for (const [path, content] of Object.entries(files)) {
      const stored = await storage.put(
        Readable.from(Buffer.from(content)),
        Buffer.byteLength(content),
      );
      await db.insert(t.repositoryFiles).values({ versionId: version.id, path, ...stored });
    }
  }

  /* ---------- Problèmes ---------- */

  const [manioc, darija, livraison, sante] = await db
    .insert(t.problems)
    .values([
      {
        title: "Détecter les maladies du manioc au champ",
        description:
          "Nos producteurs découvrent la mosaïque et la striure brune trop tard : jusqu'à la moitié de la récolte est perdue. Nous voulons un diagnostic à partir d'une photo de feuille, directement dans le champ.",
        sector: "Agriculture",
        country: "Bénin",
        connectivityConstraint: "Hors ligne : pas de réseau dans la plupart des champs",
        hardwareConstraint: "Téléphone Android d'entrée de gamme, 2 Go de RAM",
        languageConstraint: "Interface en fon et en français",
        evaluationCriteria:
          "Précision d'au moins 85 % sur nos photos de terrain, réponse en moins d'une seconde, aucune connexion requise.",
        authorId: id.aminata,
      },
      {
        title: "Comprendre les messages clients écrits en darija et en Arabizi",
        description:
          "Notre service client reçoit des milliers de messages par jour mélangeant darija en lettres latines, français et anglais. Les outils de tri automatique échouent sur ces messages.",
        sector: "Commerce",
        country: "Maroc",
        languageConstraint: "Darija en Arabizi, français, anglais, souvent dans la même phrase",
        evaluationCriteria:
          "Taux de bon routage des messages vers le bon service, mesuré sur 1 000 messages réels anonymisés.",
        authorId: id.yasmine,
      },
      {
        title: "Livrer à une adresse décrite par des repères",
        description:
          "Nos livreurs reçoivent des adresses du type « deuxième von après l'église, portail bleu ». Ils perdent en moyenne vingt minutes par course à chercher.",
        sector: "Transport",
        country: "Bénin",
        connectivityConstraint: "Réseau 3G intermittent",
        languageConstraint: "Français, fon",
        evaluationCriteria:
          "Distance médiane entre la position estimée et la vraie adresse, sur 500 livraisons.",
        authorId: id.sena,
      },
      {
        title: "Transcrire les consultations prénatales en fon",
        description:
          "Les sages-femmes des centres de santé ruraux remplissent les fiches après coup, de mémoire. Une transcription des échanges en fon les aiderait à ne rien oublier.",
        sector: "Santé",
        country: "Bénin",
        connectivityConstraint: "Connexion limitée, envoi possible en fin de journée",
        hardwareConstraint: "Tablette fournie par le centre de santé",
        languageConstraint: "Fon",
        evaluationCriteria:
          "Taux d'erreur par mot inférieur à 25 %, données qui ne quittent pas le pays.",
        authorId: id.aminata,
      },
    ])
    .returning();

  /* ---------- Solutions et décisions ---------- */

  const [solManioc, , solDarija] = await db
    .insert(t.solutions)
    .values([
      {
        problemId: manioc.id,
        repoId: repoId["manioc-mobilenet"],
        submittedBy: id.koffi,
        summary: "MobileNetV3 quantifié, affiné sur les photos de la coopérative.",
        fieldResults:
          "Testé pendant trois semaines par douze producteurs à Djidja : 88 % de bons diagnostics, 0,3 s par photo hors ligne. Échecs fréquents à contre-jour.",
        status: "accepted",
      },
      {
        problemId: manioc.id,
        repoId: repoId["whisper-fon-small"],
        submittedBy: id.koffi,
        summary: "Piste abandonnée : décrire les symptômes à l'oral plutôt que photographier.",
        fieldResults: "Les producteurs préfèrent la photo. La transcription demande une connexion.",
        status: "rejected",
      },
      {
        problemId: darija.id,
        repoId: repoId["arabizi-norm"],
        submittedBy: id.yasmine,
        summary:
          "Normalisation avant classification : l'outil de tri existant fonctionne mieux sur le texte nettoyé.",
        fieldResults: "Bon routage passé de 61 % à 83 % sur 1 000 messages de septembre.",
        status: "pending",
      },
      {
        problemId: livraison.id,
        repoId: repoId["geo-reperes"],
        submittedBy: id.sena,
        summary: "Résolution des repères à partir d'une base collectée par les livreurs eux-mêmes.",
        fieldResults: "Distance médiane de 140 m sur 320 livraisons à Cotonou.",
        status: "pending",
      },
      {
        problemId: sante.id,
        repoId: repoId["whisper-fon-small"],
        submittedBy: id.koffi,
        summary: "Whisper small affiné en fon, à héberger sur un serveur national.",
        fieldResults: "31 % d'erreur par mot, au-dessus du seuil demandé.",
        status: "pending",
      },
    ])
    .returning();

  await db.insert(t.validations).values([
    {
      targetType: "solution",
      targetId: solManioc.id,
      decision: "accepted",
      comment: "Validé après l'essai à Djidja, merci pour le retour terrain.",
      validatorId: id.aminata,
    },
  ]);
  await db.update(t.problems).set({ status: "solved" }).where(eq(t.problems.id, manioc.id));
  void solDarija;

  await db.insert(t.dataContributions).values([
    {
      problemId: manioc.id,
      datasetRepoId: repoId["feuilles-manioc-zou"],
      contributorId: id.aminata,
      description: "1 800 photos de feuilles annotées par deux agronomes de la coopérative.",
      provenanceCommunity: "Producteurs du plateau d'Abomey",
      provenanceCountry: "Bénin",
      status: "accepted",
    },
    {
      problemId: livraison.id,
      contributorId: id.koffi,
      description: "Liste de 600 repères relevés à Akpakpa avec leur position GPS.",
      provenanceCommunity: "Livreurs moto d'Akpakpa",
      provenanceCountry: "Bénin",
      status: "pending",
    },
  ]);

  /* ---------- Travaux en cours ---------- */

  await db.insert(t.problemWorkers).values([
    {
      problemId: sante.id,
      userId: id.yasmine,
      note: "J'adapte un modèle wav2vec2 plus léger, résultats prévus fin novembre.",
    },
    {
      problemId: livraison.id,
      userId: id.koffi,
      note: "Je teste geo-reperes avec trois livreurs d'Akpakpa.",
    },
    { problemId: darija.id, userId: id.sena, note: "Annotation de 500 messages de test." },
  ]);

  /* ---------- Communauté ---------- */

  await db.insert(t.discussions).values([
    {
      targetType: "problem",
      targetId: manioc.id,
      authorId: id.sena,
      body: "Est-ce que le modèle distingue la mosaïque d'une carence en potassium ? Les deux se ressemblent chez nous.",
    },
    {
      targetType: "problem",
      targetId: manioc.id,
      authorId: id.koffi,
      body: "Pas encore. Si la coopérative peut photographier quelques cas de carence, je les ajoute au prochain entraînement.",
    },
    {
      targetType: "repo",
      targetId: repoId["arabizi-norm"],
      authorId: id.koffi,
      body: "Belle bibliothèque. Une version pour le nouchi ivoirien serait la bienvenue.",
    },
  ]);
  await db.insert(t.likes).values([
    { userId: id.aminata, repoId: repoId["manioc-mobilenet"] },
    { userId: id.sena, repoId: repoId["manioc-mobilenet"] },
    { userId: id.yasmine, repoId: repoId["manioc-mobilenet"] },
    { userId: id.koffi, repoId: repoId["arabizi-norm"] },
    { userId: id.aminata, repoId: repoId["geo-reperes"] },
  ]);

  console.log(
    `Démo prête : ${people.length} comptes (mot de passe ${PASSWORD}), ${repos.length} dépôts, 4 problèmes.`,
  );
}

await main();
process.exit(0);
