"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquarePlus, ListTodo, RefreshCcw, UserCog, Trash2 } from "lucide-react";
import { useOrganisations } from "@/hooks/useOrganisations";
import { InteractionDialog } from "@/components/admin/organisations/InteractionDialog";
import { EtapeDialog } from "@/components/admin/organisations/EtapeDialog";
import { ReattribuerDialog } from "@/components/admin/organisations/ReattribuerDialog";
import { ContactsList } from "@/components/admin/organisations/ContactsList";
import { InfosVenteCard } from "@/components/admin/organisations/InfosVenteCard";
import { PerteBlock } from "@/components/admin/organisations/PerteBlock";
import { TimelineOrganisation } from "@/components/admin/organisations/TimelineOrganisation";
import { NouvelleTacheDialog } from "@/components/admin/taches/NouvelleTacheDialog";
import { ETAPE_LABELS, type Etape, type OrganisationDTO, type ContactDTO, type InteractionDTO } from "@/config/organisations";
import { useRequireSection } from "@/components/admin/AdminAccessProvider";

const ETAPE_COLORS: Record<Etape, { bg: string; text: string; border: string }> = {
  nouveau:             { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" },
  contacte:            { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  demo_faite:          { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
  proposition_envoyee: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  negociation:         { bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8" },
  signe:               { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  perdu:               { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
};

function staffLabel(uid: string | undefined, staff: { uid: string; prenom: string; nom: string; courriel: string }[]): string {
  if (!uid) return "—";
  const s = staff.find(x => x.uid === uid);
  return s ? (`${s.prenom} ${s.nom}`.trim() || s.courriel) : "—";
}

export default function OrganisationPage() {
  const { ready } = useRequireSection("pipeline");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    staff, me, fetchOrganisation, updateOrganisation, deleteOrganisation, fetchContacts, createContact,
    updateContact, deleteContact, fetchInteractions, createInteraction,
  } = useOrganisations();

  const [org, setOrg]             = useState<OrganisationDTO | null | undefined>(undefined);
  const [contacts, setContacts]   = useState<ContactDTO[]>([]);
  const [interactions, setInteractions] = useState<InteractionDTO[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  const [showInteraction, setShowInteraction] = useState(false);
  const [showEtape, setShowEtape]             = useState(false);
  const [showTache, setShowTache]             = useState(false);
  const [showReattribuer, setShowReattribuer] = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [deleting, setDeleting]               = useState(false);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteOrganisation(id);
      router.push("/admin/pipeline");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [o, c, i] = await Promise.all([
        fetchOrganisation(id),
        fetchContacts(id),
        fetchInteractions(id),
      ]);
      setOrg(o);
      setContacts(c);
      setInteractions(i);
    } catch (e) {
      setOrg(null);
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!ready) return null;

  if (org === undefined) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin text-gray-300" /></div>;
  }
  if (org === null) {
    return <div className="text-center py-16 text-sm text-red-500">{error ?? "Dossier introuvable"}</div>;
  }

  const couleur = ETAPE_COLORS[org.etape];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/pipeline")}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={13} /> Retour au pipeline
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            confirmDelete
              ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
              : "bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
          } disabled:opacity-50`}
        >
          <Trash2 size={12} /> {deleting ? "Suppression…" : confirmDelete ? "Confirmer la suppression" : "Supprimer le dossier"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 text-right">{error}</p>}

      {/* En-tête */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{org.nom}</h1>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                style={{ background: couleur.bg, color: couleur.text, borderColor: couleur.border }}
              >
                {ETAPE_LABELS[org.etape]}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              Responsable : {staffLabel(org.proprietaire, staff)}
              {me?.role === "admin" && (
                <button
                  onClick={() => setShowReattribuer(true)}
                  className="inline-flex items-center gap-1 text-[#0362E3] hover:underline"
                >
                  <UserCog size={11} /> Réattribuer
                </button>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInteraction(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <MessageSquarePlus size={13} /> Ajouter une interaction
            </button>
            <button
              onClick={() => setShowTache(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <ListTodo size={13} /> Ajouter une tâche
            </button>
            <button
              onClick={() => setShowEtape(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0362E3] text-white hover:bg-[#0350c0]"
            >
              <RefreshCcw size={13} /> Changer d&apos;étape
            </button>
          </div>
        </div>

        <div
          className={`mt-4 rounded-lg px-3.5 py-2.5 text-sm ${
            org.prochaineAction ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-600 font-medium border border-red-100"
          }`}
        >
          <span className="text-xs uppercase tracking-wide font-semibold opacity-70 mr-2">Prochaine action</span>
          {org.prochaineAction || "Aucune prochaine action définie"}
        </div>
      </div>

      {/* Corps : timeline (compacte, se remplit peu à peu) + infos (dense, a besoin de place) */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Historique</p>
          <TimelineOrganisation orgId={id} interactions={interactions} staff={staff} refreshKey={taskRefreshKey} />
        </div>

        <div className="flex flex-col gap-4">
          <InfosVenteCard org={org} onSave={async (input) => { await updateOrganisation(id, input); await load(); }} />
          <ContactsList
            contacts={contacts}
            onAdd={async (input) => { await createContact(id, input); await load(); }}
            onUpdate={async (contactId, input) => { await updateContact(id, contactId, input); await load(); }}
            onDelete={async (contactId) => { await deleteContact(id, contactId); await load(); }}
          />
          <PerteBlock org={org} onSave={async (input) => { await updateOrganisation(id, input); await load(); }} />
        </div>
      </div>

      {showInteraction && (
        <InteractionDialog
          onClose={() => setShowInteraction(false)}
          onCreate={async (input) => { await createInteraction(id, input); await load(); }}
        />
      )}

      {showEtape && (
        <EtapeDialog
          nomOrganisation={org.nom}
          etapeActuelle={org.etape}
          onClose={() => setShowEtape(false)}
          onChangeEtape={async (input) => { await updateOrganisation(id, input); await load(); }}
        />
      )}

      {showTache && (
        <NouvelleTacheDialog
          staff={staff}
          lienVerrouille={{ lienType: "organisation", lienId: id, label: org.nom }}
          onClose={() => setShowTache(false)}
          onCreate={async (input) => {
            await fetch("/api/admin/taches", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            }).then(r => { if (!r.ok) return r.json().then(b => { throw new Error(b.error ?? "Erreur"); }); });
            setTaskRefreshKey(k => k + 1);
          }}
        />
      )}

      {showReattribuer && (
        <ReattribuerDialog
          staff={staff}
          proprietaireActuel={org.proprietaire}
          onClose={() => setShowReattribuer(false)}
          onConfirm={async (nouveauUid) => { await updateOrganisation(id, { proprietaire: nouveauUid }); await load(); }}
        />
      )}
    </div>
  );
}
