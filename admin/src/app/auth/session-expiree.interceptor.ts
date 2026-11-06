import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService, URL_CONNEXION } from './auth.service';
import { estRequeteApi } from './jeton.interceptor';

// Intercepteur qui surveille les réponses (et non plus les requêtes, comme jetonInterceptor).
// Si notre API répond 401, le jeton est expiré ou invalide (voir api/src/auth/exiger-admin.ts) :
// on déconnecte et on renvoie vers la page de connexion avec le message « Session expirée ».
export const sessionExpireeInterceptor: HttpInterceptorFn = (requete, suivant) => {
  // inject() doit être appelé ici, au début : plus tard, dans catchError (quand la réponse
  // arrive), on n'est plus dans le contexte d'injection et inject() lancerait une erreur.
  const auth = inject(AuthService);
  const router = inject(Router);

  return suivant(requete).pipe(
    // catchError : appelé seulement si la requête échoue (statut 4xx ou 5xx, réseau coupé).
    catchError((erreur: unknown) => {
      if (
        erreur instanceof HttpErrorResponse &&
        erreur.status === 401 &&
        estRequeteApi(requete.url) &&
        requete.url !== URL_CONNEXION // ici, 401 = identifiants incorrects : la page l'affiche
      ) {
        auth.deconnexion();
        void router.navigateByUrl('/connexion?session=expiree');
      }
      // Dans tous les cas, on retransmet l'erreur : le code qui a envoyé la requête
      // doit savoir qu'elle a échoué (pour arrêter un indicateur de chargement, par exemple).
      return throwError(() => erreur);
    }),
  );
};
