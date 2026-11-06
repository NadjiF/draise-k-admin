import { FormControl } from '@angular/forms';
import { FORMAT_ID, obligatoire, prixEnEuros } from './validateurs';

// Un validateur se teste sans composant : on lui donne un FormControl, il renvoie ses erreurs.
describe('obligatoire', () => {
  it.each(['', '   '])('refuse « %s »', (valeur) => {
    expect(obligatoire(new FormControl(valeur))).toEqual({ obligatoire: true });
  });

  it('accepte un texte', () => {
    expect(obligatoire(new FormControl(' Chaîne '))).toBeNull();
  });
});

describe('prixEnEuros', () => {
  it.each([
    ['12,90', null],
    ['0,01', null],
    ['21474836,47', null],
    ['', null], // laissé au validateur obligatoire
    ['12,905', { format: true }],
    ['abc', { format: true }],
    ['0', { min: true }],
    ['0,00', { min: true }],
    ['21474836,48', { max: true }],
  ])('« %s » → %j', (valeur, erreurs) => {
    expect(prixEnEuros(new FormControl(valeur))).toEqual(erreurs);
  });
});

describe('FORMAT_ID', () => {
  it.each(['chaine-11v', 'a', '700c'])('accepte « %s »', (id) => {
    expect(FORMAT_ID.test(id)).toBe(true);
  });

  // Mêmes cas refusés que dans les tests de l'API (api/src/pieces/piece.schema.test.ts).
  it.each(['Chaine-11v', 'chaîne-11v', 'chaine--11v', '-chaine', 'chaine-', 'chaine 11v', ''])(
    'refuse « %s »',
    (id) => {
      expect(FORMAT_ID.test(id)).toBe(false);
    },
  );
});
