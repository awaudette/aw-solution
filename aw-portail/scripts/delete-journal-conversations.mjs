/**
 * delete-journal-conversations.mjs
 *
 * Supprime toutes les sous-collections clients/{clientId}/journal/{entryId}/conversation
 * chez tous les clients — la fonctionnalité "Conversation" du journal a été
 * retirée (voir AdminJournalManager.tsx / ClientJournalFeed.tsx) ; ce script
 * nettoie les documents devenus orphelins.
 *
 * NE PAS EXÉCUTER SANS CONFIRMATION D'ALEX — ce script écrit (supprime) dans
 * Firebase. Vérifier d'abord avec --dry-run.
 *
 * Usage :
 *   node scripts/delete-journal-conversations.mjs --dry-run   (liste sans supprimer)
 *   node scripts/delete-journal-conversations.mjs             (supprime pour de vrai)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
env.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
  }),
});

const db = getFirestore();
const dryRun = process.argv.includes("--dry-run");

async function deleteCollection(colRef) {
  const snap = await colRef.get();
  if (snap.empty) return 0;
  if (!dryRun) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

async function main() {
  const clientsSnap = await db.collection("clients").get();
  let totalConversations = 0;
  let totalMessages = 0;

  for (const clientDoc of clientsSnap.docs) {
    const journalSnap = await db.collection("clients").doc(clientDoc.id).collection("journal").get();
    for (const entryDoc of journalSnap.docs) {
      const convRef = entryDoc.ref.collection("conversation");
      const count = await deleteCollection(convRef);
      if (count > 0) {
        totalConversations++;
        totalMessages += count;
        console.log(`${dryRun ? "[dry-run] " : ""}${clientDoc.id}/journal/${entryDoc.id}/conversation — ${count} message(s)`);
      }
    }
  }

  console.log(
    `\n${dryRun ? "[dry-run] " : ""}Terminé — ${totalConversations} sous-collection(s) conversation, ${totalMessages} message(s) au total.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
