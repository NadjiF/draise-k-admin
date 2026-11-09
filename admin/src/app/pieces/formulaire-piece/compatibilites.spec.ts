import {
  casesVersCompatibilites,
  compatibilitesVersCases,
  creerCases,
  CRITERES,
  ValeursCases,
} from './compatibilites';

// Valeurs de cases où seules les clés données sont cochées.
function cochees(taillesRoue: string[], typesFrein: string[], vitesses: string[]): ValeursCases {
  const enObjet = (cles: string[]) => Object.fromEntries(cles.map((cle) => [cle, true]));
  return {
    taillesRoue: enObjet(taillesRoue),
    typesFrein: enObjet(typesFrein),
    vitesses: enObjet(vitesses),
  };
}

describe('CRITERES', () => {
  it('propose 6 tailles de roue, 4 types de frein et les vitesses de 1 à 13', () => {
    expect(CRITERES.map((critere) => critere.options.length)).toEqual([6, 4, 13]);
    expect(CRITERES[0].options.map((option) => option.cle)).toEqual([
      '20',
      '24',
      '26',
      '27.5',
      '29',
      '700c',
    ]);
    expect(CRITERES[2].options.at(-1)).toEqual({ cle: '13', libelle: '13' });
  });
});

describe('creerCases', () => {
  it('crée une case décochée par valeur', () => {
    expect(creerCases(['26', '29']).getRawValue()).toEqual({ '26': false, '29': false });
  });
});

describe('casesVersCompatibilites', () => {
  it("renvoie {} si aucune case n'est cochée (pièce universelle)", () => {
    expect(casesVersCompatibilites(cochees([], [], []))).toEqual({});
  });

  it("omet un critère sans case cochée (l'API refuse une liste vide)", () => {
    expect(casesVersCompatibilites(cochees([], ['etrier'], []))).toEqual({
      typesFrein: ['etrier'],
    });
  });

  it("range les valeurs dans l'ordre des listes et donne les vitesses en nombres", () => {
    expect(
      casesVersCompatibilites(cochees(['700c', '27.5'], ['v-brake', 'etrier'], ['12', '9', '11'])),
    ).toEqual({
      taillesRoue: ['27.5', '700c'],
      typesFrein: ['v-brake', 'etrier'],
      vitesses: [9, 11, 12],
    });
  });

  it('ignore une case décochée', () => {
    const cases = cochees(['29'], [], []);
    cases.taillesRoue['26'] = false;
    expect(casesVersCompatibilites(cases)).toEqual({ taillesRoue: ['29'] });
  });
});

describe('compatibilitesVersCases', () => {
  it('coche les cases des valeurs de la pièce, et donne toutes les cases de chaque groupe', () => {
    const cases = compatibilitesVersCases({ taillesRoue: ['29', '700c'], vitesses: [11] });

    expect(cases.taillesRoue).toEqual({
      '20': false,
      '24': false,
      '26': false,
      '27.5': false,
      '29': true,
      '700c': true,
    });
    // Critère absent : tout le groupe est décoché.
    expect(Object.values(cases.typesFrein)).toEqual([false, false, false, false]);
    expect(Object.keys(cases.vitesses).length).toBe(13);
    expect(Object.entries(cases.vitesses).filter(([, cochee]) => cochee)).toEqual([['11', true]]);
  });

  it('retrouve les compatibilités de départ après un aller-retour', () => {
    const compatibilites = {
      taillesRoue: ['26' as const, '27.5' as const],
      typesFrein: ['etrier' as const],
      vitesses: [1, 9, 13],
    };
    expect(casesVersCompatibilites(compatibilitesVersCases(compatibilites))).toEqual(
      compatibilites,
    );
    expect(casesVersCompatibilites(compatibilitesVersCases({}))).toEqual({});
  });
});
