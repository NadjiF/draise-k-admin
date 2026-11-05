// Format commun des erreurs renvoyées par l'API :
//   { "erreur": "message général", "details": [{ "champ": "...", "message": "..." }] }
// La clé details n'est présente que lorsqu'un ou plusieurs champs sont en cause.

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

// Vrai si express.json() n'a pas pu lire le corps de la requête (JSON mal formé).
export function estJsonMalForme(erreur: unknown): boolean {
  return (
    erreur instanceof SyntaxError &&
    (erreur as SyntaxError & { type?: string }).type === "entity.parse.failed"
  );
}
