// Configuration de Vitest (npm test).

import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// En local, identifiants lus dans ../.env. En CI, il n'y a pas de fichier :
// les variables viennent directement de l'environnement.
const fichierEnv = new URL("../.env", import.meta.url);
const variablesDuFichier = existsSync(fichierEnv)
  ? parseEnv(readFileSync(fichierEnv, "utf8"))
  : {};

const portDeTest =
  process.env.POSTGRES_TEST_PORT ?? variablesDuFichier.POSTGRES_TEST_PORT ?? "5433";

export default defineConfig({
  test: {
    // Variables vues par le code testé (config.ts) : la base de test remplace
    // celle de développement.
    env: {
      ...variablesDuFichier,
      POSTGRES_DB: "draisek_admin_test",
      POSTGRES_PORT: portDeTest,
    },
    // Les fichiers de test partagent la même base : on les exécute l'un après l'autre
    // pour qu'un test ne vide pas la table pendant qu'un autre s'en sert.
    fileParallelism: false,
  },
});
