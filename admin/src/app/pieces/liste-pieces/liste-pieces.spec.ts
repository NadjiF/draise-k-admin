import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessagesService } from '../../messages.service';
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
      // provideRouter([]) : les liens routerLink ont besoin d'un routeur, même sans routes.
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    api = TestBed.inject(HttpTestingController);
  });

  // Crée le composant, comme en arrivant sur la page. Appelée par chaque test, et non dans le
  // beforeEach : un test peut ainsi préparer un message de confirmation avant l'arrivée.
  async function ouvrir(): Promise<void> {
    fixture = TestBed.createComponent(ListePieces); // le constructeur envoie GET /api/pieces
    page = fixture.nativeElement;
    await fixture.whenStable(); // attend qu'Angular ait mis la page à jour
  }

  afterEach(() => api.verify());

  // La page a plusieurs zones role="status" (confirmation, chargement, résumé) : chacune
  // est cherchée par sa classe ou son texte.
  const confirmation = () => page.querySelector('.confirmation')?.textContent?.trim();
  const resume = () => page.querySelector('.resume')?.textContent;

  it("affiche un message de chargement tant que l'API n'a pas répondu", async () => {
    await ouvrir();
    expect(page.textContent).toContain('Chargement des pièces');

    api.expectOne('/api/pieces'); // la requête est partie, mais on ne répond pas
  });

  it('affiche une ligne par pièce, avec le libellé de la catégorie et le prix en euros', async () => {
    await ouvrir();
    api.expectOne('/api/pieces').flush(pieces);
    await fixture.whenStable();

    const lignes = page.querySelectorAll('tbody tr');
    expect(lignes.length).toBe(2);

    const cellules = [...lignes[1].querySelectorAll('th, td')].map((c) => c.textContent?.trim());
    // Intl sépare le montant et « € » par une espace insécable ( ) : le prix ne sera
    // jamais coupé en fin de ligne.
    expect(cellules).toEqual([
      'Pneu 700x28',
      'Pneus et chambres à air',
      '29,90 €',
      'Modifier Pneu 700x28',
    ]);
    expect(page.textContent).not.toContain('Chargement des pièces');
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    await ouvrir();
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
    await ouvrir();
    // Ce que renvoie le proxy quand l'API est arrêtée : 502, corps en texte brut.
    api.expectOne('/api/pieces').flush('', { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "Impossible de joindre l'API",
    );
  });

  it('indique quand le catalogue est vide', async () => {
    await ouvrir();
    api.expectOne('/api/pieces').flush([]);
    await fixture.whenStable();

    expect(page.textContent).toContain('Le catalogue ne contient aucune pièce.');
    expect(page.querySelector('select')).toBeNull();
  });

  it('propose un lien « Ajouter une pièce », même quand le catalogue est vide', async () => {
    await ouvrir();
    api.expectOne('/api/pieces').flush([]);
    await fixture.whenStable();

    const lien = [...page.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === 'Ajouter une pièce',
    );
    expect(lien?.getAttribute('href')).toBe('/pieces/nouvelle');
  });

  it('propose un lien « Modifier » par pièce, qui nomme la pièce', async () => {
    await ouvrir();
    api.expectOne('/api/pieces').flush(pieces);
    await fixture.whenStable();

    const liens = [...page.querySelectorAll('tbody a')];
    expect(liens.map((a) => a.getAttribute('href'))).toEqual([
      '/pieces/antivol-u/modifier',
      '/pieces/pneu-700x28/modifier',
    ]);
    // Texte lu par un lecteur d'écran : « Modifier » suivi du nom (caché à l'écran).
    expect(liens[0].textContent?.trim()).toBe('Modifier Antivol en U');
    expect(liens[0].querySelector('.visuellement-cache')?.textContent?.trim()).toBe('Antivol en U');
  });

  describe('confirmation après un enregistrement', () => {
    it('affiche le message laissé par le formulaire, une fois la liste chargée', async () => {
      // Le formulaire annonce le message avant de naviguer vers la liste.
      TestBed.inject(MessagesService).annoncer('La pièce « Antivol en U » a été ajoutée.');
      await ouvrir();

      // La zone existe déjà, vide, pendant le chargement : son remplissage sera annoncé.
      const zone = page.querySelector('.confirmation');
      expect(zone?.getAttribute('role')).toBe('status');
      expect(confirmation()).toBe('');

      api.expectOne('/api/pieces').flush(pieces);
      await fixture.whenStable();

      expect(confirmation()).toBe('La pièce « Antivol en U » a été ajoutée.');
      // Même élément qu'au départ : la zone a changé, elle n'a pas été recréée.
      expect(page.querySelector('.confirmation')).toBe(zone);
      // Le message a été consommé : il ne réapparaîtra pas au prochain passage sur la liste.
      expect(TestBed.inject(MessagesService).recuperer()).toBeNull();
    });

    it("l'affiche aussi si la liste n'a pas pu être chargée", async () => {
      TestBed.inject(MessagesService).annoncer('La pièce « Antivol en U » a été modifiée.');
      await ouvrir();
      api.expectOne('/api/pieces').flush('', { status: 502, statusText: 'Bad Gateway' });
      await fixture.whenStable();

      expect(confirmation()).toBe('La pièce « Antivol en U » a été modifiée.');
    });

    it("n'affiche rien sans message", async () => {
      await ouvrir();
      api.expectOne('/api/pieces').flush(pieces);
      await fixture.whenStable();

      expect(confirmation()).toBe('');
      expect(page.querySelector('.confirmation.visible')).toBeNull();
    });
  });

  describe('filtre par catégorie', () => {
    // Comme un utilisateur : choisir une option, ce qui déclenche l'événement change.
    async function choisir(valeur: string) {
      const select = page.querySelector<HTMLSelectElement>('#filtre-categorie')!;
      select.value = valeur;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    const nomsAffiches = () =>
      [...page.querySelectorAll('tbody th')].map((cellule) => cellule.textContent?.trim());

    beforeEach(async () => {
      await ouvrir();
      api.expectOne('/api/pieces').flush(pieces);
      await fixture.whenStable();
    });

    it('propose « Toutes les catégories » puis chaque catégorie, avec son libellé', () => {
      const select = page.querySelector('select')!;
      const options = [...select.options].map((option) => option.textContent?.trim());

      expect(options).toEqual([
        'Toutes les catégories',
        'Freinage',
        'Transmission',
        'Pneus et chambres à air',
        'Éclairage',
        'Accessoires',
      ]);
      // Le <label> est relié au <select> : un lecteur d'écran annonce « Catégorie ».
      expect(select.labels?.[0]?.textContent).toBe('Catégorie');
    });

    it('affiche toutes les pièces au départ', () => {
      expect(nomsAffiches()).toEqual(['Antivol en U', 'Pneu 700x28']);
      expect(resume()).toBe('2 pièces affichées');
    });

    it("n'affiche que les pièces de la catégorie choisie", async () => {
      await choisir('pneus-chambres');

      expect(nomsAffiches()).toEqual(['Pneu 700x28']);
      expect(resume()).toBe('1 pièce affichée');
    });

    it('réaffiche toutes les pièces avec « Toutes les catégories »', async () => {
      await choisir('pneus-chambres');
      await choisir('');

      expect(nomsAffiches()).toEqual(['Antivol en U', 'Pneu 700x28']);
    });

    it("l'indique quand la catégorie choisie n'a aucune pièce", async () => {
      await choisir('freinage');

      expect(page.querySelector('table')).toBeNull();
      expect(page.textContent).toContain('Aucune pièce dans cette catégorie.');
      expect(resume()).toBe('0 pièce affichée');
    });
  });
});
