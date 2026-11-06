import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Connexion } from './connexion';

describe('Connexion', () => {
  let fixture: ComponentFixture<Connexion>;
  let api: HttpTestingController;
  let page: HTMLElement;
  let navigation: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Connexion],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    api = TestBed.inject(HttpTestingController);
    // On remplace la navigation par un espion : le test vérifie qu'elle est demandée,
    // sans avoir besoin de vraies pages.
    navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(Connexion);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    api.verify();
    sessionStorage.clear();
  });

  function champ(id: string): HTMLInputElement {
    return page.querySelector<HTMLInputElement>(`#${id}`)!;
  }

  function bouton(): HTMLButtonElement {
    return page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  // Simule la saisie : le FormControl est mis à jour par l'évènement input.
  function saisir(id: string, valeur: string): void {
    champ(id).value = valeur;
    champ(id).dispatchEvent(new Event('input'));
  }

  async function envoyer(): Promise<void> {
    bouton().click();
    await fixture.whenStable();
  }

  async function remplirEtEnvoyer(): Promise<void> {
    saisir('identifiant', 'admin');
    saisir('motDePasse', 'secret');
    await envoyer();
  }

  it("n'affiche aucun message d'erreur à l'ouverture de la page", () => {
    expect(page.querySelector('.message-champ')).toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it("place le focus sur le champ Identifiant à l'arrivée sur la page", () => {
    expect(document.activeElement).toBe(champ('identifiant'));
  });

  it('affiche « obligatoire » quand on quitte un champ vide', async () => {
    champ('identifiant').dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(page.querySelector('#identifiant-erreur')?.textContent).toContain(
      "L'identifiant est obligatoire.",
    );
    expect(champ('identifiant').getAttribute('aria-invalid')).toBe('true');
    expect(champ('identifiant').getAttribute('aria-describedby')).toBe('identifiant-erreur');
    expect(page.querySelector('#motDePasse-erreur')).toBeNull(); // pas encore touché
  });

  it("n'envoie rien si le formulaire est incomplet, et place le focus sur le premier champ vide", async () => {
    saisir('identifiant', 'admin');
    await envoyer();

    api.expectNone('/api/auth/connexion');
    expect(page.querySelector('#motDePasse-erreur')?.textContent).toContain(
      'Le mot de passe est obligatoire.',
    );
    expect(document.activeElement).toBe(champ('motDePasse'));
  });

  it("envoie les identifiants, désactive le bouton pendant l'envoi, puis va à la liste", async () => {
    await remplirEtEnvoyer();

    const requete = api.expectOne('/api/auth/connexion');
    expect(requete.request.body).toEqual({ identifiant: 'admin', motDePasse: 'secret' });
    expect(bouton().disabled).toBe(true);
    expect(bouton().textContent).toContain('Connexion en cours');

    requete.flush({ jeton: 'jeton-de-test', expiration: '2099-01-01T00:00:00.000Z' });
    await fixture.whenStable();

    expect(navigation).toHaveBeenCalledWith('/');
  });

  it("affiche le message de l'API si les identifiants sont incorrects", async () => {
    await remplirEtEnvoyer();
    api
      .expectOne('/api/auth/connexion')
      .flush({ erreur: 'Identifiants incorrects.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Identifiants incorrects.');
    expect(bouton().disabled).toBe(false); // on peut réessayer
    expect(navigation).not.toHaveBeenCalled();
  });

  it("affiche le message de l'API en cas de trop nombreuses tentatives", async () => {
    await remplirEtEnvoyer();
    api
      .expectOne('/api/auth/connexion')
      .flush(
        { erreur: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    );
  });

  it("affiche un message à nous si l'API est injoignable", async () => {
    await remplirEtEnvoyer();
    // error(ProgressEvent) simule une panne réseau : statut 0, pas de corps JSON.
    api.expectOne('/api/auth/connexion').error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "Impossible de joindre l'API.",
    );
  });

  it("efface l'ancien message d'erreur quand on renvoie le formulaire", async () => {
    await remplirEtEnvoyer();
    api
      .expectOne('/api/auth/connexion')
      .flush({ erreur: 'Identifiants incorrects.' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    await envoyer();

    expect(page.querySelector('[role="alert"]')).toBeNull();
    api.expectOne('/api/auth/connexion'); // nouvelle tentative en attente de réponse
  });

  describe('arrivée après une session expirée (?session=expiree)', () => {
    // setInput fait ce que fait le routeur avec withComponentInputBinding :
    // il donne à l'input « session » la valeur lue dans l'URL.
    beforeEach(async () => {
      fixture.componentRef.setInput('session', 'expiree');
      await fixture.whenStable();
    });

    it('affiche « Session expirée »', () => {
      expect(page.querySelector('[role="status"]')?.textContent).toContain(
        'Session expirée. Reconnectez-vous.',
      );
    });

    it('efface le message dès que le formulaire est envoyé', async () => {
      await remplirEtEnvoyer();

      expect(page.querySelector('[role="status"]')).toBeNull();
      api.expectOne('/api/auth/connexion');
    });
  });

  it("n'affiche pas « Session expirée » pour une autre valeur de ?session", async () => {
    fixture.componentRef.setInput('session', 'autre-chose');
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')).toBeNull();
  });
});
