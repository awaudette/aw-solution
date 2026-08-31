/**
 * copy-templates.js — étape post-tsc du script `build`.
 *
 * tsc ne copie que les fichiers .ts compilés vers lib/ ; les gabarits .html
 * de src/templates/ (lus au runtime via fs, pas importés en TS) doivent être
 * copiés à la main pour se retrouver au même endroit relatif dans lib/,
 * sans quoi la Cloud Function ne les trouve plus une fois déployée.
 *
 * fs.cpSync est natif Node 18+ (le runtime cible ici est Node 20, voir
 * "engines" dans package.json) — aucune dépendance supplémentaire requise.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "src", "templates");
const dest = path.join(__dirname, "..", "lib", "templates");

if (!fs.existsSync(src)) {
  console.log(`[copy-templates] Rien à copier : ${src} n'existe pas.`);
  process.exit(0);
}

fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-templates] Gabarits copiés : ${src} -> ${dest}`);
