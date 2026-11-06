import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { jetonInterceptor } from './auth/jeton.interceptor';
import { sessionExpireeInterceptor } from './auth/session-expiree.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding : les paramètres de l'URL (ex. ?session=expiree) sont transmis
    // aux inputs du composant affiché qui portent le même nom.
    provideRouter(routes, withComponentInputBinding()),
    // withInterceptors : chaque requête HttpClient passe par ces fonctions, dans cet ordre
    // (et chaque réponse dans l'ordre inverse).
    provideHttpClient(withInterceptors([jetonInterceptor, sessionExpireeInterceptor])),
  ]
};
