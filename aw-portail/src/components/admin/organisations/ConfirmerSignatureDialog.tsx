"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PenLine } from "lucide-react";
import { todayInputValue, combineDateTimeToIso } from "@/lib/dateInputs";

/**
 * Moment charnière — jamais un simple changement d'étape. Date de signature
 * préremplie à aujourd'hui (heure locale, pas de décalage), modifiable, et
 * rappel que le suivi se poursuit désormais dans la fiche client.
 */
export function ConfirmerSignatureDialog({
  nomOrganisation, onClose, onConfirm,
}: {
  nomOrganisation: string;
  onClose: () => void;
  onConfirm: (dateSignatureIso: string) => Promise<void>;
}) {
  const [date, setDate]       = useState(todayInputValue());
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleConfirm() {
    const iso = combineDateTimeToIso(date, "");
    if (saving || !iso) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(iso);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la signature");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine size={16} className="text-[#0362E3]" /> Marquer {nomOrganisation} comme signé
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date de signature</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
            Le suivi de ce dossier se poursuivra désormais dans la fiche client — le CRM s&apos;arrête ici.
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !date}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Confirmation…" : "Confirmer la signature"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
