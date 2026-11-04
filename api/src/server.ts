// Point d'entrée : démarre le serveur HTTP.

import { app } from "./app.ts";
import { config } from "./config.ts";

app.listen(config.apiPort, (erreur) => {
  if (erreur) {
    console.error(`Impossible de démarrer l'API sur le port ${config.apiPort} :`, erreur.message);
    process.exit(1);
  }
  console.log(`API démarrée sur http://localhost:${config.apiPort}`);
});
