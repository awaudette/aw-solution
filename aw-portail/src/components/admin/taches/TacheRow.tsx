"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, CheckCircle2, MessageCircle } from "lucide-react";
import type { TacheDTO } from "@/config/taches";
import type { StaffMember } from "@/hooks/useTaches";

function staffLabel(uid: string, staff: StaffMember[]): string {
  const s = staff.find(x => x.uid === uid);
  if (!s) return "?";
  return (`${s.prenom} ${s.nom}`.trim()) || s.courriel;
}

function assigneBadgeLabel(tache: TacheDTO, staff: StaffMember[]): string {
  if (tache.portee === "tous_employes") return "Tous les employés";
  if (tache.portee === "tout_le_monde") return "Tout le monde";
  if (tache.assignes.length === 0) return "Non assignée";
  if (tache.assignes.length === 1) return staffLabel(tache.assignes[0], staff);
  return `${staffLabel(tache.assignes[0], staff)} +${tache.assignes.length - 1}`;
}

function formatEcheance(iso: string, avecHeure: boolean): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  if (!avecHeure) return datePart;
  return `${datePart} · ${d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

export function TacheRow({
  tache, staff, onRequestComplete, onReopen, onClick,
}: {
  tache: TacheDTO;
  staff: StaffMember[];
  /** Cocher demande une confirmation — ne complète jamais directement. */
  onRequestComplete: () => void;
  /** Décocher rouvre immédiatement, sans confirmation. */
  onReopen: () => void;
  onClick: () => void;
}) {
  const complete = tache.statut === "complete";
  const enRetard = !complete && !!tache.dateEcheance && new Date(tache.dateEcheance).getTime() < Date.now();

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <Checkbox
          checked={complete}
          onCheckedChange={(checked) => (checked ? onRequestComplete() : onReopen())}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${complete ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {tache.titre}
          </p>
          {tache.priorite === "urgente" && !complete && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
              Urgent
            </span>
          )}
          {tache.commentairesCount > 0 && (
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[11px] font-medium text-gray-400">
              <MessageCircle size={12} />
              {tache.commentairesCount}
            </span>
          )}
        </div>
        {tache.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{tache.description}</p>
        )}
      </div>

      <span className="flex-shrink-0 px-2 py-1 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-100 max-w-[160px] truncate">
        {assigneBadgeLabel(tache, staff)}
      </span>

      {complete ? (
        tache.completedAt && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-green-600">
            <CheckCircle2 size={12} />
            Complétée le {formatDateCourte(tache.completedAt)}
          </span>
        )
      ) : (
        tache.dateEcheance && (
          <span
            className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-medium ${
              enRetard ? "text-red-600" : "text-gray-400"
            }`}
          >
            <CalendarClock size={12} />
            {formatEcheance(tache.dateEcheance, tache.heureEcheance)}
          </span>
        )
      )}
    </div>
  );
}
