"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, ListTodo, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTaches } from "@/hooks/useTaches";
import { TachesFiltres, type FiltreActif } from "@/components/admin/taches/TachesFiltres";
import { TacheRow } from "@/components/admin/taches/TacheRow";
import { NouvelleTacheDialog } from "@/components/admin/taches/NouvelleTacheDialog";
import { TacheDetailDialog } from "@/components/admin/taches/TacheDetailDialog";
import { CompleterTacheDialog } from "@/components/admin/taches/CompleterTacheDialog";
import type { TacheDTO } from "@/config/taches";

function sortTaches(list: TacheDTO[]): TacheDTO[] {
  return [...list].sort((a, b) => {
    const aUrgent = a.priorite === "urgente" && a.statut !== "complete" ? 0 : 1;
    const bUrgent = b.priorite === "urgente" && b.statut !== "complete" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;

    const aDate = a.dateEcheance ? new Date(a.dateEcheance).getTime() : Infinity;
    const bDate = b.dateEcheance ? new Date(b.dateEcheance).getTime() : Infinity;
    if (aDate !== bDate) return aDate - bDate;

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bCreated - aCreated;
  });
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-200 rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-3">
        <ListTodo size={22} className="text-[#0362E3]" />
      </div>
      <p className="text-sm font-medium text-gray-700">Aucune tâche pour l&apos;instant</p>
      <p className="text-xs text-gray-400 mt-1 mb-4">
        Crée ta première tâche pour commencer à suivre le travail de l&apos;équipe.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0362E3] text-white text-sm font-medium hover:bg-[#0350c0] transition-colors"
      >
        <Plus size={15} /> Nouvelle tâche
      </button>
    </div>
  );
}

export default function AFairePage() {
  return (
    <Suspense>
      <AFaireContent />
    </Suspense>
  );
}

function AFaireContent() {
  const {
    taches, staff, me, myUid, loading, error,
    createTache, updateTache, completeTache, reopenTache, deleteTache,
    fetchComments, addComment,
  } = useTaches();

  const [filtre, setFiltre]                 = useState<FiltreActif>(null);
  const [voirCompletees, setVoirCompletees] = useState(false);
  const [showCreate, setShowCreate]         = useState(false);
  const [openId, setOpenId]                 = useState<string | null>(null);
  const [completeConfirmId, setCompleteConfirmId] = useState<string | null>(null);

  // Ouvre automatiquement la tâche visée par ?tacheId=... (lien "Voir" d'une
  // notification) une fois les tâches chargées. Une seule fois par visite —
  // ne rouvre pas si l'utilisateur ferme le panneau ensuite.
  const searchParams = useSearchParams();
  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpenDone.current || loading) return;
    const tacheId = searchParams.get("tacheId");
    if (tacheId && taches.some(t => t.id === tacheId)) {
      setOpenId(tacheId);
      autoOpenDone.current = true;
    } else if (!loading) {
      autoOpenDone.current = true;
    }
  }, [loading, taches, searchParams]);

  const compteBase = useMemo(
    () => (voirCompletees ? taches : taches.filter(t => t.statut !== "complete")),
    [taches, voirCompletees]
  );

  const visibles = useMemo(() => {
    let list = compteBase;
    if (filtre?.type === "mes-taches" && myUid) {
      list = list.filter(t => t.assignes.includes(myUid) || t.creePar === myUid);
    } else if (filtre?.type === "employe") {
      list = list.filter(t => t.assignes.includes(filtre.uid));
    } else if (filtre?.type === "tous_employes") {
      list = list.filter(t => t.portee === "tous_employes");
    } else if (filtre?.type === "tout_le_monde") {
      list = list.filter(t => t.portee === "tout_le_monde");
    }
    return sortTaches(list);
  }, [compteBase, filtre, myUid]);

  const openTache = taches.find(t => t.id === openId) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ListTodo size={20} className="text-[#0362E3]" /> À faire
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Tâches internes de l&apos;équipe AW Solution.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0362E3] text-white text-sm font-medium hover:bg-[#0350c0] transition-colors flex-shrink-0"
        >
          <Plus size={15} /> Nouvelle tâche
        </button>
      </div>

      {!loading && taches.length > 0 && (
        <>
          <TachesFiltres taches={compteBase} staff={staff} myUid={myUid} actif={filtre} onChange={setFiltre} />

          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-xs text-gray-500">Voir complétées</span>
            <Switch checked={voirCompletees} onCheckedChange={setVoirCompletees} />
          </div>
        </>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-300">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-sm text-red-500">{error}</div>
      ) : taches.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : visibles.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">Aucune tâche ne correspond à ce filtre.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visibles.map(t => (
            <TacheRow
              key={t.id}
              tache={t}
              staff={staff}
              onRequestComplete={() => setCompleteConfirmId(t.id)}
              onReopen={() => reopenTache(t.id)}
              onClick={() => setOpenId(t.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <NouvelleTacheDialog staff={staff} onClose={() => setShowCreate(false)} onCreate={createTache} />
      )}

      {openTache && (
        <TacheDetailDialog
          tache={openTache}
          staff={staff}
          currentUid={myUid}
          isAdmin={me?.role === "admin"}
          onClose={() => setOpenId(null)}
          onUpdate={(input) => updateTache(openTache.id, input)}
          onComplete={(input) => completeTache(openTache.id, input)}
          onReopen={() => reopenTache(openTache.id)}
          onDelete={async () => { await deleteTache(openTache.id); setOpenId(null); }}
          fetchComments={() => fetchComments(openTache.id)}
          addComment={(texte) => addComment(openTache.id, texte)}
        />
      )}

      {completeConfirmId && (
        <CompleterTacheDialog
          onClose={() => setCompleteConfirmId(null)}
          onConfirm={(input) => completeTache(completeConfirmId, input)}
        />
      )}
    </div>
  );
}
