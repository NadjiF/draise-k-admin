// Limite des tentatives de connexion, contre les attaques par force brute
// (essayer des milliers de mots de passe), avec express-rate-limit.

import { type AugmentedRequest, MemoryStore, rateLimit } from "express-rate-limit";

const FENETRE_MS = 15 * 60 * 1000; // 15 minutes
const ECHECS_MAX = 5;

// Compteurs gardés en mémoire, par adresse IP. Ils sont perdus au redémarrage
// de l'API, ce qui suffit pour un seul serveur. Exporté pour que les tests
// puissent le vider entre deux tests.
export const magasinTentatives = new MemoryStore();

export const limiteConnexion = rateLimit({
  windowMs: FENETRE_MS,
  limit: ECHECS_MAX,
  // Seuls les échecs comptent (réponse 400 ou plus) : une connexion réussie
  // ne rapproche pas l'administrateur du blocage.
  skipSuccessfulRequests: true,
  store: magasinTentatives,
  // En-têtes standard RateLimit-* et Retry-After (secondes avant de réessayer)
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // Réponse quand la limite est atteinte, au format d'erreur de l'API
  handler: (requete, reponse) => {
    // express-rate-limit range ses informations dans requete.rateLimit.
    const { resetTime } = (requete as AugmentedRequest).rateLimit ?? {};
    const finFenetre = resetTime?.getTime() ?? Date.now() + FENETRE_MS;
    const minutes = Math.max(1, Math.ceil((finFenetre - Date.now()) / 60_000));
    reponse.status(429).json({
      erreur: `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
    });
  },
});
