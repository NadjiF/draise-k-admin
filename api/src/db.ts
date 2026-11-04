import pg from "pg";
import { config } from "./config.ts";

// Un pool garde quelques connexions ouvertes et les prête à chaque requête,
// au lieu d'ouvrir une nouvelle connexion à chaque fois.
export const pool = new pg.Pool(config.db);
