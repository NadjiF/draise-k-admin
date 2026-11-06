// Middleware qui réserve une route à l'administrateur connecté.
// Usage : router.post("/", exigerAdmin, async (requete, reponse) => { … })
// Il s'exécute avant la route : si le jeton manque ou n'est pas valable, il lance
// une erreur 401 et la route n'est jamais appelée.

import type { NextFunction, Request, Response } from "express";
import { errors, jwtVerify } from "jose";
import { ErreurApi } from "../erreurs.ts";
import { cleJwt, SUJET_ADMIN } from "./jeton.ts";

// Le jeton est attendu dans l'en-tête : Authorization: Bearer <jeton>
const FORMAT_ENTETE = /^Bearer ([^\s]+)$/i;

// Générique (<Parametres>) : le middleware ne fixe pas le type de requete.params,
// que TypeScript déduit alors du chemin de la route (ex. "/:id" → { id: string }).
export async function exigerAdmin<Parametres>(
  requete: Request<Parametres>,
  reponse: Response,
  suite: NextFunction,
): Promise<void> {
  const jeton = requete.get("Authorization")?.match(FORMAT_ENTETE)?.[1];

  // En-tête standard d'une réponse 401 : il indique au client le type
  // d'authentification attendu (RFC 6750).
  if (jeton === undefined) {
    reponse.set("WWW-Authenticate", "Bearer");
    throw new ErreurApi(
      401,
      "Authentification requise : connectez-vous pour effectuer cette action.",
    );
  }

  try {
    // Vérifie la signature et la date d'expiration (exp).
    // algorithms : on n'accepte que HS256, ce qui refuse notamment « alg: none »
    // (un jeton sans signature) et toute tentative de changer d'algorithme.
    await jwtVerify(jeton, cleJwt, { algorithms: ["HS256"], subject: SUJET_ADMIN });
  } catch (erreur) {
    reponse.set("WWW-Authenticate", 'Bearer error="invalid_token"');
    if (erreur instanceof errors.JWTExpired) {
      throw new ErreurApi(401, "Session expirée. Reconnectez-vous.");
    }
    throw new ErreurApi(401, "Jeton invalide. Reconnectez-vous.");
  }

  suite(); // jeton valable : on passe à la route
}
