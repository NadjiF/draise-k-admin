import { Component, ElementRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { detailsErreur, messageErreur } from '../../erreurs';
import {
  CATEGORIES,
  Categorie,
  estCategorie,
  LIBELLES_CATEGORIES,
  Piece,
  TAILLES_ROUE,
  TYPES_FREIN,
  VITESSES,
} from '../piece';
import { PiecesService } from '../pieces.service';
import { centimesVersEuros, eurosVersCentimes } from '../prix';
import {
  casesVersCompatibilites,
  compatibilitesVersCases,
  creerCases,
  CRITERES,
} from './compatibilites';
import { FORMAT_ID, obligatoire, prixEnEuros } from './validateurs';

// Noms des champs du formulaire, dans l'ordre de la page (sert à placer le focus).
// Les trois derniers sont des groupes de cases à cocher (les compatibilités).
const CHAMPS = [
  'id',
  'nom',
  'categorie',
  'prix',
  'description',
  'taillesRoue',
  'typesFrein',
  'vitesses',
] as const;
type Champ = (typeof CHAMPS)[number];

// Message affiché pour chaque erreur de validation, selon le champ et la clé de l'erreur
// renvoyée par le validateur (obligatoire, pattern, format…).
const MESSAGES: Record<Champ, Record<string, string>> = {
  id: {
    obligatoire: "L'identifiant est obligatoire.",
    pattern:
      "L'identifiant ne doit contenir que des minuscules sans accent, des chiffres et des tirets simples, sans tiret au début ni à la fin (ex. chaine-11v).",
  },
  nom: { obligatoire: 'Le nom est obligatoire.' },
  categorie: { obligatoire: 'Choisissez une catégorie.' },
  prix: {
    obligatoire: 'Le prix est obligatoire.',
    format: 'Saisissez un prix en euros, avec au plus deux chiffres après la virgule (ex. 12,90).',
    min: 'Le prix doit être supérieur à 0.',
    max: 'Le prix est trop grand.',
  },
  description: {},
  // Les cases à cocher n'ont pas de validateur : seule l'API peut y signaler une erreur.
  taillesRoue: {},
  typesFrein: {},
  vitesses: {},
};

// Champs qui ont un texte d'aide sous leur libellé (relié au champ par aria-describedby).
// Les groupes de cases ont tous une aide, reliée directement dans le gabarit.
const CHAMPS_AVEC_AIDE: ReadonlySet<Champ> = new Set(['id', 'prix']);

// Nom d'un champ dans le JSON de l'API → champ du formulaire. Le prix est saisi en euros
// dans le champ « prix », mais l'API le reçoit (et le signale) sous le nom prixCentimes.
// Une Map plutôt qu'un objet : un nom reçu comme « constructor » ne trouve rien.
const CHAMPS_API = new Map<string, Champ>([
  ['id', 'id'],
  ['nom', 'nom'],
  ['categorie', 'categorie'],
  ['prixCentimes', 'prix'],
  ['description', 'description'],
  ['compatibilites.taillesRoue', 'taillesRoue'],
  ['compatibilites.typesFrein', 'typesFrein'],
  ['compatibilites.vitesses', 'vitesses'],
]);

const MESSAGE_API_INJOIGNABLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis réessayez.";
const MESSAGE_CHARGEMENT_IMPOSSIBLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis rechargez la page.";

@Component({
  // RouterLink : la directive routerLink, pour le lien « Annuler ».
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-formulaire-piece',
  styleUrl: './formulaire-piece.css',
  templateUrl: './formulaire-piece.html',
})
// Un seul composant pour deux pages : /pieces/nouvelle (création) et /pieces/:id/modifier.
// « implements OnInit » : la classe s'engage à fournir ngOnInit (voir plus bas).
export class FormulairePiece implements OnInit {
  private readonly piecesService = inject(PiecesService);
  private readonly router = inject(Router);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly categories = CATEGORIES;
  protected readonly libellesCategories = LIBELLES_CATEGORIES;
  protected readonly criteres = CRITERES;

  // Validators.pattern : validateur fourni par Angular (clé d'erreur « pattern »).
  protected readonly formulaire = new FormGroup({
    id: new FormControl('', {
      nonNullable: true,
      validators: [obligatoire, Validators.pattern(FORMAT_ID)],
    }),
    nom: new FormControl('', { nonNullable: true, validators: [obligatoire] }),
    // '' tant qu'aucune catégorie n'est choisie (option « Choisir une catégorie »).
    categorie: new FormControl<Categorie | ''>('', {
      nonNullable: true,
      validators: [obligatoire],
    }),
    prix: new FormControl('', { nonNullable: true, validators: [obligatoire, prixEnEuros] }),
    description: new FormControl('', { nonNullable: true }),
    // Un groupe de cases par critère ; leurs noms sont les valeurs possibles ("26", "v-brake", "11").
    taillesRoue: creerCases(TAILLES_ROUE),
    typesFrein: creerCases(TYPES_FREIN),
    vitesses: creerCases(VITESSES.map(String)),
  });

  // Valeur de :id dans l'URL /pieces/:id/modifier, transmise par le routeur
  // (withComponentInputBinding, comme ?session= pour la page de connexion).
  // Absente sur /pieces/nouvelle : le formulaire est alors en mode création.
  readonly id = input<string>();
  protected readonly modification = computed(() => this.id() !== undefined);

  // Modification : chargement de la pièce, puis son nom (pour le titre) ou l'erreur.
  protected readonly chargement = signal(false);
  protected readonly erreurChargement = signal<string | null>(null);
  private readonly nomInitial = signal<string | null>(null);

  protected readonly titre = computed(() => {
    if (!this.modification()) return 'Ajouter une pièce';
    const nom = this.nomInitial();
    return nom === null ? 'Modifier une pièce' : `Modifier la pièce « ${nom} »`;
  });

  protected readonly envoiEnCours = signal(false);
  protected readonly erreurGenerale = signal<string | null>(null);
  // Messages de l'API qui ne correspondent à aucun champ du formulaire : affichés en haut.
  protected readonly detailsNonPlaces = signal<string[]>([]);

  // ngOnInit : appelé une fois par Angular, juste après que les inputs ont reçu leur valeur.
  // Dans le constructeur, id() serait encore vide : le routeur ne l'a pas encore transmis.
  ngOnInit(): void {
    const id = this.id();
    if (id === undefined) return; // création : rien à charger

    this.chargement.set(true);
    this.piecesService.trouver(id).subscribe({
      next: (piece) => {
        this.remplir(piece);
        this.chargement.set(false);
      },
      // 404 : l'API répond « Aucune pièce avec l'identifiant « … ». »
      error: (erreur: unknown) => {
        this.erreurChargement.set(messageErreur(erreur, MESSAGE_CHARGEMENT_IMPOSSIBLE));
        this.chargement.set(false);
      },
    });
  }

  // Remplit le formulaire avec la pièce chargée.
  // setValue exige une valeur pour chaque champ : TypeScript signale tout oubli.
  private remplir(piece: Piece): void {
    this.nomInitial.set(piece.nom);
    this.formulaire.setValue({
      id: piece.id,
      nom: piece.nom,
      categorie: piece.categorie,
      prix: centimesVersEuros(piece.prixCentimes),
      description: piece.description,
      ...compatibilitesVersCases(piece.compatibilites),
    });
  }

  // Message à afficher sous le champ, ou null. Comme pour la connexion, seulement une fois
  // le champ touché. Une erreur de l'API (clé « api ») passe avant celles de l'interface.
  protected message(champ: Champ): string | null {
    const controle = this.formulaire.controls[champ];
    const erreurs = controle.errors;
    if (!controle.touched || erreurs === null) return null;

    if (typeof erreurs['api'] === 'string') return erreurs['api'];
    const cle = Object.keys(erreurs).find((cle) => Object.hasOwn(MESSAGES[champ], cle));
    return cle === undefined ? null : MESSAGES[champ][cle];
  }

  // Valeur de aria-describedby : le texte d'aide et/ou le message d'erreur du champ.
  protected descriptions(champ: Champ): string | null {
    const ids: string[] = [];
    if (CHAMPS_AVEC_AIDE.has(champ)) ids.push(`champ-${champ}-aide`);
    if (this.message(champ) !== null) ids.push(`champ-${champ}-erreur`);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected envoyer(): void {
    if (this.envoiEnCours()) return;

    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.placerFocusSurPremiereErreur();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    const prixCentimes = eurosVersCentimes(valeurs.prix);
    // Impossible une fois le formulaire valide, mais TypeScript ne le sait pas :
    // ces vérifications lui permettent de connaître les types exacts.
    if (prixCentimes === null || !estCategorie(valeurs.categorie)) return;

    const piece: Piece = {
      id: valeurs.id,
      nom: valeurs.nom.trim(),
      categorie: valeurs.categorie,
      prixCentimes,
      compatibilites: casesVersCompatibilites(valeurs),
      description: valeurs.description,
    };

    this.erreurGenerale.set(null);
    this.detailsNonPlaces.set([]);
    this.envoiEnCours.set(true);

    // Même pièce, même traitement des erreurs : seule la requête change.
    // En modification, une 404 (pièce supprimée entre-temps) s'affiche en haut du formulaire.
    const requete = this.modification()
      ? this.piecesService.modifier(piece)
      : this.piecesService.creer(piece);
    requete.subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (erreur: unknown) => this.afficherErreurApi(erreur),
    });
  }

  // Erreur générale en haut du formulaire, et chaque détail de l'API sous son champ.
  private afficherErreurApi(erreur: unknown): void {
    const nonPlaces: string[] = [];
    for (const detail of detailsErreur(erreur)) {
      const champ = CHAMPS_API.get(detail.champ);
      if (champ === undefined) {
        nonPlaces.push(detail.message);
        continue;
      }
      // setErrors remplace les erreurs du champ par la nôtre. Elle disparaîtra d'elle-même
      // dès que la valeur changera : Angular relance alors les validateurs, qui recalculent
      // toutes les erreurs du champ.
      const controle = this.formulaire.controls[champ];
      controle.setErrors({ api: detail.message });
      controle.markAsTouched();
    }

    // Pas besoin de demander la mise à jour de la page pour les messages des champs :
    // l'état d'un champ (valide ou non, touché ou non) est gardé dans des signaux internes
    // d'Angular Forms, que setErrors et markAsTouched modifient.
    this.detailsNonPlaces.set(nonPlaces);
    this.erreurGenerale.set(messageErreur(erreur, MESSAGE_API_INJOIGNABLE));
    this.envoiEnCours.set(false);
    this.placerFocusSurPremiereErreur();
  }

  private placerFocusSurPremiereErreur(): void {
    const premier = CHAMPS.find((champ) => this.formulaire.controls[champ].invalid);
    if (premier === undefined) return;
    const element = this.hote.nativeElement.querySelector<HTMLElement>(`#champ-${premier}`);
    // Un <fieldset> ne peut pas recevoir le focus : on le place sur sa première case.
    const cible = element?.matches('fieldset') ? element.querySelector('input') : element;
    cible?.focus();
  }
}
