"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";
import {
  MOTIF_PERTE_VALUES, MOTIF_PERTE_LABELS, MOTIF_CHURN_VALUES, MOTIF_CHURN_LABELS, RECUPERABLE_VALUES,
  type Recuperable, type OrganisationDTO,
} from "@/config/organisations";
import type { OrganisationUpdateInput } from "@/hooks/useOrganisations";
import { toDateInputValue, combineDateTimeToIso } from "@/lib/dateInputs";

const RECUPERABLE_LABELS: Record<Recuperable, string> = {
  oui: "Oui", non: "Non", peut_etre: "Peut-être",
};

/** Toujours présent sur la fiche — vide tant que le dossier n'a jamais été perdu. */
export function PerteBlock({
  org, onSave,
}: {
  org: OrganisationDTO;
  onSave: (input: OrganisationUpdateInput) => Promise<void>;
}) {
  const [motifPerte, setMotifPerte] = useState<string | null>(org.motifPerte ?? null);
  const [detail, setDetail]         = useState(org.motifPerteDetail ?? "");
  const [recuperable, setRecuperable] = useState<Recuperable | null>(org.recuperable);
  const [dateRelance, setDateRelance] = useState(toDateInputValue(org.dateRelanceSuggeree));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const aDesDonnees = !!(org.motifPerte || org.etape === "perdu");

  // Ancien client qui annule (venait de "signe") vs prospect jamais converti
  // — vocabulaire de motifs distinct, déterminé par l'étape enregistrée au
  // moment du passage à "perdu".
  const estAncienClient = org.etapeAvantPerte === "signe";
  const motifValues: readonly string[] = estAncienClient ? MOTIF_CHURN_VALUES : MOTIF_PERTE_VALUES;
  const motifLabels: Record<string, string> = estAncienClient ? MOTIF_CHURN_LABELS : MOTIF_PERTE_LABELS;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        motifPerte,
        motifPerteDetail: detail.trim() || null,
        recuperable,
        dateRelanceSuggeree: recuperable && recuperable !== "non" ? combineDateTimeToIso(dateRelance, "") : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (!aDesDonnees && org.etape !== "perdu") {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
          <XCircle size={14} /> Dossier perdu
        </p>
        <p className="text-xs text-gray-400 mt-1">Ce bloc se remplit si le dossier passe à l&apos;étape « perdu ».</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-red-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
          <XCircle size={14} /> Dossier perdu
        </p>
        {org.etapeAvantPerte && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
            {estAncienClient ? "Ancien client" : "Prospect"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Motif</label>
          <div className="flex flex-wrap gap-1.5">
            {motifValues.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotifPerte(m)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  motifPerte === m ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {motifLabels[m]}
              </button>
            ))}
          </div>
        </div>

        <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Détail (optionnel)" />

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Récupérable ?</label>
          <div className="flex gap-1.5">
            {RECUPERABLE_VALUES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecuperable(recuperable === r ? null : r)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  recuperable === r ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {RECUPERABLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {(recuperable === "oui" || recuperable === "peut_etre") && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date de relance suggérée</label>
            <Input type="date" value={dateRelance} onChange={(e) => setDateRelance(e.target.value)} />
          </div>
        )}

        {org.dateEtapePerdu && (
          <p className="text-xs text-gray-400">
            Perdu le {new Date(org.dateEtapePerdu).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="self-end px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
