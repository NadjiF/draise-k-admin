import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageErreur } from '../../erreurs';
import { MessagesService } from '../../messages.service';
import { CATEGORIES, Categorie, estCategorie, LIBELLES_CATEGORIES, Piece } from '../piece';
import { PiecesService } from '../pieces.service';

const formatPrix = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Message affiché si l'API ne renvoie pas son propre message (API arrêtée, réseau coupé…).
const MESSAGE_API_INJOIGNABLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis rechargez la page.";
const MESSAGE_SUPPRESSION_IMPOSSIBLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis réessayez.";

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
  private readonly injector = inject(Injector);

  // viewChild : accès à un élément du gabarit marqué #titre, #dialogue… (signal, lu avec ()).
  // required : l'élément est toujours dans la page (hors de tout @if), il ne peut pas manquer.
  private readonly titre = viewChild.required<ElementRef<HTMLElement>>('titre');
  private readonly dialogue = viewChild.required<ElementRef<HTMLDialogElement>>('dialogue');
  private readonly boutonAnnuler = viewChild.required<ElementRef<HTMLElement>>('boutonAnnuler');

  // État de la page : le template se met à jour quand l'un de ces signals change.
  protected readonly pieces = signal<Piece[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  // Confirmation laissée par le formulaire (« La pièce « … » a été ajoutée. »), ou null.
  protected readonly confirmation = signal<string | null>(null);

  // Suppression : la pièce dont la boîte de dialogue demande confirmation, ou null.
  protected readonly pieceASupprimer = signal<Piece | null>(null);
  protected readonly suppressionEnCours = signal(false);
  protected readonly erreurSuppression = signal<string | null>(null);

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
    const message = this.messages.recuperer();
    this.confirmation.set(message);
    if (message !== null) this.placerFocusSurTitre();
  }

  // Après une confirmation, le focus est sur le titre de la page : l'élément qui l'avait
  // (bouton « Enregistrer » du formulaire, « Supprimer » de la boîte de dialogue) a disparu.
  // Sans cela, le navigateur le remet au début de la page, et l'utilisateur au clavier
  // ne sait plus où il est. tabindex="-1" sur le <h1> permet de lui donner le focus par
  // programme, sans l'ajouter aux arrêts de la touche Tab.
  private placerFocusSurTitre(): void {
    this.titre().nativeElement.focus();
  }

  // Ouvre la boîte de dialogue de confirmation pour cette pièce.
  protected demanderSuppression(piece: Piece): void {
    this.pieceASupprimer.set(piece);
    // Le titre de la boîte (« Supprimer la pièce « … » ? ») vient de pieceASupprimer :
    // on attend qu'Angular l'ait mis à jour avant d'ouvrir, pour que le lecteur d'écran
    // annonce le bon nom. injector : afterNextRender appelé hors du constructeur en a besoin.
    afterNextRender(
      () => {
        // showModal : ouvre en « modal » : le reste de la page devient inerte (ni clic, ni
        // Tab, ni lecteur d'écran), et Échap ferme la boîte.
        this.dialogue().nativeElement.showModal();
        // Focus sur « Annuler », le choix sans danger : un appui trop rapide sur Entrée
        // ne supprime rien.
        this.boutonAnnuler().nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected annulerSuppression(): void {
    this.dialogue().nativeElement.close();
  }

  // Évènement « cancel » : Échap. Refusé pendant la suppression, dont on attend le résultat.
  protected surEchap(evenement: Event): void {
    if (this.suppressionEnCours()) evenement.preventDefault();
  }

  // Évènement « close » : la boîte s'est fermée (Annuler, Échap ou après la suppression).
  // Après Annuler ou Échap, le navigateur rend de lui-même le focus au bouton « Supprimer »
  // qui avait ouvert la boîte.
  protected surFermeture(): void {
    this.pieceASupprimer.set(null);
    this.erreurSuppression.set(null);
  }

  protected confirmerSuppression(): void {
    const piece = this.pieceASupprimer();
    if (piece === null || this.suppressionEnCours()) return;

    this.erreurSuppression.set(null);
    this.suppressionEnCours.set(true);
    this.piecesService.supprimer(piece.id).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.dialogue().nativeElement.close();
        // update : nouvelle liste calculée à partir de l'ancienne, sans la pièce supprimée.
        this.pieces.update((pieces) => pieces.filter((p) => p.id !== piece.id));
        this.confirmation.set(`La pièce « ${piece.nom} » a été supprimée.`);
        this.placerFocusSurTitre();
      },
      // La boîte reste ouverte, avec le message : l'utilisateur peut réessayer ou annuler.
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set(messageErreur(erreur, MESSAGE_SUPPRESSION_IMPOSSIBLE));
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
