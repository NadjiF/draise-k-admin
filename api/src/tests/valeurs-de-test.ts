// Identifiants et secret utilisés uniquement par les tests (voir vitest.config.ts).
// Ils sont commités volontairement : ils ne protègent rien de réel,
// et la CI n'a ainsi besoin d'aucun secret.

export const IDENTIFIANT_TEST = "admin-test";
export const MOT_DE_PASSE_TEST = "mot-de-passe-de-test";
// Hash argon2id de MOT_DE_PASSE_TEST, généré par npm run hash-mot-de-passe
export const MOT_DE_PASSE_HASH_TEST =
  "$argon2id$v=19$m=65536,p=4,t=3$NwZlKRwbX/DkZA95uy/S0A$143loOTgBDRT2c5T/RziRP9pnvmtiLZ9wne3/+pYr0I";
export const JWT_SECRET_TEST = "secret-de-test-uniquement-pour-vitest-0123456789";
