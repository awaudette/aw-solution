/**
 * envoiManuel.ts — Prévu pour le premier envoi manuel (calcul + POST au
 * portail, une seule fois), MAIS l'envoi réel N'EST PAS implémenté — voir
 * src/index.ts et README.md pour la raison (contrat AnalyticsGlobal
 * incomplet pour un client mono-site comme le golf). Ce script fait
 * uniquement le calcul et l'affiche ; il n'écrit rien dans Firestore et
 * n'appelle jamais le portail.
 *
 * Le jeton est lu depuis une variable d'environnement (PORTAIL_SYNC_TOKEN),
 * jamais écrit dans ce fichier — il n'est pour l'instant pas utilisé tant
 * que l'envoi n'est pas branché, mais sa présence est déjà exigée pour ne
 * pas avoir à retoucher l'usage du script plus tard.
 *
 * Usage (bash) :
 *   GOOGLE_APPLICATION_CREDENTIALS="/c/Users/alexw/cles/golf-beattie-d5062.json" \
 *   PORTAIL_SYNC_TOKEN="..." \
 *   npx tsx scripts/envoiManuel.ts
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

const token = process.env.PORTAIL_SYNC_TOKEN;
if (!token) {
  console.error("PORTAIL_SYNC_TOKEN manquant — requis pour le premier envoi réel (pas encore implémenté, voir README.md). Arrêt.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();

async function main() {
  console.log("=== ENVOI MANUEL — golf-beattie-d5062 ===");
  console.log("Calcul uniquement : l'envoi réel au portail n'est PAS implémenté (voir README.md).\n");

  const resultat = await calculerAnalytics(db);
  console.log(JSON.stringify(resultat, null, 2));

  console.warn("\n⚠ Rien n'a été envoyé à https://portail.awsolution.ca/api/sync/analytics — le mapping vers le contrat AnalyticsGlobal n'est pas encore fait (voir src/index.ts, section portailSyncJob).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Échec du calcul :", e); process.exit(1); });
