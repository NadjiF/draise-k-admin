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

// Une pièce qui n'existe pas dans le catalogue initial, utilisant tous les critères.
function nouvellePiece(): Piece {
  return {
    id: "jante-29-disque",
    nom: "Jante 29 pouces pour disque",
    categorie: "accessoires",
    prixCentimes: 5490,
    compatibilites: {
      taillesRoue: ["29"],
      typesFrein: ["disque-mecanique", "disque-hydraulique"],
      vitesses: [10, 11, 12],
    },
    description: "Jante aluminium double paroi, 32 trous.",
  };
}

// La pièce chaine-11v telle qu'elle est dans le catalogue initial.
const chaine11v: Piece = {
  id: "chaine-11v",
  nom: "Chaîne 11 vitesses",
  categorie: "transmission",
  prixCentimes: 3290,
  compatibilites: { vitesses: [11] },
  description: "Chaîne 116 maillons avec attache rapide, traitement anti-corrosion.",
};

async function nombreDePieces(): Promise<number> {
  const reponse = await request(app).get("/api/pieces");
  return reponse.body.length;
}

describe("GET /api/pieces/:id", () => {
  it("renvoie la pièce demandée", async () => {
    const reponse = await request(app).get("/api/pieces/chaine-11v");

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual(chaine11v);
  });

  it("renvoie 404 si la pièce n'existe pas", async () => {
    const reponse = await request(app).get("/api/pieces/chaine-12v");

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ erreur: "Aucune pièce avec l'identifiant « chaine-12v »." });
  });
});

describe("POST /api/pieces", () => {
  it("crée la pièce, la renvoie avec le code 201 et l'enregistre en base", async () => {
    const reponse = await request(app).post("/api/pieces").send(nouvellePiece());

    expect(reponse.status).toBe(201);
    expect(reponse.body).toEqual(nouvellePiece());

    const relue = await request(app).get("/api/pieces/jante-29-disque");
    expect(relue.body).toEqual(nouvellePiece());
    expect(await nombreDePieces()).toBe(26);
  });

  it("enregistre une pièce sans critère de compatibilité et le nom sans espaces autour", async () => {
    const piece = { ...nouvellePiece(), nom: "  Jante 29  ", compatibilites: {} };
    await request(app).post("/api/pieces").send(piece);

    const relue = await request(app).get("/api/pieces/jante-29-disque");
    expect(relue.body).toEqual({ ...piece, nom: "Jante 29" });
  });

  it("renvoie 409 si l'identifiant existe déjà, sans modifier la pièce existante", async () => {
    const reponse = await request(app)
      .post("/api/pieces")
      .send({ ...nouvellePiece(), id: "chaine-11v" });

    expect(reponse.status).toBe(409);
    expect(reponse.body).toEqual({
      erreur: "Une pièce avec l'identifiant « chaine-11v » existe déjà.",
      details: [{ champ: "id", message: "Cet identifiant est déjà utilisé." }],
    });
    const existante = await request(app).get("/api/pieces/chaine-11v");
    expect(existante.body).toEqual(chaine11v);
  });

  it("renvoie 400 avec le détail des champs si les données sont invalides, sans rien créer", async () => {
    const reponse = await request(app)
      .post("/api/pieces")
      .send({ ...nouvellePiece(), prixCentimes: 0 });

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      erreur: "Données invalides : 1 champ à corriger.",
      details: [{ champ: "prixCentimes", message: "Le prix doit être supérieur à 0." }],
    });
    expect(await nombreDePieces()).toBe(25);
  });

  it("renvoie 400 si le corps n'est pas un JSON valide", async () => {
    const reponse = await request(app)
      .post("/api/pieces")
      .set("Content-Type", "application/json")
      .send('{"id": "jante-29"');

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({ erreur: "Le corps de la requête n'est pas un JSON valide." });
  });

  it("renvoie 400 si la requête n'a pas de corps", async () => {
    const reponse = await request(app).post("/api/pieces");

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      erreur: "Le corps de la requête doit être un objet JSON décrivant une pièce.",
    });
  });
});

describe("PUT /api/pieces/:id", () => {
  it("remplace la pièce et la renvoie", async () => {
    const modifiee: Piece = {
      ...chaine11v,
      nom: "Chaîne 11 vitesses renforcée",
      prixCentimes: 3590,
      compatibilites: { vitesses: [11, 12] },
    };
    const reponse = await request(app).put("/api/pieces/chaine-11v").send(modifiee);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual(modifiee);
    const relue = await request(app).get("/api/pieces/chaine-11v");
    expect(relue.body).toEqual(modifiee);
  });

  it("remplace toute la pièce : un critère absent du corps est retiré", async () => {
    await request(app)
      .put("/api/pieces/chaine-11v")
      .send({ ...chaine11v, compatibilites: {} });

    const relue = await request(app).get("/api/pieces/chaine-11v");
    expect(relue.body.compatibilites).toEqual({});
  });

  it("renvoie 400 si l'id du corps diffère de celui de l'URL, sans rien modifier", async () => {
    const reponse = await request(app)
      .put("/api/pieces/chaine-11v")
      .send({ ...chaine11v, id: "chaine-11v-pro" });

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      erreur: "Données invalides : 1 champ à corriger.",
      details: [{ champ: "id", message: "L'identifiant d'une pièce ne peut pas être modifié." }],
    });
    const relue = await request(app).get("/api/pieces/chaine-11v");
    expect(relue.body).toEqual(chaine11v);
    expect((await request(app).get("/api/pieces/chaine-11v-pro")).status).toBe(404);
  });

  it("renvoie 400 si les données sont invalides, sans rien modifier", async () => {
    const reponse = await request(app)
      .put("/api/pieces/chaine-11v")
      .send({ ...chaine11v, nom: " ", categorie: "selles" });

    expect(reponse.status).toBe(400);
    expect(reponse.body.erreur).toBe("Données invalides : 2 champs à corriger.");
    const relue = await request(app).get("/api/pieces/chaine-11v");
    expect(relue.body).toEqual(chaine11v);
  });

  it("renvoie 404 si la pièce n'existe pas, sans la créer", async () => {
    const reponse = await request(app).put("/api/pieces/jante-29-disque").send(nouvellePiece());

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({
      erreur: "Aucune pièce avec l'identifiant « jante-29-disque ».",
    });
    expect(await nombreDePieces()).toBe(25);
  });
});

describe("DELETE /api/pieces/:id", () => {
  it("supprime la pièce et répond 204 sans corps", async () => {
    const reponse = await request(app).delete("/api/pieces/chaine-11v");

    expect(reponse.status).toBe(204);
    expect(reponse.text).toBe("");
    expect((await request(app).get("/api/pieces/chaine-11v")).status).toBe(404);
    expect(await nombreDePieces()).toBe(24);
  });

  it("renvoie 404 si la pièce n'existe pas", async () => {
    const reponse = await request(app).delete("/api/pieces/chaine-12v");

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ erreur: "Aucune pièce avec l'identifiant « chaine-12v »." });
    expect(await nombreDePieces()).toBe(25);
  });

  it("renvoie 404 si la pièce a déjà été supprimée", async () => {
    await request(app).delete("/api/pieces/chaine-11v");
    const reponse = await request(app).delete("/api/pieces/chaine-11v");

    expect(reponse.status).toBe(404);
  });
});
