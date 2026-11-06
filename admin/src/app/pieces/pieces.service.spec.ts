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
});
