import { FormControl, FormRecord } from '@angular/forms';
import {
  Compatibilites,
  LIBELLES_TAILLES_ROUE,
  LIBELLES_TYPES_FREIN,
  TAILLES_ROUE,
  TYPES_FREIN,
  VITESSES,
} from '../piece';

// Les trois critères de compatibilité : 'taillesRoue' | 'typesFrein' | 'vitesses'.
// keyof Compatibilites : la liste suit automatiquement le type Piece.
export type Critere = keyof Compatibilites;

// Ce qu'il faut pour afficher un groupe de cases à cocher.
// cle : nom de la case dans le formulaire (un texte, même pour les vitesses : "11").
export interface DescriptionCritere {
  champ: Critere;
  legende: string;
  aide: string;
  options: { cle: string; libelle: string }[];
}

export const CRITERES: readonly DescriptionCritere[] = [
  {
    champ: 'taillesRoue',
    legende: 'Tailles de roue',
    aide: 'Aucune case cochée : la pièce va sur toutes les tailles de roue.',
    options: TAILLES_ROUE.map((taille) => ({
      cle: taille,
      libelle: LIBELLES_TAILLES_ROUE[taille],
    })),
  },
  {
    champ: 'typesFrein',
    legende: 'Types de frein',
    aide: 'Aucune case cochée : la pièce va avec tous les types de frein.',
    options: TYPES_FREIN.map((type) => ({ cle: type, libelle: LIBELLES_TYPES_FREIN[type] })),
  },
  {
    champ: 'vitesses',
    legende: 'Nombres de vitesses',
    aide: 'Aucune case cochée : la pièce va sur toutes les transmissions.',
    options: VITESSES.map((vitesses) => ({ cle: String(vitesses), libelle: String(vitesses) })),
  },
];

// Un groupe de cases à cocher : une case (FormControl<boolean>) par valeur possible.
// FormRecord est un FormGroup dont les noms des champs ne sont pas connus à l'avance par
// TypeScript (ici, ils viennent de listes) ; tous ses champs ont le même type.
export type Cases = FormRecord<FormControl<boolean>>;

export function creerCases(cles: readonly string[]): Cases {
  const cases: Cases = new FormRecord<FormControl<boolean>>({});
  for (const cle of cles) {
    cases.addControl(cle, new FormControl(false, { nonNullable: true }));
  }
  return cases;
}

// Valeur des trois groupes de cases, ex. { taillesRoue: { "26": false, "29": true, … }, … }.
export type ValeursCases = Record<Critere, Record<string, boolean>>;

// Cases cochées → compatibilités au format de l'API.
// Un critère sans case cochée est absent (l'API refuse une liste vide : « ou retirez ce critère »).
// Les valeurs sont dans l'ordre des listes (TAILLES_ROUE…), quel que soit l'ordre des clics,
// et les vitesses redeviennent des nombres.
export function casesVersCompatibilites(cases: ValeursCases): Compatibilites {
  const compatibilites: Compatibilites = {};

  const taillesRoue = TAILLES_ROUE.filter((taille) => cases.taillesRoue[taille]);
  if (taillesRoue.length > 0) compatibilites.taillesRoue = taillesRoue;

  const typesFrein = TYPES_FREIN.filter((type) => cases.typesFrein[type]);
  if (typesFrein.length > 0) compatibilites.typesFrein = typesFrein;

  const vitesses = VITESSES.filter((nombre) => cases.vitesses[String(nombre)]);
  if (vitesses.length > 0) compatibilites.vitesses = vitesses;

  return compatibilites;
}
