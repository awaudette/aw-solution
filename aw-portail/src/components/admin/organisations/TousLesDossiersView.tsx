"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { ETAPE_VALUES, ETAPE_LABELS, type Etape, type OrganisationDTO } from "@/config/organisations";
import type { StaffMember } from "@/hooks/useOrganisations";
import { todayInputValue } from "@/lib/dateInputs";

type SortKey = "nom" | "etape" | "proprietaire" | "source" | "valeurMensuelleEstimee" | "derniereInteraction" | "createdAt";
type SortDir = "asc" | "desc";

function staffLabel(uid: string, staff: StaffMember[]): string {
  const s = staff.find(x => x.uid === uid);
  return s ? (`${s.prenom} ${s.nom}`.trim() || s.courriel) : "—";
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const COLONNES: { key: SortKey; label: string }[] = [
  { key: "nom", label: "Nom" },
  { key: "etape", label: "Étape" },
  { key: "proprietaire", label: "Responsable" },
  { key: "source", label: "Source" },
  { key: "valeurMensuelleEstimee", label: "Valeur mensuelle" },
  { key: "derniereInteraction", label: "Dernière interaction" },
  { key: "createdAt", label: "Créé le" },
];

/** Vue "Tous les dossiers" : liste complète et triable, avec recherche, filtres et export CSV — entièrement côté client, pas de route dédiée. */
export function TousLesDossiersView({
  organisations, staff,
}: {
  organisations: OrganisationDTO[];
  staff: StaffMember[];
}) {
  const router = useRouter();
  const [search, setSearch]             = useState("");
  const [filtreEtape, setFiltreEtape]           = useState<Etape | "">("");
  const [filtreResponsable, setFiltreResponsable] = useState("");
  const [filtreSource, setFiltreSource]         = useState("");
  const [sortKey, setSortKey]           = useState<SortKey>("createdAt");
  const [sortDir, setSortDir]           = useState<SortDir>("desc");

  const sources = useMemo(() => {
    const set = new Set<string>();
    organisations.forEach(o => { if (o.source) set.add(o.source); });
    return Array.from(set).sort();
  }, [organisations]);

  const filtered = useMemo(() => organisations.filter(o => {
    if (search.trim() && !o.nom.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filtreEtape && o.etape !== filtreEtape) return false;
    if (filtreResponsable && o.proprietaire !== filtreResponsable) return false;
    if (filtreSource && o.source !== filtreSource) return false;
    return true;
  }), [organisations, search, filtreEtape, filtreResponsable, filtreSource]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "nom": av = a.nom.toLowerCase(); bv = b.nom.toLowerCase(); break;
        case "etape": av = ETAPE_LABELS[a.etape]; bv = ETAPE_LABELS[b.etape]; break;
        case "proprietaire": av = staffLabel(a.proprietaire, staff); bv = staffLabel(b.proprietaire, staff); break;
        case "source": av = a.source ?? ""; bv = b.source ?? ""; break;
        case "valeurMensuelleEstimee": av = a.valeurMensuelleEstimee ?? -1; bv = b.valeurMensuelleEstimee ?? -1; break;
        case "derniereInteraction": av = a.derniereInteraction ? new Date(a.derniereInteraction).getTime() : 0;
                                    bv = b.derniereInteraction ? new Date(b.derniereInteraction).getTime() : 0; break;
        case "createdAt": av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          bv = b.createdAt ? new Date(b.createdAt).getTime() : 0; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, staff]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleExportCsv() {
    const header = ["Nom", "Étape", "Responsable", "Source", "Valeur mensuelle estimée", "Dernière interaction", "Créé le"];
    const rows = sorted.map(o => [
      o.nom,
      ETAPE_LABELS[o.etape],
      staffLabel(o.proprietaire, staff),
      o.source ?? "",
      o.valeurMensuelleEstimee != null ? String(o.valeurMensuelleEstimee) : "",
      formatDate(o.derniereInteraction),
      formatDate(o.createdAt),
    ]);
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossiers-${todayInputValue()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
          />
        </div>

        <select
          value={filtreEtape}
          onChange={(e) => setFiltreEtape(e.target.value as Etape | "")}
          className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white"
        >
          <option value="">Toutes les étapes</option>
          {ETAPE_VALUES.map(e => <option key={e} value={e}>{ETAPE_LABELS[e]}</option>)}
        </select>

        <select
          value={filtreResponsable}
          onChange={(e) => setFiltreResponsable(e.target.value)}
          className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white"
        >
          <option value="">Tous les responsables</option>
          {staff.map(s => (
            <option key={s.uid} value={s.uid}>{`${s.prenom} ${s.nom}`.trim() || s.courriel}</option>
          ))}
        </select>

        <select
          value={filtreSource}
          onChange={(e) => setFiltreSource(e.target.value)}
          className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white"
        >
          <option value="">Toutes les sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={handleExportCsv}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <Download size={13} /> Exporter en CSV
        </button>
      </div>

      <p className="text-xs text-gray-400">{sorted.length} dossier{sorted.length > 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              {COLONNES.map(col => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-gray-600">
                    {col.label}
                    <ArrowUpDown size={11} className={sortKey === col.key ? "text-[#0362E3]" : "text-gray-300"} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLONNES.length} className="px-4 py-10 text-center text-sm text-gray-400">Aucun dossier ne correspond à ces critères.</td></tr>
            ) : sorted.map(o => (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/organisations/${o.id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{o.nom}</td>
                <td className="px-4 py-3 text-gray-600">{ETAPE_LABELS[o.etape]}</td>
                <td className="px-4 py-3 text-gray-600">{staffLabel(o.proprietaire, staff)}</td>
                <td className="px-4 py-3 text-gray-600">{o.source ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {o.valeurMensuelleEstimee != null ? `${o.valeurMensuelleEstimee.toLocaleString("fr-CA")} $` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(o.derniereInteraction)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
