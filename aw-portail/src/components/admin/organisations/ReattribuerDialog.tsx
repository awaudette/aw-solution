"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { StaffMember } from "@/hooks/useOrganisations";

function staffLabel(s: StaffMember): string {
  return `${s.prenom} ${s.nom}`.trim() || s.courriel;
}

/** Réservé à l'admin — la route refuse la requête si l'appelant ne l'est pas. */
export function ReattribuerDialog({
  staff, proprietaireActuel, onClose, onConfirm,
}: {
  staff: StaffMember[];
  proprietaireActuel: string;
  onClose: () => void;
  onConfirm: (nouveauUid: string) => Promise<void>;
}) {
  const [uid, setUid]         = useState(proprietaireActuel);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleConfirm() {
    if (saving || uid === proprietaireActuel) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(uid);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la réattribution");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Réattribuer le dossier</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nouveau responsable</label>
            <select
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="h-8 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-sm text-gray-700 outline-none focus:border-[#0362E3]"
            >
              {staff.map(s => (
                <option key={s.uid} value={s.uid}>{staffLabel(s)}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || uid === proprietaireActuel}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Réattribution…" : "Réattribuer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
