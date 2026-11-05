// Lit et vérifie les variables d'environnement une seule fois, au démarrage.

function lireTexte(nom: string): string {
  const valeur = process.env[nom];
  if (valeur === undefined || valeur.trim() === "") {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. Vérifiez le fichier .env (modèle : .env.example).`,
    );
  }
  return valeur;
}

function lirePort(nom: string, valeurParDefaut: number): number {
  const valeur = process.env[nom];
  if (valeur === undefined || valeur.trim() === "") {
    return valeurParDefaut;
  }
  const port = Number(valeur);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Variable d'environnement invalide : ${nom} doit être un numéro de port entre 1 et 65535 (reçu : « ${valeur} »).`,
    );
  }
  return port;
}

// Le hash doit venir de « npm run hash-mot-de-passe » : on refuse ainsi
// un mot de passe en clair copié par erreur.
function lireHashArgon2(nom: string): string {
  const valeur = lireTexte(nom);
  if (!valeur.startsWith("$argon2id$")) {
    throw new Error(
      `Variable d'environnement invalide : ${nom} doit être un hash argon2id (il commence par $argon2id$). Générez-le avec : npm run hash-mot-de-passe`,
    );
  }
  return valeur;
}

function lireSecret(nom: string, longueurMin: number): string {
  const valeur = lireTexte(nom);
  if (valeur.length < longueurMin) {
    throw new Error(
      `Variable d'environnement invalide : ${nom} doit contenir au moins ${longueurMin} caractères (voir .env.example pour en générer un).`,
    );
  }
  return valeur;
}

export const config = {
  apiPort: lirePort("API_PORT", 3000),
  db: {
    host: process.env.POSTGRES_HOST?.trim() || "localhost",
    port: lirePort("POSTGRES_PORT", 5432),
    user: lireTexte("POSTGRES_USER"),
    password: lireTexte("POSTGRES_PASSWORD"),
    database: lireTexte("POSTGRES_DB"),
  },
  // Administrateur unique : il n'est pas enregistré en base.
  admin: {
    identifiant: lireTexte("ADMIN_IDENTIFIANT"),
    motDePasseHash: lireHashArgon2("ADMIN_MOT_DE_PASSE_HASH"),
  },
  jwtSecret: lireSecret("JWT_SECRET", 32),
};
