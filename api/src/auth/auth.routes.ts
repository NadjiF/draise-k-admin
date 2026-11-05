import { createHash, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { ErreurApi, validerAvecZod } from "../erreurs.ts";
import { creerJeton } from "./jeton.ts";
import { limiteConnexion } from "./limite-connexion.ts";

export const authRouter = Router();

const schemaConnexion = z.strictObject({
  identifiant: z
    .string({ error: "L'identifiant est obligatoire." })
    .min(1, { error: "L'identifiant est obligatoire." }),
  motDePasse: z
    .string({ error: "Le mot de passe est obligatoire." })
    .min(1, { error: "Le mot de passe est obligatoire." }),
});

// Compare deux textes en un temps qui ne dépend pas de l'endroit où ils diffèrent.
// On compare leurs empreintes SHA-256, qui ont toujours la même longueur,
// car timingSafeEqual exige deux valeurs de même taille.
function egauxEnTempsConstant(a: string, b: string): boolean {
  const empreinte = (texte: string) => createHash("sha256").update(texte).digest();
  return timingSafeEqual(empreinte(a), empreinte(b));
}

// POST /api/auth/connexion : { identifiant, motDePasse } → { jeton, expiration }
// limiteConnexion s'exécute avant la route : après 5 échecs, elle répond 429 elle-même.
authRouter.post("/connexion", limiteConnexion, async (requete, reponse) => {
  const { identifiant, motDePasse } = validerAvecZod(
    schemaConnexion,
    requete.body,
    "Le corps de la requête doit être un objet JSON avec identifiant et motDePasse.",
  );

  // Les deux vérifications sont toujours faites, même si l'identifiant est faux :
  // le temps de réponse ne révèle donc pas lequel des deux est incorrect.
  const identifiantCorrect = egauxEnTempsConstant(identifiant, config.admin.identifiant);
  const motDePasseCorrect = await argon2.verify(config.admin.motDePasseHash, motDePasse);

  if (!identifiantCorrect || !motDePasseCorrect) {
    throw new ErreurApi(401, "Identifiants incorrects.");
  }

  reponse.json(await creerJeton());
});
