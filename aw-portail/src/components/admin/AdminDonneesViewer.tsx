"use client";

/**
 * AdminDonneesViewer.tsx
 *
 * Miroir admin de /client/[clientId]/donnees — monte les mêmes 7 composants
 * Onglet* (inchangés) avec les mêmes données (useAnalyticsData, inchangé).
 *
 * Contrairement à AdminBrandingViewer, ce wrapper ne réimplémente aucune
 * logique de données ni aucun composant Onglet* : seul le shell de
 * navigation (sous-onglets, sélecteur de franchise, états chargement/vide)
 * est du code propre à l'admin, nécessaire parce que la navigation doit
 * rester locale à cette page (jamais de redirection vers /client/...).
 *
 * TABS est importé depuis src/lib/donneesTabs.ts (source partagée avec
 * donnees/page.tsx) — un fichier page.tsx en Next 16 ne peut pas exporter de
 * nom arbitraire, TABS a donc été extrait de ce fichier vers ce module.
 */

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import type { AnalyticsFranchise } from "@/types/analytics";
import { TABS, type TabId } from "@/lib/donneesTabs";
import OngletResume              from "@/components/donnees/OngletResume";
import OngletAlertes             from "@/components/donnees/OngletAlertes";
import OngletSegmentation        from "@/components/donnees/OngletSegmentation";
import OngletAnalytique          from "@/components/donnees/OngletAnalytique";
import OngletAnalytiqueEssentiel from "@/components/donnees/OngletAnalytiqueEssentiel";
import OngletComptabilite        from "@/components/donnees/OngletComptabilite";
import OngletHistorique          from "@/components/donnees/OngletHistorique";

const S = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 } as React.CSSProperties,
  sub:    { fontSize: 13, color: "#6B7280", margin: 0 } as React.CSSProperties,
  tabBar: { display: "flex", gap: 4, borderBottom: "2px solid #E5E7EB", marginBottom: 24 } as React.CSSProperties,
  select: {
    padding: "6px 12px", borderRadius: 8, border: "1px solid #D1D5DB",
    fontSize: 13, background: "white", cursor: "pointer",
  } as React.CSSProperties,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px", fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? "#0362E3" : "#6B7280",
    background: "none", border: "none",
    borderBottom: active ? "2px solid #0362E3" : "2px solid transparent",
    marginBottom: -2, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
  };
}

interface Props {
  clientId: string;
  forfait:  string;
}

export function AdminDonneesViewer({ clientId, forfait }: Props) {
  const isPrestige = forfait === "Prestige";

  const [activeSubTab, setActiveSubTab] = useState<TabId>("resume");
  const [franchiseId, setFranchiseId]   = useState("global");

  const { global, franchises, alertes, rapports, loading, hasData } = useAnalyticsData(clientId);

  const franchiseData: AnalyticsFranchise | null = useMemo(
    () => franchiseId === "global"
      ? null
      : franchises.find((f) => f.franchiseId === franchiseId) ?? null,
    [franchiseId, franchises],
  );
  const franchiseName = franchiseData?.franchiseNom ?? "Toutes les franchises";

  const visibleTabs = TABS.filter((t) => !t.prestige || isPrestige);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!hasData || !global) {
    return (
      <div style={{
        padding: "48px 32px", textAlign: "center",
        background: "white", borderRadius: 12, border: "1px dashed #D1D5DB",
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
          La synchronisation n&apos;a pas encore été reçue pour ce client
        </p>
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Les données apparaîtront ici automatiquement après la première synchronisation nocturne
          (clients/{clientId}/analytics/global). Aucune action requise si la sync vient d&apos;être activée.
        </p>
      </div>
    );
  }

  const [y, m, d] = global.periode.dateDonnees.split("-").map(Number);
  const dateLabel  = new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      {/* ── En-tête (pas de h1 — la fiche admin a déjà son titre) ── */}
      <div style={S.header}>
        <p style={S.sub}>Données à jour au {dateLabel}</p>

        {franchises.length > 1 && (
          <select
            style={S.select}
            value={franchiseId}
            onChange={(e) => setFranchiseId(e.target.value)}
          >
            <option value="global">Toutes les franchises</option>
            {franchises.map((f) => (
              <option key={f.franchiseId} value={f.franchiseId}>
                {f.franchiseNom}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Sous-onglets — état local, jamais de navigation vers /client/... ── */}
      <div style={S.tabBar}>
        {visibleTabs.map((t) => (
          <button key={t.id} style={tabStyle(activeSubTab === t.id)} onClick={() => setActiveSubTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu actif — composants Onglet* inchangés ── */}
      {activeSubTab === "resume" && (
        <OngletResume
          global={global}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
          alertes={alertes}
          isPrestige={isPrestige}
        />
      )}
      {activeSubTab === "alertes" && isPrestige && (
        <OngletAlertes alertes={alertes} franchiseName={franchiseName} />
      )}
      {activeSubTab === "segmentation" && isPrestige && (
        <OngletSegmentation global={global} franchiseName={franchiseName} />
      )}
      {activeSubTab === "analytique" && isPrestige && (
        <OngletAnalytique global={global} franchiseName={franchiseName} rapports={rapports} />
      )}
      {activeSubTab === "analytique" && !isPrestige && (
        <OngletAnalytiqueEssentiel
          global={global}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
          rapports={rapports}
        />
      )}
      {activeSubTab === "comptabilite" && (
        <OngletComptabilite
          global={global}
          franchises={franchises}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
          rapports={rapports}
        />
      )}
      {activeSubTab === "historique" && (
        <OngletHistorique
          rapports={rapports}
          isPrestige={isPrestige}
          forfait={forfait}
          franchiseName={franchiseName}
        />
      )}
    </div>
  );
}
