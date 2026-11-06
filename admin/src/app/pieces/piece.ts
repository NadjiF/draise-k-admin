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

// Libellés repris de La Draise-K (draise-k/lib/criteres.ts).
export const LIBELLES_TAILLES_ROUE: Record<TailleRoue, string> = {
  '20': '20 pouces',
  '24': '24 pouces',
  '26': '26 pouces',
  '27.5': '27,5 pouces',
  '29': '29 pouces',
  '700c': '700c (route)',
};

// Ordre écrit à la main : Object.keys placerait les clés qui ressemblent à des entiers
// ("20", "24", "26", "29") avant les autres, d'où 20, 24, 26, 29, 27.5, 700c.
export const TAILLES_ROUE: readonly TailleRoue[] = ['20', '24', '26', '27.5', '29', '700c'];

export const LIBELLES_TYPES_FREIN: Record<TypeFrein, string> = {
  'v-brake': 'V-Brake',
  etrier: 'Étrier',
  'disque-mecanique': 'Disque mécanique',
  'disque-hydraulique': 'Disque hydraulique',
};

// Aucune clé ne ressemble à un entier : l'ordre des libellés ci-dessus est conservé.
export const TYPES_FREIN = Object.keys(LIBELLES_TYPES_FREIN) as TypeFrein[];

// Nombres de vitesses proposés dans le formulaire : de 1 (vélo sans dérailleur)
// à 13 (transmissions 13 vitesses, comme la Campagnolo Ekar).
// L'API accepte tout entier supérieur à 0 : l'interface est volontairement plus limitée.
export const VITESSES: readonly number[] = Array.from({ length: 13 }, (_, i) => i + 1);

// Reprise de La Draise-K (draise-k/lib/pieces.ts).
// « valeur is Categorie » : si la fonction renvoie true, TypeScript traite ensuite valeur
// comme une Categorie, et non plus comme une simple chaîne.
export function estCategorie(valeur: unknown): valeur is Categorie {
  return typeof valeur === 'string' && Object.hasOwn(LIBELLES_CATEGORIES, valeur);
}
