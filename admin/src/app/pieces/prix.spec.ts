import { centimesVersEuros, eurosVersCentimes, PRIX_MAX_CENTIMES } from './prix';

describe('eurosVersCentimes', () => {
  // it.each : le même test, lancé une fois par ligne du tableau.
  it.each([
    ['12,90', 1290],
    ['12,9', 1290],
    ['12.90', 1290],
    ['12', 1200],
    ['0,05', 5],
    ['0,01', 1],
    ['19,99', 1999], // 19.99 * 100 donnerait 1998.9999999999998
    ['1,10', 110], // 1.1 * 100 donnerait 110.00000000000001
    ['  12,90  ', 1290], // espaces autour ignorés
    ['0', 0], // bien écrit : c'est le validateur qui refusera un prix nul
    ['21474836,47', PRIX_MAX_CENTIMES],
  ])('convertit « %s » en %i centimes', (saisie, centimes) => {
    expect(eurosVersCentimes(saisie)).toBe(centimes);
  });

  it.each(['', '   ', 'abc', '12,905', '12,', ',90', '-3', '12,9a', '1 200', '1e3', '12,,9'])(
    'refuse « %s »',
    (saisie) => {
      expect(eurosVersCentimes(saisie)).toBeNull();
    },
  );
});

describe('centimesVersEuros', () => {
  it.each([
    [1290, '12,90'],
    [1200, '12,00'],
    [5, '0,05'],
    [1999, '19,99'],
    [PRIX_MAX_CENTIMES, '21474836,47'],
  ])('écrit %i centimes « %s »', (centimes, texte) => {
    expect(centimesVersEuros(centimes)).toBe(texte);
  });

  it('retrouve exactement le prix de départ dans les deux sens', () => {
    for (let centimes = 1; centimes <= 10_000; centimes++) {
      expect(eurosVersCentimes(centimesVersEuros(centimes))).toBe(centimes);
    }
  });
});
