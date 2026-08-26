"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import type {
  AnalyticsGlobal, AnalyticsFranchise,
  ComptabiliteFacture, ComptabiliteReclamation,
  ComptabiliteFranchise,
} from "@/types/analytics";
import { fmtNombre, fmtArgent, fmtPct } from "@/lib/mockAnalytics";

const CARD: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "0.5px solid #E5E7EB",
  padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)",
};

// ─── Mois disponibles ─────────────────────────────────────────────────────────
function buildMoisList(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  let y = 2026, m = 7;
  const startY = 2026, startM = 2;
  while (y > startY || (y === startY && m >= startM)) {
    const d = new Date(y, m - 1, 1);
    months.push({
      value: `${y}-${String(m).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }),
    });
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return months;
}

// ─── Table triable ────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
interface ColDef {
  header: string;
  key:    string;
  fmt?:   (v: unknown) => string;
  align?: "left" | "right";
}

function Table({ cols, data, csvName, pageSize }: { cols: ColDef[]; data: Row[]; csvName: string; pageSize?: number }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  function toggleSort(key: string) {
    if (sortCol === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
    setPage(0);
  }

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""), "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  // Revient à la page 1 si les données changent sous nos pieds (changement de
  // mois/franchise) — évite d'atterrir sur une page devenue vide.
  useEffect(() => { setPage(0); }, [data]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const paged = pageSize ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  function handleExport() {
    // Exporte toujours l'ensemble des lignes triées, pas seulement la page affichée.
    const rows: string[][] = [
      cols.map((c) => c.header),
      ...sorted.map((row) => cols.map((c) => {
        const v = row[c.key];
        return c.fmt ? c.fmt(v) : String(v ?? "");
      })),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = csvName + ".csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        {pageSize && totalPages > 1 ? (
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
        ) : <div />}
        <button onClick={handleExport} style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB", cursor: "pointer",
        }}>
          ↓ Exporter CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
              {cols.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} style={{
                  padding: "8px 12px", textAlign: c.align ?? "left",
                  color: "#9CA3AF", fontWeight: 500, fontSize: 12,
                  cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
                }}>
                  {c.header}{sortCol === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F9FAFB" }}>
                {cols.map((c) => {
                  const v   = row[c.key];
                  const txt = c.fmt ? c.fmt(v) : String(v ?? "");
                  return (
                    <td key={c.key} style={{ padding: "10px 12px", textAlign: c.align ?? "left", color: "#374151" }}>
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Promotion fusionnée ──────────────────────────────────────────────────────
interface MergedPromo {
  nom:             string;
  code:            string;
  periode:         string;
  typeRabais:      string;
  utilisations:    number;
  coutReel:        number;
  valeurDistribuee:number;
  revenusGeneres:  number;
  roi:             number;
}

// ─── Export Excel multi-feuillets ─────────────────────────────────────────────
function exportXlsx(args: {
  moisRef:     string;
  moisLabel:   string;
  scopeLabel:  string;
  synthese:    AnalyticsGlobal["comptabilite"]["synthese"] | ComptabiliteFranchise["synthese"];
  snapshot:    AnalyticsGlobal["comptabilite"]["snapshotFinMois"];
  dernierJour: string;
  factures:    ComptabiliteFacture[];
  reclams:     ComptabiliteReclamation[];
  promos:      MergedPromo[];
}) {
  const { moisRef, moisLabel, scopeLabel, synthese, snapshot, dernierJour, factures, reclams, promos } = args;
  const wb = XLSX.utils.book_new();

  const wsS = XLSX.utils.aoa_to_sheet([
    [`Rapport comptable — ${moisLabel} — ${scopeLabel}`],
    [],
    ["Indicateur", "Valeur"],
    ["Inscriptions",           synthese.inscriptions],
    ["Membres actifs",         synthese.membresActifs],
    ["Membres total",          synthese.membresTotal],
    ["Notif. envoyées",        synthese.notifEnvoyees],
    ["Taux ouverture push",    synthese.tauxOuverturePush],
    ["Visites",      synthese.visites],
    ["Points distribués",      synthese.pointsDistribues],
    ["Valeur pts distribués",  snapshot.valeurPointsDistribues],
    ["Points rachetés",        synthese.pointsRachetes],
    ["Food cost réclamations", synthese.valeurRachetee],
    ["Bonus attribués",        synthese.bonusAttribues],
    ["Valeur bonus",           synthese.valeurBonus],
    [],
    [`Cumulatifs au ${dernierJour}`],
    ["Membres totaux",          snapshot.membresTotal],
    ["Revenus totaux",          snapshot.revenusTotal],
    ["Visites total", snapshot.visites],
    ["Points en circulation",   snapshot.pointsEnCirculation],
  ]);
  XLSX.utils.book_append_sheet(wb, wsS, "Synthèse");

  const wsF = XLSX.utils.aoa_to_sheet([
    ["Date", "Franchise", "Montant ($)", "Points attribués", "Code promo", "Promotion liée", "Rabais appliqué ($)"],
    ...factures.map((f) => [
      f.date, f.franchise, f.montant, f.pointsAttribues,
      f.codePromo ?? "—", f.promotionLiee ?? "—", f.rabaisApplique ?? "—",
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, wsF, "Factures");

  const wsR = XLSX.utils.aoa_to_sheet([
    ["Date", "Récompense", "Franchise", "Points réclamés", "Food cost ($)"],
    ...reclams.map((r) => [r.date, r.recompense, r.franchise, r.pointsReclames, r.foodCost]),
  ]);
  XLSX.utils.book_append_sheet(wb, wsR, "Réclamations");

  const wsP = XLSX.utils.aoa_to_sheet([
    ["Promotion", "Code", "Période", "Type de rabais", "Utilisations", "Coût réel ($)", "Val. distribuée ($)", "Revenus générés ($)", "ROI"],
    ...promos.map((p) => [
      p.nom, p.code, p.periode, p.typeRabais, p.utilisations,
      p.coutReel, p.valeurDistribuee, p.revenusGeneres, p.roi,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, wsP, "Promotions");

  const buf  = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `rapport-comptable-${scopeLabel.toLowerCase().replace(/\s+/g, "-")}-${moisRef}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bloc Synthèse ────────────────────────────────────────────────────────────
type SyntheseShape = AnalyticsGlobal["comptabilite"]["synthese"] | ComptabiliteFranchise["synthese"];
type SnapshotShape = AnalyticsGlobal["comptabilite"]["snapshotFinMois"];

function BlocSynthese({
  synthese, snapshot, dernierJour, moisLabel, scopeLabel, onExport,
}: {
  synthese:    SyntheseShape;
  snapshot:    SnapshotShape;
  dernierJour: string;
  moisLabel:   string;
  scopeLabel:  string;
  onExport:    () => void;
}) {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          Synthèse — {moisLabel}
        </h2>
        <button onClick={onExport} style={{
          padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: "#2a78d6", color: "white", border: "none", cursor: "pointer",
        }}>
          ↓ Exporter le rapport — {scopeLabel}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {([
          ["Inscriptions",      fmtNombre(synthese.inscriptions),       "nouveaux membres"],
          ["Membres actifs",    fmtNombre(synthese.membresActifs),       `/ ${fmtNombre(synthese.membresTotal)} total`],
          ["Notif. envoyées",   fmtNombre(synthese.notifEnvoyees),       `${fmtPct(synthese.tauxOuverturePush)} ouverture`],
          ["Visites", fmtNombre(synthese.visites),    ""],
          ["Points distribués", fmtNombre(synthese.pointsDistribues),    fmtArgent(snapshot.valeurPointsDistribues)],
          ["Points rachetés",   fmtNombre(synthese.pointsRachetes),      `${fmtArgent(synthese.valeurRachetee)} food cost`],
          // Pas de valeur $ affichée ici : aucun taux de conversion points → dollars
          // n'existe dans l'app, donc synthese.valeurBonus n'a aucune source valide.
          ["Bonus attribués",   fmtNombre(synthese.bonusAttribues),      ""],
        ] as [string, string, string][]).map(([label, val, sub]) => (
          <div key={label} style={{ padding: "12px 16px", background: "#F9FAFB", borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{val}</div>
            {sub && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 16, paddingTop: 16 }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 12px", fontWeight: 500 }}>
          Cumulatifs au {dernierJour}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {([
            ["Membres totaux",          fmtNombre(snapshot.membresTotal)],
            ["Revenus totaux",          fmtArgent(snapshot.revenusTotal)],
            ["Visites total", fmtNombre(snapshot.visites)],
            ["Points en circulation",  fmtNombre(snapshot.pointsEnCirculation)],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ padding: "12px 16px", background: "#EFF6FF", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1e3a8a" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>au {dernierJour}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── OngletComptabilite ───────────────────────────────────────────────────────
interface Props {
  global:        AnalyticsGlobal;
  franchises:    AnalyticsFranchise[];
  franchiseData: AnalyticsFranchise | null;
  franchiseName: string;
}

export default function OngletComptabilite({ global, franchiseData, franchiseName }: Props) {
  const moisList = useMemo(() => buildMoisList(), []);
  const [moisRef, setMoisRef] = useState(moisList[0].value);

  const c         = global.comptabilite;
  const moisLabel = moisList.find((m) => m.value === moisRef)?.label ?? "";

  const [moisY, moisM] = moisRef.split("-").map(Number);
  const dernierJour    = new Date(moisY, moisM, 0).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── RÈGLE STRICTE ────────────────────────────────────────────────────────
  //   Vue franchise  → uniquement franchiseData.comptabilite
  //                    Si absent (Phase 3 non déployé) : masqué, jamais global
  //   Vue globale    → global.comptabilite
  const franchiseCpt: ComptabiliteFranchise | null = franchiseData?.comptabilite ?? null;
  const synthese: SyntheseShape | null = franchiseData ? franchiseCpt?.synthese  ?? null : c.synthese;
  const snapshot: SnapshotShape | null = franchiseData ? franchiseCpt?.snapshotFinMois ?? null : c.snapshotFinMois;

  // ── Filtrage des détails ──────────────────────────────────────────────────
  const filterFranchise = <T extends { franchise: string }>(items: T[]): T[] =>
    franchiseData
      ? items.filter((f) => f.franchise.toLowerCase() === franchiseData.franchiseId)
      : items;

  const factures = useMemo(() => filterFranchise(c.facturesDetail),     [c.facturesDetail,     franchiseData]);
  const reclams  = useMemo(() => filterFranchise(c.reclamationsDetail), [c.reclamationsDetail, franchiseData]);

  // ── Promotions fusionnées ─────────────────────────────────────────────────
  const mergedPromos: MergedPromo[] = useMemo(() =>
    c.promotions.map((p) => {
      const code = c.codesPromo.find((cp) => cp.promotionLiee === p.nom);
      return {
        nom:              p.nom,
        code:             code?.code ?? "—",
        periode:          p.periode,
        typeRabais:       p.typeRabais,
        utilisations:     code?.utilisations ?? p.reclamations,
        coutReel:         p.coutReel,
        valeurDistribuee: p.valeurDistribuee,
        revenusGeneres:   p.revenusGeneres,
        roi:              p.roi,
      };
    }),
    [c.promotions, c.codesPromo],
  );

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const colsFactures: ColDef[] = [
    { header: "Date",             key: "date"                                                                          },
    { header: "Franchise",        key: "franchise"                                                                     },
    { header: "Montant",          key: "montant",          fmt: (v) => fmtArgent(v as number),                align: "right" },
    { header: "Points attribués", key: "pointsAttribues",  fmt: (v) => fmtNombre(v as number),               align: "right" },
    { header: "Code promo",       key: "codePromo",        fmt: (v) => String(v ?? "—")                               },
    { header: "Promotion liée",   key: "promotionLiee",    fmt: (v) => String(v ?? "—")                               },
    { header: "Rabais appliqué",  key: "rabaisApplique",   fmt: (v) => v != null ? fmtArgent(v as number) : "—", align: "right" },
  ];
  const colsReclam: ColDef[] = [
    { header: "Date",            key: "date"                                                      },
    { header: "Récompense",      key: "recompense"                                                },
    { header: "Franchise",       key: "franchise"                                                 },
    { header: "Points réclamés", key: "pointsReclames", fmt: (v) => fmtNombre(v as number), align: "right" },
    { header: "Food cost",       key: "foodCost",       fmt: (v) => fmtArgent(v as number), align: "right" },
  ];
  const colsPromos: ColDef[] = [
    { header: "Promotion",       key: "nom"                                                              },
    { header: "Code",            key: "code"                                                             },
    { header: "Période",         key: "periode"                                                          },
    { header: "Type de rabais",  key: "typeRabais"                                                       },
    { header: "Utilisations",    key: "utilisations",    fmt: (v) => fmtNombre(v as number), align: "right" },
    { header: "Coût réel",       key: "coutReel",        fmt: (v) => fmtArgent(v as number), align: "right" },
    { header: "Val. distribuée", key: "valeurDistribuee",fmt: (v) => fmtArgent(v as number), align: "right" },
    { header: "Revenus générés", key: "revenusGeneres",  fmt: (v) => fmtArgent(v as number), align: "right" },
    { header: "ROI",             key: "roi",             fmt: (v) => `${(v as number).toFixed(1).replace(".", ",")}×`, align: "right" },
  ];

  function handleExportXlsx() {
    if (!synthese || !snapshot) return;
    exportXlsx({ moisRef, moisLabel, scopeLabel: franchiseName, dernierJour, synthese, snapshot, factures, reclams, promos: mergedPromos });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Sélecteur de mois ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>Mois :</span>
        <select value={moisRef} onChange={(e) => setMoisRef(e.target.value)} style={{
          padding: "8px 14px", borderRadius: 10, border: "1px solid #D1D5DB",
          fontSize: 14, background: "white", cursor: "pointer",
        }}>
          {moisList.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "#9CA3AF" }}>
          Les données du mois en cours ne sont pas encore disponibles.
        </span>
      </div>

      {/* ── Synthèse : données franchise OU globale OU masqué ── */}
      {synthese && snapshot ? (
        <BlocSynthese
          synthese={synthese}
          snapshot={snapshot}
          dernierJour={dernierJour}
          moisLabel={moisLabel}
          scopeLabel={franchiseName}
          onExport={handleExportXlsx}
        />
      ) : franchiseData ? (
        /* Phase 3 non déployée pour cette franchise → masqué, jamais données globales */
        <div style={{ ...CARD, background: "#FAFAFA", border: "1px dashed #D1D5DB", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
            Synthèse non disponible pour {franchiseName}
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
            Les agrégats par franchise seront générés automatiquement à la clôture du mois (Phase 3 — portailSyncJob).
          </p>
        </div>
      ) : null /* vue globale sans données — ne devrait pas arriver */ }

      {/* ── Factures ── */}
      <div style={CARD}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          Activité membres — factures validées
          {franchiseData && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF", marginLeft: 8 }}>
              {franchiseName}
            </span>
          )}
        </h3>
        <Table cols={colsFactures} data={factures as unknown as Row[]} csvName={`factures-${moisRef}`} pageSize={5} />
      </div>

      {/* ── Réclamations ── */}
      <div style={CARD}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          Programme fidélité — réclamations de récompenses
          {franchiseData && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF", marginLeft: 8 }}>
              {franchiseName}
            </span>
          )}
        </h3>
        <Table cols={colsReclam} data={reclams as unknown as Row[]} csvName={`reclamations-${moisRef}`} />
      </div>

      {/* ── Promotions ── */}
      <div style={CARD}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
          Promotions du mois
        </h3>
        <Table cols={colsPromos} data={mergedPromos as unknown as Row[]} csvName={`promotions-${moisRef}`} />
      </div>

    </div>
  );
}
