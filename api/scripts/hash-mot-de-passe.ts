// Génère le hash argon2id du mot de passe administrateur, à copier dans le .env.
// Usage : npm run hash-mot-de-passe
//
// Le mot de passe est demandé avec une saisie masquée plutôt que passé en argument,
// pour qu'il n'apparaisse ni à l'écran ni dans l'historique du shell.

import { text } from "node:stream/consumers";
import argon2 from "argon2";

const LONGUEUR_MIN = 12;

// Lit une ligne au clavier sans l'afficher. En « mode brut » (raw mode), le terminal
// transmet chaque touche au programme au lieu de l'afficher lui-même.
function demanderMasque(question: string): Promise<string> {
  return new Promise((resoudre) => {
    const entree = process.stdin;
    process.stdout.write(question);
    entree.setRawMode(true);
    entree.setEncoding("utf8");
    entree.resume();

    let saisie = "";
    const terminer = () => {
      entree.off("data", surTouche);
      entree.setRawMode(false);
      entree.pause();
      process.stdout.write("\n");
    };
    const surTouche = (touches: string) => {
      for (const touche of touches) {
        if (touche === "\r" || touche === "\n") {
          terminer();
          resoudre(saisie);
          return;
        }
        if (touche === "\u0003") {
          // Ctrl+C
          terminer();
          process.exit(130);
        }
        if (touche === "\u007f" || touche === "\b") {
          saisie = saisie.slice(0, -1); // Retour arrière
        } else {
          saisie += touche;
        }
      }
    };
    entree.on("data", surTouche);
  });
}

function arreter(message: string): never {
  console.error(message);
  process.exit(1);
}

let motDePasse: string;
if (process.stdin.isTTY) {
  motDePasse = await demanderMasque("Mot de passe administrateur : ");
  const confirmation = await demanderMasque("Confirmez le mot de passe : ");
  if (confirmation !== motDePasse) {
    arreter("Les deux saisies sont différentes. Aucun hash généré.");
  }
} else {
  // Entrée redirigée (ex. printf '…' | npm run hash-mot-de-passe) : première ligne.
  motDePasse = (await text(process.stdin)).split(/\r?\n/)[0] ?? "";
}

if (motDePasse.length < LONGUEUR_MIN) {
  arreter(`Le mot de passe doit contenir au moins ${LONGUEUR_MIN} caractères. Aucun hash généré.`);
}

// argon2 choisit un sel aléatoire et l'enregistre dans le hash, avec les paramètres.
const hash = await argon2.hash(motDePasse, { type: argon2.argon2id });

console.log("\nLigne à copier dans le fichier .env (apostrophes comprises) :\n");
console.log(`ADMIN_MOT_DE_PASSE_HASH='${hash}'`);
