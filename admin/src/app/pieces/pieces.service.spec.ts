import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Piece } from './piece';
import { PiecesService } from './pieces.service';

const pieces: Piece[] = [
  {
    id: 'antivol-u',
    nom: 'Antivol en U',
    categorie: 'accessoires',
    prixCentimes: 4490,
    compatibilites: {},
    description: 'Antivol en acier trempé.',
  },
];

describe('PiecesService', () => {
  let service: PiecesService;
  let api: HttpTestingController; // la fausse API, pilotée par le test

  beforeEach(() => {
    TestBed.configureTestingModule({
      // provideHttpClientTesting() remplace l'envoi réel des requêtes :
      // elles sont retenues par HttpTestingController au lieu de partir sur le réseau.
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PiecesService);
    api = TestBed.inject(HttpTestingController);
  });

  // Échoue si une requête a été envoyée sans que le test l'ait traitée.
  afterEach(() => api.verify());

  it('lister() envoie GET /api/pieces et renvoie les pièces reçues', () => {
    let recues: Piece[] | undefined;
    service.lister().subscribe((resultat) => (recues = resultat));

    const requete = api.expectOne('/api/pieces');
    expect(requete.request.method).toBe('GET');

    requete.flush(pieces); // la fausse API répond
    expect(recues).toEqual(pieces);
  });

  it("n'envoie aucune requête tant que personne ne s'abonne", () => {
    service.lister(); // pas de subscribe

    api.expectNone('/api/pieces');
  });

  it("transmet l'erreur renvoyée par l'API", () => {
    let erreur: HttpErrorResponse | undefined;
    service.lister().subscribe({ error: (e: HttpErrorResponse) => (erreur = e) });

    api
      .expectOne('/api/pieces')
      .flush(
        { erreur: 'Erreur interne du serveur. Réessayez plus tard.' },
        { status: 500, statusText: 'Internal Server Error' },
      );

    expect(erreur?.status).toBe(500);
    expect(erreur?.error).toEqual({ erreur: 'Erreur interne du serveur. Réessayez plus tard.' });
  });

  it('trouver() envoie GET /api/pieces/:id et renvoie la pièce', () => {
    let recue: Piece | undefined;
    service.trouver('antivol-u').subscribe((resultat) => (recue = resultat));

    const requete = api.expectOne('/api/pieces/antivol-u');
    expect(requete.request.method).toBe('GET');
    requete.flush(pieces[0]);

    expect(recue).toEqual(pieces[0]);
  });

  it("trouver() encode l'id dans l'URL", () => {
    service.trouver('a/b?c').subscribe();

    // Sans encodage, l'appel partirait vers /api/pieces/a avec un paramètre ?c.
    api.expectOne('/api/pieces/a%2Fb%3Fc').flush(pieces[0]);
  });

  it('creer() envoie POST /api/pieces avec la pièce et renvoie la pièce enregistrée', () => {
    let creee: Piece | undefined;
    service.creer(pieces[0]).subscribe((resultat) => (creee = resultat));

    const requete = api.expectOne('/api/pieces');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(pieces[0]);
    requete.flush(pieces[0], { status: 201, statusText: 'Created' });

    expect(creee).toEqual(pieces[0]);
  });

  it("modifier() envoie PUT /api/pieces/:id, avec l'id de la pièce dans l'URL", () => {
    const modifiee = { ...pieces[0], prixCentimes: 3990 };
    let recue: Piece | undefined;
    service.modifier(modifiee).subscribe((resultat) => (recue = resultat));

    const requete = api.expectOne('/api/pieces/antivol-u');
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual(modifiee);
    requete.flush(modifiee);

    expect(recue).toEqual(modifiee);
  });

  it('supprimer() envoie DELETE /api/pieces/:id et se termine sans valeur', () => {
    let terminee = false;
    service.supprimer('antivol-u').subscribe(() => (terminee = true));

    const requete = api.expectOne('/api/pieces/antivol-u');
    expect(requete.request.method).toBe('DELETE');
    requete.flush(null, { status: 204, statusText: 'No Content' }); // 204 : pas de corps

    expect(terminee).toBe(true);
  });
});
