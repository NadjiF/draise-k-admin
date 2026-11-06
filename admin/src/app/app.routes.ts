import { Routes } from '@angular/router';
import { ListePieces } from './pieces/liste-pieces/liste-pieces';

export const routes: Routes = [
  // title : le routeur remplace le <title> de la page (titre de l'onglet).
  { path: '', component: ListePieces, title: 'Pièces – La Draise-K Administration' },
];
