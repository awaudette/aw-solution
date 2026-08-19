"use client";

/**
 * AnalyticsCharts.tsx
 * Tous les composants Chart.js isolés ici.
 * Importé uniquement via next/dynamic ({ ssr: false }) dans la page rapports.
 * Cela évite que Turbopack essaie de résoudre chart.js côté SSR.
 */

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler, RadialLinearScale,
} from "chart.js";
import { Bar, Line, Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler, RadialLinearScale
);

const MUTED = "#6B7280";
const C = {
  blue:   "#2a78d6",
  orange: "#eb6834",
  green:  "#1baf7a",
  gold:   "#eda100",
  gray:   "#888780",
};

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1F2937",
      titleColor: "#F9FAFB",
      bodyColor: "#E5E7EB",
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: MUTED, font: { size: 11 } } },
    y: { grid: { color: "#F3F4F6" }, ticks: { color: MUTED, font: { size: 11 } } },
  },
} as const;

// ─── Visites + Revenus (bar+line) ──────────────────────────────────────────────

export function ChartVisitesRevenus({ visitesRevenus }: { visitesRevenus: { date: string; visites: number; revenus: number }[] }) {
  const data = {
    labels: visitesRevenus.map(d => d.date),
    datasets: [
      {
        type: "bar" as const,
        label: "Visites",
        data: visitesRevenus.map(d => d.visites),
        backgroundColor: C.blue + "AA",
        borderRadius: 4,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "Revenus ($)",
        data: visitesRevenus.map(d => d.revenus),
        borderColor: C.orange,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        yAxisID: "y1",
      },
    ],
  };
  const options = {
    ...BASE_OPTS,
    plugins: { ...BASE_OPTS.plugins, legend: { display: true, position: "top" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x:  BASE_OPTS.scales.x,
      y:  { ...BASE_OPTS.scales.y, position: "left"  as const, beginAtZero: true },
      y1: { ...BASE_OPTS.scales.y, position: "right" as const, beginAtZero: true, grid: { display: false } },
    },
  };
  return (
    <div style={{ height: 220 }}>
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}

// ─── Visites par jour de semaine ──────────────────────────────────────────────

export function ChartJoursSemaine({ parJour }: { parJour: { jour: string; visites: number }[] }) {
  const data = {
    labels: parJour.map(d => d.jour.slice(0, 3)),
    datasets: [{
      label: "Visites",
      data: parJour.map(d => d.visites),
      backgroundColor: parJour.map((_, i) => `rgba(42,120,214,${[0.4, 0.55, 0.65, 0.5, 1, 0.85, 0.4][i]})`),
      borderRadius: 6,
    }],
  };
  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={BASE_OPTS as Parameters<typeof Bar>[0]["options"]} />
    </div>
  );
}

// ─── Évolution segments (barres empilées) ─────────────────────────────────────

export function ChartSegmentsEvo({ historique }: { historique: { mois: string; vip: number; reguliers: number; aRisque: number; inactifs: number }[] }) {
  const data = {
    labels: historique.map(h => h.mois),
    datasets: [
      { label: "VIP",       data: historique.map(h => h.vip),       backgroundColor: C.gold   + "CC", fill: true },
      { label: "Réguliers", data: historique.map(h => h.reguliers), backgroundColor: C.green  + "99", fill: true },
      { label: "À risque",  data: historique.map(h => h.aRisque),   backgroundColor: C.orange + "99", fill: true },
      { label: "Inactifs",  data: historique.map(h => h.inactifs),  backgroundColor: C.gray   + "66", fill: true },
    ],
  };
  const options = {
    ...BASE_OPTS,
    plugins: { ...BASE_OPTS.plugins, legend: { display: true, position: "top" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
    scales: { x: BASE_OPTS.scales.x, y: { ...BASE_OPTS.scales.y, stacked: true } },
  };
  return (
    <div style={{ height: 240 }}>
      <Bar data={data} options={options as Parameters<typeof Bar>[0]["options"]} />
    </div>
  );
}

// ─── Rétention par cohorte ────────────────────────────────────────────────────

export function ChartCohortes({ cohortes }: { cohortes: { cohorte: string; retention: number[] }[] }) {
  const palette = [C.blue, C.green, C.gold, C.orange, "#8B5CF6", C.gray];
  const data = {
    labels: ["M0", "M1", "M2", "M3", "M4", "M5"],
    datasets: cohortes.map((c, i) => ({
      label: c.cohorte,
      data: c.retention,
      borderColor: palette[i % palette.length],
      backgroundColor: "transparent",
      borderWidth: 2,
      borderDash: i < 3 ? [] : [5, 3],
      pointRadius: 4,
      tension: 0.3,
    })),
  };
  const options = {
    ...BASE_OPTS,
    plugins: { ...BASE_OPTS.plugins, legend: { display: true, position: "top" as const, labels: { boxWidth: 10, font: { size: 10 } } } },
    scales: { x: BASE_OPTS.scales.x, y: { ...BASE_OPTS.scales.y, min: 0, max: 100 } },
  };
  return (
    <div style={{ height: 220 }}>
      <Line data={data} options={options as Parameters<typeof Line>[0]["options"]} />
    </div>
  );
}

// ─── Fréquence de visite ──────────────────────────────────────────────────────

export function ChartFrequence({ frequenceVisite }: { frequenceVisite: { frequence: string; membres: number }[] }) {
  const data = {
    labels: frequenceVisite.map(f => f.frequence),
    datasets: [{
      label: "Membres",
      data: frequenceVisite.map(f => f.membres),
      backgroundColor: [C.gray, C.green, C.blue, C.gold, C.gold],
      borderRadius: 6,
    }],
  };
  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={BASE_OPTS as Parameters<typeof Bar>[0]["options"]} />
    </div>
  );
}
