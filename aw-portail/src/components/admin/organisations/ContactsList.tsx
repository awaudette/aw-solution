"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star, Mail, Phone } from "lucide-react";
import type { ContactDTO } from "@/config/organisations";
import type { NewContactInput } from "@/hooks/useOrganisations";
import { ContactDialog } from "./ContactDialog";

export function ContactsList({
  contacts, onAdd, onUpdate, onDelete,
}: {
  contacts: ContactDTO[];
  onAdd: (input: NewContactInput) => Promise<void>;
  onUpdate: (id: string, input: NewContactInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<ContactDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(c: ContactDTO) {
    if (!confirm(`Retirer ${c.prenom} ${c.nom} ?`)) return;
    setDeletingId(c.id);
    try {
      await onDelete(c.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">Contacts</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#0362E3] hover:bg-blue-50 px-2 py-1 rounded-md"
        >
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Aucun contact.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5 truncate">
                    {c.prenom} {c.nom}
                    {c.estDecideur && <Star size={11} className="text-amber-500 flex-shrink-0" fill="currentColor" />}
                  </p>
                  {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(c)} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {(c.courriel || c.telephone || c.cellulaire) && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {c.courriel && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> {c.courriel}</span>}
                  {(c.telephone || c.cellulaire) && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={10} /> {c.telephone || c.cellulaire}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <ContactDialog onClose={() => setShowAdd(false)} onSave={(input) => onAdd(input)} />
      )}
      {editing && (
        <ContactDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => onUpdate(editing.id, input)}
        />
      )}
    </div>
  );
}
