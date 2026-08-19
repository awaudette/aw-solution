import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, "../.env.local");
const env = readFileSync(envPath, "utf-8");
env.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ?.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
  }),
});

const db   = getFirestore();
const auth = getAuth();

const MOT_DE_PASSE = "Golf2026!Beattie";

// ── 1. Firebase Auth ──────────────────────────────────────────────────────────
let uid;
try {
  const existing = await auth.getUserByEmail("admin@golflasarre.com");
  uid = existing.uid;
  console.log(`✓ Utilisateur existant trouvé — UID : ${uid}`);
} catch {
  const user = await auth.createUser({
    email:       "admin@golflasarre.com",
    password:    MOT_DE_PASSE,
    displayName: "Francis Gosselin",
  });
  uid = user.uid;
  console.log(`✓ Utilisateur Firebase Auth créé — UID : ${uid}`);
}

// ── 2. Document /clients/golf-beattie ────────────────────────────────────────
const clientRef = db.collection("clients").doc("golf-beattie");
await clientRef.set({
  nom:                 "Club de Golf Beattie",
  restaurant:          "Club de Golf Beattie",
  contact:             "Francis Gosselin",
  courriel:            "admin@golflasarre.com",
  telephone:           "(819) 443-1973",
  telephoneSuccursale: "(819) 333-9944",
  forfait:             "Essentiel",
  montantMensuel:      0,
  succursales:         1,
  dateDebut:           Timestamp.fromDate(new Date("2025-12-08")),
  dateRenouvellement:  null,
  etapePipeline:       "Actif",
  statutApp:           "en_cours",
  statut:              "actif",
  dateEstimeLancement: Timestamp.fromDate(new Date("2026-10-01")),
  dateLancement:       Timestamp.fromDate(new Date("2025-12-08")),
  prochainerAction:    "Planifier les nouvelles fonctionnalités à ajouter",
  annoncesAWSolution:  "",
  couleur_primaire:    "#01a651",
  couleur_secondaire:  "#017a3d",
  logo_url:            "",
  onboardingPct:       75,
  statutFacture:       "payé",
  derniereConnexion:   Timestamp.now(),
});
console.log("✓ Document /clients/golf-beattie créé");

// ── 3. Sous-collection onboarding ─────────────────────────────────────────────
const etapes = [
  { ordre: 1, nom: "Signature du contrat",                       statut: "complete" },
  { ordre: 2, nom: "Formulaire d'informations & branding",       statut: "complete" },
  { ordre: 3, nom: "Fichiers branding déposés",                  statut: "complete" },
  { ordre: 4, nom: "Design de l'app approuvé",                   statut: "complete" },
  { ordre: 5, nom: "Développement complété",                     statut: "complete" },
  { ordre: 6, nom: "Tests & corrections",                        statut: "complete" },
  { ordre: 7, nom: "Mise à jour — nouvelles fonctionnalités",   statut: "en cours"  },
  { ordre: 8, nom: "Lancement mise à jour 🎉",                   statut: "à faire"  },
];

const batch = db.batch();
etapes.forEach((e) => {
  const ref = clientRef.collection("onboarding").doc(`etape-${e.ordre}`);
  batch.set(ref, e);
});
await batch.commit();
console.log("✓ 8 étapes onboarding créées");

// ── 4. Document /users/{uid} ──────────────────────────────────────────────────
await db.collection("users").doc(uid).set({
  role:     "client",
  clientId: "golf-beattie",
  nom:      "Francis Gosselin",
  courriel: "admin@golflasarre.com",
});
console.log(`✓ Document /users/${uid} créé (role: client, clientId: golf-beattie)`);

console.log("\n────────────────────────────────────────");
console.log(`  Email              : admin@golflasarre.com`);
console.log(`  Mot de passe temp  : ${MOT_DE_PASSE}`);
console.log(`  UID                : ${uid}`);
console.log(`  onboardingPct      : 75% (6/8 étapes complètes)`);
console.log("────────────────────────────────────────\n");

process.exit(0);
