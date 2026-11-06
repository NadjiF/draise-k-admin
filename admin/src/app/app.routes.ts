import { Routes } from '@angular/router';
import { Connexion } from './auth/connexion/connexion';
import { ListePieces } from './pieces/liste-pieces/liste-pieces';

export const routes: Routes = [
  // title : le routeur remplace le <title> de la page (titre de l'onglet).
  { path: 'connexion', component: Connexion, title: 'Connexion – La Draise-K Administration' },
  { path: '', component: ListePieces, title: 'Pièces – La Draise-K Administration' },
];
