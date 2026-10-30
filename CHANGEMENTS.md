# Changements (30 octobre 2026)

Inspection complète, tests de bout en bout, corrections, nouvelles fonctionnalités et refonte visuelle.

## Corrections

- `.env.example` manquant alors que le README et le CLAUDE.md y renvoient : ajouté.
- Pas de `.gitignore` : `node_modules` et `.env` (secrets) auraient été commités. Ajouté.
- Pas de configuration Prettier : `.prettierrc` ajouté avec la largeur de 100 colonnes du code existant.
- Lien du propriétaire d'un dépôt d'organisation : pointait vers `/u/<org>` (page introuvable), pointe maintenant vers `/orgs/<org>`.
- Après connexion ou inscription, retour sur la landing au lieu de l'application ; et juste après l'inscription, la session n'était pas encore rafraîchie. Redirection vers le tableau de bord (ou la page d'origine via `?suite=`) une fois la session à jour.
- Formulaire de problème : le pays et le secteur prenaient silencieusement la première valeur de la liste (« Afrique du Sud »). Choix explicite obligatoire.
- Fiches Markdown affichées en texte brut : rendu avec `react-markdown` et `remark-gfm` (HTML brut ignoré).
- Compteur de solutions de la liste des problèmes : comptait aussi les dépôts devenus privés, contrairement à la page du problème. Aligné.
- Pages réservées aux membres (nouveau dépôt, nouveau problème, etc.) accessibles déconnecté : renvoi vers la connexion puis retour.
- Pays d'origine saisi en texte libre dans certains formulaires et en liste dans d'autres : liste partout.
- Landing en anglais avec des textes provisoires (« Community Name », liens « # ») : traduite en français, liens vers l'application.

## Nouvelles fonctionnalités

- **Statut et édition des problèmes** : l'auteur modifie son problème et le marque ouvert, résolu ou fermé. Un problème fermé refuse les nouvelles propositions. Filtres par statut et par mot-clé.
- **Fiche technique des dépôts** : tâche, langues, fonctionnement hors ligne, matériel cible. Le hub filtre par langue et « fonctionne hors ligne ».
- **Dépôts à essayer** : sur la page d'un problème, les dépôts du hub pertinents et pas encore proposés, avec leur compatibilité aux contraintes terrain (hors ligne, langue).
- **Tableau de bord** (`/tableau-de-bord`) : solutions, contributions et pull requests en attente de décision, suivi de ses propres propositions, tous ses dépôts privés compris.
- **Données de démo** (`npm run db:demo`) : quatre comptes, une organisation, cinq dépôts avec fichiers, quatre problèmes réalistes (manioc, darija et Arabizi, géocodage par repères, transcription en fon).

## Tests

`npm test` lance 38 tests de bout en bout sur l'API (`apps/api/test/e2e.test.ts`) : comptes, organisations, droits sur les dépôts privés, collaborateurs, fichiers et versions, chemins dangereux, likes, discussions, pull requests et conflits, problèmes, solutions, contributions, validation, recherche, ainsi que toutes les nouveautés.

## Base de données

Migration `0001_terrain_et_statut` : statut et date de modification des problèmes, fiche technique des dépôts. À appliquer avec `npm run db:migrate`.

# Deuxième passe (30 octobre 2026, après-midi)

## Corrections

- Tous les onglets portaient le même titre : chaque page a maintenant le sien.
- Une recherche de moins de deux caractères affichait une page vide : message explicatif.
- « Manioc » et « manioc » pouvaient coexister chez le même propriétaire (adresses presque identiques) : unicité sans tenir compte de la casse.
- Le propriétaire d'un dépôt pouvait s'ajouter lui-même comme collaborateur : refusé.
- Un message composé uniquement d'espaces était accepté : refusé.
- Le téléchargement d'une ressource restreinte passait par une fenêtre `confirm` du navigateur : remplacée par une boîte de dialogue qui liste les conditions de la licence.
- La landing n'offrait aucun accès à l'application sans créer de compte : bouton « Explorer les problèmes ».
- Lien d'évitement « Aller au contenu » pour la navigation au clavier.

## Nouvelles fonctionnalités

- **Travaux en cours** : sur un problème, « Je travaille dessus » avec une note sur sa piste. La liste de qui travaille sur quoi est visible de tous, et retrouvée dans le tableau de bord. C'est le pendant des tentatives visibles : on sait qui est déjà parti avant de se lancer.
- **Carte des problèmes** : l'Afrique en points (contours Natural Earth de la landing), un cercle par pays ayant des problèmes, taille selon leur nombre. Un clic ouvre la liste filtrée sur ce pays.
- **Aperçu des fichiers** texte, JSON et CSV (en tableau) directement dans le navigateur.
- **Utiliser ce dépôt** : commandes prêtes à copier pour télécharger tous les fichiers et vérifier leurs empreintes SHA-256.
- **Après l'acceptation d'une solution**, la plateforme propose de marquer le problème comme résolu.
- Bouton « Copier le lien » sur chaque problème.

## Design

En-tête et pied de page marine dans la continuité de la landing, bandeaux d'affiche en Bebas Neue sur l'accueil, les problèmes, le hub et les profils, carte de l'Afrique sur l'accueil et la liste des problèmes, avatars à initiales, bande de couleur selon le statut des problèmes, pastilles d'icône par type de dépôt, chiffres d'affiche pour les étapes. Aucun dégradé, ombre ni animation, conformément au CLAUDE.md.

## Tests

44 tests de bout en bout (6 de plus). Migration `0002_travaux_en_cours`.
