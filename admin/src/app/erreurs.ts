import { HttpErrorResponse } from '@angular/common/http';

// L'API renvoie ses erreurs en JSON, avec un message en français : { "erreur": "..." }
// (voir api/src/erreurs.ts). Cette fonction renvoie ce message s'il existe.
// Sinon (API arrêtée, réseau coupé…), il n'y a pas de message utilisable : on renvoie
// messageParDefaut, choisi par l'appelant selon ce que la personne peut faire ensuite.
export function messageErreur(erreur: unknown, messageParDefaut: string): string {
  if (
    erreur instanceof HttpErrorResponse &&
    typeof erreur.error === 'object' &&
    erreur.error !== null &&
    typeof erreur.error.erreur === 'string'
  ) {
    return erreur.error.erreur;
  }
  return messageParDefaut;
}
