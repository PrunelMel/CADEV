# Plateforme communautaire d'IA appliquée (Afrique)

Une plateforme d'échange pour les développeurs, par les développeurs. Projet présenté à la Coupe CAdev 2026.

L'idée : un « GitHub de l'IA version Afrique », construit sur le modèle de Hugging Face (hub de modèles, de datasets et de bibliothèques), mais qui part des **problèmes** plutôt que des modèles, et qui place la **souveraineté des données** au centre de son fonctionnement.

> Nom de code provisoire. Le nom définitif du projet reste à fixer.

---

## Pourquoi cette plateforme

La plupart des gens qui ont besoin d'IA ne savent pas quel modèle chercher. Ils savent seulement ce qui ne marche pas chez eux. Un agronome au Bénin ne tape pas « vision transformer fine-tuné sur PlantVillage », il cherche « détecter les maladies du manioc ».

### Partir des problèmes, pas des modèles

| Pour qui                                        | Ce que la plateforme apporte                                                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Celui qui a un besoin (entreprise, ONG, mairie) | Il trouve un défi qui correspond à son problème, avec les solutions déjà proposées, leurs résultats sur le terrain et les personnes qui y ont travaillé. S'il ne trouve rien, il publie son problème et la communauté s'en charge.              |
| Le développeur                                  | Il sait à quel besoin réel il répond, qui l'attend, avec quelles contraintes (connexion faible, téléphone d'entrée de gamme, langue locale) et comment son travail sera jugé. Son profil montre des problèmes résolus, pas une liste de dépôts. |
| La qualité des solutions                        | Rattachés à un problème, les modèles sont jugés sur des critères posés par celui qui a le problème.                                                                                                                                             |
| Le travail en double                            | Tout est regroupé par problème : on voit que trois équipes ont déjà essayé le même défi, ce qui a marché et ce qui a échoué. Le suivant peut partir de là.                                                                                      |
| Les non-techniciens                             | Entreprises, institutions et bailleurs lisent la plateforme par problèmes, pas par architectures de modèles.                                                                                                                                    |

### Souveraineté affichée

- Données hébergées sur le continent.
- Licences qui protègent les communautés d'origine contre une exploitation sans retour.
- L'utilisateur garde tous les droits sur sa solution, et la plateforme agit en conséquence. Exemple : un avertissement s'affiche quand on consulte une solution protégée par des droits restrictifs (interdiction de x, de y). Aucun avertissement sur une solution sans ces restrictions.

### Ce qu'on reprend du modèle Hugging Face

- **Model Hub** : chaque modèle est un dépôt versionné avec une « model card » (documentation, licence, limites, benchmarks).
- **Datasets Hub** : même principe pour les jeux de données, publics ou privés.
- **Communauté** : likes, discussions, pull requests simples.

---

## Périmètre du MVP

**Inclus**

1. Comptes, organisations simples, dépôts publics et privés, ajout de collaborateurs.
2. **Hub de solutions** (élément phare) : modèles, datasets, bibliothèques.
3. Publication de problèmes, publication de solutions, contribution de données et validation.
4. Souveraineté : licences, avertissements, provenance des données.

**Exclus**

- Modèle économique
- KYC
- Évaluations automatiques et classements
- Location de composantes physiques

---

## Stack technique

| Couche            | Technologie                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| Front             | React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, lucide-react |
| API plateforme    | Node.js >= 20.12, Express 5, TypeScript, Drizzle ORM, Zod, better-auth               |
| Base de données   | PostgreSQL via Docker                                                                |
| Services IA (SDK) | Python >= 3.13, Pydantic (pas encore commencé)                                       |
| Stockage fichiers | MinIO (compatible S3), auto-hébergé via Docker, client `minio` côté API              |
| Lancement         | `concurrently` depuis la racine                                                      |

Dépendances ajoutées au-delà de la stack imposée : `minio` (client S3), `pg` (pilote Postgres de Drizzle), `tsx` (exécution TypeScript en dev), `@tailwindcss/vite`.

---

## Arborescence

```
.
├── apps/
│   ├── web/                 # Front React + Vite (proxy /api vers l'API en dev)
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── api/         # Client HTTP, auth, hooks TanStack Query
│   │       └── content/     # Contenu statique (accueil, FAQ, secteurs, pays)
│   └── api/                 # API Express
│       ├── drizzle/         # Migrations générées
│       └── src/
│           ├── db/          # Schéma Drizzle, connexion, seed des licences
│           ├── auth/        # Configuration better-auth (email + nom d'utilisateur)
│           ├── modules/     # Un dossier par domaine (routes, schémas Zod, services)
│           ├── storage/     # Adaptateur MinIO
│           ├── middleware/  # Session, erreurs
│           └── lib/         # Droits d'accès, validation, discussions, décisions
├── sdk/                     # SDK Python (à venir)
├── docker-compose.yml       # PostgreSQL + MinIO
├── package.json             # Scripts racine (workspaces npm)
├── .env.example
├── CLAUDE.md
└── README.md
```

---

## Démarrage

### Prérequis

- Node.js >= 20.12
- Docker et Docker Compose

### Installation

```bash
cp .env.example .env      # puis changer BETTER_AUTH_SECRET
npm install
docker compose up -d --wait
npm run db:migrate
npm run db:seed           # catalogue de licences
```

### Lancement

```bash
npm run dev
```

Une seule commande démarre Postgres et MinIO (et attend qu'ils soient prêts), puis lance l'API et le front via `concurrently`.

| Service         | URL par défaut            |
| --------------- | ------------------------- |
| Front           | http://localhost:5173     |
| API             | http://localhost:4000/api |
| PostgreSQL      | localhost:5432            |
| MinIO (API S3)  | http://localhost:9000     |
| MinIO (console) | http://localhost:9001     |

### Scripts racine

| Script                | Rôle                                          |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Docker, puis API + front                      |
| `npm run build`       | Build de l'API et du front                    |
| `npm run lint`        | ESLint sur tout le monorepo                   |
| `npm run format`      | Prettier                                      |
| `npm run typecheck`   | `tsc --noEmit` sur chaque app                 |
| `npm run db:generate` | Génère une migration Drizzle                  |
| `npm run db:migrate`  | Applique les migrations                       |
| `npm run db:seed`     | Insère ou met à jour le catalogue de licences |

---

## Modèle de données

| Entité                                           | Rôle                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `users`, `sessions`, `accounts`, `verifications` | Comptes (gérés par better-auth, plugin nom d'utilisateur)                                                  |
| `organizations`, `organization_members`          | Organisations simples et leurs membres (admin ou membre)                                                   |
| `repositories`                                   | Dépôts : type, visibilité, propriétaire (utilisateur ou organisation), licence, fiche, limites, provenance |
| `repository_collaborators`                       | Collaborateurs d'un dépôt                                                                                  |
| `repository_versions`, `repository_files`        | Chaque modification crée une version complète ; les fichiers pointent vers le stockage                     |
| `pull_requests`, `pull_request_files`            | Propositions de fichiers basées sur une version, fusionnées par le propriétaire ou un collaborateur        |
| `problems`                                       | Défis : description, secteur, pays, contraintes terrain, critères d'évaluation                             |
| `solutions`                                      | Lien entre un problème et un dépôt public, avec résultats terrain et statut                                |
| `data_contributions`                             | Contributions de données à un problème, avec provenance et dataset lié facultatif                          |
| `validations`                                    | Historique des décisions sur une solution ou une contribution                                              |
| `licenses`                                       | Catalogue de licences avec leurs restrictions                                                              |
| `likes`, `discussions`                           | Couche communautaire (discussions sur dépôts, problèmes et pull requests)                                  |

## API (préfixe `/api`)

Erreurs : `{ error: { code, message, details? } }`. Un dépôt privé inaccessible répond 404.

| Ressource      | Routes                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `/api/auth/*` (better-auth)                                                                                                                        |
| Utilisateurs   | `GET /api/users/:username`, `GET /api/me/namespaces`                                                                                               |
| Organisations  | `POST /api/orgs`, `GET /api/orgs/:slug`, `POST /api/orgs/:slug/members`, `DELETE /api/orgs/:slug/members/:username`                                |
| Dépôts         | `GET/POST /api/repos`, `GET/PATCH /api/repos/:owner/:name`, `GET /api/repos/:owner/:name/versions`                                                 |
| Fichiers       | `GET/PUT/DELETE /api/repos/:owner/:name/files/*path` (corps PUT = contenu brut, `?message=`, `?version=` en lecture)                               |
| Collaborateurs | `GET/POST /api/repos/:owner/:name/collaborators`, `DELETE .../collaborators/:username`                                                             |
| Likes          | `PUT/DELETE /api/repos/:owner/:name/like`                                                                                                          |
| Pull requests  | `GET/POST .../pulls`, `GET .../pulls/:number`, `PUT .../pulls/:number/files/*path`, `POST .../pulls/:number/merge`, `POST .../pulls/:number/close` |
| Problèmes      | `GET/POST /api/problems`, `GET /api/problems/:id`                                                                                                  |
| Solutions      | `GET/POST /api/problems/:id/solutions`, `POST /api/solutions/:id/validate`                                                                         |
| Contributions  | `GET/POST /api/problems/:id/contributions`, `POST /api/contributions/:id/validate`                                                                 |
| Discussions    | `GET/POST` sur `.../discussions` d'un dépôt, d'un problème ou d'une pull request                                                                   |
| Licences       | `GET /api/licenses`                                                                                                                                |
| Recherche      | `GET /api/search?q=` (plein texte français : problèmes, puis leurs solutions, puis autres dépôts)                                                  |

---

## Conventions

- TypeScript strict, ESLint + Prettier.
- Icônes : lucide-react uniquement.
- Validation de toutes les entrées : Zod côté API, Pydantic côté SDK.
- Interface sobre et fonctionnelle : pas de dégradés agressifs, pas d'ombres inutiles, pas d'animations, pas de cartes statistiques de remplissage, pas de tiret cadratin.
- Images : uniquement de vraies photographies libres de droits liées au domaine, jamais d'image générée par IA.
- Le skill Claude Code [ponytail](https://github.com/DietrichGebert/ponytail) est utilisé pendant le développement pour un code plus sobre (voir `CLAUDE.md`).

---

## Décisions et points ouverts

| Sujet                               | Statut                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Nom du projet                       | À fixer                                                                                                    |
| Stockage fichiers                   | Décidé : MinIO via Docker                                                                                  |
| Pull requests sur les dépôts        | Décidé : PR simples (fichiers proposés, fusion par propriétaire ou collaborateur, refus en cas de conflit) |
| Qui valide une solution             | Décidé : l'auteur du problème seul                                                                         |
| Rôles et permissions                | Implémentés selon la proposition de `CLAUDE.md`                                                            |
| Contenu statique                    | Fichiers de données dans `apps/web/src/content/`                                                           |
| Solution rattachée à un dépôt privé | Refusée pour l'instant (une solution doit être consultable par tous). À confirmer                          |
| SDK Python                          | Reporté                                                                                                    |
| Ajouts de stack éventuels           | À proposer                                                                                                 |
