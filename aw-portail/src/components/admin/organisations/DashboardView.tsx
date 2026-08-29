"use client";

import { useMemo } from "react";
import { ETAPE_LABELS, type OrganisationDTO } from "@/config/organisations";
import type { StaffMember } from "@/hooks/useOrganisations";
import {
  valeurCumuleeParEtape, tauxConversionGlobal, funnelEtapes, dureeMoyenneParEtape, activiteParPersonne,
} from "./analytics";

function formatMontant(n: number): string {
  return `${n.toLocaleString("fr-CA")} $`;
}

/**
 * Tableau de bord du pipeline. Toutes les mesures fondées sur un échantillon
 * affichent leur n à côté du taux — avec deux ou trois dossiers, un taux de
 * conversion ne veut rien dire. Les mesures qui restent approximatives faute
 * d'historique des transitions le disent explicitement dans leur libellé.
 */
export function DashboardView({
  organisations, staff,
}: {
  organisations: OrganisationDTO[];
  staff: StaffMember[];
}) {
  const valeurParEtape = useMemo(() => valeurCumuleeParEtape(organisations), [organisations]);
  const conversionGlobale = useMemo(() => tauxConversionGlobal(organisations), [organisations]);
  const funnel = useMemo(() => funnelEtapes(organisations), [organisations]);
  const durees = useMemo(() => dureeMoyenneParEtape(organisations), [organisations]);
  const activite = useMemo(() => activiteParPersonne(organisations, staff), [organisations, staff]);

  const valeurTotale = valeurParEtape.reduce((sum, v) => sum + v.total, 0);
  const maxValeur = Math.max(1, ...valeurParEtape.map(v => v.total));

  return (
    <div className="space-y-5">
      {/* Valeur mensuelle estimée cumulée par étape */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Valeur mensuelle estimée par étape</p>
          <p className="text-xs text-gray-400">Total : {formatMontant(valeurTotale)}</p>
        </div>
        <div className="space-y-2.5">
          {valeurParEtape.map(v => (
            <div key={v.etape} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-36 flex-shrink-0">{ETAPE_LABELS[v.etape]}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#0362E3]" style={{ width: `${(v.total / maxValeur) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-gray-500 w-40 flex-shrink-0 text-right">
                {formatMontant(v.total)} <span className="text-gray-300">({v.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Taux de conversion</p>
          <p className="text-[11px] text-gray-400 mb-3">
            Global : dossiers signés sur l&apos;ensemble des dossiers créés. Entre étapes : approximatif — déduit de la présence des dates de cycle de vente, faute d&apos;historique des transitions.
          </p>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-blue-50 mb-3">
            <span className="text-xs font-medium text-blue-800">Conversion globale</span>
            <span className="text-sm font-semibold text-blue-800">
              {conversionGlobale.taux}% <span className="text-xs font-normal text-blue-400">(sur {conversionGlobale.n})</span>
            </span>
          </div>

          <div className="space-y-1.5">
            {funnel.map((item, i) => (
              <div key={item.etape} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {i > 0 && "→ "}{ETAPE_LABELS[item.etape]}
                  <span className="text-gray-300 ml-1">({item.atteints})</span>
                </span>
                {item.tauxDepuisPrecedente && (
                  <span className="font-medium text-gray-700">
                    {item.tauxDepuisPrecedente.taux}%
                    <span className="text-gray-300 font-normal"> (sur {item.tauxDepuisPrecedente.n})</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Durée moyenne par étape */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Durée moyenne par étape (approximatif)</p>
          <p className="text-[11px] text-gray-400 mb-3">
            Calculée entre les dates d&apos;entrée et de sortie de chaque étape — ignore les dossiers encore bloqués dans l&apos;étape, faute de date de sortie.
          </p>
          <div className="space-y-1.5">
            {durees.map(d => (
              <div key={d.etape} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{ETAPE_LABELS[d.etape]}</span>
                <span className="font-medium text-gray-700">
                  {d.joursMoyens != null
                    ? <>≈ {d.joursMoyens} j <span className="text-gray-300 font-normal">(sur {d.n})</span></>
                    : <span className="text-gray-300">Pas assez de données</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activité par personne */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <p className="text-sm font-semibold text-gray-900 p-4 pb-0">Activité par personne</p>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Personne</th>
              <th className="px-4 py-2.5 font-medium">Dossiers</th>
              <th className="px-4 py-2.5 font-medium">Interactions</th>
              <th className="px-4 py-2.5 font-medium">Signés</th>
            </tr>
          </thead>
          <tbody>
            {activite.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Aucune activité pour le moment.</td></tr>
            ) : activite.map(a => (
              <tr key={a.uid} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-900">{a.nom}</td>
                <td className="px-4 py-2.5 text-gray-600">{a.nbDossiers}</td>
                <td className="px-4 py-2.5 text-gray-600">{a.nbInteractions}</td>
                <td className="px-4 py-2.5 text-gray-600">{a.nbSignes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
