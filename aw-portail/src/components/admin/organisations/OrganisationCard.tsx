"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, CalendarClock } from "lucide-react";
import type { OrganisationDTO } from "@/config/organisations";
import type { StaffMember } from "@/hooks/useOrganisations";
import { estSansProchaineAction, estDormant } from "./alertes";

function prenomProprietaire(uid: string, staff: StaffMember[]): string {
  const s = staff.find(x => x.uid === uid);
  return s?.prenom || s?.nom || "?";
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

export function OrganisationCard({
  org, staff, isDragging, onClick,
}: {
  org: OrganisationDTO;
  staff: StaffMember[];
  isDragging?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: org.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const alerte = estSansProchaineAction(org) || estDormant(org);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{org.nom}</p>
        {alerte && (
          <span className="flex-shrink-0" title={estSansProchaineAction(org) ? "Aucune prochaine action" : "Dossier dormant (14+ jours)"}>
            <AlertTriangle size={14} className="text-amber-500" />
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-gray-400">Responsable</span>
        <span className="font-medium text-gray-700">{prenomProprietaire(org.proprietaire, staff)}</span>
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-400 flex items-center gap-1"><CalendarClock size={11} /> Dernière interaction</span>
        <span className="font-medium text-gray-600">
          {org.derniereInteraction ? formatDateCourte(org.derniereInteraction) : "—"}
        </span>
      </div>

      <div className="pt-2 border-t border-gray-50">
        <p className="text-xs text-gray-400 mb-0.5">Prochaine action</p>
        <p className={`text-xs truncate ${org.prochaineAction ? "text-gray-700" : "text-red-500 font-medium"}`}>
          {org.prochaineAction || "Non définie"}
        </p>
      </div>
    </div>
  );
}
