import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// Intercepteur : chaque requête envoyée par HttpClient passe par cette fonction avant de partir.
// requete : la requête telle que le service l'a construite.
// suivant : la suite de la chaîne (un autre intercepteur, ou l'envoi réel sur le réseau).
//
// Rôle : si l'administrateur est connecté, ajouter son jeton aux requêtes vers notre API,
// sous la forme attendue par exigerAdmin (api/src/auth/exiger-admin.ts) :
//   Authorization: Bearer <jeton>
export const jetonInterceptor: HttpInterceptorFn = (requete, suivant) => {
  // inject() fonctionne ici : Angular appelle l'intercepteur dans un contexte d'injection.
  const jeton = inject(AuthService).jeton();

  // Pas de jeton, ou requête vers un autre site : on ne touche à rien.
  // Le jeton ne doit jamais partir ailleurs que vers notre API.
  if (jeton === null || !estRequeteApi(requete.url)) {
    return suivant(requete);
  }

  // Une requête HttpClient est immuable : on ne la modifie pas, on en crée une copie
  // avec l'en-tête en plus.
  return suivant(requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }));
};

// Nos services appellent l'API par une URL relative qui commence par /api/
// (transmise au port 3000 par proxy.conf.json en développement).
// Exportée : l'intercepteur des sessions expirées s'en sert aussi.
export function estRequeteApi(url: string): boolean {
  return url.startsWith('/api/');
}
