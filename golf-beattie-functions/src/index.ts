/**
 * index.ts — Point d'entrée des Cloud Functions du projet golf-beattie-d5062.
 *
 * portailSyncJob : planifiée tous les jours à 5 h (America/Toronto), même
 * région que portailSyncJob de Poké Station (northamerica-northeast1,
 * confirmé via `firebase functions:list --project poke-station-70yy8e`).
 *
 * Calcule le payload AnalyticsGlobal (construirePayloadPortail.ts) puis
 * l'envoie par POST à https://portail.awsolution.ca/api/sync/analytics avec
 * l'en-tête Authorization: Bearer <PORTAIL_SYNC_TOKEN> (secret Firebase, déjà
 * créé dans golf-beattie-d5062 — jamais en dur dans le code). Voir
 * construirePayloadPortail.ts pour le détail des champs omis/approximés
 * (7 champs optionnels omis, quelques champs obligatoires à 0 faute de
 * source de données — documenté en tête de ce fichier).
 *
 * Codebase Firebase dédié "aw-portail-sync" (firebase.json) : isole ce
 * déploiement des fonctions FlutterFlow existantes (addFcmToken,
 * onUserDeleted, sendPushNotificationsTrigger,
 * sendUserPushNotificationsTrigger — codebase "default", jamais touchées
 * par `firebase deploy --only functions:aw-portail-sync`).
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { construirePayloadPortail } from "./core/construirePayloadPortail";

initializeApp();

const PORTAIL_SYNC_TOKEN = defineSecret("PORTAIL_SYNC_TOKEN");
const PORTAIL_SYNC_URL = "https://portail.awsolution.ca/api/sync/analytics";
const CLIENT_ID = "golf-beattie";

export const portailSyncJob = onSchedule(
  {
    schedule: "0 5 * * *",
    timeZone: "America/Toronto",
    region: "northamerica-northeast1",
    timeoutSeconds: 300,
    memory: "1GiB",
    secrets: [PORTAIL_SYNC_TOKEN],
  },
  async () => {
    const db = getFirestore();
    const { payload, avertissements } = await construirePayloadPortail(db);

    if (avertissements.length > 0) {
      logger.warn(`[portailSyncJob] ${avertissements.length} avertissement(s) pendant le calcul`, {
        avertissements: avertissements.slice(0, 20),
      });
    }

    let reponse: Response;
    try {
      reponse = await fetch(PORTAIL_SYNC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PORTAIL_SYNC_TOKEN.value()}`,
        },
        body: JSON.stringify({ clientId: CLIENT_ID, global: payload }),
      });
    } catch (err) {
      logger.error("[portailSyncJob] échec réseau lors de l'envoi au portail", {
        erreur: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    if (!reponse.ok) {
      let details: unknown;
      try { details = await reponse.json(); } catch { details = await reponse.text().catch(() => null); }
      logger.error("[portailSyncJob] le portail a refusé le payload", {
        statut: reponse.status,
        details,
      });
      throw new Error(`POST /api/sync/analytics a échoué avec le statut ${reponse.status}`);
    }

    const resultatPortail = await reponse.json().catch(() => null);
    logger.info("[portailSyncJob] envoi au portail réussi", {
      dateDonnees: payload.periode.dateDonnees,
      documentsEcrits: (resultatPortail as { documentsEcrits?: number } | null)?.documentsEcrits,
      membresTotal: payload.aVie.membresTotal,
      avertissements: avertissements.length,
    });
  },
);
