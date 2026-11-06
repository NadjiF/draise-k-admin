import { Router } from "express";
import { exigerAdmin } from "../auth/exiger-admin.ts";
import { ErreurApi } from "../erreurs.ts";
import { validerPiece } from "./piece.schema.ts";
import {
  creerPiece,
  listerPieces,
  remplacerPiece,
  supprimerPiece,
  trouverPiece,
} from "./pieces.repository.ts";

export const piecesRouter = Router();

// Les erreurs lancées dans une route (throw) sont transmises par Express 5
// au gestionnaire d'erreurs de app.ts, qui construit la réponse.

function pieceIntrouvable(id: string): ErreurApi {
  return new ErreurApi(404, `Aucune pièce avec l'identifiant « ${id} ».`);
}

// GET /api/pieces : tout le catalogue.
piecesRouter.get("/", async (_requete, reponse) => {
  const pieces = await listerPieces();
  reponse.json(pieces);
});

// GET /api/pieces/:id : une pièce. « :id » est un paramètre de l'URL,
// lu dans requete.params.id (ex. /api/pieces/chaine-11v → "chaine-11v").
piecesRouter.get("/:id", async (requete, reponse) => {
  const piece = await trouverPiece(requete.params.id);
  if (piece === null) {
    throw pieceIntrouvable(requete.params.id);
  }
  reponse.json(piece);
});

// POST /api/pieces : création. L'id est choisi par l'administrateur.
piecesRouter.post("/", exigerAdmin, async (requete, reponse) => {
  const piece = validerPiece(requete.body);

  const creee = await creerPiece(piece);
  if (creee === null) {
    throw new ErreurApi(409, `Une pièce avec l'identifiant « ${piece.id} » existe déjà.`, [
      { champ: "id", message: "Cet identifiant est déjà utilisé." },
    ]);
  }
  reponse.status(201).json(creee);
});

// PUT /api/pieces/:id : remplacement complet. Le corps contient la pièce entière,
// id compris, et cet id doit être celui de l'URL.
piecesRouter.put("/:id", exigerAdmin, async (requete, reponse) => {
  const piece = validerPiece(requete.body);

  if (piece.id !== requete.params.id) {
    throw new ErreurApi(400, "Données invalides : 1 champ à corriger.", [
      { champ: "id", message: "L'identifiant d'une pièce ne peut pas être modifié." },
    ]);
  }

  const remplacee = await remplacerPiece(piece);
  if (remplacee === null) {
    throw pieceIntrouvable(requete.params.id);
  }
  reponse.json(remplacee);
});

// DELETE /api/pieces/:id : suppression. 204 = succès, sans corps de réponse.
piecesRouter.delete("/:id", exigerAdmin, async (requete, reponse) => {
  const supprimee = await supprimerPiece(requete.params.id);
  if (!supprimee) {
    throw pieceIntrouvable(requete.params.id);
  }
  reponse.status(204).end();
});
