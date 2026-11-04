import { Router } from "express";
import { listerPieces } from "./pieces.repository.ts";

export const piecesRouter = Router();

// GET /api/pieces : tout le catalogue.
// Si la requête SQL échoue, Express 5 transmet l'erreur au gestionnaire d'erreurs.
piecesRouter.get("/", async (_requete, reponse) => {
  const pieces = await listerPieces();
  reponse.json(pieces);
});
