import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { eurosVersCentimes, PRIX_MAX_CENTIMES } from '../prix';

// Un validateur est une fonction qui reçoit le champ (son « contrôle ») et renvoie :
// - null si la valeur est bonne ;
// - un objet d'erreurs sinon, ex. { obligatoire: true }. Les clés sont libres : le composant
//   s'en sert pour choisir le message à afficher.
// Angular l'appelle à chaque changement de valeur.

// Même format que l'API (api/src/pieces/piece.schema.ts) : minuscules sans accent, chiffres,
// tirets simples, sans tiret au début ni à la fin.
export const FORMAT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Comme Validators.required, mais une valeur faite seulement d'espaces compte comme vide
// (l'API retire les espaces autour du nom, puis refuse un nom vide).
export const obligatoire: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valeur: unknown = controle.value;
  return typeof valeur === 'string' && valeur.trim() === '' ? { obligatoire: true } : null;
};

// Prix saisi en euros. Un champ vide est laissé au validateur obligatoire, pour n'afficher
// qu'un seul message à la fois.
export const prixEnEuros: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valeur: unknown = controle.value;
  if (typeof valeur !== 'string' || valeur.trim() === '') return null;

  const centimes = eurosVersCentimes(valeur);
  if (centimes === null) return { format: true };
  if (centimes < 1) return { min: true };
  if (centimes > PRIX_MAX_CENTIMES) return { max: true };
  return null;
};
