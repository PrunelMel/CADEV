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

# Page « Publier un problème » (31 octobre 2026)

- **Nouvelle page de publication** (`apps/web/src/features/problem-form/`) : formulaire à gauche, assistant à droite dont le contenu suit le champ actif (aperçu du brouillon en direct, exemples de titres, secteurs, carte des pays, étiquettes, critères de réussite). Barre d'état collante avec progression des quatre champs obligatoires, fenêtre de confirmation après publication. Sur téléphone, l'assistant s'ouvre en volet bas.
- **Carte des pays** : reprise de la carte en points, colorée par région ; chaque point est rattaché au pays dont le centre est le plus proche (frontières approchées). Zoom sur le pays choisi, recherche avec autocomplétion.
- **Étiquettes terrain** : connectivité, matériel et langues deviennent des listes, choisies dans `apps/web/src/content/problem-form.ts` ou créées par l'auteur. Migration `0003_etiquettes_terrain` (le texte existant est découpé sur les virgules).
- **Critères de réussite facultatifs** (auparavant au moins 10 caractères).
- La page de modification utilise le même formulaire, avec le statut en plus. Après publication, « Modifier » met à jour le problème publié au lieu d'en créer un second.
- Style : exception au style sobre, limitée à cette page et notée dans le CLAUDE.md.

# Page « Publier un problème » fournie par l'équipe (31 octobre 2026)

La première version de la page est remplacée par la maquette de l'équipe (`PublishProblem.jsx`), intégrée en TypeScript et branchée sur l'API.

- **Page** : `apps/web/src/features/problem-form/PublishProblem.tsx`. Panneaux contextuels (aperçu, aides, secteurs en bulles, carte, étiquettes), recherche contextuelle, confirmation. Publication réelle ; « Modifier » met ensuite à jour le problème publié. La page de modification utilise la même page, avec le statut.
- **Carte** : vrais contours des 54 pays (`apps/web/src/content/africa-map.ts`, Natural Earth 50m, domaine public), zoom, déplacement, infobulle. Les noms enregistrés restent ceux du catalogue des pays de l'application.
- **En-tête en verre sur toutes les pages** (`apps/web/src/components/glass/GlassHeader.tsx`), relié à la navigation, à la recherche, à la session et à la déconnexion. Les bandeaux marine passent sous l'en-tête.
- **Listes** (secteurs, étiquettes, aides) dans `apps/web/src/content/problem-form.ts`, complétées comme dans la maquette (« Synchronisation différée », « Autres moyens », etc.).
- **Dépendance** : `framer-motion` 11.18.2. **Polices** : IBM Plex Mono et Hanken Grotesk (Google Fonts).
- Écarts avec la maquette : l'icône « Drone » n'existe pas dans la version de lucide-react du projet (remplacée par un avion) ; le tiret cadratin de « Pays · région » et du libellé d'accueil du logo est remplacé ; titre et description doivent atteindre les longueurs minimales de l'API (5 et 20 caractères).

# Contribution de données : page-formulaire (31 octobre 2026)

Intégration du module `contribution-feature/` (spécifications « Contribution de Données »), porté en TypeScript et branché sur la plateforme.

## Parcours

- **Page du problème** : la section « Contributions de données » affiche la page-formulaire publiée (nombre de champs, de contributions) avec le bouton **Contribuer**. L'auteur y trouve **Concevoir** (ou **Modifier**) **la page de contribution**. La proposition d'un jeu de données reste disponible (« Proposer un jeu de données »).
- **Concevoir** (`/problemes/:id/concevoir`, auteur seul) : palette de blocs à gauche (recherche, glisser-déposer ou « + »), formulaire éditable à droite, inspecteur, blocs liés, aperçu, annuler et rétablir, enregistrement automatique, publication versionnée. Onglets Ressources (médias rangés automatiquement), Stockage (champs collectés, format CSV, XLSX ou un TXT par réponse, arborescence, téléchargement), **Relectures** (l'auteur accepte ou rejette les corrections). Mode « Importer du code » : page HTML exécutée dans une iframe isolée.
- **Contribuer** (`/problemes/:id/contribuer`, membres) : le formulaire publié, barre d'envoi avec progression, remerciement, puis « Contribuer encore » ou « Retour au problème ». Un problème fermé refuse les contributions.
- **Tableau de bord** : les corrections à trancher apparaissent dans « À traiter », avec un lien direct vers l'onglet Relectures.

## API

- Module `apps/api/src/modules/contributions/form/` : routes sous `/api/problems/:id/contribution/*`, entrées validées par Zod puis par le modèle partagé.
- Base : migration `0004_contribution_formulaire` (formulaires, révisions, médias, réponses, relectures). Les réponses en base sont la source de vérité ; les fichiers CSV, XLSX, TXT et le dictionnaire sont régénérés dans MinIO sous `problems/<id>/contribution/`.
- Médias : type réel détecté par signature binaire, dédoublonnage par SHA-256, lecture par plages d'octets (audio et vidéo).
- Corrections : jamais appliquées aux réponses ; l'auteur seul décide, le seuil d'accord du bloc n'est qu'un signal.

## Écarts avec le module d'origine

- Stockage en base et dans MinIO au lieu du disque local ; envoi des médias en flux brut (comme les fichiers de dépôt) au lieu de multer.
- Règle de validation : l'auteur décide (le module validait aussi par consensus).
- Relecture seule : une réponse sans champ rempli n'ajoute pas de ligne au fichier de réponses (les champs obligatoires restent dus).
- Icônes de la palette : symboles Unicode remplacés par des icônes lucide-react.
- Positionnement du repère d'insertion pendant le glisser-déposer corrigé (il plaçait toujours le bloc avant la cible).

## Tests

`npm test` : 58 tests (14 nouveaux dans `apps/api/test/contribution.test.ts`). Le client HTTP des tests est partagé dans `apps/api/test/client.ts`.

# Liste des problèmes en charte « Liquid Glass » (2 novembre 2026)

Première page harmonisée avec la publication d'un problème et la contribution de données.

- **Bandeau** : titre, présentation, nombre de problèmes ouverts et de pays, accès à la publication ; à droite, la carte de l'Afrique en points avec un cercle par pays qui a des problèmes. Un clic sur un pays filtre la liste et la carte cadre la région ; un second clic retire le filtre. Au défilement, le bandeau s'efface doucement (coupé si le système demande moins d'animations).
- **Filtres** dans une barre de verre collante : mot-clé, statut, secteur, pays actif (retirable), nombre de résultats.
- **Liste et fiche** : la liste à gauche (cartes qui apparaissent au défilement, flèches haut et bas pour passer d'un problème à l'autre), la fiche du problème choisi à droite, collante : carte qui zoome sur le pays, statut, secteur, description, contraintes terrain, personnes qui y travaillent, critères de réussite, solutions et contributions, boutons « Voir le problème » et « Contribuer ». Le problème choisi est dans l'adresse (`?probleme=`). Sur téléphone, la fiche monte du bas.
- **Carte commune** : `components/glass/africaMap.tsx` (pays, tracés, cadrage, extraits de la page de publication, sans changement de comportement) et `components/glass/AfricaDotMap.tsx` (carte en lecture avec zoom animé). Le fond de page (`PageShell`) et la surface `.pp-card` passent dans `components/glass/`.

## Nouvelle carte de problème (2 novembre 2026)

- Carte de la liste `/problemes` refaite selon la maquette de l'équipe : titre, icône de statut seule en haut à droite (ouvert : cercle vert ; fermé : cadenas rouge ; résolu : badge lavande), ligne d'informations avec icônes (pays, secteur, solutions, acceptées), auteur et date à droite. Un problème fermé affiche « fermé le … ». Le point coloré suivi du mot « Ouvert » disparaît, aussi dans la fiche.
- API : colonne `problems.closed_at` (migration `0005_date_fermeture`), remplie quand l'auteur ferme le problème, vidée s'il le rouvre ; les problèmes déjà fermés reprennent leur date de dernière modification. Renvoyée dans la liste (`closedAt`).

## Hub de solutions en charte « Liquid Glass » (2 novembre 2026)

- `/hub` reprend les sections de la liste des problèmes : bandeau (titre, présentation, bouton « Créer un dépôt ») avec à droite le choix du type (modèles, datasets, bibliothèques, un clic filtre, un second retire le filtre), barre de filtres collante (mot-clé, langue, hors ligne, type actif, nombre de dépôts), puis la liste à gauche et la fiche du dépôt choisi à droite (`?depot=owner/nom`, flèches haut et bas). Sur téléphone, la fiche monte du bas.
- Fiche du dépôt : type, nom, auteur et date, description, licence en tête avec ses restrictions (avertissement seulement si la licence en impose), fiche technique, provenance des données, limites connues, problèmes auxquels le dépôt répond, lien vers le dépôt.
- La carte de dépôt garde le contenu de l'ancienne carte, passé en verre.
- Mise en page liste et fiche, message de liste, cases de fiche et informations à icône mises en commun dans `components/glass/MasterDetail.tsx` (la liste des problèmes s'en sert aussi).
- Étiquette « Aperçu du brouillon » sur la page de publication : texte en police d'affichage, sans bulle ni icône ; animation de clignotement retirée.

## Créer un dépôt en charte « Liquid Glass » (6 novembre 2026)

- `/nouveau-depot` reprend la construction de la publication d'un problème : formulaire à gauche (type, propriétaire, nom avec l'adresse du dépôt en direct, description ; partage : visibilité et licence ; provenance pour un dataset ; fiche technique ; documentation), barre d'envoi collante avec l'anneau des champs obligatoires (type, nom, licence), panneau contextuel à droite qui suit le champ actif :
  - type : trois bulles (modèle, dataset, bibliothèque) avec leur explication ;
  - propriétaire : soi-même ou une organisation administrée (champ masqué sans organisation) ;
  - licence : le catalogue, chaque licence avec son résumé et ses restrictions en ambre ;
  - pays d'origine (dataset) : la carte interactive de l'Afrique ;
  - langues : les étiquettes de langues de la publication d'un problème, avec création ;
  - champs texte : aperçu en direct de la carte du hub et aides (noms, tâches, matériel, sections de fiche, limites).
- Options dans `content/repo-form.ts` ; langues et matériel reprennent le vocabulaire des problèmes.
- Les pièces génériques de la page de publication (recherche contextuelle, champs, groupes, panneaux, bulles, carte des pays, barre d'envoi, décor) sont extraites telles quelles dans `components/glass/formKit.tsx` ; la page de publication s'en sert, sans changement de comportement.

## Un dépôt répond toujours à un problème (6 novembre 2026)

- **Dépôt et problème** : `repositories.problem_id` obligatoire dès la création (formulaire : champ « Problème ciblé » et panneau de choix, préremplis depuis la page d'un problème via `?probleme=`) ; le propriétaire peut changer de problème dans les paramètres du dépôt.
- **Statut d'un dépôt** (`under_construction` par défaut, ou `solution`), choisi par son propriétaire. En construction, hors de l'équipe (propriétaire, collaborateurs, membres de l'organisation), seuls le README et la fiche sont visibles partout : fichiers, versions, téléchargements, pull requests et discussions répondent 403 (`access.full` dans `lib/permissions.ts`). Un dépôt privé n'apparaît jamais parmi les solutions d'un problème.
- **Fin de la validation par l'auteur du problème** : plus d'acceptation ni de rejet des solutions, des contributions de données, ni des corrections du bloc « Validation de données » (tables `solutions` et `validations` supprimées, colonnes de décision retirées). L'auteur du problème choisit au plus la solution mise en avant (`PUT /api/problems/:id/featured`) ; sans choix, c'est la solution la plus aimée.
- **Problème fermé** : un dépôt peut encore y être lié (avertissement dans le formulaire et les paramètres), mais les dépôts d'un problème fermé passent derrière les autres dans le hub, la recherche et le profil. Bandeau sur le dépôt et section du tableau de bord pour le relier à un autre problème ou en publier un nouveau.
- **Notifications** : fermer ou rouvrir un problème notifie les propriétaires des dépôts liés (table `notifications`, cloche dans l'en-tête avec le nombre de non lues) et leur envoie un e-mail via Resend (nouvelle dépendance `resend`, variables `RESEND_API_KEY` et `MAIL_FROM` ; sans clé, pas d'e-mail).
- **Migration `0006_depots_problemes`** : chaque dépôt proposé comme solution est rattaché à son problème (la proposition acceptée d'abord) et passe au statut « solution » ; le résumé et les résultats terrain de la proposition sont ajoutés à la fin de son README ; la solution acceptée devient la solution mise en avant ; les dépôts sans problème sont supprimés avec leurs discussions.
- Cartes et fiches mises à jour (liste des problèmes : « N en construction » remplace « N acceptée » ; hub : statut et problème de chaque dépôt ; profil : « Solutions publiées »), données de démo reconstruites (un problème fermé avec un dépôt encore lié et sa notification), FAQ et textes d'accueil.
- Tests : 63 tests de bout en bout (dépôt sans problème refusé, README seul en construction, mise en avant, changement de problème, notifications, tri des problèmes fermés).

## Fiche d'un problème en charte « Liquid Glass » (6 novembre 2026)

- `/problemes/:id` : bandeau en verre (statut, secteur, pays, auteur, titre, description ; actions « Créer un dépôt pour ce problème », « Contribuer », « Modifier », « Copier le lien » ; avertissement si le problème est fermé) avec la carte zoomée sur le pays, qui s'efface au défilement.
- Barre d'onglets collante avec compteurs (Solutions, Contributions, Discussion, Terrain), onglet dans l'URL (`?onglet=`) ; changer d'onglet ramène la barre en haut.
  - Solutions : solution mise en avant (choix de l'auteur ou de la communauté), autres solutions, dépôts en construction ; l'auteur du problème met en avant ou rend la main à la communauté.
  - Contributions : page-formulaire de contribution, jeux de données proposés, formulaire de proposition.
  - Discussion : messages et formulaire.
  - Terrain : contraintes, critères de réussite, qui travaille dessus, dépôts à essayer.
- Statut, secteur et formats de date mis en commun avec la liste des problèmes (`components/glass/problemBits.tsx`).
- E-mails de notification : non configurés pour l'instant, à la demande de l'équipe (les notifications restent dans la cloche).

## Chargement de la page d'accueil (8 novembre 2026)

- Chargement des pages à la demande (`React.lazy` dans `main.tsx`) : la landing ne télécharge plus le code des autres pages. Script principal en production : 1,4 Mo → 483 Ko (453 → 160 Ko compressé) ; landing en production : 564 → 274 Ko transférés ; en développement (`npm run dev`) : 115 → 34 requêtes, 7,9 → 3,5 Mo.
- Masque de la carte WebGL (`features/landing/gl/mask.ts`) : le grand canevas 4096 × 2048 n'est plus lisible côté processeur (envoi au GPU plus rapide) ; le placement des marqueurs lit un petit canevas de l'Afrique seule (2 Mo lus au lieu de 32 Mo). Rendu identique, création du masque environ 3 fois plus rapide.

## Page d'un dépôt en charte « Liquid Glass » (8 novembre 2026)

- `/:owner/:name` : bandeau (type, propriétaire, nom, statut, licence, version, likes, problème auquel le dépôt répond, provenance d'un dataset) et quatre onglets au lieu de six, dans l'URL (`?onglet=` ; les anciens `?tab=` restent compris) :
  - README.md : le README en Markdown sur fond de verre, ou le modèle généré depuis la fiche s'il est vide ; fiche technique, licence et restrictions, limites connues à côté.
  - Fichiers : fichiers et versions réunis comme sur GitHub ou Hugging Face : sélecteur de version, dernière modification (auteur, message, date), navigation par dossiers avec fil d'Ariane, aperçu, téléchargement (avertissement en verre si la licence restreint l'usage), historique des versions, ajout de fichier dans le dossier courant, commandes « Utiliser ce dépôt ».
  - Communauté : messages et pull requests dans un même fil, du plus récent au plus ancien, avec un filtre (Tout, Messages, Pull requests) et les boutons « Nouveau message » et « Proposer des fichiers ».
  - Paramètres (propriétaire) : problème lié, statut, visibilité, licence, fiche technique, README (« Repartir du modèle »), limites, collaborateurs.
- Pull request (`/:owner/:name/pulls/:n`) dans la même charte : fichiers proposés et conflits, ajout de fichiers par l'auteur, fusion et fermeture, discussion.
- README pré-rempli à la création d'un dépôt à partir du formulaire (nom, description, problème, type, fiche technique, licence, provenance, sections « Utilisation » et « Résultats terrain »), tant que l'auteur ne l'a pas modifié.
- Correction : le menu de licence des paramètres ne prend plus la première licence du catalogue avant son chargement (un enregistrement pouvait changer la licence du dépôt).
- Pièces communes aux fiches à onglets (`components/glass/sections.tsx`) : la fiche d'un problème s'en sert aussi. Anciens composants clairs retirés (`Discussions`, `FileUpload`, `LicenseWarning`).

## Connexion et inscription en charte « Liquid Glass » (9 novembre 2026)

- `/connexion` et `/inscription` : une carte de verre centrée sur le fond marine à l'Afrique en points, avec une bascule animée entre les deux formulaires ; la page d'origine (`?suite=`) suit la bascule et sert de retour après succès.
- Champs en verre, bouton pour afficher le mot de passe, consignes du nom d'utilisateur et du mot de passe.
- Messages d'erreur de better-auth traduits en français (`content/auth.ts`) : identifiants incorrects, nom d'utilisateur ou email déjà pris, mot de passe trop court, etc.

## Code par e-mail à l'inscription et à la connexion (9 novembre 2026)

- Inscription : un code à 6 chiffres, envoyé par e-mail, confirme l'adresse ; aucune session avant la confirmation (`emailAndPassword.requireEmailVerification`, plugin `emailOTP`). La confirmation ouvre la session.
- Connexion : après le mot de passe, un code envoyé par e-mail termine la connexion (plugin `twoFactor`, codes par e-mail seulement, sans application d'authentification). Valable 10 minutes, nouveau code sur demande, essais limités par better-auth.
- Formulaire en deux étapes dans la même carte (« Confirmez votre adresse », « Code de connexion »), saisie du code adaptée au téléphone (`one-time-code`), « Renvoyer le code », « Retour » ; erreurs traduites (`content/auth.ts`).
- E-mails envoyés par Resend depuis `MAIL_FROM` (domaine vérifié), en texte et en HTML. Rien n'est envoyé vers les adresses en `.local`.
- Migration `0007_code_par_email` : table `two_factors` attendue par le plugin, colonne `users.two_factor_enabled`. Comptes existants : adresse considérée comme vérifiée ; code à la connexion activé pour les adresses réelles, pas pour les adresses fictives en `.local` (démo, tests). `npm run db:demo` crée ses comptes vérifiés, sans code.
- Tests : `npm test` charge `.env` pour lire les codes en base ; 64 tests, dont l'inscription sans session avant le code et la connexion refusée sans code ou avec un mauvais code.

## Déploiement en production (11 novembre 2026)

- `Dockerfile` en plusieurs étapes : image `api` (API compilée, dépendances d'exécution seulement, utilisateur non root) et image `web` (Caddy avec le front construit).
- `docker-compose.prod.yml` : PostgreSQL et MinIO joignables seulement depuis le réseau Docker, API, Caddy exposé sur 80 et 443 (HTTPS automatique, envois jusqu'à 500 Mo, cache long pour les fichiers du front, routes du front renvoyées vers `index.html`). Redémarrage automatique.
- `deploy/Caddyfile`, `.env.production.example`, `.dockerignore`.
- `apps/api/src/db/migrate.ts` : applique les migrations sans drizzle-kit (`node dist/db/migrate.js` dans le conteneur).
- Section « Déploiement » du README.

## Inscription : adresse mal saisie (13 novembre 2026)

Retour d'un testeur : une faute dans l'adresse (« .con ») bloquait l'inscription, et le nom d'utilisateur restait pris par le compte jamais confirmé.

- Étape du code : lien « Adresse mal saisie ? Modifier l'adresse ». La nouvelle adresse remplace l'ancienne et reçoit un nouveau code, sans tout recommencer ni perdre le nom d'utilisateur (`POST /api/account/pending-email` ; le mot de passe saisi à l'inscription, gardé par le formulaire, prouve la demande). Refusé pour une adresse déjà confirmée ou déjà utilisée par un autre compte.
- Inscriptions jamais confirmées : supprimées au bout de 24 heures (au démarrage de l'API, puis toutes les heures), ce qui libère le nom d'utilisateur et l'adresse (`PENDING_SIGNUP_TTL_HOURS`).
- Tests : 66, dont la correction d'adresse et la suppression d'une inscription expirée.

## Tableau de bord, profil et organisations en verre (13 novembre 2026)

- `/tableau-de-bord` : bandeau avec les actions (publier un problème, créer un dépôt, mon profil) et un encart « À faire » (pull requests à traiter, dépôts liés à un problème fermé), puis onglets À traiter, Mes problèmes, Travaux en cours, Contributions, Dépôts.
- `/u/:username` : bandeau (nom, organisations, nombre de solutions publiées, carte des pays des problèmes résolus, clic vers la liste filtrée), puis onglets Solutions, Problèmes publiés, Dépôts publics.
- `/orgs/:slug` : bandeau puis onglets Dépôts et Membres ; les admins ajoutent et retirent des membres dans l'onglet Membres. `/orgs/nouvelle` : carte de verre centrée, comme la connexion.
- Pièces communes : `components/glass/spaceBits.tsx` (bandeau, ligne cliquable, carte de dépôt compacte).
