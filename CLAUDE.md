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

| Sujet                 | Décision                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stockage des fichiers | MinIO via Docker, adaptateur dans `apps/api/src/storage/`                                                                                                                   |
| Pull requests         | Oui, simples : l'auteur ajoute des fichiers à sa PR, le propriétaire ou un collaborateur fusionne. Fusion refusée si un fichier de la PR a changé depuis sa version de base |
| Validation            | L'auteur du problème seul valide ou rejette solutions et contributions                                                                                                      |
| Contenu statique      | Fichiers de données dans `apps/web/src/content/`                                                                                                                            |
| SDK Python            | Reporté, `sdk/` reste vide                                                                                                                                                  |

## Périmètre MVP

À construire :

1. Comptes, organisations simples, dépôts publics et privés, collaborateurs.
2. Hub de solutions (élément phare) : modèles, datasets, bibliothèques, chacun avec sa fiche (documentation, licence, limites).
3. Problèmes : publication, solutions rattachées, contributions de données, validation.
4. Souveraineté : catalogue de licences avec restrictions, avertissement à la consultation d'une ressource restreinte, provenance des données affichée.

**Ne pas construire** : modèle économique, KYC, évaluations automatiques, classements, leaderboards, location de matériel.

## Stack (imposée)

| Couche          | Technologie                                                                          |
| --------------- | ------------------------------------------------------------------------------------ |
| Front           | React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, lucide-react |
| API             | Node.js >= 20.12, Express 5, TypeScript, Drizzle ORM, Zod, better-auth               |
| Base de données | PostgreSQL via Docker                                                                |
| SDK IA          | Python >= 3.13, Pydantic                                                             |
| Lancement       | `concurrently` depuis la racine                                                      |

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
```

Avant de considérer une tâche terminée : `npm run lint` et `npm run typecheck` passent sans erreur.

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

L'interface est minimaliste, sobre, purement fonctionnelle, centrée sur la donnée. Elle sert à interagir avec l'API, rien de plus.

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
- Une solution est un dépôt public (modèle, dataset ou bibliothèque) rattaché à un problème, avec ses résultats terrain.
- La page d'un problème montre toutes les tentatives, y compris celles qui ont échoué : c'est ce qui évite le travail en double.
- La recherche est orientée problèmes : une requête en langage courant (« maladies du manioc ») doit d'abord remonter des problèmes, puis les solutions associées.
- Le profil d'un développeur met en avant les problèmes résolus, pas la liste brute de ses dépôts.

### Souveraineté

- Chaque dépôt a une licence issue du catalogue `licenses`, qui décrit des restrictions explicites (usage commercial, redistribution, obligation de retour communautaire, etc.).
- À la consultation ou au téléchargement d'une ressource restreinte, la plateforme affiche un avertissement listant ce qui est interdit. **Aucun avertissement** sur une ressource sans restriction.
- La provenance des données (communauté, pays d'origine) est affichée sur les datasets.
- L'auteur garde tous les droits sur sa solution : la plateforme ne s'arroge aucune licence implicite.

### Rôles (implémentés)

| Rôle                  | Portée       | Droits                                                                               |
| --------------------- | ------------ | ------------------------------------------------------------------------------------ |
| Visiteur              | Global       | Lecture des ressources publiques                                                     |
| Membre                | Global       | Créer dépôts, problèmes, solutions, contributions, likes, discussions, pull requests |
| Propriétaire          | Dépôt        | Tout sur le dépôt, gestion des collaborateurs, visibilité                            |
| Collaborateur         | Dépôt        | Écriture sur le contenu du dépôt, fusion des pull requests                           |
| Admin d'organisation  | Organisation | Gestion des membres et des dépôts de l'organisation (propriétaire de ses dépôts)     |
| Membre d'organisation | Organisation | Accès aux dépôts privés de l'organisation                                            |
| Auteur du problème    | Problème     | Valide ou rejette les solutions et contributions rattachées                          |

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
