// Configure l'application Express, sans la démarrer (voir server.ts).
// Les tests pourront ainsi l'utiliser sans ouvrir de port réseau.

import express, { type ErrorRequestHandler } from "express";
import { authRouter } from "./auth/auth.routes.ts";
import { ErreurApi, estJsonMalForme } from "./erreurs.ts";
import { piecesRouter } from "./pieces/pieces.routes.ts";

export const app = express();

// Lit les corps JSON (en-tête Content-Type: application/json) dans requete.body.
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/pieces", piecesRouter);

// Aucune route ne correspond
app.use((_requete, reponse) => {
  reponse.status(404).json({ erreur: "Ressource introuvable." });
});

const gererErreurs: ErrorRequestHandler = (erreur, _requete, reponse, _suite) => {
  // Erreur prévue, lancée par une route (400, 404, 409…)
  if (erreur instanceof ErreurApi) {
    reponse.status(erreur.statut).json(erreur.versCorps());
    return;
  }

  // Corps de requête illisible : c'est une erreur du client, pas du serveur.
  if (estJsonMalForme(erreur)) {
    reponse
      .status(400)
      .json({ erreur: "Le corps de la requête n'est pas un JSON valide." });
    return;
  }

  // Erreur inattendue : le détail va dans le journal du serveur, pas dans la réponse.
  console.error(erreur);
  reponse
    .status(500)
    .json({ erreur: "Erreur interne du serveur. Réessayez plus tard." });
};
app.use(gererErreurs);
