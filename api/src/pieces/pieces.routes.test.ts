// Tests HTTP des routes /api/pieces, sur la vraie base de test.

import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.ts";
import { fermerBase, reinitialiserBase } from "../tests/base-de-test.ts";
import type { Piece } from "./piece.ts";
import { validerPiece } from "./piece.schema.ts";

beforeEach(reinitialiserBase);
afterAll(fermerBase);

describe("GET /api/pieces", () => {
  it("renvoie les 25 pièces du catalogue initial, en JSON", async () => {
    const reponse = await request(app).get("/api/pieces");

    expect(reponse.status).toBe(200);
    expect(reponse.headers["content-type"]).toMatch(/application\/json/);
    expect(reponse.body).toHaveLength(25);
  });

  it("renvoie chaque pièce au format de La Draise-K", async () => {
    const reponse = await request(app).get("/api/pieces");
    const pieces: Piece[] = reponse.body;

    // Critère NULL en base = critère absent (pas de clé taillesRoue ni typesFrein)
    expect(pieces.find((piece) => piece.id === "chaine-11v")).toEqual({
      id: "chaine-11v",
      nom: "Chaîne 11 vitesses",
      categorie: "transmission",
      prixCentimes: 3290,
      compatibilites: { vitesses: [11] },
      description: "Chaîne 116 maillons avec attache rapide, traitement anti-corrosion.",
    });
    // Aucun critère : compatibilités vides
    expect(pieces.find((piece) => piece.id === "sacoche-selle")?.compatibilites).toEqual({});
  });

  it("regroupe les pièces par catégorie, dans l'ordre alphabétique", async () => {
    const reponse = await request(app).get("/api/pieces");
    const categories = (reponse.body as Piece[]).map((piece) => piece.categorie);

    expect(categories).toEqual([...categories].sort());
  });

  // Si une règle zod était plus stricte qu'une contrainte CHECK, une pièce
  // acceptée par la base serait refusée ici.
  it("renvoie des pièces que la validation zod accepte toutes", async () => {
    const reponse = await request(app).get("/api/pieces");

    for (const piece of reponse.body as Piece[]) {
      expect(validerPiece(piece)).toEqual(piece);
    }
  });
});
