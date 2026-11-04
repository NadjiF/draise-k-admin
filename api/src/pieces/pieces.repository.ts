// Accès à la table pieces : requêtes SQL et conversion vers le modèle Piece.

import { pool } from "../db.ts";
import type {
  Categorie,
  Compatibilites,
  Piece,
  TailleRoue,
  TypeFrein,
} from "./piece.ts";

// Une ligne telle que PostgreSQL la renvoie (noms en snake_case, NULL possibles).
interface LignePiece {
  id: string;
  nom: string;
  categorie: Categorie;
  prix_centimes: number;
  description: string;
  tailles_roue: TailleRoue[] | null;
  types_frein: TypeFrein[] | null;
  vitesses: number[] | null;
}

// Convertit une ligne de la table au format de La Draise-K :
// noms en camelCase, et critère NULL = critère absent de compatibilites.
function versPiece(ligne: LignePiece): Piece {
  const compatibilites: Compatibilites = {};
  if (ligne.tailles_roue !== null) {
    compatibilites.taillesRoue = ligne.tailles_roue;
  }
  if (ligne.types_frein !== null) {
    compatibilites.typesFrein = ligne.types_frein;
  }
  if (ligne.vitesses !== null) {
    compatibilites.vitesses = ligne.vitesses;
  }

  return {
    id: ligne.id,
    nom: ligne.nom,
    categorie: ligne.categorie,
    prixCentimes: ligne.prix_centimes,
    compatibilites,
    description: ligne.description,
  };
}

export async function listerPieces(): Promise<Piece[]> {
  const resultat = await pool.query<LignePiece>(`
    SELECT id, nom, categorie, prix_centimes, description,
           tailles_roue, types_frein, vitesses
    FROM pieces
    ORDER BY categorie, nom
  `);
  return resultat.rows.map(versPiece);
}
