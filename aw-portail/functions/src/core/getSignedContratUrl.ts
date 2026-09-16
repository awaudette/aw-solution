/**
 * getSignedContratUrl — callable v2, région northamerica-northeast1.
 *
 * Remis dans le dépôt le 2026-09-15 (voir generateContrat.ts) — conversion
 * TypeScript directe, comportement inchangé.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const BUCKET_NAME = "aw-portail.firebasestorage.app";

export const getSignedContratUrl = onCall(
  { region: "northamerica-northeast1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentification requise.");

    const clientId = request.data?.clientId as string | undefined;
    if (!clientId) throw new HttpsError("invalid-argument", "clientId manquant.");

    const db = getFirestore();
    const storage = getStorage();

    const snap = await db.collection("clients").doc(clientId).get();
    if (!snap.exists) throw new HttpsError("not-found", `Client ${clientId} introuvable.`);

    const contrat = snap.data()?.contrat as { urlHTML?: string } | undefined;
    if (!contrat?.urlHTML) throw new HttpsError("not-found", "Aucun contrat généré pour ce client.");

    // Extraire le chemin du fichier depuis l'URL stockée
    const url   = contrat.urlHTML;
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) throw new HttpsError("internal", "URL contrat invalide.");

    const filePath = decodeURIComponent(match[1]);
    const bucket   = storage.bucket(BUCKET_NAME);
    const file     = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      action:  "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 heure
    });

    return { signedUrl };
  },
);
