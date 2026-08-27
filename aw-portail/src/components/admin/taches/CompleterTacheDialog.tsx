"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayInputValue, combineDateTimeToIso } from "@/lib/dateInputs";

/**
 * Confirmation avant de compléter une tâche — jamais immédiat. Date de
 * complétion modifiable (préremplie à aujourd'hui) et commentaire optionnel,
 * ajouté à la sous-collection commentaires si rempli. Annuler ne fait rien.
 */
export function CompleterTacheDialog({
  onClose, onConfirm,
}: {
  onClose: () => void;
  onConfirm: (input: { completedAt: string; commentaire?: string }) => Promise<void>;
}) {
  const [dateCompletion, setDateCompletion] = useState(todayInputValue());
  const [commentaire, setCommentaire]       = useState("");
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  async function handleConfirm() {
    const completedAtIso = combineDateTimeToIso(dateCompletion, "");
    if (saving || !completedAtIso) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({
        completedAt: completedAtIso,
        commentaire: commentaire.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la complétion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Compléter la tâche</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date de complétion</label>
            <Input type="date" value={dateCompletion} onChange={(e) => setDateCompletion(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Commentaire (optionnel)</label>
            <Textarea
              placeholder="Comment la tâche a été complétée…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !dateCompletion}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Complétion…" : "Confirmer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
