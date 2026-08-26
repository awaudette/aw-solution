"use client";

import { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, LineElement, PointElement,
  BarElement, Tooltip, Filler,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import type {
  AnalyticsGlobal, PeriodeAVie, PeriodeStandard, Periode30j, Periode90j,
  RapportDoc, PromotionDetail,
} from "@/types/analytics";
import { fmtNombre, fmtArgent, fmtPct } from "@/lib/mockAnalytics";

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Tooltip, Filler);

const CARD: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "0.5px solid #E5E7EB",
  padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function varColor(r: number) {
  return r > 0.001 ? "#1baf7a" : r < -0.001 ? "#ef4444" : "#888780";
}
function varText(r: number) {
  const abs = Math.abs(r * 100).toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${r >= 0 ? "+" : "-"}${abs} %`;
}
function Tip({ text }: { text: string }) {
  return <span title={text} style={{ cursor: "help", color: "#9CA3AF", fontSize: 13, marginLeft: 4 }}>ⓘ</span>;
}
function abbrevJour(j: string) {
  return j.substring(0, 3);
}

// ─── Metric card ─────────────────────────────────────────────────────────────
interface MetricProps {
  label: string; value: string; sub?: string; tip?: string;
  varRatio?: number; compact?: boolean;
}
function Metric({ label, value, sub, tip, varRatio, compact }: MetricProps) {
  return (
    <div style={{ ...CARD, ...(compact ? { padding: 16 } : {}) }}>
      <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "flex", alignItems: "center" }}>
        {label}{tip && <Tip text={tip} />}
      </div>
      <div style={{ fontSize: compact ? 22 : 26, fontWeight: 700, color: "#111827" }}>{value}</div>
      {varRatio != null && (
        <div style={{ fontSize: 12, color: varColor(varRatio), fontWeight: 600, marginTop: 4 }}>
          {varText(varRatio)} vs précédent
        </div>
      )}
      {sub && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Achalandage heatmap (données dynamiques) ─────────────────────────────────
function SecAchalandage({ achalandage }: { achalandage: AnalyticsGlobal["achalandage"] }) {
  const lookup: Record<string, number> = {};
  achalandage.parPlage.forEach(({ jour, plage, visites }) => {
    lookup[`${jour}_${plage}`] = visites;
  });
  // Extraire jours et plages dans leur ordre d'apparition
  const jours  = Array.from(new Set(achalandage.parPlage.map((p) => p.jour)));
  const plages = Array.from(new Set(achalandage.parPlage.map((p) => p.plage)));
  const allVals = Object.values(lookup);
  const maxV    = Math.max(...allVals, 1);
  function cellBg(v: number) {
    const t = v / maxV;
    return `rgb(${Math.round(255 - t * 213)},${Math.round(255 - t * 135)},${Math.round(255 - t * 41)})`;
  }
  function cellFg(v: number) { return (v / maxV) > .55 ? "white" : "#374151"; }

  return (
    <div style={CARD}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Achalandage par plage horaire</h3>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>Visites par jour et tranche horaire</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 12px", color: "#9CA3AF", fontWeight: 500, textAlign: "left" }}>Jour</th>
              {plages.map((p) => (
                <th key={p} style={{ padding: "6px 12px", color: "#9CA3AF", fontWeight: 500, textAlign: "center" }}>{p}</th>
              ))}
              <th style={{ padding: "6px 12px", color: "#9CA3AF", fontWeight: 500, textAlign: "center" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {jours.map((jour) => {
              const rowVals = plages.map((p) => lookup[`${jour}_${p}`] ?? 0);
              const total   = rowVals.reduce((a, b) => a + b, 0);
              return (
                <tr key={jour}>
                  <td style={{ padding: "5px 12px", fontWeight: 600, color: "#374151" }}>{abbrevJour(jour)}</td>
                  {rowVals.map((v, i) => (
                    <td key={i} style={{
                      padding: "5px 12px", textAlign: "center", borderRadius: 6,
                      background: cellBg(v), color: cellFg(v),
                      fontWeight: v > maxV * 0.6 ? 700 : 400,
                    }}>
                      {fmtNombre(v)}
                    </td>
                  ))}
                  <td style={{ padding: "5px 12px", textAlign: "center", fontWeight: 700, color: "#374151" }}>
                    {fmtNombre(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fréquence de visite ──────────────────────────────────────────────────────
function SecFrequenceVisite({ global }: { global: AnalyticsGlobal }) {
  return (
    <div style={CARD}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Fréquence de visite</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {global.frequenceVisite.map(({ tranche, membres }) => {
          const pct = (membres / global.aVie.membresTotal) * 100;
          return (
            <div key={tranche} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#6B7280", width: 140, flexShrink: 0 }}>{tranche}</span>
              <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 6, height: 20 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#2a78d6", borderRadius: 6 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", width: 80, textAlign: "right" }}>
                {fmtNombre(membres)}{" "}
                <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({fmtPct(pct, 0)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top récompenses ──────────────────────────────────────────────────────────
function SecRecompenses({ global }: { global: AnalyticsGlobal }) {
  return (
    <div style={CARD}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Récompenses — top réclamations</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
              {["Récompense", "Réclamations", "Points utilisés", "Food cost", "% Food cost"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Récompense" ? "left" : "right", color: "#9CA3AF", fontWeight: 500, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {global.recompenses.slice(0, 6).map((r) => (
              <tr key={r.nom} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <td style={{ padding: "10px 12px", color: "#111827", fontWeight: 500 }}>{r.nom}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{fmtNombre(r.reclamations)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{fmtNombre(r.pointsUtilises)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#374151" }}>{fmtArgent(r.foodCost)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.pourcentageFoodCost > 30 ? "#ef4444" : r.pourcentageFoodCost > 20 ? "#f59e0b" : "#1baf7a" }}>
                    {fmtPct(r.pourcentageFoodCost)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Promotions lancées (avec pagination) ─────────────────────────────────────
// RÈGLE DE PÉRIODE : seule dateDebutISO détermine l'inclusion.
// Une promo lancée avant windowStart est EXCLUE — même si elle est encore active.
const PROMOS_PAR_PAGE = 5;

interface SecPromosProps {
  promotions: PromotionDetail[];
  /** "YYYY-MM-DD" — exclure toute promo dont dateDebutISO < windowStart.
   *  Absent = sous-onglet « Depuis le lancement », aucun filtre de date. */
  windowStart?: string;
}

function SecPromotionsLancees({ promotions, windowStart }: SecPromosProps) {
  const [page, setPage] = useState(0);

  const globales = promotions.filter(
    (p) => p.portee === "globale" && (!windowStart || p.dateDebutISO >= windowStart),
  );
  const totalPages = Math.max(1, Math.ceil(globales.length / PROMOS_PAR_PAGE));
  const visible    = globales.slice(page * PROMOS_PAR_PAGE, (page + 1) * PROMOS_PAR_PAGE);

  const sous = windowStart
    ? `${globales.length} promotion${globales.length !== 1 ? "s" : ""} globale${globales.length !== 1 ? "s" : ""} lancée${globales.length !== 1 ? "s" : ""} dans cette période`
    : `${globales.length} promotion${globales.length !== 1 ? "s" : ""} globale${globales.length !== 1 ? "s" : ""} depuis le lancement`;

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>Promotions lancées</h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{sous}</p>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: page === 0 ? "#F3F4F6" : "white", color: page === 0 ? "#9CA3AF" : "#374151",
                border: "1px solid #E5E7EB", cursor: page === 0 ? "default" : "pointer" }}>
              ←
            </button>
            <span style={{ fontSize: 12, color: "#6B7280" }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: page === totalPages - 1 ? "#F3F4F6" : "white", color: page === totalPages - 1 ? "#9CA3AF" : "#374151",
                border: "1px solid #E5E7EB", cursor: page === totalPages - 1 ? "default" : "pointer" }}>
              →
            </button>
          </div>
        )}
      </div>

      {globales.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
          Aucune promotion globale lancée durant cette période.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((p) => (
            <div key={p.id} style={{ border: "0.5px solid #E5E7EB", borderLeft: "3px solid #2a78d6", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{p.nom}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    Lancée le {new Date(p.dateDebutISO + "T12:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}{p.typeRabais}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2a78d6", background: "#EFF6FF", borderRadius: 12, padding: "2px 10px", flexShrink: 0 }}>
                  ROI {p.roi.toFixed(1).replace(".", ",")}×
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 14px", lineHeight: 1.55 }}>{p.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {([
                  ["Utilisations",    fmtNombre(p.utilisations)],
                  ["Clics",          fmtNombre(p.clics)],
                  ["Coût réel",      fmtArgent(p.coutReel)],
                  ["Val. distribuée",fmtArgent(p.valeurDistribuee)],
                  ["Revenus générés",fmtArgent(p.revenusGeneres)],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Performance campagnes (tableau agrégé) ───────────────────────────────────
// Source : d.promos (pré-agrégé par portailSyncJob pour la période) + d.notifications
interface PerfCampagnesProps {
  d: PeriodeStandard;
  title?: string; // "Performance campagnes" (30j/90j) ou "Performance promos" (7j)
}
function SecPerformanceCampagnes({ d, title = "Performance campagnes" }: PerfCampagnesProps) {
  const rows: [string, string][] = [
    ["Promos lancées",          fmtNombre(d.promos.lancees)],
    ["Revenus attribués",       fmtArgent(d.promos.revenusAttribues)],
    ["Promos réclamées",        fmtNombre(d.promos.conversions)],
    ["Clics",                   fmtNombre(d.promos.clics)],
    ["Notifications envoyées (destinataires)", fmtNombre(d.notifications.envoyees)],
    ["Taux d'ouverture",        fmtPct(d.notifications.tauxOuverture)],
  ];
  return (
    <div style={CARD}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ borderLeft: "3px solid #E5E7EB", paddingLeft: 12 }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .4, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score de fidélité ────────────────────────────────────────────────────────
function SecScoreFidelite({ d }: { d: Periode90j }) {
  if (!d.scoreFidelite) return null;
  const sf   = d.scoreFidelite;
  const hist = sf.historique;
  const badgeColor = (n: string) =>
    n === "fort" ? "#1baf7a" : n === "modere" ? "#f59e0b" : "#ef4444";
  const badgeLabel = (n: string) =>
    n === "fort" ? "Fort" : n === "modere" ? "Modéré" : "Faible";

  return (
    <div style={CARD}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>Score de fidélité — 3 derniers mois</h3>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Score principal */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#2a78d6", lineHeight: 1 }}>{sf.score}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>/ 100</div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {(Object.entries(sf.badges) as [string, string][]).map(([k, v]) => {
            const keyLabel = { retention: "Rétention", engagement: "Engagement", croissance: "Croissance" }[k] ?? k;
            const c = badgeColor(v);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#6B7280", width: 90 }}>{keyLabel}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: c, background: `${c}18`, borderRadius: 12, padding: "3px 10px" }}>
                  {badgeLabel(v)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Historique mensuel avec variation */}
        <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
          {hist.map((h, i) => {
            const variation = i > 0 ? h.score - hist[i - 1].score : null;
            return (
              <div key={h.mois} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>{h.mois}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{h.score}</div>
                {variation !== null && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: variation > 0 ? "#1baf7a" : variation < 0 ? "#ef4444" : "#9CA3AF", marginTop: 4 }}>
                    {variation > 0 ? "+" : ""}{variation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ─── Graphique double axe visites & revenus ───────────────────────────────────
function LineChart({ d, label, seriesLabel }: { d: PeriodeStandard; label: string; seriesLabel: string }) {
  const chartData = {
    labels: d.series.map((s) => { const [, , dd] = s.date.split("-"); return dd; }),
    datasets: [
      { label: "Visites", data: d.series.map((s) => s.visites),
        borderColor: "#2a78d6", backgroundColor: "rgba(42,120,214,.08)",
        fill: true, tension: 0.4, pointRadius: 0, yAxisID: "yV" },
      { label: "Revenus ($)", data: d.series.map((s) => s.revenus),
        borderColor: "#eb6834", backgroundColor: "transparent",
        fill: false, tension: 0.4, pointRadius: 0, yAxisID: "yR" },
    ],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { tooltip: { mode: "index" as const, intersect: false }, legend: { display: false } },
    scales: {
      yV: { position: "left"  as const, grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
      yR: { position: "right" as const, grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } },
      x:  { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 10 } },
    },
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
          <span style={{ width: 12, height: 3, background: "#2a78d6", borderRadius: 2, display: "inline-block" }} />
          Visites
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
          <span style={{ width: 12, height: 3, background: "#eb6834", borderRadius: 2, display: "inline-block" }} />
          Revenus
        </div>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>Visites &amp; revenus — {label}</h3>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>{seriesLabel}</p>
      <div style={{ height: 240 }}>
        <Line data={chartData} options={chartOpts} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sous-onglet « Depuis le lancement » ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function TabAVie({ d, global }: { d: PeriodeAVie; global: AnalyticsGlobal }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Metric label="Membres total"         value={fmtNombre(d.membresTotal)} />
        <Metric label="Revenus total"         value={fmtArgent(d.revenusTotal)} />
        <Metric label="Visites"               value={fmtNombre(d.visites)} />
        <Metric label="Panier moyen"          value={fmtArgent(d.panierMoyen)} />
        <Metric label="Rev. moyen / jour"     value={fmtArgent(d.moyenneRevenusParJour)} sub="depuis le lancement" />
        <Metric label="Rev. / membre"         value={fmtArgent(d.revenuParMembre)} />
        <Metric label="Réclamations"          value={fmtNombre(d.reclamations)} sub="récompenses" />
        <Metric label="Bonus joués"           value={fmtNombre(d.bonusJoues)} />
        <Metric label="Points en circulation" value={fmtNombre(d.pointsEnCirculation)} />
        <Metric label="Burn rate"             value={fmtPct(d.burnRate)}
          tip="Pourcentage des points émis qui ont été rachetés depuis le lancement." />
        <Metric label="Breakage rate"         value={fmtPct(d.breakageRate)}
          tip="Pourcentage des points émis jamais réclamés (100 – Burn rate)." />
        <Metric label="Churn moyen mensuel"   value={fmtPct(d.churnMoyenMensuel)} sub="moy. mensuelle depuis lancement" />
        <Metric label="Taux de visite moyen"  value={fmtPct(d.tauxVisiteMoyenMensuel)}
          tip="Moyenne mensuelle du rapport membres actifs / membres total depuis le lancement." />
      </div>

      {/* Notifications — sans meilleure campagne */}
      <div style={CARD}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 14px" }}>Notifications — depuis le lancement</h3>
        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Envoyées</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtNombre(d.notifications.envoyees)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Taux d&apos;ouverture moyen</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{fmtPct(d.notifications.tauxOuverture)}</div>
          </div>
        </div>
      </div>

      {/* Ordre imposé : Promotions → Récompenses → Fréquence → Achalandage */}
      <SecPromotionsLancees promotions={global.promotionsDetail} />
      <SecRecompenses global={global} />
      <SecFrequenceVisite global={global} />
      <SecAchalandage achalandage={global.achalandage} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sous-onglet 7 jours ─────────────────────────────────────────────────────
// RÈGLE DE PÉRIODE : aucune promo lancée hors de la fenêtre n'apparaît.
// → Pas de section « Promotions lancées » (aucune promo globale dans la fenêtre 7j).
// → Tableau « Performance promos » agrégé (d.promos pré-filtré côté serveur).
// ═══════════════════════════════════════════════════════════════════════════════
function Tab7j({ d, global }: { d: PeriodeStandard; global: AnalyticsGlobal }) {
  const revMoyJour = d.revenus / 7;
  const pointsTotal = d.pointsEmisFactures + d.pointsEmisBonus;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* Pas de varRatio ici : lastAppOpenAt ne garde que la dernière ouverture de
            chaque membre, donc une variation sur une fenêtre passée sous-compte
            massivement et n'est pas fiable. Le décompte lui-même reste juste. */}
        <Metric label="Membres actifs"    value={fmtNombre(d.membresActifs)} />
        <Metric label="Nouveaux membres"  value={fmtNombre(d.nouveauxMembres)} />
        <Metric label="Revenus"           value={fmtArgent(d.revenus)}           varRatio={d.variations.revenus} />
        <Metric label="Panier moyen"      value={fmtArgent(d.panierMoyen)}        varRatio={d.variations.panierMoyen} />
        <Metric label="Visites"           value={fmtNombre(d.visites)} />
        <Metric label="Rev. moyen / jour" value={fmtArgent(revMoyJour)} sub="7 jours" />
        <Metric label="Taux de visite"    value={fmtPct(d.tauxVisite)}
          tip="Pourcentage de vos membres actifs ayant visité dans les 7 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Rev. par visite"   value={fmtArgent(d.revenuParVisite)} />
        <Metric label="Bonus joués"       value={fmtNombre(d.bonusJoues)} />
        <Metric label="Participation bonus" value={fmtPct(d.participationBonus)}
          tip="Pourcentage de vos membres actifs ayant joué au bonus dans les 7 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Points émis total" value={fmtNombre(pointsTotal)}
          tip={`Factures : ${fmtNombre(d.pointsEmisFactures)} · Bonus : ${fmtNombre(d.pointsEmisBonus)}`} />
      </div>

      <LineChart d={d} label="7 jours" seriesLabel="8–14 août 2026" />
      <SecAchalandage achalandage={global.achalandage} />
      {/* Pas de section Promotions lancées : aucune promo globale lancée dans la fenêtre 7j.
          Le tableau ci-dessous agrège les données de promos pré-filtrées côté serveur. */}
      <SecPerformanceCampagnes d={d} title="Performance promos" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sous-onglet 30 jours ────────────────────────────────────────────────────
// RÈGLE DE PÉRIODE : fenêtre = series[0].date ("2026-07-15").
// → promo-rentree (2026-08-01) incluse ; promo-golf20 (2026-07-01) exclue.
// ═══════════════════════════════════════════════════════════════════════════════
function Tab30j({ d, global }: { d: Periode30j; global: AnalyticsGlobal }) {
  const windowStart = d.series[0]?.date ?? "";
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* Pas de varRatio ici : lastAppOpenAt ne garde que la dernière ouverture de
            chaque membre, donc une variation sur une fenêtre passée sous-compte
            massivement et n'est pas fiable. Le décompte lui-même reste juste. */}
        <Metric label="Membres actifs"     value={fmtNombre(d.membresActifs)} />
        <Metric label="Nouveaux membres"   value={fmtNombre(d.nouveauxMembres)} />
        <Metric label="Revenus"            value={fmtArgent(d.revenus)}            varRatio={d.variations.revenus} />
        <Metric label="Panier moyen"       value={fmtArgent(d.panierMoyen)}         varRatio={d.variations.panierMoyen} />
        <Metric label="Visites"            value={fmtNombre(d.visites)} />
        <Metric label="Taux de visite"     value={fmtPct(d.tauxVisite)}
          tip="Pourcentage de vos membres actifs ayant visité dans les 30 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Rev. par visite"    value={fmtArgent(d.revenuParVisite)} />
        <Metric label="Réclamations"       value={fmtNombre(d.reclamations)} sub="récompenses" />
        <Metric label="Bonus joués"        value={fmtNombre(d.bonusJoues)} />
        <Metric label="Participation bonus"value={fmtPct(d.participationBonus)}
          tip="Pourcentage de vos membres actifs ayant joué au bonus dans les 30 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Taux de churn"      value={fmtPct(d.tauxChurn)}
          tip="% de membres perdus durant les 30 jours." />
        <Metric label="Customer momentum"  value={d.customerMomentum.toFixed(2).replace(".", ",")}
          tip="Ratio visites ce mois / visites mois précédent. >1 = croissance." />
        <Metric label="Pts moy. / membre"  value={fmtNombre(d.pointsMoyensParMembre)} />
      </div>

      <LineChart d={d} label="30 jours" seriesLabel="15 juil. – 14 août 2026" />
      <SecRecompenses global={global} />
      {/* Promotions lancées : filtrées par windowStart — promo-rentree (2026-08-01) uniquement */}
      <SecPromotionsLancees promotions={global.promotionsDetail} windowStart={windowStart} />
      <SecPerformanceCampagnes d={d} />
      <SecAchalandage achalandage={global.achalandage} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sous-onglet 90 jours ────────────────────────────────────────────────────
// RÈGLE DE PÉRIODE : fenêtre = series[0].date ("2026-05-15").
// → promo-ete-2pour1 (2026-06-01), promo-golf20 (2026-07-01),
//   promo-rentree (2026-08-01) incluses.
// ═══════════════════════════════════════════════════════════════════════════════
function Tab90j({ d, global }: { d: Periode90j; global: AnalyticsGlobal }) {
  const windowStart  = d.series[0]?.date ?? "";
  const revMoyJour   = d.revenus / 90;
  const pointsTotal  = d.pointsEmisFactures + d.pointsEmisBonus;

  const chartMensuel = {
    labels: d.seriesMensuelles.map((s) => {
      const [y, m] = s.mois.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-CA", { month: "short" });
    }),
    datasets: [{
      label: "Revenus ($)",
      data: d.seriesMensuelles.map((s) => s.revenus),
      backgroundColor: "#2a78d6", borderRadius: 6,
    }],
  };
  const chartOpts: ChartOptions<"bar"> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${fmtArgent(ctx.parsed.y ?? 0)}` } } },
    scales: {
      y: { grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
    },
  };

  return (
    <>
      {/* 1ère section : Score de fidélité */}
      <SecScoreFidelite d={d} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* Pas de varRatio ici : lastAppOpenAt ne garde que la dernière ouverture de
            chaque membre, donc une variation sur une fenêtre passée sous-compte
            massivement et n'est pas fiable. Le décompte lui-même reste juste. */}
        <Metric label="Membres actifs"      value={fmtNombre(d.membresActifs)} />
        <Metric label="Nouveaux membres"    value={fmtNombre(d.nouveauxMembres)} />
        <Metric label="Revenus"             value={fmtArgent(d.revenus)}            varRatio={d.variations.revenus} />
        <Metric label="Rev. par membre"     value={fmtArgent(d.revenuParMembre)} />
        <Metric label="Visites"             value={fmtNombre(d.visites)} />
        <Metric label="Panier moyen"        value={fmtArgent(d.panierMoyen)}         varRatio={d.variations.panierMoyen} />
        <Metric label="Taux de visite"      value={fmtPct(d.tauxVisite)}
          tip="Pourcentage de vos membres actifs ayant visité dans les 90 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Rev. par visite"     value={fmtArgent(d.revenuParVisite)} />
        <Metric label="Rev. moyen / jour"   value={fmtArgent(revMoyJour)} sub="90 jours" />
        <Metric label="Réclamations"        value={fmtNombre(d.reclamations)} sub="récompenses" />
        <Metric label="Bonus joués"         value={fmtNombre(d.bonusJoues)} />
        <Metric label="Participation bonus" value={fmtPct(d.participationBonus)}
          tip="Pourcentage de vos membres actifs ayant joué au bonus dans les 90 derniers jours. Ce pourcentage est calculé sur vos membres actifs et non sur vos membres totaux, ce qui explique la différence avec le chiffre affiché dans votre application." />
        <Metric label="Breakage rate"       value={fmtPct(d.breakageRate)}
          tip="% des points émis jamais réclamés sur la période." />
        <Metric label="Taux de churn"       value={fmtPct(d.tauxChurn)}
          tip="% de membres perdus sur les 90 jours." />
        <Metric label="Pts émis / factures" value={fmtNombre(d.pointsEmisFactures)} />
        <Metric label="Pts émis / bonus"    value={fmtNombre(d.pointsEmisBonus)} />
        <Metric label="Points émis total"   value={fmtNombre(pointsTotal)}
          tip={`Factures : ${fmtNombre(d.pointsEmisFactures)} · Bonus : ${fmtNombre(d.pointsEmisBonus)}`} />
      </div>

      <div style={CARD}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Revenus par mois — 90 jours</h3>
        <div style={{ height: 200 }}>
          <Bar data={chartMensuel} options={chartOpts} />
        </div>
      </div>

      <SecRecompenses global={global} />
      <SecFrequenceVisite global={global} />
      {/* Promotions lancées : filtrées par windowStart — 3 promos dans la fenêtre 90j */}
      <SecPromotionsLancees promotions={global.promotionsDetail} windowStart={windowStart} />
      <SecPerformanceCampagnes d={d} />
      <SecAchalandage achalandage={global.achalandage} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── OngletAnalytique ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
type SubTab = "aVie" | "7j" | "30j" | "90j";
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "aVie", label: "Depuis le lancement" },
  { id: "7j",   label: "7 jours"             },
  { id: "30j",  label: "30 jours"            },
  { id: "90j",  label: "90 jours"            },
];

interface Props { global: AnalyticsGlobal; franchiseName?: string; rapports?: RapportDoc[] }

export default function OngletAnalytique({ global }: Props) {
  const [sub, setSub] = useState<SubTab>("aVie");

  function subTabStyle(active: boolean): React.CSSProperties {
    return {
      padding: "7px 16px", fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? "white" : "#6B7280",
      background: active ? "#2a78d6" : "#F3F4F6",
      border: "none", borderRadius: 8, cursor: "pointer", transition: "all .15s",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Mention de méthode : le sous-onglet 90 jours du portail est une fenêtre
          glissante, alors que l'application mobile affiche les 3 derniers mois
          calendaires complets — ce sont deux périodes différentes, d'où certains
          écarts de chiffres qui ne sont pas des erreurs. */}
      <div style={{
        padding: "10px 16px", borderRadius: 10, background: "#EFF6FF",
        border: "1px solid #BFDBFE", fontSize: 12, color: "#1e3a8a",
      }}>
        ℹ️ Le portail affiche les 90 derniers jours glissants, alors que l&apos;application mobile
        affiche les 3 derniers mois calendaires complets — ce qui explique certaines différences
        de chiffres entre les deux.
      </div>

      {/* Sélecteur de période */}
      <div style={{ display: "flex", gap: 8 }}>
        {SUB_TABS.map((t) => (
          <button key={t.id} style={subTabStyle(sub === t.id)} onClick={() => setSub(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "aVie" && <TabAVie d={global.aVie} global={global} />}
      {sub === "7j"   && <Tab7j   d={global["7j"]} global={global} />}
      {sub === "30j"  && <Tab30j  d={global["30j"]} global={global} />}
      {sub === "90j"  && <Tab90j  d={global["90j"]} global={global} />}
    </div>
  );
}
