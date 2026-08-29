"use client";

import { AlertTriangle, Clock } from "lucide-react";
import type { OrganisationDTO } from "@/config/organisations";
import { estSansProchaineAction, estDormant } from "./alertes";

export type FiltrePipeline = "sans_action" | "dormant" | null;

export function PipelineBanner({
  organisations, actif, onChange,
}: {
  organisations: OrganisationDTO[];
  actif: FiltrePipeline;
  onChange: (f: FiltrePipeline) => void;
}) {
  const sansAction = organisations.filter(estSansProchaineAction).length;
  const dormants = organisations.filter(estDormant).length;

  if (sansAction === 0 && dormants === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {sansAction > 0 && (
        <button
          onClick={() => onChange(actif === "sans_action" ? null : "sans_action")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            actif === "sans_action"
              ? "bg-amber-100 border-amber-300 text-amber-800"
              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          }`}
        >
          <AlertTriangle size={13} />
          {sansAction} dossier{sansAction > 1 ? "s" : ""} sans prochaine action
        </button>
      )}
      {dormants > 0 && (
        <button
          onClick={() => onChange(actif === "dormant" ? null : "dormant")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            actif === "dormant"
              ? "bg-red-100 border-red-300 text-red-800"
              : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          }`}
        >
          <Clock size={13} />
          {dormants} dossier{dormants > 1 ? "s" : ""} dormant{dormants > 1 ? "s" : ""} (14+ jours)
        </button>
      )}
    </div>
  );
}
