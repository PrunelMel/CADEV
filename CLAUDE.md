# CLAUDE.md

Instructions pour Claude Code sur ce dépôt. Lire ce fichier en entier avant toute modification.

## Le projet en une phrase

Plateforme communautaire d'IA appliquée pour l'Afrique : un hub de modèles, datasets et bibliothèques inspiré de Hugging Face, organisé autour des **problèmes réels** (défis) et non des modèles, avec la **souveraineté des données** comme comportement de la plateforme. MVP pour la Coupe CAdev 2026.

Le contexte complet (vision, périmètre, stack) est dans `README.md`.

## Règle numéro un : demander avant de trancher

Le cahier des charges laisse plusieurs points ouverts. **Dès qu'il y a un choix à faire, poser la question au lieu de décider seul.** Cela vaut en particulier pour :

- les rôles et la logique de validation au-delà de ce qui est décidé ci-dessous,
- les bibliothèques Python du SDK,
- tout ajout à la stack,
- tout élément hors périmètre MVP.

Si tu identifies une fonctionnalité qui donnerait une touche propre au projet (au-delà du modèle Hugging Face), **propose-la** en une ou deux phrases, ne l'implémente pas sans accord.

## Décisions prises

| Sujet                           | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stockage des fichiers           | MinIO via Docker, adaptateur dans `apps/api/src/storage/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pull requests                   | Oui, simples : l'auteur ajoute des fichiers à sa PR, le propriétaire ou un collaborateur fusionne. Fusion refusée si un fichier de la PR a changé depuis sa version de base                                                                                                                                                                                                                                                                                                                                                                        |
| Validation                      | Personne n'accepte ni ne rejette sur un problème. L'auteur du problème choisit au plus la solution mise en avant (`problems.featured_repo_id`) ; sans choix, c'est la solution la plus aimée (likes). Accepter ou refuser ne vaut que pour une contribution à son propre dépôt (pull requests)                                                                                                                                                                                                                                                     |
| Contenu statique                | Fichiers de données dans `apps/web/src/content/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| SDK Python                      | Reporté, `sdk/` reste vide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Statut des problèmes            | Ouvert, résolu ou fermé, modifiable par l'auteur seul. Un problème fermé refuse les nouvelles solutions et contributions                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Fiche technique                 | Chaque dépôt déclare tâche, langues, fonctionnement hors ligne et matériel cible ; le hub filtre dessus et la page d'un problème suggère les dépôts compatibles                                                                                                                                                                                                                                                                                                                                                                                    |
| Tableau de bord                 | `/tableau-de-bord` : pull requests à traiter, dépôts dont le problème est fermé, ses problèmes, travaux en cours, contributions de données, tous ses dépôts privés compris                                                                                                                                                                                                                                                                                                                                                                         |
| Fiches Markdown                 | Rendues avec `react-markdown` + `remark-gfm`, HTML brut ignoré                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Travaux en cours                | Un membre se déclare sur un problème (« Je travaille dessus », avec une note). Évite le travail en double, refusé sur un problème fermé                                                                                                                                                                                                                                                                                                                                                                                                            |
| Carte des problèmes             | Carte de l'Afrique en points, générée depuis les contours Natural Earth de la landing ; un cercle par pays ayant des problèmes, clic vers la liste filtrée (`?pays=`)                                                                                                                                                                                                                                                                                                                                                                              |
| Données de démo                 | `npm run db:demo`, comptes et contenus réalistes pour la présentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Publier un problème             | Page fournie par l'équipe (`features/problem-form/PublishProblem.tsx`), à reproduire telle quelle : formulaire à gauche, assistant contextuel à droite, carte des 54 pays (`content/africa-map.ts`, Natural Earth). Charte « Liquid Glass » (`components/glass/`), animations `framer-motion`                                                                                                                                                                                                                                                      |
| Contraintes terrain             | Listes d'étiquettes (`text[]`) : connectivité, matériel, langues, choisies dans `content/problem-form.ts` ou créées par l'auteur. Seuls titre, description, secteur et pays sont obligatoires                                                                                                                                                                                                                                                                                                                                                      |
| En-tête                         | En-tête en bulles de verre sur toutes les pages (`components/glass/GlassHeader.tsx`), fixe ; les bandeaux marine passent dessous                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Page-formulaire de contribution | Module `modules/contributions/form/` (API) et `features/contribution/` (front) : l'auteur conçoit une page (`/problemes/:id/concevoir`, glisser-déposer ou HTML importé), les membres la remplissent (`/problemes/:id/contribuer`). Coexiste avec la proposition de jeu de données                                                                                                                                                                                                                                                                 |
| Stockage des contributions      | Formulaire, révisions, réponses et relectures en base (source de vérité) ; médias et fichiers lisibles (CSV, XLSX, un TXT par réponse, dictionnaire) dans MinIO sous `problems/<id>/contribution/`, régénérés depuis la base                                                                                                                                                                                                                                                                                                                       |
| Relecture des contributions     | Bloc « Validation de données » : les corrections ne modifient jamais les réponses et personne ne les tranche ; le nombre de relecteurs d'accord, comparé au seuil du bloc, est le seul signal                                                                                                                                                                                                                                                                                                                                                      |
| Modèle de formulaire            | Une seule définition des règles (`modules/contributions/form/model/`), importée aussi par le front                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Liste des problèmes             | `/problemes` en charte « Liquid Glass » (`features/problems/ProblemsView.tsx`) : bandeau avec la carte des problèmes par pays (clic : filtre), filtres, liste à gauche et fiche du problème choisi à droite, dont la carte zoome sur le pays. Carte commune : `components/glass/AfricaDotMap.tsx`                                                                                                                                                                                                                                                  |
| Hub de solutions                | `/hub` en charte « Liquid Glass » (`features/hub/HubView.tsx`) : bandeau avec le choix du type (modèles, datasets, bibliothèques), filtres, liste à gauche et fiche du dépôt à droite, licence et restrictions en tête. Mise en page liste et fiche commune : `components/glass/MasterDetail.tsx`                                                                                                                                                                                                                                                  |
| Créer un dépôt                  | `/nouveau-depot` en charte « Liquid Glass » (`features/repo-form/CreateRepo.tsx`), construit comme la publication d'un problème : formulaire à gauche, panneau contextuel à droite (types, propriétaire, catalogue des licences avec restrictions, carte de provenance, langues, aides, aperçu de la carte du hub). Options dans `content/repo-form.ts`. Pièces communes aux deux formulaires : `components/glass/formKit.tsx`                                                                                                                     |
| Fiche d'un problème             | `/problemes/:id` en charte « Liquid Glass » (`features/problem-detail/ProblemDetailView.tsx`) : bandeau (statut, titre, description, actions, carte zoomée sur le pays), puis barre d'onglets collante (Solutions, Contributions, Discussion, Terrain ; `?onglet=`) qui affiche un contenu à la fois. Pièces communes aux pages de problèmes : `components/glass/problemBits.tsx`                                                                                                                                                                  |
| Page d'un dépôt                 | `/:owner/:name` en charte « Liquid Glass » (`features/repo-detail/RepoView.tsx`) : bandeau, puis onglets README.md · Fichiers (navigation par dossiers, sélecteur et historique des versions) · Communauté (messages et pull requests dans un même fil, filtre) · Paramètres (propriétaire). Pull request : `features/repo-detail/PullView.tsx`. README pré-rempli à la création depuis le formulaire (`content/readme-template.ts`), modèle affiché si le README est vide. Pièces communes des fiches à onglets : `components/glass/sections.tsx` |
| Connexion et inscription        | `/connexion` et `/inscription` en charte « Liquid Glass » (`features/auth/AuthView.tsx`) : carte de verre centrée sur le fond à l'Afrique en points, bascule entre les deux formulaires (`?suite=` conservé), messages d'erreur de better-auth traduits dans `content/auth.ts`                                                                                                                                                                                                                                                                     |
| Dépôt et problème               | Tout dépôt est lié à un problème dès sa création (`repositories.problem_id`, obligatoire) ; son propriétaire peut en changer dans les paramètres. Création depuis la page d'un problème : `/nouveau-depot?probleme=<id>`                                                                                                                                                                                                                                                                                                                           |
| Statut d'un dépôt               | Choisi par son propriétaire : `under_construction` (par défaut) ou `solution`. En construction, hors de l'équipe (propriétaire, collaborateurs, membres de l'organisation), seuls le README et la fiche sont visibles sur toute la plateforme : fichiers, versions, téléchargements, pull requests et discussions sont fermés (`access.full`). Un dépôt privé n'apparaît jamais parmi les solutions d'un problème                                                                                                                                  |
| Problème fermé                  | Un dépôt peut encore y être lié (le formulaire prévient), mais les dépôts d'un problème fermé passent derrière les autres (hub, recherche, profil) ; le propriétaire est invité à lier son dépôt à un autre problème ou à en publier un nouveau. Statut « reprendre le flambeau » envisagé plus tard, non construit                                                                                                                                                                                                                                |
| Notifications                   | Fermer ou rouvrir un problème notifie les propriétaires des dépôts liés (table `notifications`, cloche de l'en-tête) et leur envoie un e-mail via Resend (`RESEND_API_KEY`, `MAIL_FROM` ; sans clé, pas d'e-mail)                                                                                                                                                                                                                                                                                                                                  |
| Code par e-mail                 | Plugins better-auth `emailOTP` et `twoFactor` (code à 6 chiffres, 10 minutes, envoyé via Resend depuis `MAIL_FROM`) : à l'inscription pour confirmer l'adresse (pas de session avant), puis à chaque connexion après le mot de passe (`users.two_factor_enabled`, activé pour tout nouveau compte). Aucun envoi vers les adresses en `.local` (démo, tests) ; ces comptes sont vérifiés d'office, sans code à la connexion. Les tests lisent les codes en base                                                                                     |

## Périmètre MVP

À construire :

1. Comptes, organisations simples, dépôts publics et privés, collaborateurs.
2. Hub de solutions (élément phare) : modèles, datasets, bibliothèques, chacun avec sa fiche (documentation, licence, limites).
3. Problèmes : publication, solutions rattachées, contributions de données, validation.
4. Souveraineté : catalogue de licences avec restrictions, avertissement à la consultation d'une ressource restreinte, provenance des données affichée.

**Ne pas construire** : modèle économique, KYC, évaluations automatiques, classements, leaderboards, location de matériel.

## Stack (imposée)

| Couche          | Technologie                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front           | React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, lucide-react, framer-motion (pages en verre et en-tête), @dnd-kit (concepteur de contribution) |
| API             | Node.js >= 20.12, Express 5, TypeScript, Drizzle ORM, Zod, better-auth, Resend (e-mails de notification)                                                               |
| Base de données | PostgreSQL via Docker                                                                                                                                                  |
| SDK IA          | Python >= 3.13, Pydantic                                                                                                                                               |
| Lancement       | `concurrently` depuis la racine                                                                                                                                        |

Ne pas substituer une technologie par une autre (pas de Prisma, pas de Next.js, pas de NextAuth, pas d'autre librairie d'icônes).

## Arborescence

```
apps/web/        Front
apps/api/        API Express
sdk/             SDK Python
docker-compose.yml
package.json     Scripts racine
```

Dans `apps/api/src/modules/<domaine>/`, un domaine regroupe : `routes.ts`, `schemas.ts` (Zod), `service.ts`. Les routes ne parlent pas directement à la base, elles passent par le service. Le code partagé entre domaines (droits d'accès, discussions, décisions de validation) vit dans `apps/api/src/lib/`.

Domaines : `users`, `orgs`, `repos`, `problems`, `solutions`, `contributions`, `licenses`, `search`.

## Commandes

```bash
npm run dev          # Docker, puis API + front via concurrently
npm run lint
npm run typecheck
npm run format
npm run db:generate  # après modification du schéma Drizzle
npm run db:migrate
npm run db:seed      # catalogue de licences
npm run db:demo      # données de démonstration
npm test             # tests de bout en bout de l'API (API lancée)
```

Avant de considérer une tâche terminée : `npm run lint`, `npm run typecheck` et `npm test` passent sans erreur.

## Conventions de code

- TypeScript `strict: true`. Pas de `any`, pas de `@ts-ignore` sans commentaire justifiant.
- ESLint + Prettier, configuration à la racine.
- **Toute entrée est validée** : Zod côté API (body, params, query), Pydantic côté SDK. Les types TypeScript sont inférés des schémas Zod (`z.infer`), pas redéclarés à la main.
- Toutes les routes API sont préfixées par `/api`. Auth sous `/api/auth/*` (handler better-auth).
- Les réponses d'erreur ont une forme unique : `{ error: { code, message, details? } }`.
- Migrations Drizzle versionnées, jamais de modification manuelle du schéma en base.
- Secrets uniquement dans `.env` (jamais commité). Tenir `.env.example` à jour.
- Réutiliser l'existant (librairie standard, fonctions natives de la plateforme, code déjà présent) avant d'écrire du code neuf.

## Ponytail

Le skill [ponytail](https://github.com/DietrichGebert/ponytail) est utilisé sur ce projet pour réduire la consommation de tokens et garder un code minimal. Installation (deux commandes séparées dans Claude Code) :

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

Mode attendu sur ce projet : `full` (mode par défaut). Node.js doit être dans le PATH pour l'activation automatique.

## Front : règles d'interface

L'interface est minimaliste, sobre, purement fonctionnelle, centrée sur la donnée. Elle sert à interagir avec l'API, rien de plus. Exceptions : la publication d'un problème, la contribution de données, la liste et la fiche des problèmes, le hub, la création et la page d'un dépôt, les pull requests, la connexion, l'inscription et l'en-tête en verre suivent la charte « Liquid Glass » fournie par l'équipe, animations comprises (voir Décisions prises). Les autres pages y passent une à une, à la demande de l'équipe.

**Interdit** :

- dégradés agressifs, ombres portées inutiles, animations, boutons clignotants,
- cartes statistiques de remplissage (« +200 », « +300% »),
- **tiret cadratin** dans les textes de l'interface,
- emoji dans l'interface,
- toute icône hors lucide-react,
- images générées par IA ou illustrations génériques.

**Images** : uniquement de vraies photographies libres de droits (ou contenu réel sourcé) qui correspondent strictement au domaine de l'application. Noter la source et la licence de chaque image à côté du fichier de contenu qui l'utilise.

**Données** : TanStack Query pour tout appel API (pas de `fetch` dans les composants). Client HTTP centralisé dans `apps/web/src/api/`. En dev, Vite proxifie `/api` vers l'API : front et API partagent la même origine.

## Domaine : règles métier à respecter

### Problèmes et solutions

- Un problème décrit : le besoin, le secteur, le pays, les contraintes terrain (connectivité, matériel, langue), les critères d'évaluation posés par son auteur.
- Tout dépôt (modèle, dataset ou bibliothèque) répond à un problème. Une solution est un dépôt public que son auteur a déclaré « solution » ; ses résultats terrain sont dans son README.
- La page d'un problème montre tous les dépôts publics liés, solutions et dépôts en construction : c'est ce qui évite le travail en double.
- La recherche est orientée problèmes : une requête en langage courant (« maladies du manioc ») doit d'abord remonter des problèmes, puis les solutions associées.
- Le profil d'un développeur met en avant les problèmes résolus, pas la liste brute de ses dépôts.

### Souveraineté

- Chaque dépôt a une licence issue du catalogue `licenses`, qui décrit des restrictions explicites (usage commercial, redistribution, obligation de retour communautaire, etc.).
- À la consultation ou au téléchargement d'une ressource restreinte, la plateforme affiche un avertissement listant ce qui est interdit. **Aucun avertissement** sur une ressource sans restriction.
- La provenance des données (communauté, pays d'origine) est affichée sur les datasets.
- L'auteur garde tous les droits sur sa solution : la plateforme ne s'arroge aucune licence implicite.

### Rôles (implémentés)

| Rôle                  | Portée       | Droits                                                                                  |
| --------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Visiteur              | Global       | Lecture des ressources publiques                                                        |
| Membre                | Global       | Créer dépôts, problèmes, solutions, contributions, likes, discussions, pull requests    |
| Propriétaire          | Dépôt        | Tout sur le dépôt, gestion des collaborateurs, visibilité                               |
| Collaborateur         | Dépôt        | Écriture sur le contenu du dépôt, fusion des pull requests                              |
| Admin d'organisation  | Organisation | Gestion des membres et des dépôts de l'organisation (propriétaire de ses dépôts)        |
| Membre d'organisation | Organisation | Accès aux dépôts privés de l'organisation                                               |
| Auteur du problème    | Problème     | Choisit la solution mise en avant (sinon, la plus aimée) ; n'accepte ni ne rejette rien |

Les dépôts privés ne sont visibles que par leur propriétaire, leurs collaborateurs et les membres de l'organisation propriétaire. Vérifier ces droits côté API (`apps/api/src/lib/permissions.ts`), jamais seulement côté front.

## SDK Python (`sdk/`)

- Python >= 3.13, modèles d'entrée et de sortie en Pydantic.
- Choix des bibliothèques libre, mais à proposer avant ajout.
- Le SDK consomme l'API `/api` ; il ne touche jamais directement la base.

## Ce qu'il ne faut pas faire

- Implémenter un élément exclu du MVP.
- Trancher un point ouvert sans demander.
- Ajouter une dépendance non listée sans le signaler.
- Écrire du texte d'interface avec un tiret cadratin.
- Générer ou intégrer une image produite par IA.
