"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { ContactDTO } from "@/config/organisations";
import type { NewContactInput } from "@/hooks/useOrganisations";

export function ContactDialog({
  initial, onClose, onSave,
}: {
  initial?: ContactDTO;
  onClose: () => void;
  onSave: (input: NewContactInput) => Promise<void>;
}) {
  const [prenom, setPrenom]         = useState(initial?.prenom ?? "");
  const [nom, setNom]               = useState(initial?.nom ?? "");
  const [role, setRole]             = useState(initial?.role ?? "");
  const [courriel, setCourriel]     = useState(initial?.courriel ?? "");
  const [telephone, setTelephone]   = useState(initial?.telephone ?? "");
  const [cellulaire, setCellulaire] = useState(initial?.cellulaire ?? "");
  const [estDecideur, setEstDecideur] = useState(initial?.estDecideur ?? false);
  const [notes, setNotes]           = useState(initial?.notes ?? "");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSave() {
    if (!prenom.trim() && !nom.trim()) {
      setError("Prénom ou nom requis");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        prenom: prenom.trim(), nom: nom.trim(),
        role: role.trim() || null,
        courriel: courriel.trim() || null,
        telephone: telephone.trim() || null,
        cellulaire: cellulaire.trim() || null,
        estDecideur,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le contact" : "Ajouter un contact"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
              <Input autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titre / rôle</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex. Propriétaire" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Courriel</label>
              <Input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cellulaire</label>
            <Input value={cellulaire} onChange={(e) => setCellulaire(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox checked={estDecideur} onCheckedChange={(v) => setEstDecideur(v === true)} />
            Décideur
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
