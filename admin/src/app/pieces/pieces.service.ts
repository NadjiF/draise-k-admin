import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Piece } from './piece';

// Toutes les requêtes HTTP sur les pièces passent par ce service :
// les composants ne connaissent pas les URL de l'API.
@Injectable({ providedIn: 'root' })
export class PiecesService {
  private readonly http = inject(HttpClient);

  // URL relative : en développement, le proxy (proxy.conf.json) la transmet au port 3000.
  lister(): Observable<Piece[]> {
    return this.http.get<Piece[]>('/api/pieces');
  }
}
