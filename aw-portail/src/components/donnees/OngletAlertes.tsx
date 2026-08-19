"use client";

import { useState } from "react";
import type { AlerteDoc, SeveriteAlerte } from "@/types/analytics";
import { fmtArgent } from "@/lib/mockAnalytics";

// ─── Palette sévérité ─────────────────────────────────────────────────────────
const SEV_COLOR: Record<SeveriteAlerte, string> = {
  critique:  "#ef4444",
  attention: "#f59e0b",
  positive:  "#1baf7a",
};
const SEV_LABEL: Record<SeveriteAlerte, string> = {
  critique:  "Critique",
  attention: "Attention",
  positive:  "Positif",
};

// ─── Filtres ──────────────────────────────────────────────────────────────────
type Filtre = "toutes" | SeveriteAlerte | "non_lues";
const FILTRES: { id: Filtre; label: string }[] = [
  { id: "toutes",    label: "Toutes"    },
  { id: "critique",  label: "Critiques" },
  { id: "attention", label: "Attention" },
  { id: "positive",  label: "Positives" },
  { id: "non_lues",  label: "Non lues"  },
];

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 14px", borderRadius: 20, fontSize: 13,
    fontWeight: active ? 600 : 400,
    background: active ? "#111827" : "white",
    color: active ? "white" : "#6B7280",
    border: `1px solid ${active ? "#111827" : "#E5E7EB"}`,
    cursor: "pointer", transition: "all .15s",
  };
}

// ─── Temps relatif ────────────────────────────────────────────────────────────
function formatRelative(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diff < 60)   return `Il y a ${diff} min`;
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)} h`;
  return `Il y a ${Math.floor(diff / 1440)} j`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { alertes: AlerteDoc[]; franchiseName?: string }

export default function OngletAlertes({ alertes }: Props) {
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [lues, setLues]    = useState<Set<number>>(new Set());

  function markLue(idx: number) {
    setLues((prev) => new Set([...prev, idx]));
  }

  const filtered = alertes.filter((a, i) => {
    const estLue = lues.has(i) || a.lue;
    if (filtre === "non_lues") return !estLue;
    if (filtre === "toutes")   return true;
    return a.severite === filtre;
  });

  const nonLuesCount = alertes.filter((a, i) => !lues.has(i) && !a.lue).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Compteurs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {(["critique", "attention", "positive"] as SeveriteAlerte[]).map((sev) => {
          const count = alertes.filter((a) => a.severite === sev).length;
          const color = SEV_COLOR[sev];
          return (
            <div key={sev} style={{
              background: "white", borderRadius: 12,
              border: "0.5px solid #E5E7EB",
              borderLeft: `3px solid ${color}`,
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,.04)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: color, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                  {count}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                  {SEV_LABEL[sev]}{count !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FILTRES.map((f) => (
          <button key={f.id} style={pillStyle(filtre === f.id)} onClick={() => setFiltre(f.id)}>
            {f.label}
            {f.id === "non_lues" && nonLuesCount > 0 ? ` (${nonLuesCount})` : ""}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12,
          border: "0.5px solid #E5E7EB",
          textAlign: "center", color: "#9CA3AF",
          padding: 56, fontSize: 14,
        }}>
          Aucune alerte dans cette catégorie.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((a, i) => {
            const idx    = alertes.indexOf(a);
            const color  = SEV_COLOR[a.severite];
            const estLue = lues.has(idx) || a.lue;

            return (
              <div key={i} style={{
                background: "white",
                borderRadius: 12,
                border: "0.5px solid #E5E7EB",
                borderLeft: `3px solid ${estLue ? "#D1D5DB" : color}`,
                padding: "18px 22px",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

                  {/* Pastille */}
                  <span style={{
                    marginTop: 5,
                    width: 7, height: 7, borderRadius: "50%",
                    background: estLue ? "#D1D5DB" : color,
                    flexShrink: 0,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Ligne 1 : badge + titre + franchise */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      gap: 8, marginBottom: 6, flexWrap: "wrap",
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: estLue ? "#9CA3AF" : color,
                        border: `1px solid ${estLue ? "#E5E7EB" : color}`,
                        borderRadius: 20, padding: "1px 8px",
                        letterSpacing: 0.3,
                      }}>
                        {SEV_LABEL[a.severite]}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: estLue ? "#9CA3AF" : "#111827",
                      }}>
                        {a.titre}
                      </span>
                      {a.franchiseId && (
                        <span style={{
                          fontSize: 11, color: "#9CA3AF",
                          background: "#F3F4F6", borderRadius: 12,
                          padding: "2px 8px",
                        }}>
                          {a.franchiseId}
                        </span>
                      )}
                    </div>

                    {/* Ligne 2 : description */}
                    <p style={{
                      fontSize: 13,
                      color: estLue ? "#9CA3AF" : "#6B7280",
                      margin: "0 0 12px",
                      lineHeight: 1.6,
                    }}>
                      {a.description}
                    </p>

                    {/* Ligne 3 : montant + actions + horodatage */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      gap: 16, flexWrap: "wrap",
                    }}>
                      {a.valeurEnJeu != null && (
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: estLue ? "#9CA3AF" : color,
                        }}>
                          {fmtArgent(a.valeurEnJeu)} en jeu
                        </span>
                      )}
                      {a.actionLabel && !estLue && (
                        <button style={{
                          padding: "5px 14px", borderRadius: 8,
                          fontSize: 13, fontWeight: 600,
                          background: color, color: "white",
                          border: "none", cursor: "pointer",
                        }}>
                          {a.actionLabel} →
                        </button>
                      )}
                      {!estLue && (
                        <button onClick={() => markLue(idx)} style={{
                          fontSize: 12, color: "#9CA3AF",
                          background: "none", border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}>
                          Marquer comme lue
                        </button>
                      )}
                      <span style={{
                        fontSize: 11, color: "#9CA3AF",
                        marginLeft: "auto",
                      }}>
                        {formatRelative(a.createdAt)}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
