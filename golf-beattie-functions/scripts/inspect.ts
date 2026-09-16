/**
 * inspect.ts — outil jetable, PAS un livrable.
 * Lit un échantillon de chaque collection brute pour confirmer les noms de
 * champs réels avant d'écrire le calcul. Lecture seule (get), aucune écriture.
 *
 * Exécution : GOOGLE_APPLICATION_CREDENTIALS=<chemin clé> npx tsx scripts/inspect.ts
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS manquant");
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();

async function dump(collectionPath: string, n = 3) {
  console.log(`\n=== ${collectionPath} ===`);
  const snap = await db.collection(collectionPath).limit(n).get();
  console.log(`count (échantillon) = ${snap.size}`);
  snap.docs.forEach((d) => {
    console.log(`-- doc ${d.id}`);
    console.log(JSON.stringify(d.data(), null, 2));
  });
}

async function main() {
  for (const col of ["factures", "utilisateurs", "Tirage", "Recompenses_reclamees"]) {
    try {
      await dump(col);
    } catch (e) {
      console.error(`Échec lecture ${col}:`, e);
    }
  }

  // Compte approximatif via agrégation count() (peu coûteux, pas de lecture de documents)
  for (const col of ["factures", "utilisateurs", "Tirage", "Recompenses_reclamees"]) {
    try {
      const agg = await db.collection(col).count().get();
      console.log(`\n[count()] ${col} = ${agg.data().count}`);
    } catch (e) {
      console.error(`Échec count() ${col}:`, e);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
