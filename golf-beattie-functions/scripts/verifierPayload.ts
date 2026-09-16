/**
 * verifierPayload.ts — Vérification SANS ENVOI.
 *
 * Calcule le payload réel (construirePayloadPortail) contre Firestore de
 * golf-beattie-d5062 via une clé de service locale, puis valide sa forme
 * avec validateSyncPayload d'aw-portail (import relatif direct — repo
 * voisin sur disque, pas un lien npm). Ce fichier est exclu du build de
 * déploiement (voir tsconfig.json "exclude") : l'import cross-repo ne doit
 * jamais se retrouver dans le code déployé sur Cloud Functions.
 *
 * N'appelle JAMAIS POST /api/sync/analytics, n'écrit rien dans Firestore,
 * ne déploie rien.
 *
 * Usage :
 *   GOOGLE_APPLICATION_CREDENTIALS="C:\Users\alexw\cles\golf-beattie-d5062.json" npx tsx scripts/verifierPayload.ts
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import { construirePayloadPortail } from "../src/core/construirePayloadPortail";
import { validateSyncPayload } from "../../aw-portail/src/lib/validateAnalyticsPayload";

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
  console.log("=== VÉRIFICATION PAYLOAD (sans envoi) — golf-beattie-d5062 ===\n");

  const { payload, avertissements } = await construirePayloadPortail(db);
  const body = { clientId: "golf-beattie", global: payload };
  const { errors } = validateSyncPayload(body);

  console.log(`Avertissements de calcul : ${avertissements.length}`);
  avertissements.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
  if (avertissements.length > 20) console.log(`  … et ${avertissements.length - 20} autres`);

  console.log(`\nErreurs de validation (contrat AnalyticsGlobal, validateSyncPayload d'aw-portail) : ${errors.length}`);
  errors.forEach((e) => console.log(`  - ${e}`));

  if (errors.length === 0) {
    console.log("\n✅ Payload conforme au contrat AnalyticsGlobal. RIEN n'a été envoyé au portail.");
  } else {
    console.log("\n❌ Payload NON conforme au contrat — à corriger avant tout branchement réel.");
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error("Échec de la vérification :", e); process.exit(1); });
