// Tests de la protection des routes d'écriture des pièces (middleware exigerAdmin),
// sur la vraie base de test : on vérifie aussi qu'un refus ne modifie rien.

import { base64url, decodeJwt, SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.ts";
import { creerJeton, type JetonEmis } from "../auth/jeton.ts";
import { fermerBase, reinitialiserBase } from "../tests/base-de-test.ts";
import {
  IDENTIFIANT_TEST,
  JWT_SECRET_TEST,
  MOT_DE_PASSE_TEST,
} from "../tests/valeurs-de-test.ts";
import type { Piece } from "./piece.ts";

beforeEach(reinitialiserBase);
afterAll(fermerBase);

const maintenant = () => Math.floor(Date.now() / 1000);

// Signe un jeton au format de l'API, avec le secret et les dates voulus.
function signer(secret: string, iat: number, exp: number): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

// Remplace le contenu d'un jeton valide sans recalculer la signature.
async function jetonModifie(): Promise<string> {
  const { jeton } = await creerJeton();
  const [entete, contenu, signature] = jeton.split(".");
  const nouveauContenu = { ...decodeJwt(jeton), exp: maintenant() + 365 * 24 * 3600 };
  expect(base64url.encode(JSON.stringify(nouveauContenu))).not.toBe(contenu);
  return `${entete}.${base64url.encode(JSON.stringify(nouveauContenu))}.${signature}`;
}

// Jeton « non signé » : en-tête alg: none et signature vide.
function jetonSansSignature(): string {
  const entete = base64url.encode(JSON.stringify({ alg: "none" }));
  const contenu = base64url.encode(
    JSON.stringify({ sub: "admin", iat: maintenant(), exp: maintenant() + 3600 }),
  );
  return `${entete}.${contenu}.`;
}

const nouvellePiece: Piece = {
  id: "jante-29-disque",
  nom: "Jante 29 pouces pour disque",
  categorie: "accessoires",
  prixCentimes: 5490,
  compatibilites: { taillesRoue: ["29"] },
  description: "Jante aluminium double paroi, 32 trous.",
};

const chaine11vModifiee: Piece = {
  id: "chaine-11v",
  nom: "Chaîne 11 vitesses renforcée",
  categorie: "transmission",
  prixCentimes: 3590,
  compatibilites: { vitesses: [11] },
  description: "Nouvelle description.",
};

// Les trois routes protégées, avec le code renvoyé quand l'administrateur est connecté.
const routesProtegees = [
  { methode: "post", url: "/api/pieces", corps: nouvellePiece, succes: 201 },
  { methode: "put", url: "/api/pieces/chaine-11v", corps: chaine11vModifiee, succes: 200 },
  { methode: "delete", url: "/api/pieces/chaine-11v", corps: undefined, succes: 204 },
] as const;

const MESSAGE_ABSENT = "Authentification requise : connectez-vous pour effectuer cette action.";
const MESSAGE_INVALIDE = "Jeton invalide. Reconnectez-vous.";
const MESSAGE_EXPIRE = "Session expirée. Reconnectez-vous.";

async function catalogue(): Promise<Piece[]> {
  return (await request(app).get("/api/pieces")).body as Piece[];
}

describe.each(routesProtegees)("$methode $url", ({ methode, url, corps, succes }) => {
  // Envoie la requête de la route, avec l'en-tête Authorization donné (ou aucun).
  function envoyer(authorization?: string) {
    let requete = request(app)[methode](url);
    if (authorization !== undefined) {
      requete = requete.set("Authorization", authorization);
    }
    return corps === undefined ? requete : requete.send(corps);
  }

  // Vérifie le refus 401, son message, l'en-tête WWW-Authenticate, et que rien n'a changé.
  async function verifierRefus(
    authorization: string | undefined,
    message: string,
    wwwAuthenticate: string,
  ) {
    const avant = await catalogue();
    const reponse = await envoyer(authorization);

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ erreur: message });
    expect(reponse.headers["www-authenticate"]).toBe(wwwAuthenticate);
    expect(await catalogue()).toEqual(avant);
  }

  it("refuse une requête sans jeton", async () => {
    await verifierRefus(undefined, MESSAGE_ABSENT, "Bearer");
  });

  it.each(["Basic YWRtaW46c2VjcmV0", "Bearer", "Bearer "])(
    "refuse un en-tête Authorization mal formé (« %s »)",
    async (authorization) => {
      await verifierRefus(authorization, MESSAGE_ABSENT, "Bearer");
    },
  );

  it("refuse un jeton qui n'est pas un JWT", async () => {
    await verifierRefus("Bearer n-importe-quoi", MESSAGE_INVALIDE, 'Bearer error="invalid_token"');
  });

  it("refuse un jeton signé avec un autre secret", async () => {
    const jeton = await signer("un-autre-secret-de-plus-de-32-caracteres", maintenant(), maintenant() + 3600);
    await verifierRefus(`Bearer ${jeton}`, MESSAGE_INVALIDE, 'Bearer error="invalid_token"');
  });

  it("refuse un jeton dont le contenu a été modifié", async () => {
    await verifierRefus(
      `Bearer ${await jetonModifie()}`,
      MESSAGE_INVALIDE,
      'Bearer error="invalid_token"',
    );
  });

  it("refuse un jeton non signé (alg: none)", async () => {
    await verifierRefus(
      `Bearer ${jetonSansSignature()}`,
      MESSAGE_INVALIDE,
      'Bearer error="invalid_token"',
    );
  });

  it("refuse un jeton expiré", async () => {
    // Émis il y a 3 heures, expiré depuis 1 heure
    const jeton = await signer(JWT_SECRET_TEST, maintenant() - 3 * 3600, maintenant() - 3600);
    await verifierRefus(`Bearer ${jeton}`, MESSAGE_EXPIRE, 'Bearer error="invalid_token"');
  });

  it("vérifie le jeton avant les données : 401 même si le corps est invalide", async () => {
    const reponse = await request(app)[methode](url).send({ nom: "" });

    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ erreur: MESSAGE_ABSENT });
  });

  it("accepte un jeton valide", async () => {
    const { jeton } = await creerJeton();
    const reponse = await envoyer(`Bearer ${jeton}`);

    expect(reponse.status).toBe(succes);
  });
});

describe("Parcours complet", () => {
  it("le jeton obtenu par POST /api/auth/connexion permet de créer une pièce", async () => {
    const connexion = await request(app)
      .post("/api/auth/connexion")
      .send({ identifiant: IDENTIFIANT_TEST, motDePasse: MOT_DE_PASSE_TEST });
    expect(connexion.status).toBe(200);

    const creation = await request(app)
      .post("/api/pieces")
      .set("Authorization", `Bearer ${(connexion.body as JetonEmis).jeton}`)
      .send(nouvellePiece);

    expect(creation.status).toBe(201);
    expect((await request(app).get("/api/pieces/jante-29-disque")).body).toEqual(nouvellePiece);
  });

  it("les routes GET restent publiques", async () => {
    expect((await request(app).get("/api/pieces")).status).toBe(200);
    expect((await request(app).get("/api/pieces/chaine-11v")).status).toBe(200);
  });
});
