// Format commun des erreurs renvoyées par l'API :
//   { "erreur": "message général", "details": [{ "champ": "...", "message": "..." }] }
// La clé details n'est présente que lorsqu'un ou plusieurs champs sont en cause.

import type { z } from "zod";

export interface DetailErreur {
  champ: string; // chemin du champ dans le JSON, ex. "compatibilites.vitesses"
  message: string;
}

export interface CorpsErreur {
  erreur: string;
  details?: DetailErreur[];
}

// Erreur « prévue » (400, 404, 409…) : une route la lance avec throw,
// et le gestionnaire d'erreurs de app.ts la transforme en réponse HTTP.
export class ErreurApi extends Error {
  readonly statut: number;
  readonly details?: DetailErreur[];

  constructor(statut: number, message: string, details?: DetailErreur[]) {
    super(message);
    this.name = "ErreurApi";
    this.statut = statut;
    this.details = details;
  }

  versCorps(): CorpsErreur {
    return this.details === undefined
      ? { erreur: this.message }
      : { erreur: this.message, details: this.details };
  }
}

// Transforme les problèmes trouvés par zod en détails au format de l'API.
// Le chemin ["compatibilites", "taillesRoue", 1] devient "compatibilites.taillesRoue" :
// on retire les numéros de position pour désigner le champ du formulaire,
// la valeur fautive étant citée dans le message.
export function detailsDepuisZod(problemes: readonly z.core.$ZodIssue[]): DetailErreur[] {
  const details: DetailErreur[] = [];
  for (const probleme of problemes) {
    const chemin = probleme.path.filter((morceau) => typeof morceau === "string");

    // Champs en trop : zod les regroupe en un seul problème, on en fait un par champ.
    if (probleme.code === "unrecognized_keys") {
      for (const cle of probleme.keys) {
        details.push({ champ: [...chemin, cle].join("."), message: "Champ inconnu." });
      }
      continue;
    }

    details.push({ champ: chemin.join("."), message: probleme.message });
  }
  return details;
}

// Vérifie des données reçues avec un schéma zod et renvoie le résultat validé.
// Lance une ErreurApi 400, au format commun, si les données ne conviennent pas.
// messageCorpsInvalide : message quand le corps entier n'est pas un objet.
export function validerAvecZod<Schema extends z.ZodType>(
  schema: Schema,
  donnees: unknown,
  messageCorpsInvalide: string,
): z.output<Schema> {
  const resultat = schema.safeParse(donnees);
  if (resultat.success) {
    return resultat.data;
  }

  // Le corps entier n'est pas un objet (tableau, texte, corps absent…)
  const surLeCorps = resultat.error.issues.find(
    (probleme) => probleme.path.length === 0 && probleme.code === "invalid_type",
  );
  if (surLeCorps !== undefined) {
    throw new ErreurApi(400, messageCorpsInvalide);
  }

  const details = detailsDepuisZod(resultat.error.issues);
  const nombreDeChamps = new Set(details.map((detail) => detail.champ)).size;
  const message =
    nombreDeChamps === 1
      ? "Données invalides : 1 champ à corriger."
      : `Données invalides : ${nombreDeChamps} champs à corriger.`;
  throw new ErreurApi(400, message, details);
}

// Vrai si express.json() n'a pas pu lire le corps de la requête (JSON mal formé).
export function estJsonMalForme(erreur: unknown): boolean {
  return (
    erreur instanceof SyntaxError &&
    (erreur as SyntaxError & { type?: string }).type === "entity.parse.failed"
  );
}
