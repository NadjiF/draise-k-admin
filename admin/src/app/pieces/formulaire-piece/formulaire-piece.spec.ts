import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessagesService } from '../../messages.service';
import { FormulairePiece } from './formulaire-piece';

describe('FormulairePiece', () => {
  let fixture: ComponentFixture<FormulairePiece>;
  let api: HttpTestingController;
  let page: HTMLElement;
  let navigation: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormulairePiece],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    api = TestBed.inject(HttpTestingController);
    navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  // Crée le composant. Avec un id, il est en mode modification : setInput fait ce que fait
  // le routeur pour /pieces/:id/modifier. Il est appelé avant whenStable, donc avant ngOnInit.
  async function ouvrir(id?: string): Promise<void> {
    fixture = TestBed.createComponent(FormulairePiece);
    if (id !== undefined) fixture.componentRef.setInput('id', id);
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => api.verify());

  type Element = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const champ = (nom: string) => page.querySelector<Element>(`#champ-${nom}`)!;
  const erreurDe = (nom: string) => page.querySelector(`#champ-${nom}-erreur`)?.textContent?.trim();
  const alerte = () => page.querySelector('[role="alert"]');

  // Simule la saisie. Une liste déroulante signale son changement par l'évènement change,
  // les champs de texte par l'évènement input.
  async function saisir(nom: string, valeur: string): Promise<void> {
    const element = champ(nom);
    element.value = valeur;
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input'));
    element.dispatchEvent(new Event('blur')); // le champ est « touché »
    await fixture.whenStable();
  }

  async function envoyer(): Promise<void> {
    page.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  async function remplir(): Promise<void> {
    await saisir('id', 'chaine-12v');
    await saisir('nom', '  Chaîne 12 vitesses  ');
    await saisir('categorie', 'transmission');
    await saisir('prix', '39,9');
    await saisir('description', 'Chaîne 126 maillons.');
  }

  async function remplirEtEnvoyer(): Promise<void> {
    await remplir();
    await envoyer();
  }

  // Les cases d'un groupe de compatibilités (fieldset #champ-taillesRoue…).
  const cases = (critere: string) => [
    ...page.querySelectorAll<HTMLInputElement>(`#champ-${critere} input[type="checkbox"]`),
  ];

  // La case dont le libellé est exactement ce texte, ex. caseDe('vitesses', '11').
  function caseDe(critere: string, libelle: string): HTMLInputElement {
    const label = [...page.querySelectorAll(`#champ-${critere} label`)].find(
      (element) => element.textContent?.trim() === libelle,
    );
    return label!.querySelector('input')!;
  }

  // click() coche ou décoche la case et déclenche l'évènement change, comme un vrai clic.
  async function cocher(critere: string, ...libelles: string[]): Promise<void> {
    for (const libelle of libelles) caseDe(critere, libelle).click();
    await fixture.whenStable();
  }

  describe('création', () => {
    beforeEach(() => ouvrir());

    it("n'affiche aucune erreur à l'ouverture", () => {
      expect(page.querySelector('h1')?.textContent).toContain('Ajouter une pièce');
      expect(page.querySelector('.message-champ')).toBeNull();
      expect(alerte()).toBeNull();
    });

    it("n'envoie rien si le formulaire est vide, signale chaque champ obligatoire et place le focus sur le premier", async () => {
      await envoyer();

      api.expectNone('/api/pieces');
      expect(erreurDe('id')).toBe("L'identifiant est obligatoire.");
      expect(erreurDe('nom')).toBe('Le nom est obligatoire.');
      expect(erreurDe('categorie')).toBe('Choisissez une catégorie.');
      expect(erreurDe('prix')).toBe('Le prix est obligatoire.');
      expect(erreurDe('description')).toBeUndefined(); // facultative
      expect(document.activeElement).toBe(champ('id'));
    });

    it("refuse un identifiant mal formé, avec le même message que l'API", async () => {
      await saisir('id', 'Chaîne 12V');

      expect(erreurDe('id')).toContain("L'identifiant ne doit contenir que des minuscules");
      expect(champ('id').getAttribute('aria-invalid')).toBe('true');
      // L'aide et l'erreur sont toutes deux lues avec le champ.
      expect(champ('id').getAttribute('aria-describedby')).toBe('champ-id-aide champ-id-erreur');
    });

    it("refuse un nom fait seulement d'espaces", async () => {
      await saisir('nom', '   ');

      expect(erreurDe('nom')).toBe('Le nom est obligatoire.');
    });

    it.each([
      [
        '12,905',
        'Saisissez un prix en euros, avec au plus deux chiffres après la virgule (ex. 12,90).',
      ],
      [
        'douze',
        'Saisissez un prix en euros, avec au plus deux chiffres après la virgule (ex. 12,90).',
      ],
      ['0', 'Le prix doit être supérieur à 0.'],
      ['99999999', 'Le prix est trop grand.'],
    ])('refuse le prix « %s »', async (prix, message) => {
      await saisir('prix', prix);

      expect(erreurDe('prix')).toBe(message);
    });

    it("envoie la pièce à l'API (nom sans espaces autour, prix en centimes), puis revient à la liste", async () => {
      await remplirEtEnvoyer();

      const requete = api.expectOne('/api/pieces');
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({
        id: 'chaine-12v',
        nom: 'Chaîne 12 vitesses',
        categorie: 'transmission',
        prixCentimes: 3990,
        compatibilites: {},
        description: 'Chaîne 126 maillons.',
      });
      expect(page.querySelector('button[type="submit"]')?.textContent).toContain('Enregistrement');

      requete.flush(requete.request.body, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(navigation).toHaveBeenCalledWith('/');
      expect(TestBed.inject(MessagesService).recuperer()).toBe(
        'La pièce « Chaîne 12 vitesses » a été ajoutée.',
      );
    });

    it("affiche l'erreur 409 sous le champ identifiant", async () => {
      await remplirEtEnvoyer();
      api.expectOne('/api/pieces').flush(
        {
          erreur: "Une pièce avec l'identifiant « chaine-12v » existe déjà.",
          details: [{ champ: 'id', message: 'Cet identifiant est déjà utilisé.' }],
        },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();

      expect(alerte()?.textContent).toContain(
        "Une pièce avec l'identifiant « chaine-12v » existe déjà.",
      );
      expect(erreurDe('id')).toBe('Cet identifiant est déjà utilisé.');
      expect(document.activeElement).toBe(champ('id'));
      expect(navigation).not.toHaveBeenCalled();
      // Rien n'a été enregistré : aucune confirmation ne doit attendre la liste.
      expect(TestBed.inject(MessagesService).recuperer()).toBeNull();
    });

    it('place chaque détail du 400 sous son champ (prixCentimes sous le prix), et les autres en haut', async () => {
      await remplirEtEnvoyer();
      api.expectOne('/api/pieces').flush(
        {
          erreur: 'Données invalides : 3 champs à corriger.',
          details: [
            { champ: 'nom', message: 'Le nom ne peut pas être vide.' },
            { champ: 'prixCentimes', message: 'Le prix est trop grand.' },
            { champ: 'inconnu', message: 'Champ inconnu.' },
          ],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      await fixture.whenStable();

      expect(erreurDe('nom')).toBe('Le nom ne peut pas être vide.');
      expect(erreurDe('prix')).toBe('Le prix est trop grand.');

      // Le message est dans le bloc du champ (juste sous lui), et relié au champ :
      // le lecteur d'écran l'annonce avec lui, comme champ invalide.
      for (const nom of ['nom', 'prix']) {
        const bloc = champ(nom).closest('.champ');
        expect(bloc?.querySelector(`#champ-${nom}-erreur`)).not.toBeNull();
        expect(champ(nom).getAttribute('aria-invalid')).toBe('true');
        expect(champ(nom).getAttribute('aria-describedby')).toContain(`champ-${nom}-erreur`);
      }

      expect(alerte()?.textContent).toContain('Données invalides : 3 champs à corriger.');
      expect(alerte()?.querySelector('li')?.textContent).toBe('Champ inconnu.');
      expect(document.activeElement).toBe(champ('nom'));
    });

    it("efface l'erreur de l'API d'un champ dès qu'on le modifie", async () => {
      await remplirEtEnvoyer();
      api.expectOne('/api/pieces').flush(
        {
          erreur: 'Conflit.',
          details: [{ champ: 'id', message: 'Cet identifiant est déjà utilisé.' }],
        },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();

      await saisir('id', 'chaine-12v-bis');

      expect(erreurDe('id')).toBeUndefined();
    });

    it("affiche un message à nous si l'API est injoignable", async () => {
      await remplirEtEnvoyer();
      api.expectOne('/api/pieces').error(new ProgressEvent('error'));
      await fixture.whenStable();

      expect(alerte()?.textContent).toContain("Impossible de joindre l'API.");
      expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    });

    describe('compatibilités', () => {
      it('affiche un groupe de cases par critère, toutes décochées', () => {
        const legendes = [...page.querySelectorAll('fieldset legend')].map((l) =>
          l.textContent?.trim(),
        );
        expect(legendes).toEqual(['Tailles de roue', 'Types de frein', 'Nombres de vitesses']);

        expect(cases('taillesRoue').length).toBe(6);
        expect(cases('typesFrein').length).toBe(4);
        expect(cases('vitesses').length).toBe(13);
        expect(
          [...page.querySelectorAll<HTMLInputElement>('fieldset input')].some((c) => c.checked),
        ).toBe(false);

        // Libellés de La Draise-K, et texte d'aide relié au groupe.
        expect(caseDe('taillesRoue', '700c (route)')).toBeDefined();
        expect(caseDe('typesFrein', 'V-Brake')).toBeDefined();
        expect(champ('taillesRoue').getAttribute('aria-describedby')).toBe(
          'champ-taillesRoue-aide',
        );
      });

      it("envoie les cases cochées, dans l'ordre des listes, et les vitesses en nombres", async () => {
        await remplir();
        await cocher('taillesRoue', '700c (route)', '29 pouces');
        await cocher('typesFrein', 'Disque hydraulique');
        await cocher('vitesses', '12', '11', '13');
        await cocher('vitesses', '13'); // cochée puis décochée : non envoyée
        await envoyer();

        const requete = api.expectOne('/api/pieces');
        expect(requete.request.body.compatibilites).toEqual({
          taillesRoue: ['29', '700c'],
          typesFrein: ['disque-hydraulique'],
          vitesses: [11, 12],
        });
        requete.flush(requete.request.body, { status: 201, statusText: 'Created' });
      });

      it("affiche une erreur de l'API sur un critère dans son groupe, et y place le focus", async () => {
        await remplir();
        await cocher('vitesses', '11');
        await envoyer();
        api.expectOne('/api/pieces').flush(
          {
            erreur: 'Données invalides : 1 champ à corriger.',
            details: [
              {
                champ: 'compatibilites.vitesses',
                message: 'Chaque nombre de vitesses doit être compris entre 1 et 13.',
              },
            ],
          },
          { status: 400, statusText: 'Bad Request' },
        );
        await fixture.whenStable();

        // Le message est dans la légende du groupe : il est annoncé en entrant dans le groupe.
        expect(champ('vitesses').querySelector('legend .message-champ')?.textContent?.trim()).toBe(
          'Chaque nombre de vitesses doit être compris entre 1 et 13.',
        );
        expect(champ('vitesses').classList).toContain('en-erreur');
        // aria-describedby ne garde que l'aide : le message n'est pas lu deux fois.
        expect(champ('vitesses').getAttribute('aria-describedby')).toBe('champ-vitesses-aide');
        expect(alerte()?.querySelector('li')).toBeNull(); // placée dans le groupe, pas en haut
        // Un fieldset ne prend pas le focus : il va sur la première case du groupe.
        expect(document.activeElement).toBe(cases('vitesses')[0]);

        // L'erreur disparaît dès qu'on change une case du groupe.
        await cocher('vitesses', '12');
        expect(erreurDe('vitesses')).toBeUndefined();
      });
    });
  });

  describe('modification', () => {
    const chaine11v = {
      id: 'chaine-11v',
      nom: 'Chaîne 11 vitesses',
      categorie: 'transmission',
      prixCentimes: 3290,
      compatibilites: { taillesRoue: ['700c'], vitesses: [11] },
      description: 'Chaîne 116 maillons avec attache rapide.',
    };

    // Ouvre /pieces/chaine-11v/modifier et laisse la fausse API répondre avec la pièce.
    async function ouvrirChaine11v(): Promise<void> {
      await ouvrir('chaine-11v');
      api.expectOne('/api/pieces/chaine-11v').flush(chaine11v);
      await fixture.whenStable();
    }

    it("affiche « Chargement de la pièce… » tant que l'API n'a pas répondu", async () => {
      await ouvrir('chaine-11v');

      expect(page.querySelector('[role="status"]')?.textContent).toContain(
        'Chargement de la pièce',
      );
      expect(page.querySelector('form')).toBeNull();
      api.expectOne('/api/pieces/chaine-11v'); // requête partie, sans réponse
    });

    it('remplit le formulaire avec la pièce chargée', async () => {
      await ouvrirChaine11v();

      expect(page.querySelector('h1')?.textContent).toContain(
        'Modifier la pièce « Chaîne 11 vitesses »',
      );
      expect(champ('id').value).toBe('chaine-11v');
      expect(champ('nom').value).toBe('Chaîne 11 vitesses');
      expect(champ('categorie').value).toBe('transmission');
      expect(champ('prix').value).toBe('32,90');
      expect(champ('description').value).toBe('Chaîne 116 maillons avec attache rapide.');
      expect(caseDe('taillesRoue', '700c (route)').checked).toBe(true);
      expect(caseDe('vitesses', '11').checked).toBe(true);
      expect(cases('taillesRoue').filter((c) => c.checked).length).toBe(1);
      expect(cases('typesFrein').some((c) => c.checked)).toBe(false);
      expect(page.querySelector('.message-champ')).toBeNull();
    });

    it("affiche l'identifiant en lecture seule, avec une aide qui le dit", async () => {
      await ouvrirChaine11v();

      expect((champ('id') as HTMLInputElement).readOnly).toBe(true);
      expect(page.querySelector('#champ-id-aide')?.textContent).toContain(
        "L'identifiant d'une pièce ne peut pas être modifié.",
      );
    });

    it('envoie PUT /api/pieces/:id avec la pièce modifiée, puis revient à la liste', async () => {
      await ouvrirChaine11v();
      await saisir('prix', '34,50');
      await cocher('vitesses', '12');
      await envoyer();

      const requete = api.expectOne('/api/pieces/chaine-11v');
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body).toEqual({
        ...chaine11v,
        prixCentimes: 3450,
        compatibilites: { taillesRoue: ['700c'], vitesses: [11, 12] },
      });
      expect(page.querySelector('button[type="submit"]')?.textContent).toContain(
        'Enregistrement en cours',
      );

      requete.flush(requete.request.body);
      await fixture.whenStable();
      expect(navigation).toHaveBeenCalledWith('/');
      expect(TestBed.inject(MessagesService).recuperer()).toBe(
        'La pièce « Chaîne 11 vitesses » a été modifiée.',
      );
    });

    it('propose « Enregistrer les modifications »', async () => {
      await ouvrirChaine11v();

      expect(page.querySelector('button[type="submit"]')?.textContent?.trim()).toBe(
        'Enregistrer les modifications',
      );
    });

    it("affiche le message de l'API et un lien vers la liste si la pièce n'existe pas", async () => {
      await ouvrir('chaine-99v');
      api
        .expectOne('/api/pieces/chaine-99v')
        .flush(
          { erreur: "Aucune pièce avec l'identifiant « chaine-99v »." },
          { status: 404, statusText: 'Not Found' },
        );
      await fixture.whenStable();

      expect(alerte()?.textContent).toContain("Aucune pièce avec l'identifiant « chaine-99v ».");
      expect(page.querySelector('form')).toBeNull();
      expect(page.querySelector('a')?.textContent).toContain('Retour à la liste des pièces');
    });

    it('affiche la 404 en haut du formulaire si la pièce a été supprimée entre-temps', async () => {
      await ouvrirChaine11v();
      await envoyer();
      api
        .expectOne('/api/pieces/chaine-11v')
        .flush(
          { erreur: "Aucune pièce avec l'identifiant « chaine-11v »." },
          { status: 404, statusText: 'Not Found' },
        );
      await fixture.whenStable();

      expect(alerte()?.textContent).toContain("Aucune pièce avec l'identifiant « chaine-11v ».");
      expect(navigation).not.toHaveBeenCalled();
    });
  });
});
