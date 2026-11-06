import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CLE_SESSION } from './auth.service';
import { jetonInterceptor } from './jeton.interceptor';

describe('jetonInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;

  // AuthService lit sessionStorage à sa création : on prépare d'abord le stockage
  // (connecté ou non), puis on crée HttpClient avec l'intercepteur, comme dans app.config.ts.
  function preparer(connecte: boolean): void {
    if (connecte) {
      sessionStorage.setItem(
        CLE_SESSION,
        JSON.stringify({ jeton: 'jeton-de-test', expiration: '2099-01-01T00:00:00.000Z' }),
      );
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jetonInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
  }

  // Envoie une requête et renvoie l'en-tête Authorization qu'elle porte réellement.
  function enteteEnvoye(url: string): string | null {
    http.get(url).subscribe();
    const requete = api.expectOne(url);
    requete.flush({});
    return requete.request.headers.get('Authorization');
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    api.verify();
    sessionStorage.clear();
  });

  it('ajoute le jeton aux requêtes vers /api/ quand on est connecté', () => {
    preparer(true);

    expect(enteteEnvoye('/api/pieces')).toBe('Bearer jeton-de-test');
  });

  it("n'ajoute rien quand on n'est pas connecté", () => {
    preparer(false);

    expect(enteteEnvoye('/api/pieces')).toBeNull();
  });

  it("n'envoie jamais le jeton vers un autre site", () => {
    preparer(true);

    expect(enteteEnvoye('https://exemple.com/api/pieces')).toBeNull();
  });

  it("n'envoie pas le jeton vers une URL qui commence seulement comme /api", () => {
    preparer(true);

    expect(enteteEnvoye('/apiculture')).toBeNull();
  });
});
