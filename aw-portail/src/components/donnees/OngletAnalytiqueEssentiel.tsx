"use client";

import { useMemo } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import type { AnalyticsGlobal, AnalyticsFranchise, RapportDoc } from "@/types/analytics";
import { fmtNombre, fmtArgent, fmtPct } from "@/lib/mockAnalytics";

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = "#0362E3";
const CARD: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "0.5px solid #E5E7EB",
  padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
};

const MOIS_FR: Record<number, string> = {
  1: "Jan", 2: "Fév", 3: "Mar",  4: "Avr",
  5: "Mai", 6: "Jun", 7: "Juil", 8: "Aoû",
  9: "Sep", 10: "Oct", 11: "Nov", 12: "Déc",
};
const MOIS_FR_LONG: Record<number, string> = {
  1: "Janvier", 2: "Février", 3: "Mars",    4: "Avril",
  5: "Mai",     6: "Juin",    7: "Juillet", 8: "Août",
  9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

// ─── Titre de section ─────────────────────────────────────────────────────────
function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 12, marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: "#6B7280", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Métrique card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={CARD}>
      <div style={{
        fontSize: 11, color: "#9CA3AF", textTransform: "uppercase",
        letterSpacing: 0.5, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Label analyse (pastille + texte sobre) ───────────────────────────────────
function AnalyseLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{
        fontSize: 13, fontWeight: 600, color: "#374151",
        textTransform: "uppercase", letterSpacing: 0.6,
      }}>
        {children}
      </span>
    </div>
  );
}

// ─── OngletAnalytiqueEssentiel ────────────────────────────────────────────────
interface Props {
  global:        AnalyticsGlobal;
  franchiseData: AnalyticsFranchise | null;
  franchiseName: string;
  rapports:      RapportDoc[];
}

export default function OngletAnalytiqueEssentiel({
  global, franchiseData, rapports,
}: Props) {

  const aVie = franchiseData?.aVie ?? global.aVie;

  // ── Bloc B — valeurs calculées ────────────────────────────────────────────
  const pointsDistribuesTotal = aVie.pointsDistribuesFactures + aVie.pointsDistribuesBonus;
  const pointsRachetes        = pointsDistribuesTotal - aVie.pointsEnCirculation;
  const pointsParMembre       = Math.round(aVie.pointsEnCirculation / aVie.membresTotal);

  // ── Rapport de performance le plus récent ─────────────────────────────────
  const rapportPerf = useMemo(() =>
    [...rapports]
      .filter((r) => r.type === "performance")
      .sort((a, b) => b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois)[0] ?? null,
    [rapports],
  );

  // ── Graphique 1 : revenus mensuels depuis le lancement ───────────────────
  const optMensuel: ChartOptions<"bar"> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${fmtArgent(ctx.parsed.y ?? 0)}` } },
    },
    scales: {
      y: { grid: { color: "#F3F4F6" }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };
  const chartMensuel = useMemo(() => ({
    labels: aVie.seriesMensuelles.map((s) => {
      const m = Number(s.mois.split("-")[1]);
      return MOIS_FR[m] ?? s.mois;
    }),
    datasets: [{
      label: "Revenus",
      data: aVie.seriesMensuelles.map((s) => s.revenus),
      backgroundColor: ACCENT, borderRadius: 6,
    }],
  }), [aVie]);

  // ── Graphique 2 : répartition des points ─────────────────────────────────
  const chartPoints = useMemo(() => ({
    labels: ["Points rachetés", "Points en circulation"],
    datasets: [{
      data: [pointsRachetes, aVie.pointsEnCirculation],
      backgroundColor: ["#1baf7a", "#E5E7EB"],
      borderWidth: 0,
    }],
  }), [pointsRachetes, aVie.pointsEnCirculation]);

  const optPoints: ChartOptions<"doughnut"> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12 }, padding: 16 } },
      tooltip: { callbacks: { label: (ctx) => ` ${fmtNombre(ctx.parsed ?? 0)} pts` } },
    },
    cutout: "62%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ══ Rapport de performance — en tête d'onglet ══ */}
      {rapportPerf && (
        <section>
          <SectionTitle sub="Rapport de performance le plus récent — Analyse IA">
            Rapport de performance
          </SectionTitle>
          <div style={CARD}>
            <div style={{
              display: "flex", alignItems: "flex-start",
              justifyContent: "space-between", marginBottom: 20,
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                  {MOIS_FR_LONG[rapportPerf.mois]} {rapportPerf.annee}
                </h3>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                  Généré le {rapportPerf.generatedAt.toLocaleDateString("fr-CA", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
              {rapportPerf.pdfUrl && (
                <button style={{
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: "white", color: "#374151",
                  border: "1px solid #D1D5DB", cursor: "pointer",
                }}>
                  ↓ Télécharger PDF
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <AnalyseLabel color="#1baf7a">Points positifs</AnalyseLabel>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {rapportPerf.analyseIA.bonsCoups.slice(0, 1).map((pt, i) => (
                    <li key={i} style={{
                      padding: "10px 14px", background: "#f0fdf4", borderRadius: 10,
                      fontSize: 13, color: "#374151", borderLeft: "3px solid #1baf7a",
                    }}>
                      {pt}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 10, fontStyle: "italic" }}>
                  Le forfait Prestige déverrouille 2 points d&apos;analyse supplémentaires.
                </p>
              </div>
              <div>
                <AnalyseLabel color="#f59e0b">À travailler</AnalyseLabel>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {rapportPerf.analyseIA.aTravailler.slice(0, 1).map((pt, i) => (
                    <li key={i} style={{
                      padding: "10px 14px", background: "#fffbeb", borderRadius: 10,
                      fontSize: 13, color: "#374151", borderLeft: "3px solid #f59e0b",
                    }}>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ Bloc A — Volumes ══ */}
      <section>
        <SectionTitle sub="Données cumulatives depuis le lancement">Volumes</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <MetricCard label="Membres totaux"        value={fmtNombre(aVie.membresTotal)} />
          <MetricCard label="Visites"      value={fmtNombre(aVie.visites)} />
          <MetricCard label="Revenus totaux"        value={fmtArgent(aVie.revenusTotal)} />
          <MetricCard label="Panier moyen"          value={fmtArgent(aVie.panierMoyen)} />
          <MetricCard label="Revenu moyen par jour" value={fmtArgent(aVie.moyenneRevenusParJour)} />
          <MetricCard label="Revenu par membre"     value={fmtArgent(aVie.revenuParMembre)} />
        </div>
      </section>

      {/* ══ Bloc B — Économie des points ══ */}
      <section>
        <SectionTitle sub="Depuis le lancement">Économie des points</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <MetricCard label="Points distribués — factures" value={fmtNombre(aVie.pointsDistribuesFactures)} />
          <MetricCard label="Points distribués — bonus"    value={fmtNombre(aVie.pointsDistribuesBonus)} />
          <MetricCard label="Points total distribués"      value={fmtNombre(pointsDistribuesTotal)} />
          <MetricCard label="Points rachetés"              value={fmtNombre(pointsRachetes)} />
          <MetricCard label="Points en circulation"        value={fmtNombre(aVie.pointsEnCirculation)} sub="passif non réclamé" />
          <MetricCard label="Points par membre"            value={fmtNombre(pointsParMembre)} sub="en circulation / membres" />
          <MetricCard label="Burn rate"                    value={fmtPct(aVie.burnRate)}   sub="points rachetés / émis" />
          <MetricCard label="Breakage rate"                value={fmtPct(aVie.breakageRate)} sub="points jamais réclamés" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginTop: 16 }}>
          <MetricCard label="Churn moyen mensuel"       value={fmtPct(aVie.churnMoyenMensuel)}      sub="moyenne depuis le lancement" />
          <MetricCard label="Taux de visite moyen"      value={fmtPct(aVie.tauxVisiteMoyenMensuel)} sub="membres actifs / total / mois" />
        </div>
      </section>

      {/* ══ Bloc C — Bonus et récompenses ══ */}
      <section>
        <SectionTitle sub="Depuis le lancement">Bonus et récompenses</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <MetricCard label="Bonus joués"  value={fmtNombre(aVie.bonusJoues)} />
          <MetricCard label="Réclamations" value={fmtNombre(aVie.reclamations)} />
        </div>
      </section>

      {/* ══ Bloc D — Promotions ══ */}
      <section>
        <SectionTitle sub="Depuis le lancement">Promotions</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <MetricCard label="Promotions lancées" value={fmtNombre(aVie.promos.lancees)} />
          <MetricCard label="Conversions"        value={fmtNombre(aVie.promos.conversions)} />
          <MetricCard label="Revenus attribués"  value={fmtArgent(aVie.promos.revenusAttribues)} />
        </div>
        {aVie.promos.meilleurePromo && (
          <div style={{ ...CARD, marginTop: 16, borderLeft: `4px solid ${ACCENT}` }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Meilleure promotion depuis le lancement
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
              {aVie.promos.meilleurePromo.nom}
            </div>
            <div style={{ fontSize: 14, color: "#374151" }}>
              {fmtArgent(aVie.promos.meilleurePromo.revenusAttribues)} de revenus attribués
            </div>
          </div>
        )}
      </section>

      {/* ══ Bloc E — Notifications ══ */}
      <section>
        <SectionTitle sub="Depuis le lancement">Notifications</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <MetricCard label="Notifications envoyées" value={fmtNombre(aVie.notifications.envoyees)} />
          <MetricCard label="Taux d'ouverture moyen" value={fmtPct(aVie.notifications.tauxOuverture)} />
        </div>
      </section>

      {/* ══ Bloc F — Graphiques ══ */}
      <section>
        <SectionTitle>Graphiques</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
          <div style={CARD}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
              Revenus mensuels depuis le lancement
            </h3>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>
              Mois complets — données partielles exclues
            </p>
            <div style={{ height: 220 }}>
              <Bar data={chartMensuel} options={optMensuel} />
            </div>
          </div>
          <div style={CARD}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
              Répartition des points
            </h3>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 12px" }}>
              {fmtNombre(pointsDistribuesTotal)} points distribués au total
            </p>
            <div style={{ height: 200 }}>
              <Doughnut data={chartPoints} options={optPoints} />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
