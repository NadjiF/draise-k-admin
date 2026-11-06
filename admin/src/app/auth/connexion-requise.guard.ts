import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Garde de route : le routeur l'appelle avant d'afficher une page du back-office.
// Elle renvoie true pour laisser passer, ou une UrlTree (une adresse) pour rediriger.
//
// Elle n'interroge pas l'API : elle regarde seulement si un jeton est présent et pas encore
// expiré. C'est un confort pour l'utilisateur, pas une protection : la vraie protection
// est dans l'API (exigerAdmin), qui vérifie la signature du jeton à chaque requête.
export const connexionRequiseGuard: CanActivateChildFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  switch (auth.etatSession()) {
    case 'valide':
      return true;

    case 'expiree':
      // On efface le jeton périmé, puis on l'indique à la page de connexion par ?session=expiree.
      auth.deconnexion();
      return router.createUrlTree(['/connexion'], { queryParams: { session: 'expiree' } });

    case 'absente':
      return router.createUrlTree(['/connexion']);
  }
};
