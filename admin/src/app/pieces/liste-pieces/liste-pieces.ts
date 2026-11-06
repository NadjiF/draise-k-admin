import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { CATEGORIES, Categorie, estCategorie, LIBELLES_CATEGORIES, Piece } from '../piece';
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

  // Filtre : null signifie « toutes les catégories ».
  protected readonly categorieChoisie = signal<Categorie | null>(null);

  // Recalculé automatiquement quand pieces ou categorieChoisie change.
  protected readonly piecesFiltrees = computed(() => {
    const categorie = this.categorieChoisie();
    const pieces = this.pieces();
    return categorie === null ? pieces : pieces.filter((piece) => piece.categorie === categorie);
  });

  // Nombre de pièces affichées, annoncé aux lecteurs d'écran quand le filtre change.
  protected readonly resume = computed(() => {
    const nombre = this.piecesFiltrees().length;
    return `${nombre} ${nombre > 1 ? 'pièces affichées' : 'pièce affichée'}`;
  });

  protected readonly categories = CATEGORIES;
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

  // valeur vient du <select> : "" pour « Toutes les catégories », sinon une catégorie.
  protected choisirCategorie(valeur: string): void {
    this.categorieChoisie.set(estCategorie(valeur) ? valeur : null);
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
