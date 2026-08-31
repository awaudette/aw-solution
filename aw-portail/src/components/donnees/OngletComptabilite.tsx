"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  AnalyticsGlobal, AnalyticsFranchise,
  ComptabiliteFacture, ComptabiliteReclamation,
  ComptabiliteFranchise,
} from "@/types/analytics";
import type { RapportItem } from "@/hooks/useAnalyticsData";
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
  revenusGeneres:  number;
}

// ─── Bloc Synthèse ────────────────────────────────────────────────────────────
type SyntheseShape = AnalyticsGlobal["comptabilite"]["synthese"] | ComptabiliteFranchise["synthese"];
type SnapshotShape = AnalyticsGlobal["comptabilite"]["snapshotFinMois"];

function BlocSynthese({
  synthese, snapshot, dernierJour, moisLabel, scopeLabel, pdfUrl, facturesCsvUrl,
}: {
  synthese:       SyntheseShape;
  snapshot:       SnapshotShape;
  dernierJour:    string;
  moisLabel:      string;
  scopeLabel:     string;
  /** PDF déjà généré par la Cloud Function genererRapportPdf — jamais généré
   *  au clic (Vercel Hobby coupe à 10 s, Puppeteer en prend 10-15 rien qu'au
   *  démarrage de Chromium). Absent tant que la clôture du mois n'a pas eu lieu. */
  pdfUrl?:        string;
  facturesCsvUrl?: string;
}) {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          Synthèse — {moisLabel}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {facturesCsvUrl && (
            <a href={facturesCsvUrl} style={{ fontSize: 13, fontWeight: 600, color: "#2a78d6" }}>
              Détail factures (CSV)
            </a>
          )}
          {pdfUrl ? (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "#2a78d6", color: "white", textDecoration: "none", display: "inline-block",
            }}>
              ↓ Exporter le rapport — {scopeLabel}
            </a>
          ) : (
            <button
              disabled
              title="Le PDF de ce rapport n'a pas encore été généré pour ce mois."
              style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "#E5E7EB", color: "#9CA3AF", border: "none", cursor: "not-allowed",
              }}
            >
              ↓ Exporter le rapport — {scopeLabel}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {([
          // Revenus du mois affiché seulement — pas cumulatif (voir Cumulatifs plus bas).
          ["Revenus",            fmtArgent(synthese.revenus),            ""],
          ["Inscriptions",      fmtNombre(synthese.inscriptions),       "nouveaux membres"],
          ["Membres actifs",    fmtNombre(synthese.membresActifs),       `/ ${fmtNombre(synthese.membresTotal)} total`],
          ["Notif. envoyées",   fmtNombre(synthese.notifEnvoyees),       `${fmtPct(synthese.tauxOuverturePush)} ouverture`],
          ["Visites", fmtNombre(synthese.visites),    ""],
          ["Points distribués", fmtNombre(synthese.pointsDistribues),    ""],
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
  rapports:      RapportItem[];
}

export default function OngletComptabilite({ global, franchiseData, franchiseName, rapports }: Props) {
  const moisList = useMemo(() => buildMoisList(), []);
  const [moisRef, setMoisRef] = useState(moisList[0].value);

  // Id déterministe, identique à celui écrit par POST /api/sync/analytics —
  // voir functions/src/templates/rapportMensuel.README.md.
  const rapportId = franchiseData ? `comptable-${moisRef}-${franchiseData.franchiseId}` : `comptable-${moisRef}`;
  const rapportCourant = rapports.find((r) => r.id === rapportId);

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
  // Bug corrigé : comparait franchise (nom affiché, ex. "Poké Station
  // Trois-Rivières") à franchiseId (slug, ex. "trois-rivieres") — ne pouvait
  // jamais matcher. Comparaison par nom désormais, comme côté Cloud Function
  // (functions/src/core/genererRapportPdf.ts) — même fragilité assumée et
  // documentée dans rapportMensuel.README.md (matching par chaîne, pas par id).
  const filterFranchise = <T extends { franchise: string }>(items: T[]): T[] =>
    franchiseData
      ? items.filter((f) => f.franchise.trim().toLowerCase() === franchiseData.franchiseNom.trim().toLowerCase())
      : items;

  const factures = useMemo(() => filterFranchise(c.facturesDetail),     [c.facturesDetail,     franchiseData]);
  const reclams  = useMemo(() => filterFranchise(c.reclamationsDetail), [c.reclamationsDetail, franchiseData]);

  // ── Promotions fusionnées ─────────────────────────────────────────────────
  const mergedPromos: MergedPromo[] = useMemo(() =>
    c.promotions.map((p) => {
      const code = c.codesPromo.find((cp) => cp.promotionLiee === p.nom);
      return {
        nom:            p.nom,
        code:           code?.code ?? "—",
        periode:        p.periode,
        typeRabais:     p.typeRabais,
        utilisations:   code?.utilisations ?? p.reclamations,
        coutReel:       p.coutReel,
        revenusGeneres: p.revenusGeneres,
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
  // Pas de ROI ni de Val. distribuée : ces colonnes sont retirées de l'affichage
  // (gardées dans MergedPromo/l'export Excel). Coût réel à 0 $ affiché en tiret
  // plutôt qu'un montant qui laisse croire à une donnée mesurée.
  const colsPromos: ColDef[] = [
    { header: "Promotion",             key: "nom"                                                              },
    { header: "Code",                  key: "code"                                                             },
    { header: "Période",               key: "periode"                                                          },
    { header: "Type de rabais",        key: "typeRabais"                                                       },
    { header: "Utilisations totales",  key: "utilisations",    fmt: (v) => fmtNombre(v as number), align: "right" },
    { header: "Coût réel",             key: "coutReel",        fmt: (v) => (v as number) === 0 ? "—" : fmtArgent(v as number), align: "right" },
    { header: "Revenus totaux",        key: "revenusGeneres",  fmt: (v) => fmtArgent(v as number), align: "right" },
  ];

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
          pdfUrl={rapportCourant?.pdfUrl}
          facturesCsvUrl={rapportCourant?.facturesCsvUrl}
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
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 10 }}>
          Utilisations totales et revenus totaux sont cumulatifs depuis la création de la promotion, pas limités à {moisLabel.toLowerCase()}.
        </p>
      </div>

    </div>
  );
}
