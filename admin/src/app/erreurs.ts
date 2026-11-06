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

// Un champ en cause dans une erreur de l'API, ex. { champ: "nom", message: "Le nom ne peut pas être vide." }.
// champ est le chemin dans le JSON envoyé : "prixCentimes", "compatibilites.vitesses"…
export interface DetailErreur {
  champ: string;
  message: string;
}

// Les détails par champ d'une erreur de l'API (400 de validation, 409 sur l'id).
// Renvoie une liste vide si la réponse n'en contient pas, ou si elle est mal formée.
export function detailsErreur(erreur: unknown): DetailErreur[] {
  if (!(erreur instanceof HttpErrorResponse) || typeof erreur.error !== 'object') return [];
  const details: unknown = erreur.error?.details;
  if (!Array.isArray(details)) return [];
  return details.filter(
    (detail): detail is DetailErreur =>
      typeof detail?.champ === 'string' && typeof detail?.message === 'string',
  );
}
