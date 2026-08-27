"use client";

import type { TacheDTO } from "@/config/taches";
import type { StaffMember } from "@/hooks/useTaches";

export type FiltreActif =
  | { type: "mes-taches" }
  | { type: "employe"; uid: string }
  | { type: "tous_employes" }
  | { type: "tout_le_monde" }
  | null;

function filtreLabel(f: NonNullable<FiltreActif>, staff: StaffMember[]): string {
  if (f.type === "mes-taches") return "Mes tâches";
  if (f.type === "tous_employes") return "Tous les employés";
  if (f.type === "tout_le_monde") return "Tout le monde";
  const s = staff.find(x => x.uid === f.uid);
  return s ? (`${s.prenom} ${s.nom}`.trim() || s.courriel) : "Employé";
}

function sameFiltre(a: FiltreActif, b: NonNullable<FiltreActif>): boolean {
  if (a === null) return false;
  if (a.type !== b.type) return false;
  if (a.type === "employe" && b.type === "employe") return a.uid === b.uid;
  return true;
}

function countFor(f: NonNullable<FiltreActif>, taches: TacheDTO[], myUid: string | null): number {
  if (f.type === "mes-taches") {
    return myUid ? taches.filter(t => t.assignes.includes(myUid) || t.creePar === myUid).length : 0;
  }
  if (f.type === "employe") return taches.filter(t => t.assignes.includes(f.uid)).length;
  if (f.type === "tous_employes") return taches.filter(t => t.portee === "tous_employes").length;
  return taches.filter(t => t.portee === "tout_le_monde").length;
}

/** Rangée de filtres à sélection simple — cliquer le filtre actif le désactive. */
export function TachesFiltres({
  taches, staff, myUid, actif, onChange,
}: {
  taches: TacheDTO[];
  staff: StaffMember[];
  myUid: string | null;
  actif: FiltreActif;
  onChange: (f: FiltreActif) => void;
}) {
  const employes = staff.filter(s => s.role === "employe");

  const chips: NonNullable<FiltreActif>[] = [
    { type: "mes-taches" },
    ...employes.map(e => ({ type: "employe" as const, uid: e.uid })),
    { type: "tous_employes" },
    { type: "tout_le_monde" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {chips.map((chip, i) => {
        const active = sameFiltre(actif, chip);
        const count = countFor(chip, taches, myUid);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(active ? null : chip)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              active
                ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {filtreLabel(chip, staff)}
            <span
              className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                active ? "bg-[#0362E3] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
