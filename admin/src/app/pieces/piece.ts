// Modèle repris de La Draise-K (draise-k/types/piece.ts), identique à celui de l'API
// (api/src/pieces/piece.ts). C'est la forme du JSON renvoyé par GET /api/pieces.

export type Categorie =
  | 'freinage'
  | 'transmission'
  | 'pneus-chambres'
  | 'eclairage'
  | 'accessoires';

export type TailleRoue = '20' | '24' | '26' | '27.5' | '29' | '700c';

export type TypeFrein =
  | 'v-brake'
  | 'etrier' // frein à patins des vélos de route
  | 'disque-mecanique'
  | 'disque-hydraulique';

// Un critère absent signifie que la pièce n'en dépend pas.
export interface Compatibilites {
  taillesRoue?: TailleRoue[];
  typesFrein?: TypeFrein[];
  vitesses?: number[];
}

export interface Piece {
  id: string; // slug, utilisable dans les URL
  nom: string;
  categorie: Categorie;
  prixCentimes: number; // entier, en centimes d'euro TTC (ex. 1290 pour 12,90 €)
  compatibilites: Compatibilites;
  description: string;
}

// Libellés affichés, repris de La Draise-K (draise-k/lib/pieces.ts).
// Record<Categorie, string> oblige à donner un libellé à chaque catégorie, ni plus ni moins.
export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  freinage: 'Freinage',
  transmission: 'Transmission',
  'pneus-chambres': 'Pneus et chambres à air',
  eclairage: 'Éclairage',
  accessoires: 'Accessoires',
};

// Toutes les catégories, dans l'ordre des libellés ci-dessus.
export const CATEGORIES = Object.keys(LIBELLES_CATEGORIES) as Categorie[];

// Reprise de La Draise-K (draise-k/lib/pieces.ts).
// « valeur is Categorie » : si la fonction renvoie true, TypeScript traite ensuite valeur
// comme une Categorie, et non plus comme une simple chaîne.
export function estCategorie(valeur: unknown): valeur is Categorie {
  return typeof valeur === 'string' && Object.hasOwn(LIBELLES_CATEGORIES, valeur);
}
