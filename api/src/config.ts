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

export const config = {
  apiPort: lirePort("API_PORT", 3000),
  db: {
    host: process.env.POSTGRES_HOST?.trim() || "localhost",
    port: lirePort("POSTGRES_PORT", 5432),
    user: lireTexte("POSTGRES_USER"),
    password: lireTexte("POSTGRES_PASSWORD"),
    database: lireTexte("POSTGRES_DB"),
  },
};
