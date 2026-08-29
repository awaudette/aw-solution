"use client";

import { useState } from "react";
import { Kanban, Table2, XCircle, LayoutDashboard, Loader2 } from "lucide-react";
import { useOrganisations } from "@/hooks/useOrganisations";
import { PipelineView } from "@/components/admin/organisations/PipelineView";
import { TousLesDossiersView } from "@/components/admin/organisations/TousLesDossiersView";
import { PerdusView } from "@/components/admin/organisations/PerdusView";
import { DashboardView } from "@/components/admin/organisations/DashboardView";

type Vue = "pipeline" | "tous" | "perdus" | "dashboard";

const ONGLETS: { id: Vue; label: string; icon: typeof Kanban }[] = [
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "tous", label: "Tous les dossiers", icon: Table2 },
  { id: "perdus", label: "Perdus", icon: XCircle },
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
];

export default function PipelinePage() {
  const {
    organisations, staff, me, myUid, loading,
    updateOrganisation, createOrganisation, createContact,
  } = useOrganisations();

  const [vue, setVue] = useState<Vue>("pipeline");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {ONGLETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setVue(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                vue === id ? "bg-white text-[#0362E3] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          {vue === "pipeline" && (
            <PipelineView
              organisations={organisations}
              staff={staff}
              myUid={myUid}
              me={me}
              updateOrganisation={updateOrganisation}
              createOrganisation={createOrganisation}
              createContact={createContact}
            />
          )}
          {vue === "tous" && <TousLesDossiersView organisations={organisations} staff={staff} />}
          {vue === "perdus" && <PerdusView organisations={organisations} staff={staff} updateOrganisation={updateOrganisation} />}
          {vue === "dashboard" && <DashboardView organisations={organisations} staff={staff} />}
        </>
      )}
    </div>
  );
}
