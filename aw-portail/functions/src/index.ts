import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { genererRapportPdf } from "./core/genererRapportPdf";

// Aucun argument requis : une Cloud Function déployée dans le projet aw-portail
// obtient automatiquement des Application Default Credentials scopées à ce même
// projet (Firestore + Storage) — pas de service account à fournir ici, contrairement
// aux routes API Next.js/Vercel qui, elles, n'ont pas de credentials GCP natifs.
initializeApp();

// Puppeteer + @sparticuz/chromium dépassent largement les limites par
// défaut (256 MiB / 60 s) — appliqué aux deux points d'entrée qui appellent
// genererRapportPdf. Voir functions/src/templates/rapportMensuel.README.md,
// section "Génération — architecture réelle".
const OPTIONS_GENERATION_PDF = { memory: "1GiB" as const, timeoutSeconds: 120 };

/**
 * Déclenché à la création de clients/{clientId}/rapports/{rapportId}
 * (écrit par POST /api/sync/analytics, voir src/app/api/sync/analytics/route.ts).
 *
 * Génère pour les deux types de documents créés par la sync nocturne : le
 * rapport global (comptable-{moisRef}) et chaque rapport par franchise
 * (comptable-{moisRef}-{franchiseId}) — le sélecteur "Toutes les franchises"
 * du portail a lui aussi besoin d'un PDF.
 *
 * Seul le type "comptable" est géré pour l'instant (types "performance" et
 * "annuel" pas encore branchés sur un gabarit).
 */
export const genererRapportPdfTrigger = onDocumentCreated(
  { document: "clients/{clientId}/rapports/{rapportId}", ...OPTIONS_GENERATION_PDF },
  async (event) => {
    const { clientId, rapportId } = event.params;
    const donnees = event.data?.data();
    if (!donnees || donnees.type !== "comptable") {
      logger.info(`[genererRapportPdfTrigger] Ignoré (type=${donnees?.type}) : clients/${clientId}/rapports/${rapportId}`);
      return;
    }
    try {
      await genererRapportPdf(clientId, rapportId);
    } catch (err) {
      logger.error(`[genererRapportPdfTrigger] Échec clients/${clientId}/rapports/${rapportId}`, err);
      throw err;
    }
  },
);

/**
 * Régénération manuelle — admin-only (users/{uid}.role === "admin", même
 * pattern que le reste de l'admin du portail, ex. src/app/api/admin/sync-token/route.ts).
 * Utile pour tester sans attendre une vraie clôture de mois, ou pour
 * régénérer un rapport après une correction de données.
 *
 * Déclenchement (après déploiement) :
 *   firebase functions:shell
 *   regenererRapportPdf({ clientId: "poke-station-tr", rapportId: "comptable-2026-07-trois-rivieres" })
 */
export const regenererRapportPdf = onCall(OPTIONS_GENERATION_PDF, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentification requise.");
  }
  const userSnap = await getFirestore().collection("users").doc(request.auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Réservé aux administrateurs AW Solution.");
  }

  const clientId = request.data?.clientId;
  const rapportId = request.data?.rapportId;
  if (typeof clientId !== "string" || typeof rapportId !== "string") {
    throw new HttpsError("invalid-argument", "clientId et rapportId (chaînes) requis.");
  }

  try {
    return await genererRapportPdf(clientId, rapportId);
  } catch (err) {
    logger.error(`[regenererRapportPdf] Échec clients/${clientId}/rapports/${rapportId}`, err);
    throw new HttpsError("internal", err instanceof Error ? err.message : "Échec de la génération.");
  }
});
