// Validation d'une pièce reçue par l'API (POST et PUT), avec zod.
// Les règles reprennent les contraintes CHECK de api/db/init.sql :
// si l'une change, l'autre doit changer aussi.

import { z } from "zod";
import { validerAvecZod } from "../erreurs.ts";
import type { Piece } from "./piece.ts";

// Plus grand nombre accepté par une colonne integer de PostgreSQL.
const ENTIER_MAX_POSTGRES = 2_147_483_647;

const CATEGORIES = [
  "freinage",
  "transmission",
  "pneus-chambres",
  "eclairage",
  "accessoires",
] as const;
const TAILLES_ROUE = ["20", "24", "26", "27.5", "29", "700c"] as const;
const TYPES_FREIN = [
  "v-brake",
  "etrier",
  "disque-mecanique",
  "disque-hydraulique",
] as const;

// Message à utiliser quand le champ manque ou n'a pas le bon type.
// zod appelle cette fonction avec le problème trouvé ; issue.input est la valeur reçue.
function siAbsentOuMauvaisType(obligatoire: string, mauvaisType: string) {
  return (probleme: { input?: unknown }) =>
    probleme.input === undefined ? obligatoire : mauvaisType;
}

// Message pour une valeur hors liste, qui rappelle les valeurs possibles.
function siValeurInconnue(libelleInconnu: string, valeurs: readonly string[], obligatoire: string) {
  return (probleme: { input?: unknown }) =>
    probleme.input === undefined
      ? obligatoire
      : `${libelleInconnu} : « ${enTexte(probleme.input)} ». Valeurs possibles : ${valeurs.join(", ")}.`;
}

// Écrit la valeur reçue dans un message. Un texte est cité tel quel ; le reste
// (nombre, objet, null…) passe par JSON.stringify, car String({}) donnerait
// « [object Object] ».
function enTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : JSON.stringify(valeur);
}

const schemaCompatibilites = z.strictObject(
  {
    taillesRoue: z
      .array(
        z.enum(TAILLES_ROUE, {
          error: siValeurInconnue("Taille de roue inconnue", TAILLES_ROUE, "Taille de roue manquante."),
        }),
        { error: "Les tailles de roue doivent être une liste." },
      )
      .min(1, { error: "Indiquez au moins une taille de roue, ou retirez ce critère." })
      .optional(),

    typesFrein: z
      .array(
        z.enum(TYPES_FREIN, {
          error: siValeurInconnue("Type de frein inconnu", TYPES_FREIN, "Type de frein manquant."),
        }),
        { error: "Les types de frein doivent être une liste." },
      )
      .min(1, { error: "Indiquez au moins un type de frein, ou retirez ce critère." })
      .optional(),

    vitesses: z
      .array(
        z
          .int({ error: "Chaque nombre de vitesses doit être un nombre entier." })
          .min(1, { error: "Chaque nombre de vitesses doit être supérieur à 0." })
          .max(ENTIER_MAX_POSTGRES, { error: "Nombre de vitesses trop grand." }),
        { error: "Les vitesses doivent être une liste de nombres." },
      )
      .min(1, { error: "Indiquez au moins un nombre de vitesses, ou retirez ce critère." })
      .optional(),
  },
  {
    error: siAbsentOuMauvaisType(
      "Les compatibilités sont obligatoires (un objet vide {} si la pièce va sur tous les vélos).",
      "Les compatibilités doivent être un objet.",
    ),
  },
);

export const schemaPiece = z.strictObject({
  id: z
    .string({
      error: siAbsentOuMauvaisType(
        "L'identifiant est obligatoire.",
        "L'identifiant doit être un texte.",
      ),
    })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      error:
        "L'identifiant ne doit contenir que des minuscules sans accent, des chiffres et des tirets simples, sans tiret au début ni à la fin (ex. chaine-11v).",
    }),

  nom: z
    .string({
      error: siAbsentOuMauvaisType("Le nom est obligatoire.", "Le nom doit être un texte."),
    })
    .trim()
    .min(1, { error: "Le nom ne peut pas être vide." }),

  categorie: z.enum(CATEGORIES, {
    error: siValeurInconnue("Catégorie inconnue", CATEGORIES, "La catégorie est obligatoire."),
  }),

  prixCentimes: z
    .int({
      error: siAbsentOuMauvaisType(
        "Le prix est obligatoire.",
        "Le prix doit être un nombre entier de centimes (ex. 1290 pour 12,90 €).",
      ),
    })
    .min(1, { error: "Le prix doit être supérieur à 0." })
    .max(ENTIER_MAX_POSTGRES, { error: "Le prix est trop grand." }),

  compatibilites: schemaCompatibilites,

  // Aucune contrainte en base : une description vide est acceptée.
  description: z.string({
    error: siAbsentOuMauvaisType(
      "La description est obligatoire (elle peut être vide).",
      "La description doit être un texte.",
    ),
  }),
}) satisfies z.ZodType<Piece>; // TypeScript vérifie que le résultat est bien une Piece

// Vérifie des données reçues et renvoie la pièce validée (nom sans espaces autour).
// Lance une ErreurApi 400 si les données ne conviennent pas.
export function validerPiece(donnees: unknown): Piece {
  return validerAvecZod(
    schemaPiece,
    donnees,
    "Le corps de la requête doit être un objet JSON décrivant une pièce.",
  );
}
