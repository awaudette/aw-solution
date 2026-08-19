"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClients } from "@/hooks/useClients";
import type { Client, EtapePipeline } from "@/types/admin";

const COLONNES: { id: EtapePipeline; label: string; color: string }[] = [
  { id: "Prospect", label: "Prospect", color: "#6B7280" },
  { id: "Signé", label: "Signé", color: "#0362E3" },
  { id: "En développement", label: "En développement", color: "#7C3AED" },
  { id: "Live", label: "Live", color: "#D97706" },
  { id: "Actif", label: "Actif", color: "#16A34A" },
  { id: "À risque de churn", label: "À risque de churn", color: "#DC2626" },
];

function KanbanCard({ client, isDragging }: { client: Client; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: client.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{client.nom}</p>
        <span
          className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
            client.forfait === "Prestige"
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-50 text-gray-500"
          }`}
        >
          {client.forfait === "Prestige" ? "★" : ""} {client.forfait}
        </span>
      </div>

      {/* Barre onboarding */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Onboarding</span>
          <span className="text-xs font-medium text-gray-600">{client.onboardingPct}%</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${client.onboardingPct}%`,
              backgroundColor: client.onboardingPct === 100 ? "#16a34a" : "#0362E3",
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            client.statutFacture === "payé"
              ? "bg-green-50 text-green-700"
              : client.statutFacture === "en retard"
              ? "bg-red-50 text-red-700"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {client.statutFacture}
        </span>
        <span className="text-xs text-gray-400">{client.montantMensuel} $/mois</span>
      </div>
    </div>
  );
}

function OverlayCard({ client }: { client: Client }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-xl cursor-grabbing rotate-1 w-64">
      <p className="text-sm font-semibold text-gray-900 mb-1">{client.nom}</p>
      <p className="text-xs text-gray-400">{client.forfait} · {client.onboardingPct}% onboarding</p>
    </div>
  );
}

export default function PipelinePage() {
  const { clients, loading } = useClients();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localClients, setLocalClients] = useState<Client[] | null>(null);

  const displayClients = localClients ?? clients;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (!localClients) setLocalClients([...clients]);
  }, [clients, localClients]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const clientId = active.id as string;
    const overId = over.id as string;

    const targetColonne = COLONNES.find((c) => c.id === overId);
    if (!targetColonne) return;

    const newEtape = targetColonne.id;

    setLocalClients((prev) =>
      (prev ?? clients).map((c) =>
        c.id === clientId ? { ...c, etapePipeline: newEtape } : c
      )
    );

    try {
      await updateDoc(doc(db, "clients", clientId), { etapePipeline: newEtape });
    } catch {
      setLocalClients(null);
    }
  }, [clients]);

  const activeClient = displayClients.find((c) => c.id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Glissez les cartes pour mettre à jour l&apos;étape de chaque client
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLONNES.map((col) => {
            const colClients = displayClients.filter((c) => c.etapePipeline === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-60">
                {/* En-tête colonne */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                    {colClients.length}
                  </span>
                </div>

                {/* Zone de drop */}
                <SortableContext
                  id={col.id}
                  items={colClients.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="min-h-[200px] rounded-xl p-2 space-y-2 transition-colors"
                    style={{ backgroundColor: `${col.color}08` }}
                    data-droppable-id={col.id}
                  >
                    {colClients.length === 0 ? (
                      <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-100">
                        <span className="text-xs text-gray-300">Aucun client</span>
                      </div>
                    ) : (
                      colClients.map((client) => (
                        <KanbanCard
                          key={client.id}
                          client={client}
                          isDragging={client.id === activeId}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeClient ? <OverlayCard client={activeClient} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
