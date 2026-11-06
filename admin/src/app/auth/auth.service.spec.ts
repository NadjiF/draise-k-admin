import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, CLE_SESSION, Session } from './auth.service';

const UNE_HEURE = 60 * 60 * 1000;

function sessionValableEncore(duree: number): Session {
  return { jeton: 'jeton-de-test', expiration: new Date(Date.now() + duree).toISOString() };
}

describe('AuthService', () => {
  let api: HttpTestingController;

  // Le service lit sessionStorage à sa création : chaque test prépare d'abord le stockage,
  // puis appelle creerService().
  function creerService(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    api.verify();
    sessionStorage.clear();
  });

  it("n'est pas connecté au démarrage si rien n'est stocké", () => {
    const service = creerService();

    expect(service.etatSession()).toBe('absente');
    expect(service.jeton()).toBeNull();
  });

  it('connexion() envoie les identifiants et garde la session reçue', () => {
    const service = creerService();
    const session = sessionValableEncore(2 * UNE_HEURE);
    let terminee = false;

    service.connexion('admin', 'secret').subscribe(() => (terminee = true));

    const requete = api.expectOne('/api/auth/connexion');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ identifiant: 'admin', motDePasse: 'secret' });
    requete.flush(session);

    expect(terminee).toBe(true);
    expect(service.jeton()).toBe('jeton-de-test');
    expect(service.etatSession()).toBe('valide');
    expect(JSON.parse(sessionStorage.getItem(CLE_SESSION)!)).toEqual(session);
  });

  it("connexion() transmet l'erreur de l'API et ne garde rien", () => {
    const service = creerService();
    let erreur: HttpErrorResponse | undefined;

    service.connexion('admin', 'faux').subscribe({ error: (e: HttpErrorResponse) => (erreur = e) });
    api
      .expectOne('/api/auth/connexion')
      .flush({ erreur: 'Identifiants incorrects.' }, { status: 401, statusText: 'Unauthorized' });

    expect(erreur?.status).toBe(401);
    expect(erreur?.error).toEqual({ erreur: 'Identifiants incorrects.' });
    expect(service.etatSession()).toBe('absente');
    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
  });

  it('deconnexion() efface la session en mémoire et dans sessionStorage', () => {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify(sessionValableEncore(UNE_HEURE)));
    const service = creerService();

    service.deconnexion();

    expect(service.etatSession()).toBe('absente');
    expect(service.jeton()).toBeNull();
    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
  });

  it('reprend la session stockée au démarrage (rechargement de la page)', () => {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify(sessionValableEncore(UNE_HEURE)));
    const service = creerService();

    expect(service.etatSession()).toBe('valide');
    expect(service.jeton()).toBe('jeton-de-test');
  });

  it("indique une session expirée une fois l'heure d'expiration passée", () => {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify(sessionValableEncore(-1000)));
    const service = creerService();

    expect(service.etatSession()).toBe('expiree');
  });

  it('ignore et supprime une session stockée mal formée', () => {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify({ jeton: 42, expiration: 'demain' }));
    const service = creerService();

    expect(service.etatSession()).toBe('absente');
    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
  });

  it("ignore un contenu stocké qui n'est pas du JSON", () => {
    sessionStorage.setItem(CLE_SESSION, 'pas du json');
    const service = creerService();

    expect(service.etatSession()).toBe('absente');
  });
});
