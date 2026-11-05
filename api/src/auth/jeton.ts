// Création des jetons JWT de l'administrateur, avec la bibliothèque jose.

import { SignJWT } from "jose";
import { config } from "../config.ts";

// Durée de validité d'un jeton : 2 heures, en secondes.
export const DUREE_JETON_SECONDES = 2 * 60 * 60;

// Le contenu du jeton est lisible par tous (encodé, pas chiffré) :
// on n'y met que "admin", jamais l'identifiant réel ni rien de sensible.
export const SUJET_ADMIN = "admin";

// jose attend la clé sous forme d'octets, pas de texte.
export const cleJwt = new TextEncoder().encode(config.jwtSecret);

export interface JetonEmis {
  jeton: string;
  expiration: string; // date ISO, pour qu'Angular sache quand la session finit
}

export async function creerJeton(): Promise<JetonEmis> {
  const maintenant = Math.floor(Date.now() / 1000); // les dates JWT sont en secondes
  const expiration = maintenant + DUREE_JETON_SECONDES;

  const jeton = await new SignJWT()
    .setProtectedHeader({ alg: "HS256" }) // en-tête : algorithme de signature
    .setSubject(SUJET_ADMIN) // sub
    .setIssuedAt(maintenant) // iat
    .setExpirationTime(expiration) // exp
    .sign(cleJwt);

  return { jeton, expiration: new Date(expiration * 1000).toISOString() };
}
