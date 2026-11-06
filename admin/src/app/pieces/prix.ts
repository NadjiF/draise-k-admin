// Conversion entre le prix saisi en euros (texte) et le prix en centimes (entier) de l'API.
//
// On ne passe jamais par un nombre décimal : en JavaScript, 19.99 * 100 donne
// 1998.9999999999998, car 19,99 ne s'écrit pas exactement en binaire. On découpe donc
// le texte en euros et en centimes, deux nombres entiers, que l'on additionne.

// Plus grand prix accepté par l'API (colonne integer de PostgreSQL), en centimes.
export const PRIX_MAX_CENTIMES = 2_147_483_647;

// Des chiffres (les euros), puis éventuellement une virgule ou un point et 1 ou 2 chiffres.
// Les parenthèses capturent les deux morceaux : 12,9 → "12" et "9".
const FORMAT_EUROS = /^(\d+)(?:[,.](\d{1,2}))?$/;

// "12,90" → 1290, "12,9" → 1290, "12" → 1200, "0,05" → 5, "12.90" → 1290.
// Renvoie null si le texte n'est pas un prix bien écrit ("", "abc", "12,905", "-3").
// Ne vérifie pas les limites (0, trop grand) : c'est le rôle du validateur du formulaire,
// qui peut ainsi afficher un message précis.
export function eurosVersCentimes(saisie: string): number | null {
  const morceaux = FORMAT_EUROS.exec(saisie.trim());
  if (morceaux === null) return null;

  const [, euros, centimes = ''] = morceaux;
  // padEnd complète à droite : "9" → "90" (9 dixièmes = 90 centimes), "" → "00".
  return Number(euros) * 100 + Number(centimes.padEnd(2, '0'));
}

// 1290 → "12,90", 5 → "0,05", 1200 → "12,00". Pour remplir le champ en modification.
// Uniquement des opérations sur des entiers : le reste (%) donne les centimes,
// et la soustraction rend la division par 100 exacte.
export function centimesVersEuros(prixCentimes: number): string {
  const centimes = prixCentimes % 100;
  const euros = (prixCentimes - centimes) / 100;
  return `${euros},${String(centimes).padStart(2, '0')}`;
}
