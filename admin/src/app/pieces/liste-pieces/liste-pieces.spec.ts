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

  // jsdom (le faux navigateur des tests) ne sait pas ouvrir une boîte de dialogue :
  // showModal et close n'y existent pas. Ces versions simplifiées font l'essentiel :
  // l'attribut open (boîte ouverte ou non) et l'évènement close à la fermeture.
  // Le comportement réel (page inerte, Échap, retour du focus) n'est pas testable ici.
  // titreALOuverture : le titre de la boîte au moment exact de l'ouverture, celui qu'un
  // lecteur d'écran annoncerait.
  let titreALOuverture: string | undefined;
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      titreALOuverture = this.querySelector('h2')?.textContent ?? undefined;
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  // La page a plusieurs zones role="status" (confirmation, chargement, résumé) : chacune
  // est cherchée par sa classe ou son texte.
  const confirmation = () => page.querySelector('.confirmation')?.textContent?.trim();
  const resume = () => page.querySelector('.resume')?.textContent;
  const titre = () => page.querySelector('h1');

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
    // slice(0, 3) : la 4e cellule (« Modifier », « Supprimer ») a ses propres tests.
    expect(cellules.slice(0, 3)).toEqual(['Pneu 700x28', 'Pneus et chambres à air', '29,90 €']);
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
      // Le bouton « Enregistrer » a disparu avec le formulaire : le focus est sur le titre.
      expect(document.activeElement).toBe(titre());
      expect(titre()?.getAttribute('tabindex')).toBe('-1');
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
      expect(document.activeElement).toBe(titre());
    });

    it("n'affiche rien sans message", async () => {
      await ouvrir();
      api.expectOne('/api/pieces').flush(pieces);
      await fixture.whenStable();

      expect(confirmation()).toBe('');
      expect(page.querySelector('.confirmation.visible')).toBeNull();
      // Arrivée normale sur la page : le focus n'est pas déplacé.
      expect(document.activeElement).not.toBe(titre());
    });
  });

  describe('suppression', () => {
    const dialogue = () => page.querySelector('dialog')!;
    const boutonDialogue = (texte: string) =>
      [...dialogue().querySelectorAll('button')].find((b) => b.textContent?.trim() === texte)!;

    // Le bouton « Supprimer » de la ligne de cette pièce.
    function boutonSupprimer(nom: string): HTMLButtonElement {
      const ligne = [...page.querySelectorAll('tbody tr')].find(
        (tr) => tr.querySelector('th')?.textContent?.trim() === nom,
      );
      return ligne!.querySelector('button.supprimer')!;
    }

    async function cliquer(bouton: HTMLButtonElement): Promise<void> {
      bouton.click();
      await fixture.whenStable();
    }

    beforeEach(async () => {
      await ouvrir();
      api.expectOne('/api/pieces').flush(pieces);
      await fixture.whenStable();
    });

    it('propose un bouton « Supprimer » par pièce, qui nomme la pièce', () => {
      const bouton = boutonSupprimer('Antivol en U');
      expect(bouton.textContent?.replace(/\s+/g, ' ').trim()).toBe('Supprimer Antivol en U');
      expect(bouton.getAttribute('type')).toBe('button');
    });

    it('ouvre une boîte de dialogue nommée par son titre, avec le focus sur « Annuler »', async () => {
      expect(dialogue().hasAttribute('open')).toBe(false);

      await cliquer(boutonSupprimer('Antivol en U'));

      expect(dialogue().hasAttribute('open')).toBe(true);
      // Le nom de la pièce était déjà dans le titre à l'ouverture, pas seulement après.
      expect(titreALOuverture).toBe('Supprimer la pièce « Antivol en U » ?');
      const idTitre = dialogue().getAttribute('aria-labelledby')!;
      expect(page.querySelector(`#${idTitre}`)?.textContent).toBe(
        'Supprimer la pièce « Antivol en U » ?',
      );
      const idTexte = dialogue().getAttribute('aria-describedby')!;
      expect(page.querySelector(`#${idTexte}`)?.textContent).toContain('définitive');
      expect(document.activeElement).toBe(boutonDialogue('Annuler'));
      api.expectNone('/api/pieces/antivol-u'); // rien n'est supprimé sans confirmation
    });

    it('« Annuler » ferme la boîte sans rien supprimer', async () => {
      await cliquer(boutonSupprimer('Antivol en U'));
      await cliquer(boutonDialogue('Annuler'));

      expect(dialogue().hasAttribute('open')).toBe(false);
      expect(page.querySelectorAll('tbody tr').length).toBe(2);
      api.expectNone('/api/pieces/antivol-u');
    });

    it('supprime la pièce, la retire de la liste, confirme et place le focus sur le titre', async () => {
      await cliquer(boutonSupprimer('Antivol en U'));
      await cliquer(boutonDialogue('Supprimer définitivement'));

      const requete = api.expectOne('/api/pieces/antivol-u');
      expect(requete.request.method).toBe('DELETE');
      expect(boutonDialogue('Suppression en cours…').disabled).toBe(true);

      requete.flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      expect(dialogue().hasAttribute('open')).toBe(false);
      expect([...page.querySelectorAll('tbody th')].map((th) => th.textContent?.trim())).toEqual([
        'Pneu 700x28',
      ]);
      expect(resume()).toBe('1 pièce affichée');
      expect(confirmation()).toBe('La pièce « Antivol en U » a été supprimée.');
      expect(document.activeElement).toBe(titre());
    });

    it("affiche l'erreur de l'API dans la boîte, qui reste ouverte", async () => {
      await cliquer(boutonSupprimer('Antivol en U'));
      await cliquer(boutonDialogue('Supprimer définitivement'));
      api
        .expectOne('/api/pieces/antivol-u')
        .flush(
          { erreur: "Aucune pièce avec l'identifiant « antivol-u »." },
          { status: 404, statusText: 'Not Found' },
        );
      await fixture.whenStable();

      expect(dialogue().hasAttribute('open')).toBe(true);
      expect(dialogue().querySelector('[role="alert"]')?.textContent).toBe(
        "Aucune pièce avec l'identifiant « antivol-u ».",
      );
      expect(boutonDialogue('Supprimer définitivement').disabled).toBe(false);
      expect(page.querySelectorAll('tbody tr').length).toBe(2);
      expect(confirmation()).toBe('');
    });

    it("efface l'erreur quand on rouvre la boîte", async () => {
      await cliquer(boutonSupprimer('Antivol en U'));
      await cliquer(boutonDialogue('Supprimer définitivement'));
      api.expectOne('/api/pieces/antivol-u').flush('', { status: 502, statusText: 'Bad Gateway' });
      await fixture.whenStable();
      expect(dialogue().querySelector('[role="alert"]')?.textContent).toContain(
        "Impossible de joindre l'API",
      );

      await cliquer(boutonDialogue('Annuler'));
      await cliquer(boutonSupprimer('Pneu 700x28'));

      expect(dialogue().querySelector('[role="alert"]')).toBeNull();
      expect(dialogue().querySelector('h2')?.textContent).toBe(
        'Supprimer la pièce « Pneu 700x28 » ?',
      );
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
