"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, Users, UserRound, Globe } from "lucide-react";
import type { Portee } from "@/config/taches";
import type { StaffMember } from "@/hooks/useTaches";

const OPTIONS: { value: Portee; label: string; icon: typeof Users }[] = [
  { value: "individuel", label: "Personnes précises", icon: UserRound },
  { value: "tous_employes", label: "Tous les employés", icon: Users },
  { value: "tout_le_monde", label: "Tout le monde", icon: Globe },
];

function staffLabel(s: StaffMember): string {
  const nom = `${s.prenom} ${s.nom}`.trim();
  return nom || s.courriel;
}

/**
 * Bascule individuel / tous_employes / tout_le_monde. Pour tous_employes et
 * tout_le_monde, `assignes` est calculé côté serveur (voir src/lib/taches.ts)
 * — ce composant n'envoie alors aucune liste, juste la portée choisie.
 */
export function AssigneePicker({
  staff, portee, assignes, onChange, error,
}: {
  staff: StaffMember[];
  /** null = aucune portée choisie encore (aucun bouton actif). */
  portee: Portee | null;
  assignes: string[];
  onChange: (portee: Portee, assignes: string[]) => void;
  /** Message affiché juste sous le sélecteur, ex. quand rien n'est choisi à la soumission. */
  error?: string;
}) {
  function toggleUid(uid: string) {
    const next = assignes.includes(uid) ? assignes.filter(u => u !== uid) : [...assignes, uid];
    onChange("individuel", next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(opt => {
          const active = portee === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value, opt.value === "individuel" ? assignes : [])}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#0362E3]"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={13} /> {opt.label}
            </button>
          );
        })}
      </div>

      {portee === "individuel" && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="justify-between w-full sm:w-72 h-auto py-1.5 text-xs font-normal text-gray-600"
              />
            }
          >
            <span className="truncate">
              {assignes.length === 0
                ? "Choisir une ou plusieurs personnes"
                : staff.filter(s => assignes.includes(s.uid)).map(staffLabel).join(", ")}
            </span>
            <ChevronDown size={14} className="opacity-50 flex-shrink-0" />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-1.5">
            {staff.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-1.5">Aucun membre du personnel trouvé.</p>
            ) : (
              staff.map(s => (
                <label
                  key={s.uid}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <Checkbox checked={assignes.includes(s.uid)} onCheckedChange={() => toggleUid(s.uid)} />
                  <span className="truncate">{staffLabel(s)}</span>
                  <span className="ml-auto text-[10px] text-gray-400 uppercase flex-shrink-0">{s.role}</span>
                </label>
              ))
            )}
          </PopoverContent>
        </Popover>
      )}

      {(portee === "tous_employes" || portee === "tout_le_monde") && (
        <p className="text-xs text-gray-400">
          Assignation calculée automatiquement — reste à jour si l&apos;équipe change.
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
