import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CLE_SESSION, URL_CONNEXION } from './auth.service';
import { sessionExpireeInterceptor } from './session-expiree.interceptor';

describe('sessionExpireeInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let navigation: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    // Connecté au départ : on vérifie que la 401 déconnecte.
    sessionStorage.setItem(
      CLE_SESSION,
      JSON.stringify({ jeton: 'jeton-de-test', expiration: '2099-01-01T00:00:00.000Z' }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpireeInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    api.verify();
    sessionStorage.clear();
  });

  // Envoie une requête, fait répondre la fausse API avec ce statut, et renvoie l'erreur reçue.
  function repondre(url: string, status: number): HttpErrorResponse | undefined {
    let erreur: HttpErrorResponse | undefined;
    http.post(url, {}).subscribe({ error: (e: HttpErrorResponse) => (erreur = e) });
    api.expectOne(url).flush({ erreur: "Message de l'API." }, { status, statusText: 'Erreur' });
    return erreur;
  }

  it("déconnecte et renvoie vers /connexion?session=expiree si l'API répond 401", () => {
    const erreur = repondre('/api/pieces', 401);

    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
    expect(navigation).toHaveBeenCalledWith('/connexion?session=expiree');
    expect(erreur?.status).toBe(401); // l'erreur est quand même transmise à l'appelant
  });

  it('ne fait rien pour une 401 de la connexion (identifiants incorrects)', () => {
    const erreur = repondre(URL_CONNEXION, 401);

    expect(navigation).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CLE_SESSION)).not.toBeNull();
    expect(erreur?.status).toBe(401); // la page de connexion affichera le message
  });

  it('ne fait rien pour les autres erreurs', () => {
    const erreur = repondre('/api/pieces', 500);

    expect(navigation).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CLE_SESSION)).not.toBeNull();
    expect(erreur?.status).toBe(500);
  });

  it("ne fait rien pour une 401 venant d'un autre site", () => {
    repondre('https://exemple.com/api/pieces', 401);

    expect(navigation).not.toHaveBeenCalled();
  });
});
