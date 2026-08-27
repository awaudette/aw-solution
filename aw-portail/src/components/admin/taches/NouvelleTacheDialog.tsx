"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssigneePicker } from "./AssigneePicker";
import { combineDateTimeToIso } from "@/lib/dateInputs";
import { useClients } from "@/hooks/useClients";
import type { Portee, Priorite } from "@/config/taches";
import type { NewTacheInput, StaffMember } from "@/hooks/useTaches";

/** Formulaire minimal — seul le titre est requis ; tout le reste est visible d'emblée. */
export function NouvelleTacheDialog({
  staff, onClose, onCreate,
}: {
  staff: StaffMember[];
  onClose: () => void;
  onCreate: (input: NewTacheInput) => Promise<void>;
}) {
  const { clients } = useClients();

  const [titre, setTitre]             = useState("");
  const [description, setDescription] = useState("");
  const [portee, setPortee]           = useState<Portee | null>(null);
  const [assignes, setAssignes]       = useState<string[]>([]);
  const [priorite, setPriorite]       = useState<Priorite>("normale");
  const [dateEcheance, setDateEcheance] = useState("");
  const [heureEcheance, setHeureEcheance] = useState("");
  const [clientId, setClientId]       = useState("");
  const [lienType, setLienType]       = useState("");
  const [lienId, setLienId]           = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [assignError, setAssignError] = useState(false);

  function handleAssigneChange(p: Portee, a: string[]) {
    setPortee(p);
    setAssignes(a);
    setAssignError(false);
  }

  function assignationInvalide(): boolean {
    return portee === null || (portee === "individuel" && assignes.length === 0);
  }

  async function handleSubmit() {
    if (!titre.trim() || saving) return;
    if (assignationInvalide()) {
      setAssignError(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        titre: titre.trim(),
        description: description.trim() || null,
        portee: portee!,
        assignes: portee === "individuel" ? assignes : undefined,
        priorite,
        dateEcheance: combineDateTimeToIso(dateEcheance, heureEcheance),
        heureEcheance: !!heureEcheance,
        clientId: clientId || null,
        lienType: lienType.trim() || null,
        lienId: lienId.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="Titre de la tâche"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <Textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignation</label>
            <AssigneePicker
              staff={staff}
              portee={portee}
              assignes={assignes}
              onChange={handleAssigneChange}
              error={assignError ? "Choisissez à qui assigner cette tâche." : undefined}
            />
          </div>

          <button
            type="button"
            onClick={() => setPriorite(priorite === "urgente" ? "normale" : "urgente")}
            className={`self-start px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              priorite === "urgente"
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            Priorité urgente
          </button>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Échéance (optionnel)</label>
            <div className="flex gap-2">
              <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} className="w-36" />
              <Input
                type="time"
                value={heureEcheance}
                onChange={(e) => setHeureEcheance(e.target.value)}
                className="w-28"
                disabled={!dateEcheance}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Client (optionnel)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-8 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-sm text-gray-700 outline-none focus:border-[#0362E3]"
            >
              <option value="">Aucun client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Lien (optionnel)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Type (ex. lead, url…)"
                value={lienType}
                onChange={(e) => setLienType(e.target.value)}
              />
              <Input
                placeholder="Identifiant ou URL"
                value={lienId}
                onChange={(e) => setLienId(e.target.value)}
              />
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
            disabled={!titre.trim() || saving}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
