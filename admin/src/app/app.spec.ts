import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { CLE_SESSION } from './auth/auth.service';

describe('App', () => {
  // AuthService lit sessionStorage à sa création : on prépare d'abord le stockage.
  async function creer(connecte: boolean) {
    if (connecte) {
      sessionStorage.setItem(
        CLE_SESSION,
        JSON.stringify({ jeton: 'jeton-de-test', expiration: '2099-01-01T00:00:00.000Z' }),
      );
    }
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const navigation = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const bouton = () => page.querySelector<HTMLButtonElement>('header button');
    return { fixture, navigation, bouton };
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("n'affiche pas le bouton de déconnexion quand on n'est pas connecté", async () => {
    const { bouton } = await creer(false);

    expect(bouton()).toBeNull();
  });

  it('affiche le bouton « Se déconnecter » quand on est connecté', async () => {
    const { bouton } = await creer(true);

    expect(bouton()?.textContent).toContain('Se déconnecter');
  });

  it('déconnecte, retire le bouton et va à la page de connexion', async () => {
    const { fixture, navigation, bouton } = await creer(true);

    bouton()!.click();
    await fixture.whenStable();

    expect(sessionStorage.getItem(CLE_SESSION)).toBeNull();
    expect(bouton()).toBeNull();
    expect(navigation).toHaveBeenCalledWith('/connexion');
  });
});
