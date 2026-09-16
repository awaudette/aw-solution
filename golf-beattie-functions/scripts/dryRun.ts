/**
 * dryRun.ts — CALCUL À BLANC.
 *
 * Exécute calculerAnalytics() en local contre le vrai Firestore de
 * golf-beattie-d5062, avec une clé de service fournie hors du repo via
 * GOOGLE_APPLICATION_CREDENTIALS. N'écrit RIEN dans Firestore, n'appelle
 * JAMAIS POST /api/sync/analytics (aw-portail), ne déploie rien.
 *
 * Usage (PowerShell) :
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\alexw\cles\golf-beattie-d5062.json"
 *   npm run dry-run
 *
 * Usage (bash) :
 *   GOOGLE_APPLICATION_CREDENTIALS="/c/Users/alexw/cles/golf-beattie-d5062.json" npm run dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import { calculerAnalytics } from "../src/core/calculerAnalytics";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS manquant — pointez-le vers la clé locale, jamais versionnée dans ce repo.");
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
if (serviceAccount.project_id !== "golf-beattie-d5062") {
  console.error(`Clé pour le projet "${serviceAccount.project_id}", attendu "golf-beattie-d5062" — arrêt par sécurité.`);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();

async function main() {
  console.log("=== CALCUL À BLANC — golf-beattie-d5062 ===");
  console.log("Lecture seule : aucune écriture Firestore, aucun appel au portail, aucun déploiement.\n");

  const t0 = Date.now();
  const resultat = await calculerAnalytics(db);
  const dureeMs = Date.now() - t0;

  console.log(JSON.stringify(resultat, null, 2));
  console.log(`\n⏱ Durée du calcul complet (lecture Firestore + agrégation) : ${dureeMs} ms`);

  if (resultat.avertissements.length > 0) {
    console.log(`\n⚠ ${resultat.avertissements.length} avertissement(s) — documents ignorés (champ manquant) :`);
    resultat.avertissements.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
    if (resultat.avertissements.length > 20) console.log(`  … et ${resultat.avertissements.length - 20} autres`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Échec du calcul à blanc :", e); process.exit(1); });
