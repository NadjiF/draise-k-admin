import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { LIBELLES_CATEGORIES, Piece } from '../piece';
import { PiecesService } from '../pieces.service';

const formatPrix = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

@Component({
  imports: [],
  selector: 'app-liste-pieces',
  styleUrl: './liste-pieces.css',
  templateUrl: './liste-pieces.html',
})
export class ListePieces {
  private readonly piecesService = inject(PiecesService);

  // État de la page : le template se met à jour quand l'un de ces signals change.
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly libellesCategories = LIBELLES_CATEGORIES;

  constructor() {
    this.piecesService.lister().subscribe({
      next: (pieces) => {
        this.pieces.set(pieces);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreur(erreur));
        this.chargement.set(false);
      },
    });
  }

  protected prix(centimes: number): string {
    return formatPrix.format(centimes / 100);
  }
}

// Notre API renvoie ses erreurs en JSON, avec un message en français : { "erreur": "..." }.
// Sinon (API arrêtée, réseau coupé…), il n'y a pas de message utilisable : on donne le nôtre.
function messageErreur(erreur: unknown): string {
  if (
    erreur instanceof HttpErrorResponse &&
    typeof erreur.error === 'object' &&
    erreur.error !== null &&
    typeof erreur.error.erreur === 'string'
  ) {
    return erreur.error.erreur;
  }
  return "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis rechargez la page.";
}
