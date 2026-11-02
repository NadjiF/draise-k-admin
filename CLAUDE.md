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

### Hors V1
La Draise-K qui lit le catalogue depuis l'API, plusieurs comptes ou rôles, envoi d'images, OAuth, Storybook.

## Conventions
- Interface en français, accessible (HTML sémantique, clavier, contrastes).
- Secrets dans des variables d'environnement, jamais dans le dépôt.
- Je suis développeur junior et j'apprends Angular avec ce projet : avancer par petites étapes, expliquer chaque modification et chaque concept Angular nouveau, proposer avant d'ajouter une dépendance, ne pas ajouter de fonctionnalité non demandée.
