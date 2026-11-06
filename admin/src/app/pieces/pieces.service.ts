import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Piece } from './piece';

// URL relative : en développement, le proxy (proxy.conf.json) la transmet au port 3000.
const URL_PIECES = '/api/pieces';

// Adresse d'une pièce. encodeURIComponent : l'id vient parfois de l'URL de la page
// (/pieces/:id/modifier), donc de n'importe quelle saisie ; un caractère comme « / » ou « ? »
// changerait sinon l'adresse appelée. Les vrais id (ex. chaine-11v) ne sont pas modifiés.
function urlPiece(id: string): string {
  return `${URL_PIECES}/${encodeURIComponent(id)}`;
}

// Toutes les requêtes HTTP sur les pièces passent par ce service :
// les composants ne connaissent pas les URL de l'API.
// Les erreurs (400, 404, 409…) sont transmises telles quelles : c'est le composant qui les affiche.
// Le jeton est ajouté par jetonInterceptor, pas ici.
@Injectable({ providedIn: 'root' })
export class PiecesService {
  private readonly http = inject(HttpClient);

  lister(): Observable<Piece[]> {
    return this.http.get<Piece[]>(URL_PIECES);
  }

  // GET /api/pieces/:id (404 si la pièce n'existe pas).
  trouver(id: string): Observable<Piece> {
    return this.http.get<Piece>(urlPiece(id));
  }

  // POST /api/pieces. Renvoie la pièce enregistrée (nom sans espaces autour, par exemple).
  creer(piece: Piece): Observable<Piece> {
    return this.http.post<Piece>(URL_PIECES, piece);
  }

  // PUT /api/pieces/:id : remplace toute la pièce. L'id de l'URL est celui de la pièce,
  // car l'API refuse qu'ils diffèrent (l'id ne peut pas être modifié).
  modifier(piece: Piece): Observable<Piece> {
    return this.http.put<Piece>(urlPiece(piece.id), piece);
  }

  // DELETE /api/pieces/:id. L'API répond 204, sans corps : il n'y a rien à renvoyer.
  supprimer(id: string): Observable<void> {
    return this.http.delete(urlPiece(id)).pipe(map(() => undefined));
  }
}
