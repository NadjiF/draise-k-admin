import { Routes } from '@angular/router';
import { Connexion } from './auth/connexion/connexion';
import { connexionRequiseGuard } from './auth/connexion-requise.guard';
import { ListePieces } from './pieces/liste-pieces/liste-pieces';

export const routes: Routes = [
  // title : le routeur remplace le <title> de la page (titre de l'onglet).
  { path: 'connexion', component: Connexion, title: 'Connexion – La Draise-K Administration' },

  // Toutes les pages du back-office sont des enfants de cette route.
  // canActivateChild : la garde est appelée à chaque navigation vers l'une d'elles, y compris
  // d'une page enfant à une autre (canActivate, lui, ne serait appelé qu'en entrant dans le groupe).
  {
    path: '',
    canActivateChild: [connexionRequiseGuard],
    children: [{ path: '', component: ListePieces, title: 'Pièces – La Draise-K Administration' }],
  },
];
