import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FormulairePiece } from './formulaire-piece';

describe('FormulairePiece (création)', () => {
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
    fixture = TestBed.createComponent(FormulairePiece);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

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

  async function remplirEtEnvoyer(): Promise<void> {
    await saisir('id', 'chaine-12v');
    await saisir('nom', '  Chaîne 12 vitesses  ');
    await saisir('categorie', 'transmission');
    await saisir('prix', '39,9');
    await saisir('description', 'Chaîne 126 maillons.');
    await envoyer();
  }

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
});
