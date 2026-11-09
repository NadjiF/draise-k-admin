import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageErreur } from '../../erreurs';
import { MessagesService } from '../../messages.service';
import { CATEGORIES, Categorie, estCategorie, LIBELLES_CATEGORIES, Piece } from '../piece';
import { PiecesService } from '../pieces.service';

const formatPrix = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Message affiché si l'API ne renvoie pas son propre message (API arrêtée, réseau coupé…).
const MESSAGE_API_INJOIGNABLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis rechargez la page.";

@Component({
  // RouterLink : liens « Ajouter une pièce » et « Modifier ».
  imports: [RouterLink],
  selector: 'app-liste-pieces',
  styleUrl: './liste-pieces.css',
  templateUrl: './liste-pieces.html',
})
export class ListePieces {
  private readonly piecesService = inject(PiecesService);
  private readonly messages = inject(MessagesService);

  // État de la page : le template se met à jour quand l'un de ces signals change.
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  // Confirmation laissée par le formulaire (« La pièce « … » a été ajoutée. »), ou null.
  protected readonly confirmation = signal<string | null>(null);

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
        this.afficherConfirmation();
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreur(erreur, MESSAGE_API_INJOIGNABLE));
        this.chargement.set(false);
        this.afficherConfirmation(); // la pièce a quand même été enregistrée
      },
    });
  }

  // Appelée une fois la liste chargée, et non dans le constructeur : la zone role="status"
  // de la confirmation est alors déjà dans la page, vide. Un lecteur d'écran n'annonce que
  // les changements d'une telle zone, pas le texte qu'elle contient en apparaissant.
  private afficherConfirmation(): void {
    this.confirmation.set(this.messages.recuperer());
  }

  // valeur vient du <select> : "" pour « Toutes les catégories », sinon une catégorie.
  protected choisirCategorie(valeur: string): void {
    this.categorieChoisie.set(estCategorie(valeur) ? valeur : null);
  }

  protected prix(centimes: number): string {
    return formatPrix.format(centimes / 100);
  }
}
