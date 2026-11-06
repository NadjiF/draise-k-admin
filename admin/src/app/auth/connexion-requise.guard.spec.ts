import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CLE_SESSION } from './auth.service';
import { connexionRequiseGuard } from './connexion-requise.guard';

// Deux pages factices : le test ne vérifie que la navigation, pas le contenu des pages.
@Component({ template: 'Page protégée' })
class PageProtegee {}

@Component({ template: 'Page de connexion' })
class PageConnexion {}

describe('connexionRequiseGuard', () => {
  // Même organisation que app.routes.ts : la garde protège toutes les pages enfants.
  function preparer(session: { jeton: string; expiration: string } | null): void {
    if (session !== null) sessionStorage.setItem(CLE_SESSION, JSON.stringify(session));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'connexion', component: PageConnexion },
          {
            path: '',
            canActivateChild: [connexionRequiseGuard],
            children: [
              { path: '', component: PageProtegee },
              { path: 'autre', component: PageProtegee },
            ],
          },
        ]),
      ],
    });
  }

  const dansUneHeure = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const ilYaUneSeconde = () => new Date(Date.now() - 1000).toISOString();

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('laisse passer quand la session est valide', async () => {
    preparer({ jeton: 'jeton-de-test', expiration: dansUneHeure() });
    // RouterTestingHarness : un vrai routeur, piloté par le test.
    const harnais = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harnais.routeNativeElement?.textContent).toContain('Page protégée');
  });

  it("redirige vers /connexion quand on n'est pas connecté", async () => {
    preparer(null);
    await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/connexion');
  });

  it('redirige avec ?session=expiree et efface le jeton quand la session est expirée', async () => {
    preparer({ jeton: 'jeton-de-test', expiration: ilYaUneSeconde() });
    await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/connexion?session=expiree');
    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
  });

  it('protège aussi les autres pages du back-office', async () => {
    preparer(null);
    await RouterTestingHarness.create('/autre');

    expect(TestBed.inject(Router).url).toBe('/connexion');
  });

  it('revérifie la session à chaque changement de page', async () => {
    // Session valable au départ, qui expire pendant qu'on est sur le site.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      preparer({ jeton: 'jeton-de-test', expiration: dansUneHeure() });
      const harnais = await RouterTestingHarness.create('/');
      expect(TestBed.inject(Router).url).toBe('/');

      vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000); // deux heures plus tard
      await harnais.navigateByUrl('/autre');

      expect(TestBed.inject(Router).url).toBe('/connexion?session=expiree');
    } finally {
      vi.useRealTimers();
    }
  });
});
