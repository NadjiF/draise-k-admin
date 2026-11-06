import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { messageErreur } from '../../erreurs';
import { AuthService } from '../auth.service';

// Noms des champs, dans l'ordre de la page (sert à placer le focus sur le premier en erreur).
const CHAMPS = ['identifiant', 'motDePasse'] as const;
type Champ = (typeof CHAMPS)[number];

// Message affiché si l'API ne renvoie pas son propre message (API arrêtée, réseau coupé…).
const MESSAGE_API_INJOIGNABLE =
  "Impossible de joindre l'API. Vérifiez qu'elle est démarrée, puis réessayez.";

@Component({
  // ReactiveFormsModule fournit les directives [formGroup], formControlName et (ngSubmit).
  imports: [ReactiveFormsModule],
  selector: 'app-connexion',
  styleUrl: './connexion.css',
  templateUrl: './connexion.html',
})
export class Connexion {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef); // la balise <app-connexion>

  constructor() {
    // Focus sur le champ Identifiant à l'arrivée sur la page.
    // Dans le constructeur, le HTML du composant n'existe pas encore : afterNextRender attend
    // qu'Angular l'ait affiché une première fois, puis exécute la fonction (une seule fois).
    afterNextRender(() => this.champ('identifiant')?.focus());
  }

  // Le modèle du formulaire, décrit en TypeScript.
  // nonNullable : reset() remet '' et non null, donc la valeur est typée string (et non string | null).
  protected readonly formulaire = new FormGroup({
    identifiant: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    motDePasse: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly envoiEnCours = signal(false);
  protected readonly erreurApi = signal<string | null>(null);

  // Valeur de ?session=… dans l'URL, transmise par le routeur (withComponentInputBinding).
  // La garde y met « expiree » quand elle redirige à cause d'un jeton périmé.
  readonly session = input<string>();

  // Le message « Session expirée » s'efface dès qu'on renvoie le formulaire.
  protected readonly sessionExpiree = computed(
    () => this.session() === 'expiree' && !this.envoiEnCours() && this.erreurApi() === null,
  );

  // Un message d'erreur de champ ne s'affiche qu'une fois le champ « touché » (quitté au moins
  // une fois) : on n'affiche pas « obligatoire » à quelqu'un qui n'a pas encore commencé à taper.
  protected afficherErreur(champ: Champ): boolean {
    const controle = this.formulaire.controls[champ];
    return controle.invalid && controle.touched;
  }

  // Le champ <input> de la page qui porte l'id donné (les id sont les noms des champs).
  private champ(nom: Champ): HTMLInputElement | null {
    return this.hote.nativeElement.querySelector<HTMLInputElement>(`#${nom}`);
  }

  protected envoyer(): void {
    if (this.envoiEnCours()) return; // évite un double envoi (touche Entrée répétée)

    if (this.formulaire.invalid) {
      // Affiche tous les messages, puis place le focus sur le premier champ à corriger.
      this.formulaire.markAllAsTouched();
      const premier = CHAMPS.find((champ) => this.formulaire.controls[champ].invalid);
      if (premier !== undefined) this.champ(premier)?.focus();
      return;
    }

    // getRawValue() : les valeurs typées { identifiant: string; motDePasse: string }.
    const { identifiant, motDePasse } = this.formulaire.getRawValue();
    this.erreurApi.set(null);
    this.envoiEnCours.set(true);

    this.auth.connexion(identifiant, motDePasse).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (erreur: unknown) => {
        this.erreurApi.set(messageErreur(erreur, MESSAGE_API_INJOIGNABLE));
        this.envoiEnCours.set(false);
      },
    });
  }
}
