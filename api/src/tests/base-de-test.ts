// Outils pour les tests qui utilisent la vraie base PostgreSQL (service db-test).

import { readFile } from "node:fs/promises";
import { config } from "../config.ts";
import { pool } from "../db.ts";

const scriptInit = await readFile(new URL("../../db/init.sql", import.meta.url), "utf8");

// Remet la base dans son état initial : table recréée et catalogue réinséré,
// à partir du même init.sql que la base de développement.
// À appeler avant chaque test : beforeEach(reinitialiserBase).
export async function reinitialiserBase(): Promise<void> {
  // Sécurité : ce script supprime la table, il ne doit jamais viser une autre base.
  if (!config.db.database.endsWith("_test")) {
    throw new Error(
      `Tests interrompus : la base « ${config.db.database} » n'est pas une base de test (son nom doit finir par _test).`,
    );
  }

  try {
    // Sans paramètres, pg envoie le texte tel quel : PostgreSQL exécute alors
    // toutes les instructions du fichier, comme au démarrage du conteneur.
    await pool.query(`DROP TABLE IF EXISTS pieces;\n${scriptInit}`);
  } catch (erreur) {
    if ((erreur as { code?: string }).code === "ECONNREFUSED") {
      throw new Error(
        `Base de test injoignable sur ${config.db.host}:${config.db.port}. Lancez-la avec : docker compose up -d db-test`,
      );
    }
    throw erreur;
  }
}

// À appeler une fois à la fin du fichier de test : afterAll(fermerBase).
// Ferme les connexions, sinon le processus de test resterait ouvert.
export async function fermerBase(): Promise<void> {
  await pool.end();
}
