"use client";

/**
 * useAnalyticsData.ts
 *
 * Hook de lecture Firestore pour les données de POST /api/sync/analytics
 * (voir src/app/api/sync/analytics/route.ts et src/types/analytics.ts).
 *
 * Lit :
 *   clients/{clientId}/analytics/global          → AnalyticsGlobal
 *   clients/{clientId}/analytics/{franchiseId}    → AnalyticsFranchise[] (tous les docs sauf "global")
 *   clients/{clientId}/alertes                    → AlerteDoc[] (triées récentes d'abord)
 *   clients/{clientId}/rapports                   → RapportDoc[] (triés récents d'abord)
 *
 * Remplace getMockAnalytics() / getMockGlobal() / getMockFranchises() /
 * getMockAlertes() / getMockRapports() (src/lib/mockAnalytics.ts) — les types
 * sont identiques, aucun changement requis côté composants consommateurs au-delà
 * du branchement des props.
 *
 * "Aucune donnée" = la sync n'a jamais tourné pour ce client (portailSyncJob
 * pas encore déployé/exécuté) : clients/{clientId}/analytics/global n'existe pas.
 * Distinct de "loading" (requête Firestore en cours).
 */

import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AnalyticsGlobal, AnalyticsFranchise, AlerteDoc, RapportDoc } from "@/types/analytics";

export interface AlerteItem extends AlerteDoc { id: string }
export interface RapportItem extends RapportDoc { id: string }

/** Convertit periode.derniereSync (Timestamp Firestore) en Date JS. */
function withDerniereSyncDate<T extends { periode: { derniereSync: unknown } }>(data: T): T {
  const raw = data.periode.derniereSync;
  return {
    ...data,
    periode: { ...data.periode, derniereSync: raw instanceof Timestamp ? raw.toDate() : raw },
  };
}

export function useAnalyticsData(clientId: string) {
  const [global, setGlobal]         = useState<AnalyticsGlobal | null>(null);
  const [franchises, setFranchises] = useState<AnalyticsFranchise[]>([]);
  const [alertes, setAlertes]       = useState<AlerteItem[]>([]);
  const [rapports, setRapports]     = useState<RapportItem[]>([]);

  const [loadingGlobal, setLoadingGlobal]         = useState(true);
  const [loadingFranchises, setLoadingFranchises] = useState(true);
  const [loadingAlertes, setLoadingAlertes]       = useState(true);
  const [loadingRapports, setLoadingRapports]     = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const unsubGlobal = onSnapshot(
      doc(db, "clients", clientId, "analytics", "global"),
      (snap) => {
        setGlobal(snap.exists() ? withDerniereSyncDate(snap.data() as AnalyticsGlobal) : null);
        setLoadingGlobal(false);
      },
      () => setLoadingGlobal(false),
    );

    // clients/{clientId}/analytics/{franchiseId} — la collection contient aussi
    // le doc "global" ci-dessus, qu'on exclut ici.
    const unsubFranchises = onSnapshot(
      collection(db, "clients", clientId, "analytics"),
      (snap) => {
        setFranchises(
          snap.docs
            .filter((d) => d.id !== "global")
            .map((d) => withDerniereSyncDate(d.data() as AnalyticsFranchise)),
        );
        setLoadingFranchises(false);
      },
      () => setLoadingFranchises(false),
    );

    const unsubAlertes = onSnapshot(
      query(collection(db, "clients", clientId, "alertes"), orderBy("createdAt", "desc"), limit(50)),
      (snap) => {
        setAlertes(snap.docs.map((d) => {
          const data = d.data() as AlerteDoc;
          return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          };
        }));
        setLoadingAlertes(false);
      },
      () => setLoadingAlertes(false),
    );

    const unsubRapports = onSnapshot(
      query(collection(db, "clients", clientId, "rapports"), orderBy("generatedAt", "desc"), limit(24)),
      (snap) => {
        setRapports(snap.docs.map((d) => {
          const data = d.data() as RapportDoc;
          return {
            ...data,
            id: d.id,
            generatedAt: data.generatedAt instanceof Timestamp ? data.generatedAt.toDate() : data.generatedAt,
          };
        }));
        setLoadingRapports(false);
      },
      () => setLoadingRapports(false),
    );

    return () => {
      unsubGlobal(); unsubFranchises(); unsubAlertes(); unsubRapports();
    };
  }, [clientId]);

  const loading = loadingGlobal || loadingFranchises || loadingAlertes || loadingRapports;
  /** true seulement une fois le chargement terminé et sans doc "global" — sync jamais reçue. */
  const hasData = !loading && global !== null;

  return { global, franchises, alertes, rapports, loading, hasData };
}
