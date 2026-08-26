"use client";

import { useState } from "react";
import type { RapportDoc } from "@/types/analytics";

const CARD: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "0.5px solid #E5E7EB",
  padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
};

const MOIS_FR: Record<number, string> = {
  1: "Janvier", 2: "Février", 3: "Mars",      4: "Avril",
  5: "Mai",     6: "Juin",    7: "Juillet",   8: "Août",
  9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

const TYPE_LABEL: Record<string, string> = {
  comptable:   "Rapport mensuel",
  performance: "Performance",
  annuel:      "Annuel",
};
const TYPE_COLOR: Record<string, string> = {
  comptable:   "#1baf7a",
  performance: "#2a78d6",
  annuel:      "#eda100",
};

// ─── Label analyse (pastille + titre sobre, sans emoji) ───────────────────────
function AnalyseLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{children}</span>
    </div>
  );
}

// ─── Carte rapport ────────────────────────────────────────────────────────────
function RapportCard({ r }: { r: RapportDoc }) {
  const col     = TYPE_COLOR[r.type] ?? "#888780";
  const genDate = r.generatedAt.toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: col,
          border: `1px solid ${col}`, borderRadius: 20, padding: "2px 8px",
        }}>
          {TYPE_LABEL[r.type] ?? r.type}
        </span>
        {r.publie && (
          <span style={{
            fontSize: 11, color: "#1baf7a", background: "#f0fdf4",
            borderRadius: 20, padding: "2px 8px", fontWeight: 500,
          }}>
            Publié
          </span>
        )}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        {MOIS_FR[r.mois]} {r.annee}
      </div>
      <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
        Généré le {genDate}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: col, color: "white", border: "none", cursor: "pointer",
        }}>
          Voir le rapport
        </button>
        {r.pdfUrl && (
          <button style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "white", color: col, border: `1px solid ${col}`, cursor: "pointer",
          }}>
            ↓ PDF
          </button>
        )}
      </div>

      {/* Analyse IA — uniquement pour les rapports de performance (Prestige) */}
      {r.type === "performance" && r.analyseIA && (
        <div style={{ marginTop: 20, borderTop: "1px solid #F3F4F6", paddingTop: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <AnalyseLabel color="#1baf7a">Points positifs</AnalyseLabel>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {r.analyseIA.bonsCoups.map((pt, i) => (
                  <li key={i} style={{
                    padding: "10px 14px", background: "white", borderRadius: 10,
                    fontSize: 13, color: "#374151", lineHeight: 1.5,
                    border: "0.5px solid #E5E7EB", borderLeft: "3px solid #1baf7a",
                  }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <AnalyseLabel color="#f59e0b">À travailler</AnalyseLabel>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {r.analyseIA.aTravailler.map((pt, i) => (
                  <li key={i} style={{
                    padding: "10px 14px", background: "white", borderRadius: 10,
                    fontSize: 13, color: "#374151", lineHeight: 1.5,
                    border: "0.5px solid #E5E7EB", borderLeft: "3px solid #f59e0b",
                  }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sous-section avec « Voir tout » ─────────────────────────────────────────
const MAX_VISIBLE = 3;

function SubSection({
  title, rapports,
}: {
  title?: string;
  rapports: RapportDoc[];
}) {
  const [showAll, setShowAll] = useState(false);
  if (rapports.length === 0) return null;

  const visible = showAll ? rapports : rapports.slice(0, MAX_VISIBLE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {title && (
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          {title}
        </h2>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {visible.map((r, i) => <RapportCard key={i} r={r} />)}
      </div>
      {rapports.length > MAX_VISIBLE && !showAll && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "white", color: "#374151",
              border: "1px solid #D1D5DB", cursor: "pointer",
            }}
          >
            Voir tout ({rapports.length} rapports)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── OngletHistorique ─────────────────────────────────────────────────────────
interface Props {
  rapports:      RapportDoc[];
  isPrestige:    boolean;
  forfait:       string;
  franchiseName?: string;
}

export default function OngletHistorique({ rapports, isPrestige }: Props) {
  const sorted     = [...rapports].sort((a, b) =>
    b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois,
  );
  // La route de sync écrit un rapport "comptable" global ET un par franchise
  // pour le même mois (voir src/app/api/sync/analytics/route.ts) — cette vue
  // n'a pas de sélecteur de franchise, donc on ne garde que le rapport global
  // (franchiseId absent) pour éviter deux cartes "Rapport mensuel" identiques
  // en apparence pour le même mois.
  const comptable   = sorted.filter((r) => r.type === "comptable" && !r.franchiseId);
  const performance = sorted.filter((r) => r.type === "performance");

  if (sorted.length === 0) {
    return (
      <div style={{ ...CARD, textAlign: "center", color: "#9CA3AF", padding: 64 }}>
        Vos données apparaîtront ici dès le lancement de votre application.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Rapports mensuels — Essentiel : section unique sans titre
          Prestige : première sous-section avec titre                */}
      <SubSection
        title={isPrestige ? "Rapports mensuels" : undefined}
        rapports={comptable}
      />

      {/* Prestige uniquement : rapports de performance — carte grisée "bientôt
          disponible" tant qu'aucun rapport n'a été généré, plutôt que de
          masquer la section en silence. */}
      {isPrestige && (
        performance.length > 0 ? (
          <SubSection title="Rapports de performance" rapports={performance} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              Rapports de performance
            </h2>
            <div style={{
              ...CARD, background: "#F9FAFB", border: "1px dashed #D1D5DB",
              textAlign: "center", padding: 40,
            }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>📈</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#9CA3AF", margin: "0 0 4px" }}>
                Rapport de performance
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                Bientôt disponible
              </p>
            </div>
          </div>
        )
      )}

      {/* Comparateur de périodes — tous forfaits */}
      <div style={{ ...CARD, background: "#F9FAFB", border: "1px dashed #D1D5DB" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF", margin: "0 0 8px" }}>
          Comparateur de périodes
        </h3>
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
          Comparez deux périodes côte à côte — disponible dès que vous avez 2 mois de données.
        </p>
      </div>

    </div>
  );
}
