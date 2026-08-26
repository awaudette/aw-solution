"use client";

import { Suspense, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useClientData } from "@/hooks/useClientData";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import type { AnalyticsFranchise } from "@/types/analytics";
import OngletResume              from "@/components/donnees/OngletResume";
import OngletAlertes             from "@/components/donnees/OngletAlertes";
import OngletSegmentation        from "@/components/donnees/OngletSegmentation";
import OngletAnalytique          from "@/components/donnees/OngletAnalytique";
import OngletAnalytiqueEssentiel from "@/components/donnees/OngletAnalytiqueEssentiel";
import OngletComptabilite        from "@/components/donnees/OngletComptabilite";
import OngletHistorique          from "@/components/donnees/OngletHistorique";

// ─── Définition des onglets ─────────────────────────────────────────────────
// « prestige: true » = masqué pour Essentiel
const TABS = [
  { id: "resume",        label: "Résumé",       prestige: false },
  { id: "alertes",       label: "Alertes",       prestige: true  },
  { id: "segmentation",  label: "Segmentation",  prestige: true  },
  { id: "analytique",    label: "Analytique",    prestige: false }, // Essentiel: OngletAnalytiqueEssentiel / Prestige: OngletAnalytique
  { id: "comptabilite",  label: "Comptabilité",  prestige: false },
  { id: "historique",    label: "Historique",    prestige: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page:   { padding: "32px 48px", maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
  h1:     { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 } as React.CSSProperties,
  sub:    { fontSize: 13, color: "#6B7280", marginTop: 4 } as React.CSSProperties,
  tabBar: { display: "flex", gap: 4, borderBottom: "2px solid #E5E7EB", marginBottom: 32 } as React.CSSProperties,
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

// ─── Orchestrateur ────────────────────────────────────────────────────────────
function DonneesInner() {
  const { clientId } = useParams() as { clientId: string };
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { client }   = useClientData(clientId);

  const forfait    = (client as { forfait?: string } | null)?.forfait ?? "Essentiel";
  const isPrestige = forfait === "Prestige";

  const rawTab = (searchParams.get("tab") ?? "resume") as TabId;
  const [activeTab, setActiveTab] = useState<TabId>(rawTab);
  const [franchiseId, setFranchiseId] = useState("global");

  const { global, franchises, alertes, rapports, loading, hasData } = useAnalyticsData(clientId);

  // ── Doc de la franchise sélectionnée (null = toutes) ──────────
  const franchiseData: AnalyticsFranchise | null = useMemo(
    () => franchiseId === "global"
      ? null
      : franchises.find((f) => f.franchiseId === franchiseId) ?? null,
    [franchiseId, franchises],
  );
  const franchiseName = franchiseData?.franchiseNom ?? "Toutes les franchises";

  const visibleTabs = TABS.filter((t) => !t.prestige || isPrestige);

  function goTab(id: TabId) {
    setActiveTab(id);
    router.replace(`/client/${clientId}/donnees?tab=${id}`, { scroll: false });
  }

  // ── Chargement ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  // ── Aucune donnée : la sync n'a jamais tourné pour ce client ────
  if (!hasData || !global) {
    return (
      <div style={S.page}>
        <div style={{ ...S.header, marginBottom: 0 }}>
          <div>
            <h1 style={S.h1}>Données &amp; rapports</h1>
            <p style={S.sub}>Aucune donnée disponible pour le moment</p>
          </div>
        </div>
        <div style={{
          marginTop: 24, padding: "48px 32px", textAlign: "center",
          background: "white", borderRadius: 12, border: "1px dashed #D1D5DB",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
            La synchronisation n&apos;a pas encore été reçue
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Les données apparaîtront ici automatiquement après la première synchronisation nocturne
            (clients/{clientId}/analytics/global). Aucune action requise si la sync vient d&apos;être activée.
          </p>
        </div>
      </div>
    );
  }

  const [y, m, d] = global.periode.dateDonnees.split("-").map(Number);
  const dateLabel  = new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={S.page}>
      {/* ── En-tête ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Données &amp; rapports</h1>
          <p style={S.sub}>Données à jour au {dateLabel}</p>
        </div>

        {/* Sélecteur de franchise — visible si multi-franchise */}
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

      {/* ── Onglets ── */}
      <div style={S.tabBar}>
        {visibleTabs.map((t) => (
          <button key={t.id} style={tabStyle(activeTab === t.id)} onClick={() => goTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu actif ── */}
      {activeTab === "resume" && (
        <OngletResume
          global={global}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
          alertes={alertes}
          isPrestige={isPrestige}
        />
      )}
      {activeTab === "alertes" && isPrestige && (
        <OngletAlertes alertes={alertes} franchiseName={franchiseName} />
      )}
      {activeTab === "segmentation" && isPrestige && (
        <OngletSegmentation global={global} franchiseName={franchiseName} />
      )}
      {activeTab === "analytique" && isPrestige && (
        <OngletAnalytique global={global} franchiseName={franchiseName} rapports={rapports} />
      )}
      {activeTab === "analytique" && !isPrestige && (
        <OngletAnalytiqueEssentiel
          global={global}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
          rapports={rapports}
        />
      )}
      {activeTab === "comptabilite" && (
        <OngletComptabilite
          global={global}
          franchises={franchises}
          franchiseData={franchiseData}
          franchiseName={franchiseName}
        />
      )}
      {activeTab === "historique" && (
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

export default function DonneesPage() {
  return (
    <Suspense>
      <DonneesInner />
    </Suspense>
  );
}
