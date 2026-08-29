"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INTERACTION_TYPE_VALUES, REACTION_VALUES, type InteractionType, type Reaction } from "@/config/organisations";
import { todayInputValue, combineDateTimeToIso } from "@/lib/dateInputs";

const TYPE_LABELS: Record<InteractionType, string> = {
  appel: "Appel", courriel: "Courriel", rencontre: "Rencontre",
  demo: "Démo", texto: "Texto", note: "Note",
};
const REACTION_LABELS: Record<Reaction, string> = {
  tres_positif: "Très positif", positif: "Positif", neutre: "Neutre",
  reserve: "Réservé", negatif: "Négatif",
};

/** Volontairement rapide — trois champs seulement. */
export function InteractionDialog({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { type: InteractionType; texte: string; reaction: Reaction | null; date: string | null }) => Promise<void>;
}) {
  const [type, setType]         = useState<InteractionType>("appel");
  const [texte, setTexte]       = useState("");
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [date, setDate]         = useState(todayInputValue());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!texte.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({ type, texte: texte.trim(), reaction, date: combineDateTimeToIso(date, "") });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une interaction</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {INTERACTION_TYPE_VALUES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    type === t ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Texte</label>
            <Textarea autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ce qui s'est dit ou passé…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Réaction (optionnel)</label>
            <div className="flex flex-wrap gap-1.5">
              {REACTION_VALUES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReaction(reaction === r ? null : r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    reaction === r ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {REACTION_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!texte.trim() || saving}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50"
          >
            {saving ? "Ajout…" : "Ajouter"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
