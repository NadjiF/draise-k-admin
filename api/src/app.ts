// Configure l'application Express, sans la démarrer (voir server.ts).
// Les tests pourront ainsi l'utiliser sans ouvrir de port réseau.

import express, { type ErrorRequestHandler } from "express";
import { piecesRouter } from "./pieces/pieces.routes.ts";

export const app = express();

app.use("/api/pieces", piecesRouter);

// Aucune route ne correspond
app.use((_requete, reponse) => {
  reponse.status(404).json({ erreur: "Ressource introuvable." });
});

// Erreur inattendue : le détail va dans le journal du serveur, pas dans la réponse.
const gererErreurs: ErrorRequestHandler = (erreur, _requete, reponse, _suite) => {
  console.error(erreur);
  reponse
    .status(500)
    .json({ erreur: "Erreur interne du serveur. Réessayez plus tard." });
};
app.use(gererErreurs);
