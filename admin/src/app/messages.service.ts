import { Injectable } from '@angular/core';

// Transmet un message de confirmation d'une page à la suivante, par exemple
// « La pièce « … » a été ajoutée. », du formulaire à la liste des pièces.
//
// providedIn: 'root' : une seule instance pour toute l'application. Le formulaire et la liste
// reçoivent donc le même service, qui garde le message pendant le changement de page
// (le composant du formulaire, lui, est détruit en quittant la page).
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private message: string | null = null;

  annoncer(message: string): void {
    this.message = message;
  }

  // Renvoie le message en attente, puis l'oublie : il ne s'affiche qu'une fois.
  // Revenir plus tard sur la liste ne le réaffichera pas.
  recuperer(): string | null {
    const message = this.message;
    this.message = null;
    return message;
  }
}
