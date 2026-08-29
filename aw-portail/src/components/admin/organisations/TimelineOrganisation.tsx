"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, Users, Monitor, MessageSquare, StickyNote, ListTodo, Loader2 } from "lucide-react";
import type { InteractionDTO, InteractionType, Reaction } from "@/config/organisations";
import type { TacheDTO } from "@/config/taches";
import type { StaffMember } from "@/hooks/useOrganisations";

const TYPE_ICON: Record<InteractionType, typeof Phone> = {
  appel: Phone, courriel: Mail, rencontre: Users, demo: Monitor, texto: MessageSquare, note: StickyNote,
};
const REACTION_COLOR: Record<Reaction, string> = {
  tres_positif: "#16A34A", positif: "#16A34A", neutre: "#9CA3AF", reserve: "#D97706", negatif: "#DC2626",
};

function auteurLabel(uid: string, staff: StaffMember[]): string {
  const s = staff.find(x => x.uid === uid);
  return s ? (`${s.prenom} ${s.nom}`.trim() || s.courriel) : "?";
}

function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`;
}

type Entry =
  | { kind: "interaction"; date: string; data: InteractionDTO }
  | { kind: "tache"; date: string; data: TacheDTO };

export function TimelineOrganisation({
  orgId, interactions, staff, refreshKey,
}: {
  orgId: string;
  interactions: InteractionDTO[];
  staff: StaffMember[];
  /** Change pour forcer un rafraîchissement des tâches liées (ex. après en avoir créé une). */
  refreshKey: number;
}) {
  const [taches, setTaches]   = useState<TacheDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/taches?lienType=organisation&lienId=${orgId}`)
      .then(r => r.json())
      .then(body => { if (!cancelled) setTaches(body.taches ?? []); })
      .catch(() => { if (!cancelled) setTaches([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orgId, refreshKey]);

  const entries: Entry[] = [
    ...interactions.filter(i => i.date).map(i => ({ kind: "interaction" as const, date: i.date as string, data: i })),
    ...taches.filter(t => t.createdAt).map(t => ({ kind: "tache" as const, date: t.createdAt as string, data: t })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-gray-300" /></div>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-4">Aucune activité pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        if (entry.kind === "tache") {
          const t = entry.data;
          return (
            <div key={`t-${t.id}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
              <ListTodo size={14} className="text-[#0362E3] mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800">
                  Tâche créée : <span className="font-medium">{t.titre}</span>
                  {t.statut === "complete" && <span className="ml-1.5 text-xs text-green-600 font-medium">✓ complétée</span>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{formatDateHeure(entry.date)}</p>
              </div>
            </div>
          );
        }

        const i = entry.data;
        if (i.automatique) {
          return (
            <div key={`i-${i.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400">
              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
              {i.texte} · {formatDateHeure(entry.date)}
            </div>
          );
        }

        const Icon = TYPE_ICON[i.type];
        return (
          <div key={`i-${i.id}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-800 flex-1">{i.texte}</p>
                {i.reaction && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: REACTION_COLOR[i.reaction] }}
                    title={i.reaction}
                  />
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {auteurLabel(i.auteur, staff)} · {formatDateHeure(entry.date)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
