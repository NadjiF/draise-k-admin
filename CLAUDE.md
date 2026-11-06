## Projet : back-office de La Draise-K
Interface d'administration du catalogue de La Draise-K (boutique de démonstration de pièces vélo, déjà en ligne, dépôt NadjiF/draise-k). Projet de portfolio, destiné à montrer : Angular, une API REST avec authentification, PostgreSQL, Docker et la CI. Développé sous Linux (WSL).

### Stack
- admin/ : Angular (version stable actuelle), TypeScript strict, signals, formulaires réactifs.
- api/ : Node.js, Express, TypeScript.
- Base : PostgreSQL, lancée avec Docker Compose.
- Tests de l'API automatisés, CI GitHub Actions (lint et tests à chaque push).

### Fonctionnalités V1
- Connexion d'un administrateur unique (mot de passe haché, JWT), routes protégées côté API et côté Angular.
- Liste des pièces avec filtre par catégorie.
- Création, modification, suppression d'une pièce, avec validation côté interface et côté API.
- Données : même modèle que La Draise-K (id, nom, catégorie, prixCentimes, compatibilités, description), le catalogue actuel servant de données initiales.
- Erreurs claires et en français, dans l'API et l'interface.

### Choix techniques
- Structure : api/, admin/ et docker-compose.yml à la racine, un package.json par dossier.
- Base : PostgreSQL dans Docker Compose, initialisée par un seul fichier api/db/init.sql (création de la table et insertion du catalogue de La Draise-K), exécuté par PostgreSQL au premier démarrage du conteneur. Pas d'outil de migration ni de dossiers migrations/ ou seeds/ en V1.
- API : Express + TypeScript, bibliothèque pg (SQL écrit à la main), validation avec zod, tests avec Vitest et supertest.
- Authentification : un seul administrateur, identifiant et mot de passe haché dans les variables d'environnement. Aucun administrateur en base.
- Angular : sans bibliothèque de composants, palette de La Draise-K.
- Identifiants de la base dans un fichier .env non commité, avec un .env.example commité.
- Sources du catalogue initial : /mnt/c/Users/Utilisateur/dev/draise-k/data/pieces.json (données) et /mnt/c/Users/Utilisateur/dev/draise-k/types/piece.ts (type Piece).

- Limite des tentatives de connexion : express-rate-limit, 5 échecs par adresse IP en 15 minutes, compteurs en mémoire (api/src/auth/limite-connexion.ts).

### À faire à la mise en ligne
- Régler `trust proxy` d'Express (`app.set("trust proxy", …)` dans api/src/app.ts) selon l'hébergeur. Derrière un proxy, sans ce réglage, toutes les requêtes semblent venir de l'adresse IP du proxy : la limite de tentatives de connexion bloquerait alors tout le monde à la fois.
- En développement, l'interface appelle l'API par une URL relative (`/api/...`), transmise au port 3000 par le proxy du serveur de développement d'Angular (admin/proxy.conf.json). En production, si l'interface et l'API ne sont pas servies sous le même domaine, il faudra soit une redirection de `/api` vers l'API (reverse proxy), soit activer CORS dans l'API pour l'origine de l'interface.

### Hors V1
La Draise-K qui lit le catalogue depuis l'API, plusieurs comptes ou rôles, envoi d'images, OAuth, Storybook.

## Conventions
- Interface en français, accessible (HTML sémantique, clavier, contrastes).
- Secrets dans des variables d'environnement, jamais dans le dépôt.
- Je suis développeur junior et j'apprends Angular avec ce projet : avancer par petites étapes, expliquer chaque modification et chaque concept Angular nouveau, proposer avant d'ajouter une dépendance, ne pas ajouter de fonctionnalité non demandée.
