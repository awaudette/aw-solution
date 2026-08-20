/**
 * POST /api/sync/analytics
 *
 * Reçoit chaque nuit les agrégats calculés par portailSyncJob (Cloud Function
 * du projet Firebase du CLIENT — pas du portail). Aucune clé de service du
 * portail n'est distribuée aux projets clients : l'authentification se fait
 * par un jeton Bearer propre à chaque client, stocké hashé dans
 * clients/{clientId}/syncConfig/token (voir src/lib/syncToken.ts).
 *
 * Écrit :
 *   clients/{clientId}/analytics/global
 *   clients/{clientId}/analytics/{franchiseId}          (une par franchise reçue)
 *   clients/{clientId}/rapports/comptable-{moisRef}[-{franchiseId}]
 *   clients/{clientId}/syncLogs/{dateDonnees}
 *
 * Idempotent : chaque écriture cible un id déterministe (set, jamais add), donc
 * recevoir deux fois la même nuit écrase avec la même donnée plutôt que de dupliquer.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { hashSyncToken, safeCompareHash } from "@/lib/syncToken";
import { validateSyncPayload } from "@/lib/validateAnalyticsPayload";
import type { AnalyticsGlobal, AnalyticsFranchise } from "@/types/analytics";

export const runtime = "nodejs"; // crypto (hash du jeton) + firebase-admin — pas compatible edge

interface SyncPayload {
  clientId: string;
  global: AnalyticsGlobal;
  franchises?: Record<string, AnalyticsFranchise>;
}

/** Convertit periode.derniereSync (chaîne ISO reçue en JSON) en Date pour Firestore. */
function withDerniereSyncDate<T extends { periode: { derniereSync: unknown } }>(doc: T) {
  return { ...doc, periode: { ...doc.periode, derniereSync: new Date(doc.periode.derniereSync as string) } };
}

async function writeLog(clientId: string, dateDonnees: string | undefined, entry: Record<string, unknown>) {
  try {
    // Un seul document par nuit agrégée : une re-livraison de la même nuit met à
    // jour l'entrée existante plutôt que d'empiler des doublons dans l'admin.
    const id = dateDonnees && dateDonnees.length > 0 ? dateDonnees : `sync-${Date.now()}`;
    await adminDb
      .collection("clients").doc(clientId)
      .collection("syncLogs").doc(id)
      .set({ ...entry, dateDonnees: dateDonnees ?? null, horodatage: FieldValue.serverTimestamp() });
  } catch (e) {
    console.error("[sync/analytics] échec écriture syncLogs", clientId, e);
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Authentification par jeton Bearer ──────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, presentedToken] = authHeader.split(" ");
  if (scheme !== "Bearer" || !presentedToken) {
    return NextResponse.json({ error: "En-tête Authorization: Bearer <jeton> requis" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const clientId = typeof (body as Record<string, unknown> | null)?.clientId === "string"
    ? ((body as Record<string, unknown>).clientId as string)
    : null;
  if (!clientId) {
    return NextResponse.json({ error: "clientId manquant dans le corps de la requête" }, { status: 400 });
  }

  // ── 2. Le jeton doit correspondre à CE clientId précis ─────────────────────
  // Chaque client a son propre jeton (clients/{clientId}/syncConfig/token) : il
  // faut donc déjà connaître le clientId pour retrouver le hash à comparer. Cette
  // vérification remplit à la fois "authentifier le jeton" et "le jeton correspond
  // au clientId du corps" en une seule étape — le jeton d'un autre client échoue ici.
  const syncConfigRef = adminDb.collection("clients").doc(clientId).collection("syncConfig").doc("token");
  const syncConfigSnap = await syncConfigRef.get();
  if (!syncConfigSnap.exists) {
    return NextResponse.json({ error: "Aucun jeton de synchronisation configuré pour ce client" }, { status: 401 });
  }
  const syncConfig = syncConfigSnap.data()!;
  if (syncConfig.revoked === true) {
    return NextResponse.json({ error: "Jeton révoqué" }, { status: 401 });
  }
  if (!safeCompareHash(hashSyncToken(presentedToken), syncConfig.tokenHash)) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401 });
  }

  // ── 3. Valider la forme des données contre le contrat analytics.ts ─────────
  const { errors } = validateSyncPayload(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Payload invalide", details: errors }, { status: 400 });
  }

  const payload = body as SyncPayload;
  const franchises = payload.franchises ?? {};
  const dateDonnees = payload.global.periode?.dateDonnees;

  let documentsEcrits = 0;
  try {
    const batch = adminDb.batch();
    const clientRef = adminDb.collection("clients").doc(clientId);

    // clients/{clientId}/analytics/global
    batch.set(clientRef.collection("analytics").doc("global"), withDerniereSyncDate(payload.global));
    documentsEcrits++;

    // clients/{clientId}/analytics/{franchiseId}
    for (const [franchiseId, fdata] of Object.entries(franchises)) {
      batch.set(clientRef.collection("analytics").doc(franchiseId), withDerniereSyncDate(fdata));
      documentsEcrits++;
    }

    // Documents mensuels de comptabilité (archive historique — analytics/global.comptabilite
    // ne garde que le dernier mois clos ; l'onglet Historique du portail lit ces documents
    // pour afficher tous les mois passés). Id déterministe = idempotent.
    const moisRef = payload.global.comptabilite.moisRef; // "YYYY-MM"
    const [anneeStr, moisStr] = moisRef.split("-");
    const annee = Number(anneeStr);
    const mois = Number(moisStr);

    if (Number.isFinite(annee) && Number.isFinite(mois)) {
      batch.set(
        clientRef.collection("rapports").doc(`comptable-${moisRef}`),
        {
          type: "comptable",
          mois, annee,
          donnees: payload.global.comptabilite,
          analyseIA: { bonsCoups: [], aTravailler: [] },
          publie: false,
          generatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      documentsEcrits++;

      for (const [franchiseId, fdata] of Object.entries(franchises)) {
        if (!fdata.comptabilite) continue;
        batch.set(
          clientRef.collection("rapports").doc(`comptable-${moisRef}-${franchiseId}`),
          {
            type: "comptable",
            mois, annee,
            franchiseId,
            donnees: fdata.comptabilite,
            analyseIA: { bonsCoups: [], aTravailler: [] },
            publie: false,
            generatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        documentsEcrits++;
      }
    }

    await batch.commit();
    await syncConfigRef.set({ lastUsedAt: FieldValue.serverTimestamp() }, { merge: true });

    await writeLog(clientId, dateDonnees, {
      succes: true,
      documentsEcrits,
      franchisesCount: Object.keys(franchises).length,
    });

    return NextResponse.json({ ok: true, documentsEcrits });
  } catch (err) {
    console.error("[sync/analytics]", clientId, err);
    await writeLog(clientId, dateDonnees, {
      succes: false,
      documentsEcrits: 0,
      erreur: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Échec de l'écriture Firestore" }, { status: 500 });
  }
}
