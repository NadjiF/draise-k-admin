// Tests unitaires de la validation d'une pièce : ni base de données, ni HTTP.

import { describe, expect, it } from "vitest";
import { ErreurApi, type CorpsErreur } from "../erreurs.ts";
import { validerPiece } from "./piece.schema.ts";

// Une pièce valide, que chaque test modifie pour créer le cas voulu.
function pieceValide(): Record<string, unknown> {
  return {
    id: "chaine-11v",
    nom: "Chaîne 11 vitesses",
    categorie: "transmission",
    prixCentimes: 3290,
    compatibilites: { vitesses: [11] },
    description: "Chaîne 116 maillons avec attache rapide.",
  };
}

// Appelle validerPiece et renvoie le corps de l'erreur 400 qu'elle doit lancer.
function erreurDe(donnees: unknown): CorpsErreur {
  try {
    validerPiece(donnees);
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurApi);
    expect((erreur as ErreurApi).statut).toBe(400);
    return (erreur as ErreurApi).versCorps();
  }
  throw new Error("validerPiece aurait dû refuser ces données.");
}

describe("validerPiece : données valides", () => {
  it("accepte une pièce complète et la renvoie", () => {
    expect(validerPiece(pieceValide())).toEqual(pieceValide());
  });

  it("accepte des compatibilités vides (pièce universelle) et une description vide", () => {
    const piece = { ...pieceValide(), compatibilites: {}, description: "" };
    expect(validerPiece(piece)).toEqual(piece);
  });

  it("accepte tous les critères de compatibilité à la fois", () => {
    const compatibilites = {
      taillesRoue: ["27.5", "29", "700c"],
      typesFrein: ["v-brake", "disque-hydraulique"],
      vitesses: [9, 10, 11],
    };
    expect(validerPiece({ ...pieceValide(), compatibilites }).compatibilites).toEqual(
      compatibilites,
    );
  });

  it("retire les espaces autour du nom", () => {
    expect(validerPiece({ ...pieceValide(), nom: "  Chaîne 11 vitesses  " }).nom).toBe(
      "Chaîne 11 vitesses",
    );
  });

  it("accepte le plus grand prix que la base peut stocker", () => {
    expect(validerPiece({ ...pieceValide(), prixCentimes: 2_147_483_647 }).prixCentimes).toBe(
      2_147_483_647,
    );
  });
});

describe("validerPiece : champs obligatoires", () => {
  it.each([
    ["id", "L'identifiant est obligatoire."],
    ["nom", "Le nom est obligatoire."],
    ["categorie", "La catégorie est obligatoire."],
    ["prixCentimes", "Le prix est obligatoire."],
    [
      "compatibilites",
      "Les compatibilités sont obligatoires (un objet vide {} si la pièce va sur tous les vélos).",
    ],
    ["description", "La description est obligatoire (elle peut être vide)."],
  ])("signale l'absence de %s", (champ, message) => {
    const donnees = pieceValide();
    delete donnees[champ];
    expect(erreurDe(donnees)).toEqual({
      erreur: "Données invalides : 1 champ à corriger.",
      details: [{ champ, message }],
    });
  });
});

describe("validerPiece : règles de chaque champ", () => {
  it.each(["Chaine-11v", "chaîne-11v", "chaine--11v", "-chaine", "chaine-", "chaine 11v", ""])(
    "refuse l'identifiant « %s »",
    (id) => {
      expect(erreurDe({ ...pieceValide(), id }).details).toEqual([
        {
          champ: "id",
          message:
            "L'identifiant ne doit contenir que des minuscules sans accent, des chiffres et des tirets simples, sans tiret au début ni à la fin (ex. chaine-11v).",
        },
      ]);
    },
  );

  it.each(["", "   "])("refuse le nom « %s »", (nom) => {
    expect(erreurDe({ ...pieceValide(), nom }).details).toEqual([
      { champ: "nom", message: "Le nom ne peut pas être vide." },
    ]);
  });

  it("refuse un nom qui n'est pas un texte", () => {
    expect(erreurDe({ ...pieceValide(), nom: 42 }).details).toEqual([
      { champ: "nom", message: "Le nom doit être un texte." },
    ]);
  });

  it("refuse une catégorie inconnue en rappelant les valeurs possibles", () => {
    expect(erreurDe({ ...pieceValide(), categorie: "selles" }).details).toEqual([
      {
        champ: "categorie",
        message:
          "Catégorie inconnue : « selles ». Valeurs possibles : freinage, transmission, pneus-chambres, eclairage, accessoires.",
      },
    ]);
  });

  it.each([
    [0, "Le prix doit être supérieur à 0."],
    [-500, "Le prix doit être supérieur à 0."],
    [12.9, "Le prix doit être un nombre entier de centimes (ex. 1290 pour 12,90 €)."],
    ["1290", "Le prix doit être un nombre entier de centimes (ex. 1290 pour 12,90 €)."],
    [2_147_483_648, "Le prix est trop grand."],
  ])("refuse le prix %j", (prixCentimes, message) => {
    expect(erreurDe({ ...pieceValide(), prixCentimes }).details).toEqual([
      { champ: "prixCentimes", message },
    ]);
  });

  it("refuse des compatibilités qui ne sont pas un objet", () => {
    expect(erreurDe({ ...pieceValide(), compatibilites: [] }).details).toEqual([
      { champ: "compatibilites", message: "Les compatibilités doivent être un objet." },
    ]);
  });
});

describe("validerPiece : critères de compatibilité", () => {
  it.each([
    ["taillesRoue", [], "Indiquez au moins une taille de roue, ou retirez ce critère."],
    ["typesFrein", [], "Indiquez au moins un type de frein, ou retirez ce critère."],
    ["vitesses", [], "Indiquez au moins un nombre de vitesses, ou retirez ce critère."],
    ["taillesRoue", null, "Les tailles de roue doivent être une liste."],
    ["vitesses", "11", "Les vitesses doivent être une liste de nombres."],
    [
      "taillesRoue",
      ["29", "28"],
      "Taille de roue inconnue : « 28 ». Valeurs possibles : 20, 24, 26, 27.5, 29, 700c.",
    ],
    [
      "taillesRoue",
      [{ taille: "29" }],
      'Taille de roue inconnue : « {"taille":"29"} ». Valeurs possibles : 20, 24, 26, 27.5, 29, 700c.',
    ],
    [
      "typesFrein",
      ["tambour"],
      "Type de frein inconnu : « tambour ». Valeurs possibles : v-brake, etrier, disque-mecanique, disque-hydraulique.",
    ],
    ["vitesses", [0], "Chaque nombre de vitesses doit être supérieur à 0."],
    ["vitesses", [9.5], "Chaque nombre de vitesses doit être un nombre entier."],
  ])("refuse %s = %j", (critere, valeur, message) => {
    expect(
      erreurDe({ ...pieceValide(), compatibilites: { [critere]: valeur } }).details,
    ).toEqual([{ champ: `compatibilites.${critere}`, message }]);
  });
});

describe("validerPiece : champs inconnus", () => {
  it("refuse un champ en trop à la racine", () => {
    expect(erreurDe({ ...pieceValide(), prix: 3290 }).details).toEqual([
      { champ: "prix", message: "Champ inconnu." },
    ]);
  });

  it("refuse une faute de frappe dans les compatibilités", () => {
    expect(
      erreurDe({ ...pieceValide(), compatibilites: { taillesRoues: ["29"] } }).details,
    ).toEqual([{ champ: "compatibilites.taillesRoues", message: "Champ inconnu." }]);
  });
});

describe("validerPiece : plusieurs erreurs et corps invalide", () => {
  it("signale toutes les erreurs à la fois et compte les champs", () => {
    const corps = erreurDe({ ...pieceValide(), nom: "", prixCentimes: 0, categorie: "x" });
    expect(corps.erreur).toBe("Données invalides : 3 champs à corriger.");
    expect(corps.details?.map((detail) => detail.champ)).toEqual([
      "nom",
      "categorie",
      "prixCentimes",
    ]);
  });

  it.each([undefined, null, [], "une pièce", 42])("refuse le corps %j", (donnees) => {
    expect(erreurDe(donnees)).toEqual({
      erreur: "Le corps de la requête doit être un objet JSON décrivant une pièce.",
    });
  });
});
