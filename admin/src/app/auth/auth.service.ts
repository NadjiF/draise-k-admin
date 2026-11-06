import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

// Réponse de POST /api/auth/connexion (même forme que JetonEmis dans api/src/auth/jeton.ts).
export interface Session {
  jeton: string;
  expiration: string; // date ISO, ex. "2026-11-06T16:30:00.000Z"
}

// absente : jamais connecté, ou déconnecté
// expiree : un jeton existe, mais son heure d'expiration est passée
// valide  : connecté
export type EtatSession = 'absente' | 'expiree' | 'valide';

// Adresse de connexion de l'API. Exportée pour l'intercepteur des sessions expirées :
// sur cette requête, une 401 signifie « identifiants incorrects » et non « session expirée ».
export const URL_CONNEXION = '/api/auth/connexion';

// Clé utilisée dans sessionStorage.
export const CLE_SESSION = 'draise-k-admin.session';

// Garde le jeton de l'administrateur connecté.
// Source de vérité : le signal session. sessionStorage n'est qu'une copie, relue une seule
// fois au démarrage, pour que la connexion survive à un rechargement de la page (F5).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // Privé et modifiable : seul ce service change la session.
  private readonly session = signal<Session | null>(lireSessionStockee());

  // Lecture seule pour le reste de l'application (l'intercepteur, à l'étape 3).
  // computed : valeur recalculée automatiquement quand le signal session change.
  readonly jeton = computed(() => this.session()?.jeton ?? null);

  // Envoie les identifiants à l'API. En cas de succès, garde la session reçue.
  // En cas d'échec (401, 429…), l'erreur est transmise telle quelle à l'abonné :
  // c'est la page de connexion qui affichera le message.
  connexion(identifiant: string, motDePasse: string): Observable<void> {
    return this.http.post<Session>(URL_CONNEXION, { identifiant, motDePasse }).pipe(
      tap((session) => this.enregistrer(session)),
      map(() => undefined), // l'appelant n'a pas besoin du jeton
    );
  }

  deconnexion(): void {
    this.session.set(null);
    try {
      sessionStorage.removeItem(CLE_SESSION);
    } catch {
      // stockage indisponible : la session en mémoire est déjà effacée, cela suffit
    }
  }

  // Méthode et non computed : le résultat dépend de l'heure actuelle, qui n'est pas un signal.
  etatSession(): EtatSession {
    const session = this.session();
    if (session === null) return 'absente';
    return Date.parse(session.expiration) > Date.now() ? 'valide' : 'expiree';
  }

  private enregistrer(session: Session): void {
    this.session.set(session);
    try {
      sessionStorage.setItem(CLE_SESSION, JSON.stringify(session));
    } catch {
      // stockage plein ou bloqué : la session reste en mémoire jusqu'au prochain F5
    }
  }
}

// Relit la session gardée dans sessionStorage. Renvoie null si elle est absente ou mal formée
// (le contenu de sessionStorage peut avoir été modifié à la main dans le navigateur).
function lireSessionStockee(): Session | null {
  try {
    const texte = sessionStorage.getItem(CLE_SESSION);
    if (texte === null) return null;

    const valeur: unknown = JSON.parse(texte);
    if (estSession(valeur)) return valeur;

    sessionStorage.removeItem(CLE_SESSION); // contenu inutilisable : on le supprime
    return null;
  } catch {
    // JSON invalide, ou stockage inaccessible (certains navigateurs en navigation privée)
    return null;
  }
}

function estSession(valeur: unknown): valeur is Session {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const { jeton, expiration } = valeur as Record<string, unknown>;
  return (
    typeof jeton === 'string' &&
    jeton !== '' &&
    typeof expiration === 'string' &&
    !Number.isNaN(Date.parse(expiration))
  );
}
