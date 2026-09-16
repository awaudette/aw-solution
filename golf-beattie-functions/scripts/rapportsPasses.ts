/**
 * rapportsPasses.ts — Génère et envoie le rapport comptable d'un ou plusieurs
 * MOIS PASSÉS au portail, via POST /api/sync/analytics avec le champ
 * `moisRapport` (voir aw-portail/src/app/api/sync/analytics/route.ts) : le
 * portail saute alors les écritures analytics/global et
 * analytics/{franchiseId} et n'écrit QUE
 * clients/golf-beattie/rapports/comptable-{moisRapport} — les chiffres
 * courants (dashboard, portailSyncJob de la nuit) ne sont jamais touchés.
 *
 * Calcul : même logique que le rapport du dernier mois clos
 * (construirePayloadPortail.ts / construireComptabilite) — factures et
 * réclamations du mois, répartition points factures/bonus, solde début/fin
 * de mois (snapshot réel, pas le solde actuel), promotions dont la date de
 * début tombe dans le mois. Une seule lecture Firestore (chargerDonneesBrutes)
 * réutilisée pour tous les mois demandés.
 *
 * `--a-blanc` : affiche les chiffres de chaque mois et s'arrête — n'appelle
 * JAMAIS le portail, n'exige pas PORTAIL_SYNC_TOKEN.
 *
 * Usage (bash) :
 *   GOOGLE_APPLICATION_CREDENTIALS="/c/Users/alexw/cles/golf-beattie-d5062.json" \
 *   npx tsx scripts/rapportsPasses.ts 2026-05 2026-06 2026-07 --a-blanc
 *
 *   GOOGLE_APPLICATION_CREDENTIALS="/c/Users/alexw/cles/golf-beattie-d5062.json" \
 *   PORTAIL_SYNC_TOKEN="..." \
 *   npx tsx scripts/rapportsPasses.ts 2026-05 2026-06 2026-07
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import { chargerDonneesBrutes, calculerDepuisBruts, moisKey, moisPrecedent } from "../src/core/calculerAnalytics";
import { construirePayloadPortail, construireComptabilite, type PayloadAnalyticsGlobal } from "../src/core/construirePayloadPortail";
import { torontoDateString } from "../src/core/dateToronto";

const PORTAIL_SYNC_URL = "https://portail.awsolution.ca/api/sync/analytics";
const CLIENT_ID = "golf-beattie";

// ── Arguments ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const aBlanc = argv.includes("--a-blanc");
const moisCibles = argv.filter((a) => a !== "--a-blanc");

if (moisCibles.length === 0) {
  console.error("Usage : npx tsx scripts/rapportsPasses.ts AAAA-MM [AAAA-MM ...] [--a-blanc]");
  process.exit(1);
}
for (const m of moisCibles) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
    console.error(`Mois invalide "${m}" — format attendu AAAA-MM.`);
    process.exit(1);
  }
}

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

let token: string | undefined;
if (!aBlanc) {
  token = process.env.PORTAIL_SYNC_TOKEN;
  if (!token) {
    console.error("PORTAIL_SYNC_TOKEN manquant — requis hors --a-blanc.");
    process.exit(1);
  }
}

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();

async function main() {
  console.log(`=== RAPPORTS PASSÉS — golf-beattie-d5062 — ${aBlanc ? "À BLANC (rien envoyé)" : "ENVOI RÉEL"} ===\n`);

  const maintenant = new Date();
  const moisActuel = moisKey(torontoDateString(maintenant));
  for (const m of moisCibles) {
    if (m >= moisActuel) {
      console.error(`Mois "${m}" >= mois en cours (${moisActuel}) — le portail le refuserait (400). Arrêt, rien envoyé.`);
      process.exit(1);
    }
  }

  // Une seule lecture Firestore, réutilisée pour l'enveloppe (7j/30j/90j/aVie —
  // identiques quel que soit le mois demandé, non affectés par moisRapport côté
  // portail) et pour le calcul de comptabilite de chaque mois cible.
  const { payload: enveloppe } = await construirePayloadPortail(db);
  const bruts = await chargerDonneesBrutes(db);
  const resultat = calculerDepuisBruts(bruts, maintenant);

  let toutOk = true;
  let soldeFinPrecedent: { mois: string; valeur: number } | null = null;

  for (const moisCible of moisCibles) {
    const { comptabilite, avertissements } = construireComptabilite(bruts, resultat, moisCible);
    const soldeDebut = construireComptabilite(bruts, resultat, moisPrecedent(moisCible)).comptabilite.snapshotFinMois.pointsEnCirculation;
    const soldeFin = comptabilite.snapshotFinMois.pointsEnCirculation;

    console.log(`── ${moisCible} ──────────────────────────────`);
    console.log(`  Revenus              : ${comptabilite.synthese.revenus.toFixed(2)} $`);
    console.log(`  Factures             : ${comptabilite.facturesDetail.length}`);
    console.log(`  Points factures      : ${comptabilite.synthese.pointsDistribuesFactures}`);
    console.log(`  Points bonus         : ${comptabilite.synthese.pointsDistribuesBonus}`);
    console.log(`  Points utilisés      : ${comptabilite.synthese.pointsRachetes}`);
    console.log(`  Solde début de mois  : ${soldeDebut}`);
    console.log(`  Solde fin de mois    : ${soldeFin}`);
    console.log(`  Promotions du mois   : ${comptabilite.promotions.length}`);
    if (avertissements.length > 0) {
      console.log(`  ⚠ ${avertissements.length} avertissement(s) :`);
      avertissements.forEach((w) => console.log(`    - ${w}`));
    }

    if (soldeFinPrecedent) {
      const continuite = soldeFinPrecedent.valeur === soldeDebut;
      console.log(`  Continuité vs solde fin ${soldeFinPrecedent.mois} (${soldeFinPrecedent.valeur}) : ${continuite ? "✅ OK" : "❌ MISMATCH"}`);
      if (!continuite) toutOk = false;
    }
    soldeFinPrecedent = { mois: moisCible, valeur: soldeFin };
    console.log("");

    if (!aBlanc) {
      const payload: PayloadAnalyticsGlobal = { ...enveloppe, comptabilite };
      const reponse = await fetch(PORTAIL_SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId: CLIENT_ID, global: payload, moisRapport: moisCible }),
      });
      if (!reponse.ok) {
        const details = await reponse.json().catch(() => reponse.text().catch(() => null));
        console.error(`  ❌ Envoi ${moisCible} refusé (${reponse.status}) :`, details);
        toutOk = false;
        continue;
      }
      const resultatPortail = await reponse.json().catch(() => null);
      console.log(`  ✅ Envoyé — ${JSON.stringify(resultatPortail)}`);
    }
  }

  if (aBlanc) {
    console.log("⚠ Mode --a-blanc : RIEN n'a été envoyé au portail.");
  }
  if (!toutOk) process.exitCode = 1;
}

main().catch((e) => { console.error("Échec :", e); process.exit(1); });
