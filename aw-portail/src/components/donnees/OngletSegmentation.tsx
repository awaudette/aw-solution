"use client";

import { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, LineElement, PointElement,
  Tooltip, Filler,
} from "chart.js";
import type { AnalyticsGlobal, SegmentId, Segment } from "@/types/analytics";
import { fmtNombre, fmtArgent, fmtPct } from "@/lib/mockAnalytics";

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

// ─── Couleurs par segment ─────────────────────────────────────────────────────
// Utilisées de façon cohérente : cards, graphique d'évolution, funnel
const SEG_COLOR: Record<SegmentId, string> = {
  vip:      "#7c3aed", // violet
  regulier: "#2a78d6", // bleu
  nouveau:  "#1baf7a", // vert
  aRisque:  "#f59e0b", // ambre
  inactif:  "#6b7280", // gris
  perdu:    "#ef4444", // rouge
};

const SEG_LABEL: Record<SegmentId, string> = {
  vip:      "VIP",
  regulier: "Régulier",
  nouveau:  "Nouveau",
  aRisque:  "À risque",
  inactif:  "Inactif",
  perdu:    "Perdu",
};

const SEG_CRITERE: Record<SegmentId, string> = {
  vip:      "5+ visites · panier élevé · récent",
  regulier: "2–4 visites · engagement stable",
  nouveau:  "1re visite dans les 30 derniers jours",
  aRisque:  "60–90 jours sans visite",
  inactif:  "90–180 jours sans visite",
  perdu:    "180+ jours sans visite",
};

function varColor(n: number) {
  return n > 0 ? "#1baf7a" : n < 0 ? "#ef4444" : "#6b7280";
}

// ─── Pastille de couleur ──────────────────────────────────────────────────────
function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}

// ─── Card segment ─────────────────────────────────────────────────────────────
function SegmentCard({
  seg, selected, onClick,
}: { seg: Segment; selected: boolean; onClick: () => void }) {
  const c = SEG_COLOR[seg.id];
  return (
    <div onClick={onClick} style={{
      background: "white",
      borderRadius: 12,
      border: `0.5px solid ${selected ? c : "#E5E7EB"}`,
      borderLeft: `3px solid ${c}`,
      padding: "20px 20px 16px",
      boxShadow: selected
        ? `0 0 0 2px ${c}22`
        : "0 1px 3px rgba(0,0,0,.04)",
      cursor: "pointer",
      transition: "box-shadow .15s, border-color .15s",
    }}>

      {/* Identité */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Dot color={c} size={8} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", flex: 1 }}>
          {SEG_LABEL[seg.id]}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: c,
          background: `${c}14`, borderRadius: 12,
          padding: "2px 8px",
        }}>
          {fmtPct(seg.pourcentage, 1)}
        </span>
      </div>

      {/* Nombre */}
      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
        {fmtNombre(seg.count)}
      </div>
      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>membres</div>

      {/* Critère */}
      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10 }}>
        {SEG_CRITERE[seg.id]}
      </div>

      {/* Évolution */}
      <div style={{ fontSize: 12, fontWeight: 600, color: varColor(seg.variation) }}>
        {seg.variation > 0 ? "+" : ""}{seg.variation} vs mois précédent
      </div>

      {/* Métriques optionnelles */}
      {seg.panierMoyen != null && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
          Panier moyen : {fmtArgent(seg.panierMoyen)}
        </div>
      )}
      {seg.valeurEnJeu != null && (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
          {fmtArgent(seg.valeurEnJeu)} en jeu
        </div>
      )}
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────
function Funnel({ parcours }: { parcours: NonNullable<AnalyticsGlobal["parcours"]> }) {
  const ACCENT = "#2a78d6";
  const steps: { label: string; value: number }[] = [
    { label: "Inscrits",            value: parcours.inscrits         },
    { label: "1re visite",          value: parcours.premiereVisite   },
    { label: "2e visite",           value: parcours.deuxiemeVisite   },
    { label: "Récompense réclamée", value: parcours.recompenseReclamee },
    { label: "Fidélisé (5+ vis.)",  value: parcours.fidelise         },
  ];
  const max = steps[0].value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((s, i) => {
        const pct    = (s.value / max) * 100;
        const dropPct = i > 0
          ? ((steps[i - 1].value - s.value) / steps[i - 1].value * 100)
          : 0;
        return (
          <div key={s.label}>
            {i > 0 && (
              <div style={{
                fontSize: 11, color: "#ef4444",
                textAlign: "center", marginBottom: 4,
              }}>
                ↓ −{dropPct.toFixed(1).replace(".", ",")} %
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                fontSize: 12, color: "#6B7280",
                width: 148, textAlign: "right", flexShrink: 0,
              }}>
                {s.label}
              </div>
              <div style={{
                flex: 1, background: "#F3F4F6",
                borderRadius: 6, height: 28, position: "relative",
              }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  borderRadius: 6,
                  background: i === 4 ? "#1baf7a" : ACCENT,
                  transition: "width .4s",
                }} />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#111827",
                width: 60, flexShrink: 0,
              }}>
                {fmtNombre(s.value)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── OngletSegmentation ───────────────────────────────────────────────────────
interface Props { global: AnalyticsGlobal; franchiseName?: string }

export default function OngletSegmentation({ global }: Props) {
  const [selectedSeg, setSelectedSeg] = useState<SegmentId | null>(null);
  const seg = global.segmentation;

  const CARD: React.CSSProperties = {
    background: "white", borderRadius: 12,
    border: "0.5px solid #E5E7EB",
    padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
  };

  if (!seg) {
    return (
      <div style={{ ...CARD, textAlign: "center", color: "#9CA3AF", padding: 64 }}>
        Vos données apparaîtront ici dès le lancement de votre application.
      </div>
    );
  }

  // ── Graphique historique ──────────────────────────────────────────────────
  const hist = seg.historique;
  const LAYERS: { key: keyof (typeof hist)[0]; label: string; color: string }[] = [
    { key: "vip",      label: "VIP",      color: SEG_COLOR.vip      },
    { key: "regulier", label: "Régulier", color: SEG_COLOR.regulier  },
    { key: "nouveau",  label: "Nouveau",  color: SEG_COLOR.nouveau   },
    { key: "aRisque",  label: "À risque", color: SEG_COLOR.aRisque   },
    { key: "inactif",  label: "Inactif",  color: SEG_COLOR.inactif   },
    { key: "perdu",    label: "Perdu",    color: SEG_COLOR.perdu     },
  ];
  const chartData = {
    labels: hist.map((h) => h.mois),
    datasets: LAYERS.map(({ key, label, color }) => ({
      label,
      data: hist.map((h) => h[key] as number),
      backgroundColor: color + "CC",
      borderColor:     color,
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    })),
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      tooltip: { mode: "index" as const, intersect: false },
      legend: {
        position: "bottom" as const,
        labels: { font: { size: 11 }, boxWidth: 10, padding: 16 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { stacked: true, grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
    },
  };

  const selectedSegData = selectedSeg
    ? seg.segments.find((s) => s.id === selectedSeg) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── 6 cards segments ── */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          Segments RFM
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {seg.segments.map((s) => (
            <SegmentCard
              key={s.id}
              seg={s}
              selected={selectedSeg === s.id}
              onClick={() => setSelectedSeg(selectedSeg === s.id ? null : s.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Détail segment sélectionné ── */}
      {selectedSegData && (
        <section style={{
          ...CARD,
          borderLeft: `3px solid ${SEG_COLOR[selectedSegData.id]}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Dot color={SEG_COLOR[selectedSegData.id]} size={9} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>
              {SEG_LABEL[selectedSegData.id]} — {fmtNombre(selectedSegData.count)} membres
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>
            {SEG_CRITERE[selectedSegData.id]}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                Part du programme
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
                {fmtPct(selectedSegData.pourcentage)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                Évolution mensuelle
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: varColor(selectedSegData.variation) }}>
                {selectedSegData.variation > 0 ? "+" : ""}{selectedSegData.variation} membres
              </div>
            </div>
            {selectedSegData.panierMoyen != null && (
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                  Panier moyen
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
                  {fmtArgent(selectedSegData.panierMoyen)}
                </div>
              </div>
            )}
            {selectedSegData.valeurEnJeu != null && (
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>
                  Valeur en jeu
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>
                  {fmtArgent(selectedSegData.valeurEnJeu)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Graphique évolution 6 mois ── */}
      <section style={CARD}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
          Évolution des segments — 6 derniers mois
        </h3>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 20px" }}>
          Membres par segment
        </p>
        <div style={{ height: 280 }}>
          <Line data={chartData} options={chartOpts} />
        </div>
      </section>

      {/* ── Funnel de conversion ── */}
      {global.parcours && (
        <section style={CARD}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            Parcours de conversion
          </h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 24px" }}>
            De l&apos;inscription à la fidélisation
          </p>
          <Funnel parcours={global.parcours} />
          <div style={{
            marginTop: 20, padding: "12px 16px",
            background: "#F9FAFB", borderRadius: 10,
            borderLeft: "3px solid #2a78d6",
          }}>
            <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
              <strong>{fmtPct((global.parcours.fidelise / global.parcours.inscrits) * 100)}</strong> des inscrits
              deviennent fidélisés. La plus grande perte survient entre la 1re et la 2e visite
              ({fmtPct(((global.parcours.premiereVisite - global.parcours.deuxiemeVisite) / global.parcours.premiereVisite) * 100)} de chute).
            </p>
          </div>
        </section>
      )}

    </div>
  );
}
