import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { jetonInterceptor } from './auth/jeton.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // withInterceptors : chaque requête HttpClient passe par ces fonctions, dans cet ordre.
    provideHttpClient(withInterceptors([jetonInterceptor])),
  ]
};
