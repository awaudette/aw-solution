import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charger .env.local manuellement
const envPath = resolve(__dirname, "../.env.local");
const env = readFileSync(envPath, "utf-8");
env.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ?.replace(/\\n/g, "\n")
      .replace(/^"|"$/g, ""),
  }),
});

const db = getFirestore();
const auth = getAuth();

const MOT_DE_PASSE_TEMPORAIRE = "Poke2026!TR";

// ── 1. Créer l'utilisateur Firebase Auth ──────────────────────────────────────
let uid;
try {
  const existing = await auth.getUserByEmail("catherinehlie@yahoo.ca");
  uid = existing.uid;
  console.log(`✓ Utilisateur existant trouvé — UID : ${uid}`);
} catch {
  const user = await auth.createUser({
    email: "catherinehlie@yahoo.ca",
    password: MOT_DE_PASSE_TEMPORAIRE,
    displayName: "Catherine Hélie",
  });
  uid = user.uid;
  console.log(`✓ Utilisateur Firebase Auth créé — UID : ${uid}`);
}

// ── 2. Document /clients/poke-station-tr ──────────────────────────────────────
const clientRef = db.collection("clients").doc("poke-station-tr");
await clientRef.set({
  nom: "Poké Station",
  restaurant: "Poké Station Trois-Rivières",
  contact: "Catherine Hélie",
  courriel: "catherinehlie@yahoo.ca",
  telephone: "(819) 690-9997",
  telephoneSuccursale: "(819) 370-3999",
  forfait: "Prestige",
  montantMensuel: 0,
  succursales: 1,
  dateDebut: Timestamp.fromDate(new Date("2026-05-01")),
  dateRenouvellement: null,
  dateLancement: Timestamp.fromDate(new Date("2026-05-01")),
  dateEstimeLancement: null,
  etapePipeline: "Actif",
  statutApp: "termine",
  statut: "actif",
  statutFacture: "payé",
  prochaineAction: "",
  annoncesAWSolution: "",
  onboardingPct: 100,
  derniereConnexion: Timestamp.now(),
});
console.log("✓ Document /clients/poke-station-tr créé");

// ── 3. Sous-collection /clients/poke-station-tr/onboarding ───────────────────
const etapes = [
  "Signature du contrat",
  "Formulaire d'informations & branding",
  "Fichiers branding déposés",
  "Design de l'app approuvé",
  "Développement complété",
  "Tests & corrections",
  "Soumission App Store & Google Play",
  "Lancement 🎉",
];

const batch = db.batch();
etapes.forEach((nom, i) => {
  const ref = clientRef.collection("onboarding").doc(`etape-${i + 1}`);
  batch.set(ref, { ordre: i + 1, nom, statut: "complete" });
});
await batch.commit();
console.log("✓ 8 étapes onboarding créées (toutes : complete)");

// ── 4. Document /users/{uid} ──────────────────────────────────────────────────
await db.collection("users").doc(uid).set({
  role: "client",
  clientId: "poke-station-tr",
  nom: "Catherine Hélie",
  courriel: "catherinehlie@yahoo.ca",
});
console.log(`✓ Document /users/${uid} créé (role: client, clientId: poke-station-tr)`);

console.log("\n────────────────────────────────────────");
console.log(`  Email     : catherinehlie@yahoo.ca`);
console.log(`  Mot de passe temporaire : ${MOT_DE_PASSE_TEMPORAIRE}`);
console.log(`  UID       : ${uid}`);
console.log("────────────────────────────────────────\n");

process.exit(0);
