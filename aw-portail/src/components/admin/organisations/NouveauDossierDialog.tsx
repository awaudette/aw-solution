"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { NewOrganisationInput, NewContactInput, StaffMember } from "@/hooks/useOrganisations";

function staffLabel(s: StaffMember): string {
  return `${s.prenom} ${s.nom}`.trim() || s.courriel;
}

/** Formulaire volontairement court — le reste se remplit depuis la fiche. */
export function NouveauDossierDialog({
  staff, myUid, isAdmin, onClose, onCreate, onCreateContact,
}: {
  staff: StaffMember[];
  myUid: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onCreate: (input: NewOrganisationInput) => Promise<string>;
  onCreateContact: (orgId: string, input: NewContactInput) => Promise<void>;
}) {
  const [nom, setNom]                 = useState("");
  // Visible seulement pour un admin — un employé se voit toujours attribué
  // automatiquement le dossier qu'il crée (appliqué côté serveur de toute façon).
  const [proprietaire, setProprietaire] = useState(myUid ?? "");
  const [contactNom, setContactNom]   = useState("");
  const [contactCourriel, setContactCourriel] = useState("");
  const [source, setSource]           = useState("");
  const [prochaineAction, setProchaineAction] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  // Une fois l'organisation créée, on garde son id — un deuxième clic sur
  // "Créer" (ex. après un échec du contact) ne doit jamais recréer un
  // deuxième dossier dupliqué, seulement réessayer le contact.
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  async function handleSubmit() {
    if (saving) return;
    if (!createdOrgId && !nom.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let orgId = createdOrgId;
      if (!orgId) {
        orgId = await onCreate({
          nom: nom.trim(),
          source: source.trim() || null,
          prochaineAction: prochaineAction.trim() || null,
          proprietaire: isAdmin && proprietaire ? proprietaire : undefined,
        });
        setCreatedOrgId(orgId);
      }

      if (contactNom.trim() || contactCourriel.trim()) {
        await onCreateContact(orgId, {
          nom: contactNom.trim(),
          courriel: contactCourriel.trim() || null,
        });
      }

      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "erreur inconnue";
      setError(
        createdOrgId
          ? `Le dossier a été créé, mais l'ajout du contact a échoué : ${message}. Cliquez sur Réessayer, ou continuez sans contact — vous pourrez l'ajouter depuis la fiche.`
          : `Erreur lors de la création : ${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nom de l&apos;entreprise *</label>
            <Input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Resto ABC" />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Responsable</label>
              <select
                value={proprietaire}
                onChange={(e) => setProprietaire(e.target.value)}
                className="h-8 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-sm text-gray-700 outline-none focus:border-[#0362E3]"
              >
                {staff.map(s => (
                  <option key={s.uid} value={s.uid}>{staffLabel(s)}{s.uid === myUid ? " (moi)" : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact</label>
              <Input value={contactNom} onChange={(e) => setContactNom(e.target.value)} placeholder="Nom" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Courriel</label>
              <Input type="email" value={contactCourriel} onChange={(e) => setContactCourriel(e.target.value)} placeholder="contact@resto.ca" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex. référence, salon, appel à froid…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prochaine action</label>
            <Input value={prochaineAction} onChange={(e) => setProchaineAction(e.target.value)} placeholder="Ex. appeler jeudi" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            {createdOrgId ? "Continuer sans contact" : "Annuler"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!createdOrgId && !nom.trim()) || saving}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "…" : createdOrgId ? "Réessayer l'ajout du contact" : "Créer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
