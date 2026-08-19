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

await getFirestore().collection("clients").doc("golf-beattie").update({
  logo_url: "https://firebasestorage.googleapis.com/v0/b/aw-portail.firebasestorage.app/o/logos%2FGolf_Beattie.png?alt=media&token=5b7ff31d-d01f-45d1-90b6-74af9d87c67d",
});

console.log("✓ logo_url mis à jour pour golf-beattie");
process.exit(0);
