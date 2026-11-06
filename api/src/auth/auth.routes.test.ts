// Tests HTTP de POST /api/auth/connexion et de la limite de tentatives.
// Pas besoin de la base : l'administrateur est défini par les variables d'environnement.

import { decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.ts";
import type { CorpsErreur } from "../erreurs.ts";
import {
  IDENTIFIANT_TEST,
  JWT_SECRET_TEST,
  MOT_DE_PASSE_TEST,
} from "../tests/valeurs-de-test.ts";
import type { JetonEmis } from "./jeton.ts";
import { magasinTentatives } from "./limite-connexion.ts";

const bonsIdentifiants = { identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST };

function seConnecter(corps: unknown) {
  return request(app).post("/api/auth/connexion").send(corps as object);
}

// Chaque test commence avec des compteurs de tentatives vides et la vraie horloge.
beforeEach(() => magasinTentatives.resetAll());
afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/auth/connexion", () => {
  it("renvoie un jeton valable 2 heures si les identifiants sont corrects", async () => {
    const reponse = await seConnecter(bonsIdentifiants);

    expect(reponse.status).toBe(200);
    const { jeton, expiration } = reponse.body as JetonEmis;

    // Signé en HS256 avec le secret de l'API
    expect(decodeProtectedHeader(jeton)).toEqual({ alg: "HS256" });
    await expect(jwtVerify(jeton, new TextEncoder().encode(JWT_SECRET_TEST))).resolves.toBeDefined();

    // Contenu : uniquement sub, iat et exp. Ni identifiant réel, ni mot de passe.
    const contenu = decodeJwt(jeton);
    expect(Object.keys(contenu).sort()).toEqual(["exp", "iat", "sub"]);
    expect(contenu.sub).toBe("admin");
    expect(contenu.exp! - contenu.iat!).toBe(2 * 60 * 60);
    expect(JSON.stringify(contenu)).not.toContain(IDENTIFIANT_TEST);

    // L'expiration renvoyée correspond à celle du jeton
    expect(expiration).toBe(new Date(contenu.exp! * 1000).toISOString());
  });

  it("refuse un mauvais identifiant avec un message générique", async () => {
    const reponse = await seConnecter({ ...bonsIdentifiants, identifiant: "admin" });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ erreur: "Identifiants incorrects." });
  });

  it("refuse un mauvais mot de passe avec le même message", async () => {
    const reponse = await seConnecter({ ...bonsIdentifiants, motDePasse: "mot-de-passe-faux" });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ erreur: "Identifiants incorrects." });
  });

  it("répond exactement pareil pour un mauvais identifiant et un mauvais mot de passe", async () => {
    const mauvaisIdentifiant = await seConnecter({ ...bonsIdentifiants, identifiant: "x" });
    const mauvaisMotDePasse = await seConnecter({ ...bonsIdentifiants, motDePasse: "x" });

    expect(mauvaisIdentifiant.status).toBe(mauvaisMotDePasse.status);
    expect(mauvaisIdentifiant.text).toBe(mauvaisMotDePasse.text);
  });

  it("renvoie 400 avec le détail des champs s'il manque des champs", async () => {
    const reponse = await seConnecter({ identifiant: "" });

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      erreur: "Données invalides : 2 champs à corriger.",
      details: [
        { champ: "identifiant", message: "L'identifiant est obligatoire." },
        { champ: "motDePasse", message: "Le mot de passe est obligatoire." },
      ],
    });
  });

  it("renvoie 400 si la requête n'a pas de corps", async () => {
    const reponse = await request(app).post("/api/auth/connexion");

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      erreur: "Le corps de la requête doit être un objet JSON avec identifiant et motDePasse.",
    });
  });
});

describe("Limite de tentatives de connexion", () => {
  const mauvaisIdentifiants = { ...bonsIdentifiants, motDePasse: "mot-de-passe-faux" };

  async function echouer(fois: number) {
    for (let i = 0; i < fois; i++) {
      expect((await seConnecter(mauvaisIdentifiants)).status).toBe(401);
    }
  }

  it("bloque la 6e tentative après 5 échecs, même avec les bons identifiants", async () => {
    await echouer(5);

    const reponse = await seConnecter(bonsIdentifiants);
    expect(reponse.status).toBe(429);
    expect(reponse.body).toEqual({
      erreur: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    });
    // Nombre de secondes à attendre, indiqué au client (au plus 15 minutes)
    const secondes = Number(reponse.headers["retry-after"]);
    expect(secondes).toBeGreaterThan(0);
    expect(secondes).toBeLessThanOrEqual(15 * 60);
  });

  it("ne compte pas les connexions réussies", async () => {
    for (let i = 0; i < 6; i++) {
      expect((await seConnecter(bonsIdentifiants)).status).toBe(200);
    }
    await echouer(4);

    // 4 échecs seulement : la connexion est encore possible
    expect((await seConnecter(bonsIdentifiants)).status).toBe(200);
  });

  it("débloque la connexion 15 minutes après le premier échec", async () => {
    // On ne fausse que la date (Date.now), à laquelle le compteur compare ses fenêtres.
    vi.useFakeTimers({ toFake: ["Date"] });
    await echouer(5);
    expect((await seConnecter(bonsIdentifiants)).status).toBe(429);

    vi.setSystemTime(Date.now() + 14 * 60 * 1000); // 14 minutes plus tard
    const encoreBloquee = await seConnecter(bonsIdentifiants);
    expect(encoreBloquee.status).toBe(429);
    expect((encoreBloquee.body as CorpsErreur).erreur).toBe(
      "Trop de tentatives de connexion. Réessayez dans 1 minute.",
    );

    vi.setSystemTime(Date.now() + 61 * 1000); // un peu plus de 15 minutes au total
    expect((await seConnecter(bonsIdentifiants)).status).toBe(200);
  });
});
