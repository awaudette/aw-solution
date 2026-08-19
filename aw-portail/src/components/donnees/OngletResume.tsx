"use client";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, LineElement, PointElement,
  BarElement, Tooltip, Filler,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import type { AnalyticsGlobal, AnalyticsFranchise, AlerteDoc, SeveriteAlerte } from "@/types/analytics";
import { fmtNombre, fmtArgent } from "@/lib/mockAnalytics";

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Tooltip, Filler);

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = "#0362E3";
const CARD: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "0.5px solid #E5E7EB",
  padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
};

// ─── Helpers variation ────────────────────────────────────────────────────────
function varColor(r: number) { return r > 0.001 ? "#1baf7a" : r < -0.001 ? "#ef4444" : "#888780"; }
function varArrow(r: number) { return r > 0.001 ? "↑" : r < -0.001 ? "↓" : "→"; }
function varText(r: number) {
  const abs = Math.abs(r * 100).toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${r >= 0 ? "+" : "-"}${abs} %`;
}

// ─── Titre de section ─────────────────────────────────────────────────────────
function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: "#6B7280", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── KPI card Hier ────────────────────────────────────────────────────────────
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase",
        letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}

// ─── Alertes preview (Prestige) ──────────────────────────────────────────────
const SEV_COLOR: Record<SeveriteAlerte, string> = { critique: "#ef4444", attention: "#f59e0b", positive: "#1baf7a" };
const SEV_BG:    Record<SeveriteAlerte, string> = { critique: "#fef2f2", attention: "#fffbeb", positive: "#f0fdf4" };
const SEV_LABEL: Record<SeveriteAlerte, string> = { critique: "Critique", attention: "Attention", positive: "Positif" };

function AlertePreview({ a }: { a: AlerteDoc }) {
  const col = SEV_COLOR[a.severite];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 16px", borderRadius: 10, background: SEV_BG[a.severite],
      borderLeft: `4px solid ${col}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: col, background: "white",
            border: `1px solid ${col}`, borderRadius: 20, padding: "1px 8px" }}>
            {SEV_LABEL[a.severite]}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{a.titre}</span>
        </div>
        <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{a.description}</p>
      </div>
      {a.valeurEnJeu != null && (
        <span style={{ fontSize: 13, fontWeight: 700, color: col, whiteSpace: "nowrap" }}>
          {fmtArgent(a.valeurEnJeu)}
        </span>
      )}
    </div>
  );
}

// ─── OngletResume ─────────────────────────────────────────────────────────────
interface Props {
  global:        AnalyticsGlobal;
  franchiseData: AnalyticsFranchise | null;
  franchiseName: string;
  alertes:       AlerteDoc[];
  isPrestige:    boolean;
}

export default function OngletResume({ global, franchiseData, alertes, isPrestige }: Props) {

  // Données selon la franchise sélectionnée (ou global si aucune)
  const hier = franchiseData?.hier ?? global.hier;
  const aVie = franchiseData?.aVie ?? global.aVie;

  // Variations 30j : utilise la franchise si disponible (scalaires uniquement)
  // La série journalière (charts) n'est PAS disponible par franchise → voir garde ci-dessous
  const f30  = franchiseData?.["30j"];
  const p30  = global["30j"]; // série complète — toujours global
  const p30v = f30 ?? p30;    // scalaires + variations — franchise si sélectionnée

  // ── Date de "Hier" ────────────────────────────────────────────────────────
  const [dy, dm, dd] = global.periode.dateDonnees.split("-").map(Number);
  const hierDate = new Date(dy, dm - 1, dd).toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Noms des deux derniers mois complets (dynamiques) ─────────────────────
  const lastM = dm - 1 === 0 ? 12 : dm - 1;
  const lastY = dm - 1 === 0 ? dy - 1 : dy;
  const prevM = lastM - 1 === 0 ? 12 : lastM - 1;
  const prevY = lastM - 1 === 0 ? lastY - 1 : lastY;
  const fmtMois = (y: number, m: number) =>
    new Date(y, m - 1, 1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  const labelMoisA = fmtMois(lastY, lastM); // "juillet 2026"
  const labelMoisB = fmtMois(prevY, prevM); // "juin 2026"
  const varSub = `${labelMoisA.charAt(0).toUpperCase() + labelMoisA.slice(1)} vs ${labelMoisB}`;

  // ── Séries : franchise si sélectionnée, sinon global ─────────────────────
  const seriesChart = franchiseData?.["30j"].series ?? p30.series;
  const achalandage = franchiseData?.achalandage ?? global.achalandage;

  // ── Graphique 1 : Visites & revenus 30j ──────────────────────────────────
  const labels30 = seriesChart.map((s) => s.date.split("-")[2]);
  const chartVisitesRevenus = {
    labels: labels30,
    datasets: [
      {
        label: "Visites",
        data: seriesChart.map((s) => s.visites),
        borderColor: ACCENT, backgroundColor: `${ACCENT}12`,
        fill: true, tension: 0.4, pointRadius: 0, yAxisID: "yV",
      },
      {
        label: "Revenus ($)",
        data: seriesChart.map((s) => s.revenus),
        borderColor: "#eb6834", backgroundColor: "transparent",
        fill: false, tension: 0.4, pointRadius: 0, yAxisID: "yR",
      },
    ],
  };
  const optVisitesRevenus = {
    responsive: true, maintainAspectRatio: false,
    plugins: { tooltip: { mode: "index" as const, intersect: false }, legend: { display: false } },
    scales: {
      yV: { position: "left"  as const, grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
      yR: { position: "right" as const, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } },
      x:  { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 8 } },
    },
  };

  // ── Graphique 2 : Achalandage par jour ────────────────────────────────────
  const chartParJour = {
    labels: achalandage.parJour.map((j) => j.jour),
    datasets: [{
      label: "Visites",
      data: achalandage.parJour.map((j) => j.visites),
      backgroundColor: ACCENT, borderRadius: 6,
    }],
  };
  const optParJour: ChartOptions<"bar"> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: (ctx) => ` ${fmtNombre(ctx.parsed.y ?? 0)} visites`,
    }}},
    scales: {
      y: { grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  // Alertes preview : 3 non-lues les plus sévères
  const alertesPreview = alertes
    .filter((a) => !a.lue)
    .sort((a, b) => ({ critique: 0, attention: 1, positive: 2 }[a.severite] - { critique: 0, attention: 1, positive: 2 }[b.severite]))
    .slice(0, 3);

  const variations = p30v.variations;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ══ SECTION 1 : Hier ══ */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <div style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>Hier</h2>
          </div>
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>
            {hierDate.charAt(0).toUpperCase() + hierDate.slice(1)}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <KpiCard label="Membres actifs"    value={fmtNombre(hier.membresActifs)}   />
          <KpiCard label="Ventes"            value={fmtNombre(hier.ventes)}           />
          <KpiCard label="Revenus"           value={fmtArgent(hier.revenus)}          />
          <KpiCard label="Visites" value={fmtNombre(hier.visites)} />
          <KpiCard label="Réclamations"      value={fmtNombre(hier.reclamations)}     />
          <KpiCard label="Bonus joués"       value={fmtNombre(hier.bonusJoues)}       />
        </div>
      </section>

      {/* ══ SECTION 2 : Depuis le lancement ══ */}
      <section>
        <SectionTitle>Depuis le lancement</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div style={CARD}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Total membres</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtNombre(aVie.membresTotal)}</div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Total revenus</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtArgent(aVie.revenusTotal)}</div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Visites</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtNombre(aVie.visites)}</div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Revenus promos</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtArgent(aVie.promos.revenusAttribues)}</div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 3 : Variations 2 derniers mois ══ */}
      <section>
        <SectionTitle sub={varSub}>Variations — 2 derniers mois</SectionTitle>
        <div style={CARD}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {([
              ["Revenus",        variations.revenus,       fmtArgent(p30v.revenus)],
              ["Ventes",         variations.ventes,        fmtNombre(p30v.ventes)],
              ["Membres actifs", variations.membresActifs, fmtNombre(p30v.membresActifs)],
              ["Panier moyen",   variations.panierMoyen,   fmtArgent(p30v.panierMoyen)],
            ] as [string, number, string][]).map(([lbl, ratio, val]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{val}</div>
                <div style={{ fontSize: 13, color: varColor(ratio), fontWeight: 600, marginTop: 4 }}>
                  {varArrow(ratio)} {varText(ratio)}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Alertes preview (Prestige) ══ */}
      {isPrestige && alertesPreview.length > 0 && (
        <section>
          <SectionTitle>Alertes récentes</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alertesPreview.map((a, i) => <AlertePreview key={i} a={a} />)}
          </div>
        </section>
      )}

      {/* ══ SECTION 4 : Graphiques ══ */}
      <section>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
          <div style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>Visites &amp; revenus — 30 jours</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>15 juil. – 14 août 2026</p>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Visites", color: ACCENT,    ratio: p30v.variations.membresActifs },
                  { label: "Revenus", color: "#eb6834", ratio: p30v.variations.revenus },
                ].map(({ label, color, ratio }) => (
                  <div key={label} style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 3, background: color, display: "inline-block", borderRadius: 2 }} />
                    {label}&nbsp;
                    <span style={{ color: varColor(ratio), fontWeight: 600 }}>
                      {varArrow(ratio)} {varText(ratio)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 220 }}>
              <Line data={chartVisitesRevenus} options={optVisitesRevenus} />
            </div>
          </div>
          <div style={CARD}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>Achalandage par jour</h3>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>Visites moyennes par jour de semaine</p>
            <div style={{ height: 220 }}>
              <Bar data={chartParJour} options={optParJour} />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
