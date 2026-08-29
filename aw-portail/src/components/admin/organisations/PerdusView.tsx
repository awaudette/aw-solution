"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertCircle } from "lucide-react";
import { MOTIF_LABELS_COMBINES, type OrganisationDTO } from "@/config/organisations";
import type { StaffMember, OrganisationUpdateInput } from "@/hooks/useOrganisations";
import { motifBreakdown, relancesEnRetard } from "./analytics";

const RECUP_LABELS: Record<string, string> = { oui: "Oui", non: "Non", peut_etre: "Peut-être" };

function staffLabel(uid: string, staff: StaffMember[]): string {
  const s = staff.find(x => x.uid === uid);
  return s ? (`${s.prenom} ${s.nom}`.trim() || s.courriel) : "—";
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/**
 * Page Perdus : liste tous les dossiers à l'étape "perdu", avec une analyse
 * volontairement limitée à la répartition des motifs et aux relances en
 * retard — le taux/la distribution de perte par étape a été explicitement
 * écarté (impossible à calculer sans historique des transitions réelles).
 */
export function PerdusView({
  organisations, staff, updateOrganisation,
}: {
  organisations: OrganisationDTO[];
  staff: StaffMember[];
  updateOrganisation: (id: string, input: OrganisationUpdateInput) => Promise<void>;
}) {
  const router = useRouter();
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const perdus = useMemo(() => organisations.filter(o => o.etape === "perdu"), [organisations]);
  const breakdown = useMemo(() => motifBreakdown(perdus), [perdus]);
  const enRetard = useMemo(() => relancesEnRetard(perdus), [perdus]);

  async function handleReactiver(id: string) {
    setReactivatingId(id);
    try {
      await updateOrganisation(id, { etape: "contacte" });
    } finally {
      setReactivatingId(null);
    }
  }

  if (perdus.length === 0) {
    return <div className="text-center py-16 text-sm text-gray-400">Aucun dossier perdu pour le moment.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Répartition des motifs de perte</p>
          <div className="space-y-2.5">
            {breakdown.map(item => (
              <div key={item.motif} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 flex-shrink-0 truncate" title={item.label}>{item.label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-red-400" style={{ width: `${item.pct}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0 text-right">{item.count} ({item.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-100 p-4">
          <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-3">
            <AlertCircle size={14} /> Relances en retard ({enRetard.length})
          </p>
          {enRetard.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune relance en retard.</p>
          ) : (
            <ul className="space-y-2">
              {enRetard.map(o => (
                <li key={o.id} className="flex items-center justify-between text-xs">
                  <button onClick={() => router.push(`/admin/organisations/${o.id}`)} className="text-[#0362E3] hover:underline font-medium">
                    {o.nom}
                  </button>
                  <span className="text-gray-400">Suggérée le {formatDate(o.dateRelanceSuggeree)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Motif</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Date de perte</th>
              <th className="px-4 py-3 font-medium">Récupérable</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {perdus.map(o => {
              const estAncienClient = o.etapeAvantPerte === "signe";
              return (
                <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      estAncienClient ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      {estAncienClient ? "Ancien client" : "Prospect"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 font-medium text-gray-900 cursor-pointer"
                    onClick={() => router.push(`/admin/organisations/${o.id}`)}
                  >
                    {o.nom}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.motifPerte ? (MOTIF_LABELS_COMBINES[o.motifPerte] ?? o.motifPerte) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{staffLabel(o.proprietaire, staff)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(o.dateEtapePerdu)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.recuperable ? RECUP_LABELS[o.recuperable] : "—"}
                    {(o.recuperable === "oui" || o.recuperable === "peut_etre") && o.dateRelanceSuggeree && (
                      <span className="text-gray-400"> · relance {formatDate(o.dateRelanceSuggeree)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleReactiver(o.id)}
                      disabled={reactivatingId === o.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> {reactivatingId === o.id ? "…" : "Réactiver"}
                    </button>
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
