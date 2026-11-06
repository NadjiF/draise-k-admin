import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Piece } from '../piece';
import { ListePieces } from './liste-pieces';

const pieces: Piece[] = [
  {
    id: 'antivol-u',
    nom: 'Antivol en U',
    categorie: 'accessoires',
    prixCentimes: 4490,
    compatibilites: {},
    description: 'Antivol en acier trempé.',
  },
  {
    id: 'pneu-700x28',
    nom: 'Pneu 700x28',
    categorie: 'pneus-chambres',
    prixCentimes: 2990,
    compatibilites: { taillesRoue: ['700c'] },
    description: 'Pneu route.',
  },
];

describe('ListePieces', () => {
  let fixture: ComponentFixture<ListePieces>;
  let api: HttpTestingController;
  let page: HTMLElement; // le HTML affiché par le composant

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListePieces],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    api = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListePieces); // le constructeur envoie GET /api/pieces
    page = fixture.nativeElement;
    await fixture.whenStable(); // attend qu'Angular ait mis la page à jour
  });

  afterEach(() => api.verify());

  it("affiche un message de chargement tant que l'API n'a pas répondu", () => {
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Chargement des pièces');

    api.expectOne('/api/pieces'); // la requête est partie, mais on ne répond pas
  });

  it('affiche une ligne par pièce, avec le libellé de la catégorie et le prix en euros', async () => {
    api.expectOne('/api/pieces').flush(pieces);
    await fixture.whenStable();

    const lignes = page.querySelectorAll('tbody tr');
    expect(lignes.length).toBe(2);

    const cellules = [...lignes[1].querySelectorAll('th, td')].map((c) => c.textContent?.trim());
    // Intl sépare le montant et « € » par une espace insécable ( ) : le prix ne sera
    // jamais coupé en fin de ligne.
    expect(cellules).toEqual(['Pneu 700x28', 'Pneus et chambres à air', '29,90 €']);
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    api
      .expectOne('/api/pieces')
      .flush(
        { erreur: 'Erreur interne du serveur. Réessayez plus tard.' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toBe(
      'Erreur interne du serveur. Réessayez plus tard.',
    );
    expect(page.querySelector('table')).toBeNull();
  });

  it("affiche un message en français quand l'API est injoignable", async () => {
    // Ce que renvoie le proxy quand l'API est arrêtée : 502, corps en texte brut.
    api.expectOne('/api/pieces').flush('', { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "Impossible de joindre l'API",
    );
  });

  it('indique quand le catalogue est vide', async () => {
    api.expectOne('/api/pieces').flush([]);
    await fixture.whenStable();

    expect(page.textContent).toContain('Le catalogue ne contient aucune pièce.');
  });
});
