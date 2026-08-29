"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Kanban } from "lucide-react";
import { useOrganisations } from "@/hooks/useOrganisations";
import { OrganisationCard } from "@/components/admin/organisations/OrganisationCard";
import { PipelineBanner, type FiltrePipeline } from "@/components/admin/organisations/PipelineBanner";
import { NouveauDossierDialog } from "@/components/admin/organisations/NouveauDossierDialog";
import { ConfirmerSignatureDialog } from "@/components/admin/organisations/ConfirmerSignatureDialog";
import { estSansProchaineAction, estDormant } from "@/components/admin/organisations/alertes";
import type { Etape, OrganisationDTO } from "@/config/organisations";

const COLONNES: { id: Etape; label: string; color: string }[] = [
  { id: "nouveau",             label: "Nouveau",              color: "#6B7280" },
  { id: "contacte",            label: "Contacté",             color: "#0362E3" },
  { id: "demo_faite",          label: "Démo faite",           color: "#7C3AED" },
  { id: "proposition_envoyee", label: "Proposition envoyée",  color: "#D97706" },
  { id: "negociation",         label: "Négociation",          color: "#DB2777" },
  { id: "signe",               label: "Signé",                color: "#16A34A" },
];

function OverlayCard({ org }: { org: OrganisationDTO }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-xl cursor-grabbing rotate-1 w-64">
      <p className="text-sm font-semibold text-gray-900">{org.nom}</p>
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const { organisations, staff, myUid, me, updateOrganisation, createOrganisation, createContact } = useOrganisations();

  const [activeId, setActiveId]         = useState<string | null>(null);
  const [localOrgs, setLocalOrgs]       = useState<OrganisationDTO[] | null>(null);
  const [filtre, setFiltre]             = useState<FiltrePipeline>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [pendingSignature, setPendingSignature] = useState<OrganisationDTO | null>(null);

  // Le kanban ne montre jamais les dossiers perdus — ils en sortent.
  const actives = useMemo(
    () => (localOrgs ?? organisations).filter(o => o.etape !== "perdu"),
    [localOrgs, organisations]
  );

  const visibles = useMemo(() => {
    if (filtre === "sans_action") return actives.filter(estSansProchaineAction);
    if (filtre === "dormant") return actives.filter(estDormant);
    return actives;
  }, [actives, filtre]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (!localOrgs) setLocalOrgs(organisations.filter(o => o.etape !== "perdu"));
  }, [organisations, localOrgs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const orgId = active.id as string;
    const target = COLONNES.find(c => c.id === over.id);
    if (!target) return;

    const org = (localOrgs ?? actives).find(o => o.id === orgId);
    if (!org || org.etape === target.id) return;

    if (target.id === "signe") {
      // Moment charnière — jamais un glisser-déposer silencieux.
      setPendingSignature(org);
      return;
    }

    setLocalOrgs((prev) => (prev ?? actives).map(o => (o.id === orgId ? { ...o, etape: target.id } : o)));
    updateOrganisation(orgId, { etape: target.id }).catch(() => setLocalOrgs(null));
  }, [actives, localOrgs, updateOrganisation]);

  const activeOrg = visibles.find(o => o.id === activeId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Kanban size={22} className="text-[#0362E3]" /> Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Glissez les cartes pour faire avancer un dossier.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0362E3] text-white text-sm font-medium hover:bg-[#0350c0] transition-colors"
        >
          <Plus size={15} /> Nouveau dossier
        </button>
      </div>

      <PipelineBanner organisations={actives} actif={filtre} onChange={setFiltre} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLONNES.map((col) => {
            const colOrgs = visibles.filter(o => o.etape === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-64">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.label}</span>
                  <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                    {colOrgs.length}
                  </span>
                </div>

                <SortableContext id={col.id} items={colOrgs.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  <div
                    className="min-h-[200px] rounded-xl p-2 space-y-2 transition-colors"
                    style={{ backgroundColor: `${col.color}08` }}
                    data-droppable-id={col.id}
                  >
                    {colOrgs.length === 0 ? (
                      <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-100">
                        <span className="text-xs text-gray-300">Aucun dossier</span>
                      </div>
                    ) : (
                      colOrgs.map((org) => (
                        <OrganisationCard
                          key={org.id}
                          org={org}
                          staff={staff}
                          isDragging={org.id === activeId}
                          onClick={() => router.push(`/admin/organisations/${org.id}`)}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>{activeOrg ? <OverlayCard org={activeOrg} /> : null}</DragOverlay>
      </DndContext>

      {showCreate && (
        <NouveauDossierDialog
          staff={staff}
          myUid={myUid}
          isAdmin={me?.role === "admin"}
          onClose={() => setShowCreate(false)}
          onCreate={createOrganisation}
          onCreateContact={createContact}
        />
      )}

      {pendingSignature && (
        <ConfirmerSignatureDialog
          nomOrganisation={pendingSignature.nom}
          onClose={() => setPendingSignature(null)}
          onConfirm={async (dateSignatureIso) => {
            await updateOrganisation(pendingSignature.id, { etape: "signe", dateSignature: dateSignatureIso });
            setLocalOrgs(null);
          }}
        />
      )}
    </div>
  );
}
