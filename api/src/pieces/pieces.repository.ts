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

// Colonnes lues ou renvoyées par chaque requête (SELECT et RETURNING)
const COLONNES = `id, nom, categorie, prix_centimes, description,
                  tailles_roue, types_frein, vitesses`;

// Code d'erreur PostgreSQL « unique_violation » : la clé primaire existe déjà.
const CODE_DOUBLON = "23505";

// Valeurs des paramètres $1 à $8, dans l'ordre des colonnes ci-dessus.
// Conversion inverse de versPiece : critère absent = NULL.
// pg transforme lui-même les tableaux JavaScript en tableaux PostgreSQL.
function versParametres(piece: Piece): unknown[] {
  return [
    piece.id,
    piece.nom,
    piece.categorie,
    piece.prixCentimes,
    piece.description,
    piece.compatibilites.taillesRoue ?? null,
    piece.compatibilites.typesFrein ?? null,
    piece.compatibilites.vitesses ?? null,
  ];
}

export async function listerPieces(): Promise<Piece[]> {
  const resultat = await pool.query<LignePiece>(`
    SELECT ${COLONNES}
    FROM pieces
    ORDER BY categorie, nom
  `);
  return resultat.rows.map(versPiece);
}

// Renvoie la pièce, ou null si aucune pièce n'a cet identifiant.
export async function trouverPiece(id: string): Promise<Piece | null> {
  // $1 est un paramètre : pg envoie la valeur séparément du SQL,
  // ce qui empêche toute injection SQL.
  const resultat = await pool.query<LignePiece>(
    `SELECT ${COLONNES} FROM pieces WHERE id = $1`,
    [id],
  );
  const ligne = resultat.rows[0];
  return ligne === undefined ? null : versPiece(ligne);
}

// Ajoute la pièce et la renvoie, ou renvoie null si l'identifiant est déjà pris.
export async function creerPiece(piece: Piece): Promise<Piece | null> {
  try {
    const resultat = await pool.query<LignePiece>(
      `INSERT INTO pieces (${COLONNES})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLONNES}`,
      versParametres(piece),
    );
    return versPiece(resultat.rows[0]!); // INSERT … RETURNING renvoie toujours une ligne
  } catch (erreur) {
    // On tente l'INSERT directement plutôt que de vérifier avant avec un SELECT :
    // deux créations simultanées du même id ne peuvent pas passer toutes les deux.
    if ((erreur as { code?: string }).code === CODE_DOUBLON) {
      return null;
    }
    throw erreur;
  }
}

// Remplace tous les champs de la pièce (sauf l'id) et la renvoie,
// ou renvoie null si aucune pièce n'a cet identifiant.
export async function remplacerPiece(piece: Piece): Promise<Piece | null> {
  const resultat = await pool.query<LignePiece>(
    `UPDATE pieces
     SET nom = $2, categorie = $3, prix_centimes = $4, description = $5,
         tailles_roue = $6, types_frein = $7, vitesses = $8
     WHERE id = $1
     RETURNING ${COLONNES}`,
    versParametres(piece),
  );
  const ligne = resultat.rows[0];
  return ligne === undefined ? null : versPiece(ligne);
}

// Supprime la pièce. Renvoie false si aucune pièce n'avait cet identifiant.
export async function supprimerPiece(id: string): Promise<boolean> {
  const resultat = await pool.query("DELETE FROM pieces WHERE id = $1", [id]);
  return resultat.rowCount === 1;
}
