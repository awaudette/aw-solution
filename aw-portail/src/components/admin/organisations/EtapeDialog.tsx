"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ETAPE_VALUES, ETAPE_LABELS, MOTIF_PERTE_VALUES, MOTIF_PERTE_LABELS, RECUPERABLE_VALUES,
  type Etape, type MotifPerte, type Recuperable,
} from "@/config/organisations";
import { combineDateTimeToIso, toDateInputValue } from "@/lib/dateInputs";
import { ConfirmerSignatureDialog } from "./ConfirmerSignatureDialog";
import type { OrganisationUpdateInput } from "@/hooks/useOrganisations";

const RECUPERABLE_LABELS: Record<Recuperable, string> = {
  oui: "Oui", non: "Non", peut_etre: "Peut-être",
};

export function EtapeDialog({
  nomOrganisation, etapeActuelle, onClose, onChangeEtape,
}: {
  nomOrganisation: string;
  etapeActuelle: Etape;
  onClose: () => void;
  onChangeEtape: (input: OrganisationUpdateInput) => Promise<void>;
}) {
  const [target, setTarget]   = useState<Etape | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Champs du sous-flux "perdu"
  const [motifPerte, setMotifPerte]           = useState<MotifPerte | null>(null);
  const [motifPerteDetail, setMotifPerteDetail] = useState("");
  const [recuperable, setRecuperable]         = useState<Recuperable | null>(null);
  const [dateRelance, setDateRelance]         = useState(toDateInputValue(null));

  if (target === "signe") {
    return (
      <ConfirmerSignatureDialog
        nomOrganisation={nomOrganisation}
        onClose={onClose}
        onConfirm={(dateSignatureIso) => onChangeEtape({ etape: "signe", dateSignature: dateSignatureIso })}
      />
    );
  }

  async function handleConfirmSimple() {
    if (!target || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onChangeEtape({ etape: target });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du changement d'étape");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPerdu() {
    if (!motifPerte || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onChangeEtape({
        etape: "perdu",
        motifPerte,
        motifPerteDetail: motifPerteDetail.trim() || null,
        recuperable,
        dateRelanceSuggeree: recuperable && recuperable !== "non" ? combineDateTimeToIso(dateRelance, "") : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du changement d'étape");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Changer l&apos;étape</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nouvelle étape</label>
            <div className="flex flex-wrap gap-1.5">
              {ETAPE_VALUES.filter(e => e !== etapeActuelle).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setTarget(e)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    target === e
                      ? e === "perdu" ? "bg-red-50 border-red-200 text-red-600" : "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {ETAPE_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          {target === "perdu" && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Motif de perte *</label>
                <div className="flex flex-wrap gap-1.5">
                  {MOTIF_PERTE_VALUES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotifPerte(m)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        motifPerte === m ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {MOTIF_PERTE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Détail (optionnel)</label>
                <Textarea value={motifPerteDetail} onChange={(e) => setMotifPerteDetail(e.target.value)} />
              </div>

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
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          {target === "perdu" ? (
            <button
              onClick={handleConfirmPerdu}
              disabled={!motifPerte || saving}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Confirmation…" : "Marquer comme perdu"}
            </button>
          ) : (
            <button
              onClick={handleConfirmSimple}
              disabled={!target || saving}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Confirmation…" : "Confirmer"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
