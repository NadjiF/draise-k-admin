// Tests des contraintes CHECK de api/db/init.sql, directement en SQL.
// Elles protègent la base même si une requête ne passe pas par la validation zod
// (insertion à la main, futur code qui oublierait de valider…).

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../db.ts";
import { fermerBase, reinitialiserBase } from "../tests/base-de-test.ts";

beforeEach(reinitialiserBase);
afterAll(fermerBase);

// Insère une pièce minimale avec ces vitesses. $1 : paramètre envoyé à part par pg,
// jamais collé dans le texte SQL.
function insererAvecVitesses(vitesses: (number | null)[]) {
  return pool.query(
    `INSERT INTO pieces (id, nom, categorie, prix_centimes, description, vitesses)
     VALUES ('piece-de-test', 'Pièce de test', 'transmission', 1000, '', $1)`,
    [vitesses],
  );
}

// Code d'erreur de PostgreSQL pour une contrainte CHECK non respectée.
const VIOLATION_CHECK = "23514";

describe("Contrainte CHECK sur les vitesses", () => {
  it("accepte les vitesses de 1 à 13", async () => {
    await expect(insererAvecVitesses([1, 7, 13])).resolves.toBeDefined();
  });

  it.each([[[0]], [[14]], [[11, 99]], [[]], [[11, null]]])("refuse %j", async (vitesses) => {
    await expect(insererAvecVitesses(vitesses)).rejects.toMatchObject({ code: VIOLATION_CHECK });
  });
});
